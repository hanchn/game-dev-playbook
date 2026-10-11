import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const sharp = require('sharp'), { createCanvas, ImageData } = require('@napi-rs/canvas');
const root = path.dirname(new URL(import.meta.url).pathname), lab = path.resolve(root, '../../..');
const original = JSON.parse(await fs.readFile(path.join(root, '../milk-frog-arm-control-v1/source-labels.json')));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
const radians = value => value * Math.PI / 180;
const endpoint = (a, len, deg) => [a[0] + len * Math.cos(radians(deg)), a[1] + len * Math.sin(radians(deg))];
const median = values => { const a = [...values].sort((a, b) => a - b); return (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2; };
const stats = values => ({ min: Math.min(...values), max: Math.max(...values), median: median(values) });
const rows = original.frames.slice(2, 8).map(f => {
  const [s, e, w] = f.far.arm;
  return { index: f.index, shoulder: s, elbow: e, wrist: w, nearShoulder: f.near.arm[0], upperPixels: distance(s, e), forePixels: distance(e, w), upperDegrees: angle(s, e), foreDegrees: angle(e, w), elbowDirectionDifferenceDegrees: Math.abs(angle(s, e) - angle(e, w)), shoulderOffsetFromNear: s.map((v, i) => v - f.near.arm[0][i]), warning: 'Hand-marked 2D projected painted-joint distances. Anatomical pivots are not measured bones; apparent volume/perspective/source drawing varies.' };
});
for (const row of rows) {
  row.sourcePng = original.originalFrames[row.index].source;
  row.sourcePngSha256 = createHash('sha256').update(await fs.readFile(lab + '/public' + row.sourcePng)).digest('hex');
}
const summary = { upperPixels: stats(rows.map(r => r.upperPixels)), forePixels: stats(rows.map(r => r.forePixels)), offsetX: stats(rows.map(r => r.shoulderOffsetFromNear[0])), offsetY: stats(rows.map(r => r.shoulderOffsetFromNear[1])) };
const near8 = original.frames[8].near.arm[0], wrist8 = original.frames[8].far.arm[2];
const rawSocket = [near8[0] + summary.offsetX.min, near8[1] + summary.offsetY.min, near8[0] + summary.offsetX.max, near8[1] + summary.offsetY.max];
const minRectDistance = (a, b) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));
const expand = (box, pad) => [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
const projectedReach = summary.upperPixels.max + summary.forePixels.max;
// This is an explicitly declared production-consistency model, not a statistical confidence interval.
const productionModel = { rootOffsetExtraPixels: 40, upperExtraPixels: 40, foreExtraPixels: 40, observedWristExtraPixels: 20 };
const socket = expand(rawSocket, productionModel.rootOffsetExtraPixels), wristBox = expand([...wrist8, ...wrist8], productionModel.observedWristExtraPixels), generousReach = projectedReach + productionModel.upperExtraPixels + productionModel.foreExtraPixels;
const nearest = minRectDistance(socket, wristBox);
const hiddenPhaseReach = original.frames.filter(f => !f.far.arm[0]).map(f => {
  const n = f.near.arm[0], w = f.far.arm[2];
  const box = [n[0] + summary.offsetX.min, n[1] + summary.offsetY.min, n[0] + summary.offsetX.max, n[1] + summary.offsetY.max];
  const rootBox = expand(box, productionModel.rootOffsetExtraPixels), markedWristBox = expand([...w, ...w], productionModel.observedWristExtraPixels), minimumDistance = minRectDistance(rootBox, markedWristBox);
  return { index: f.index, shoulderInferred: true, inferredSocketBox: rootBox, markedWrist: w, wristToleranceBox: markedWristBox, minimumDistance, maximumReach: generousReach, outsideThisModel: minimumDistance > generousReach, marginPixels: minimumDistance - generousReach, anatomicalApproval: false };
});
const sensitivity = [0, 10, 15, 20, 25, 35, 60].map(error => {
  // Independent +/-e errors for far/near calibration centers and the frame8 near center => +/-3e socket.
  // Two endpoint errors per segment => +2sqrt(2)e maximum per bone. This intentionally much looser model
  // cannot reject the source at high uncertainty; do not hide that limitation.
  const uncertainSocket = expand(rawSocket, 3 * error), uncertainWrist = expand([...wrist8, ...wrist8], error), reach = projectedReach + 4 * Math.SQRT2 * error;
  const minimumDistance = minRectDistance(uncertainSocket, uncertainWrist);
  return { independentPointErrorEachAxisPixels: error, minimumDistance, reach, outside: minimumDistance > reach, marginPixels: minimumDistance - reach };
});
const candidateUpper = [55, 90, ...rows.map(r => r.upperDegrees), 70, 45, 45, 55];
const candidateFlex = [90, 45, ...rows.map(r => r.elbowDirectionDifferenceDegrees), 60, 90, 90, 90];
const upperLen = summary.upperPixels.median, foreLen = summary.forePixels.median;
const coupled = original.frames.map(f => {
  const shoulder = [f.near.arm[0][0] + summary.offsetX.median, f.near.arm[0][1] + summary.offsetY.median];
  const elbow = endpoint(shoulder, upperLen, candidateUpper[f.index]), wrist = endpoint(elbow, foreLen, candidateUpper[f.index] - candidateFlex[f.index]);
  const hip = f.far.leg[0], knee = f.far.leg[1], thighX = knee ? knee[0] - hip[0] : null, upperX = elbow[0] - shoulder[0];
  const directionOpposed = thighX === null ? null : Math.abs(thighX) <= 70 || Math.abs(upperX) <= 35 ? 'passing/uncertain' : Math.sign(thighX) === -Math.sign(upperX);
  return { index: f.index, phase: f.phase, stageObserved: f.stage, shoulder, elbow, wrist, upperLength: upperLen, foreLength: foreLen, upperDegrees: candidateUpper[f.index], elbowFlexDegrees: candidateFlex[f.index], farThighX: thighX, farUpperX: upperX, directionOpposed, source: f.index >= 2 && f.index <= 7 ? 'Visible source upperarm direction and flex adapted to median fixed projected lengths/socket; not pixel-perfect source copy.' : 'Hidden source socket inferred; arm direction proposed from thigh phase. Phase1 far knee unknown, temporal interpolation only.', occlusionExpected: f.index >= 2 && f.index <= 7 ? 'Back upperarm/forearm may emerge left of near arm/body. Allow near arm/torso to hide shoulder and wrist; do not move fist to force visibility.' : 'Front/passing far chain likely largely behind original near deltoid/arm and torso. Partial or entire fist occlusion permissible; original art must be visually rechecked. No automatic opacity pass.', status: 'proposal-only; no source edit or imagegen submitted' };
});
for (const frame of coupled) {
  assert(Math.abs(distance(frame.shoulder, frame.elbow) - upperLen) < 1e-9);
  assert(Math.abs(distance(frame.elbow, frame.wrist) - foreLen) < 1e-9);
  assert.notEqual(frame.directionOpposed, false, `phase${frame.index} obvious same-direction proximal pair`);
}
assert(nearest > generousReach, 'Production-consistency reach rejects remote observed wrist');
assert.equal(sensitivity.find(r => r.independentPointErrorEachAxisPixels === 35).outside, false, 'Broad independent point uncertainty must not manufacture certainty');
const report = { kind: 'manual-source-projected-arm-reach-audit', status: 'proposal-pending-root-review', imagegenSubmitted: false, sourceLabels: '../milk-frog-arm-control-v1/source-labels.json', units: 'Original1254x1254 native image pixels, 2D projected hand-marked centers, NOT anatomical bone measurements or motion capture.', visibleSourceRows: rows, summary, phase8: { observedNearShoulder: near8, observedWrist: wrist8, rawOffsetDerivedSocketBox: rawSocket, rawMaxProjectedReach: projectedReach, rawMinimumWristDistance: minRectDistance(rawSocket, [...wrist8, ...wrist8]), productionConsistencyModel: productionModel, inferredSocketBox: socket, measuredWristToleranceBox: wristBox, allowedMaximumReach: generousReach, minimumPossibleDistance: nearest, outsideByPixels: nearest - generousReach, conclusion: 'Observed frame8 wrist violates this explicitly bounded source-consistency model. Hidden socket is INFERRED; no assertion of measured joint or anatomical impossibility for every conceivable viewpoint/annotation error.', widerIndependentPointSensitivity: sensitivity, limitation: 'At +/-20px independently for every center the much wider worst-case uncertainty no longer rejects. Prior +/-35..60px uncertainty cannot establish unconditional impossibility. Need refined visible-pivot/view contract; do not report a statistical confidence.' }, hiddenPhaseReach, proposedCycle: { upperLengthPixels: upperLen, foreLengthPixels: foreLen, fixedOffsetFromNear: [summary.offsetX.median, summary.offsetY.median], frames: coupled, baselineRejected: 'Independent S650430/L225+225 and phase8 back-angle117.5 ignored source proportions and thigh phase.', limitation: 'Phase1 knee unknown. Frontal hidden elbows/flex inferred. Shared median 2D lengths are a candidate source-consistency convention, not uniquely recovered anatomy. Source8 largely occluded arm cannot be required fully visible. Parent review before single-frame edit.' } };
await fs.writeFile(`${root}/report.json`, JSON.stringify(report, null, 2));
const c = createCanvas(1850, 1320), g = c.getContext('2d'), source = lab + '/public' + original.originalFrames[8].source, bytes = await fs.readFile(source), { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), image = createCanvas(info.width, info.height);
g.fillStyle = '#e5e9e7'; g.fillRect(0, 0, c.width, c.height); image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), info.width, info.height), 0, 0); g.drawImage(image, 0, 50);
g.strokeStyle = '#005cc8'; g.fillStyle = 'rgba(0,100,220,.1)'; g.lineWidth = 4; g.beginPath(); g.roundRect(socket[0] - generousReach, socket[1] - generousReach + 50, socket[2] - socket[0] + 2 * generousReach, socket[3] - socket[1] + 2 * generousReach, generousReach); g.fill(); g.stroke();
g.fillStyle = 'rgba(0,100,220,.25)'; g.fillRect(socket[0], socket[1] + 50, socket[2] - socket[0], socket[3] - socket[1]);
g.strokeStyle = '#ef303b'; g.lineWidth = 6; g.strokeRect(wristBox[0], wristBox[1] + 50, wristBox[2] - wristBox[0], wristBox[3] - wristBox[1]);
g.strokeStyle = '#198142'; g.lineWidth = 8; g.setLineDash([13, 13]); const p = coupled[8]; g.beginPath(); g.moveTo(p.shoulder[0], p.shoulder[1] + 50); g.lineTo(p.elbow[0], p.elbow[1] + 50); g.lineTo(p.wrist[0], p.wrist[1] + 50); g.stroke(); g.setLineDash([]);
g.fillStyle = '#192f3d'; g.font = 'bold 25px sans-serif'; g.fillText('SOURCE8 reach evidence | annotation ONLY | hidden socket INFERRED', 20, 30);
const text = ['Native source2..7 projected distances:', `upper ${summary.upperPixels.min.toFixed(1)}..${summary.upperPixels.max.toFixed(1)} (median${upperLen.toFixed(1)})`, `fore ${summary.forePixels.min.toFixed(1)}..${summary.forePixels.max.toFixed(1)} (median${foreLen.toFixed(1)})`, 'far shoulder relative near:', `X${summary.offsetX.min}..${summary.offsetX.max}; Y${summary.offsetY.min}..${summary.offsetY.max}`, '', 'BLUE=raw socket range +40px', `Allowed Umax+Fmax+80 = ${generousReach.toFixed(1)}px`, 'RED=observed wrist955,620 +/-20px', `Nearest separation ${nearest.toFixed(1)}px`, `Outside declared model by ${(nearest - generousReach).toFixed(1)}px`, '', 'GREEN=dashed proposed 8 chain:', `S${p.shoulder.map(v => v.toFixed(1)).join(',')}`, `E${p.elbow.map(v => v.toFixed(1)).join(',')}`, `W${p.wrist.map(v => v.toFixed(1)).join(',')}`, 'Proximal arm FRONT, far thigh BACK.', 'Likely hidden by source near arm/body.', 'Do NOT move hand to force visibility.', '', 'Not a statistical/anatomical proof:', 'independent +/-20px endpoints makes', 'worst-case interval too wide to reject.', 'See sensitivity table; no new imagegen.'];
g.font = '23px sans-serif'; text.forEach((line, i) => g.fillText(line, 1260, 100 + i * 43)); await fs.writeFile(`${root}/source-08-reach.png`, c.toBuffer('image/png'));
assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
let markdown = '# 奶蛙远臂源量纲、可达范围与候选时相\n\n未提交新 imagegen。源2..7的原生人工关节点仅测2D投影距离，并非真实骨长或动捕；根/肘解剖中心仍有歧义。\n\n| 原相位 | 上臂像素 | 前臂像素 | far肩相对near肩 | 上臂方向角 | 屈肘方向差 |\n|---|---:|---:|---|---:|---:|\n';
for (const r of rows) markdown += `| ${r.index}/12 | ${r.upperPixels.toFixed(2)} | ${r.forePixels.toFixed(2)} | ${r.shoulderOffsetFromNear.join(',')} | ${r.upperDegrees.toFixed(2)}° | ${r.elbowDirectionDifferenceDegrees.toFixed(2)}° |\n`;
markdown += `\n中位数候选：上臂${upperLen.toFixed(2)}px、前臂${foreLen.toFixed(2)}px，far肩相对near肩[${summary.offsetX.median},${summary.offsetY.median}]。这替代先前未源校准的225+225与650430假设。back-swing可见肘链近伸直（2.7..23.1°），也不能继续强行套旧60..100°屈肘参数。\n\n第8帧near肩635400；套可见相对偏移范围得到far socket box[${rawSocket}]。观测远腕955620。原最大总投影长度${projectedReach.toFixed(2)}px，原范围最小距离${report.phase8.rawMinimumWristDistance.toFixed(2)}px。\n\n明确生产一致性假设：根偏移范围额外±40px、两段各放宽40px、腕±20px。得到socket[${socket}]、最大可达${generousReach.toFixed(2)}px、最短距离${nearest.toFixed(2)}px，超出${(nearest - generousReach).toFixed(2)}px。它支持拒绝当前远离身体的腕作为复用比例的候选；不能声称隐藏肩真实测得、任意姿态均生理不可能。\n\n独立每个端点误差的更宽模型（根同时合并3倍误差，骨段两端误差和）：\n\n| 每坐标误差±px | 最短距离 | 最大可达 | 可排除? |\n|---|---:|---:|---|\n`;
for (const r of sensitivity) markdown += `| ${r.independentPointErrorEachAxisPixels} | ${r.minimumDistance.toFixed(2)} | ${r.reach.toFixed(2)} | ${r.outside ? '在该误差模型下可排除' : '不能排除'} |\n`;
markdown += '\n±20及以上的独立最坏情况不再能排除，旧全局±35..60px标注不确定性不能制造确定结论。需要根视角/真实可见关节细化；这不是置信区间。\n\n候选12时相固定中位投影骨段与相对肩偏移，从真实far thigh方向约束上臂，2..7沿原可见上臂/屈肘方向，隐藏相位0/8..11只提案，1far knee未知保留未验证。8新上臂70°朝前，与far thigh朝后配合；腕约636,530在躯干/near臂内部，合理遮挡而非硬推到外侧。候选前摆大概率部分/全部隐藏，不能仅为显眼加长/外移远拳。所有提案未作为生图或源资产，root复核后单张编辑。\n\n| 相位 | 腿观察 | far上臂角 | 屈肘差 | 候选肩→肘→腕 | 来源/状态 |\n|---|---|---:|---:|---|---|\n';
for (const f of coupled) markdown += `| ${f.index}/12 | ${f.stageObserved} | ${f.upperDegrees.toFixed(2)}° | ${f.elbowFlexDegrees.toFixed(2)}° | ${[f.shoulder, f.elbow, f.wrist].map(p => p.map(v => v.toFixed(1)).join(',')).join(' → ')} | ${f.index === 1 ? 'far膝隐藏，时序插值未验证' : f.index >= 2 && f.index <= 7 ? '原可见方向适配，未像素跟随验收' : '隐藏根/弯肘推断，未美术验收'} |\n`;
markdown += '\n图证据 `source-08-reach.png`，完整JSON `report.json`。原PNG字节未改，图是QA标注而非最终角色帧；绿色推断链可能遮在角色源后面，虚线不表示真关节已测得。\n';
await fs.writeFile(`${root}/README.md`, markdown);
console.log(JSON.stringify({ summary, phase8: { rawSocket, socket, wrist8, generousReach, nearest, outsideBy: nearest - generousReach }, proposal: { upperLen, foreLen, phase8: coupled[8] }, allStatus: 'pending root review; no imagegen' }));
