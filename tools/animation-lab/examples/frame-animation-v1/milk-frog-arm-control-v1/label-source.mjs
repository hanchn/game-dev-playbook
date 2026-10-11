import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'), sharp = require('sharp'), { createCanvas, ImageData } = require('@napi-rs/canvas');
const root = path.dirname(new URL(import.meta.url).pathname), pub = path.resolve(root, '../../../public'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = JSON.parse(await fs.readFile(`${root}/source-labels.json`)), rows = [], sources = [];
const dir = (a, b) => !a || !b ? 'hidden/unknown' : Math.abs(b[0] - a[0]) <= 70 ? `passing/uncertain (${b[0] - a[0]}px)` : b[0] > a[0] ? `front (+${b[0] - a[0]}px)` : `back (${b[0] - a[0]}px)`;
const chain = pts => pts.map(p => p ? p.join(',') : '?hidden').join(' → ');
for (const f of report.frames) {
  const source = report.originalFrames[f.index].source, bytes = await fs.readFile(pub + source), { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], [1254, 1254]);
  for (const side of ['near', 'far']) for (const limb of ['arm', 'leg']) for (const point of f[side][limb]) if (point) assert(point[0] >= 0 && point[0] < info.width && point[1] >= 0 && point[1] < info.height);
  const c = createCanvas(1254, 1310), g = c.getContext('2d'), t = createCanvas(1254, 1254);
  g.fillStyle = '#e5e9e7'; g.fillRect(0, 0, c.width, c.height); t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), info.width, info.height), 0, 0); g.drawImage(t, 0, 50);
  for (const side of ['far', 'near']) for (const limb of ['arm', 'leg']) {
    const points = f[side][limb], labels = limb === 'arm' ? ['S', 'E', 'W'] : ['H', 'K', 'A'];
    g.strokeStyle = g.fillStyle = side === 'near' ? '#e63333' : '#005cc8'; g.lineWidth = 9;
    for (let k = 0; k < 2; k++) if (points[k] && points[k + 1]) { g.beginPath(); g.moveTo(points[k][0], points[k][1] + 50); g.lineTo(points[k + 1][0], points[k + 1][1] + 50); g.stroke(); }
    for (let k = 0; k < 3; k++) if (points[k]) { const p = points[k]; g.beginPath(); g.arc(p[0], p[1] + 50, 14, 0, Math.PI * 2); g.fill(); g.font = 'bold 24px sans-serif'; g.fillText(`${side[0]}${labels[k]}`, p[0] + 18, p[1] + 46); }
  }
  g.fillStyle = '#192f3d'; g.font = 'bold 25px sans-serif'; g.fillText(`ORIGINAL ${f.index}/12 | manual QA, NOT art | RED near / BLUE far`, 20, 32);
  await fs.writeFile(`${root}/source-${String(f.index).padStart(2, '0')}-chains.png`, c.toBuffer('image/png'));
  assert.equal(sha(await fs.readFile(pub + source)), sha(bytes), 'Original unchanged by annotations');
  const row = { index: f.index, nearUpper: dir(...f.near.arm.slice(0, 2)), farUpper: dir(...f.far.arm.slice(0, 2)), nearThigh: dir(...f.near.leg.slice(0, 2)), farThigh: dir(...f.far.leg.slice(0, 2)), notes: f.notes, state: 'failed-source-art; evidence only' };
  rows.push(row); sources.push({ index: f.index, source, sha256: sha(bytes), originalUnchanged: true });
}
let markdown = '# 原生12相位肢体归属与控制审计\n\n暂停新 imagegen，先以原始 PNG 观察对齐。下面是手工近似关节点，不是动捕，也不是最终生成素材。近侧永久粗前景腿/张手，远侧永久后景腿/握拳；肩肘髋膝遮挡者保留未知。每行仍为源美术 failed，方向对应图像向右前进。±70px 的 passing/uncertain 区域避免把手工中心误差当严格运动结论。\n\n';
markdown += '| 相位 | 腿时相观察 | 近上臂 S→E | 近大腿 H→K | 远上臂 S→E | 远大腿 H→K |\n|---|---|---|---|---|---|\n';
for (const row of rows) markdown += `| ${row.index}/12 | ${report.frames[row.index].stage} | ${row.nearUpper} | ${row.nearThigh} | ${row.farUpper} | ${row.farThigh} |\n`;
markdown += '\n各链原生1254坐标（?hidden 不补出虚假的根/肘/膝）：\n\n| 相位 | 近肩→肘→腕 | 远肩→肘→腕 | 近髋→膝→踝 | 远髋→膝→踝 |\n|---|---|---|---|---|\n';
for (const f of report.frames) markdown += `| ${f.index}/12 | ${chain(f.near.arm)} | ${chain(f.far.arm)} | ${chain(f.near.leg)} | ${chain(f.far.leg)} |\n`;
markdown += '\n8号原始链证据：`source-08-joint-overlay.png`。原12帧每张也有 `source-NN-chains.png`；这是 QA 标注，不修改公共原图、不导入动画资产。source-integrity.json 保存每原图 SHA，脚本重读前后核字节不变。\n\n主要结论：0/1/8..11 的远肩隐藏，无法凭前方拳头证明整个远上臂正确；2..7 后肩可见约535..555,400..440，稳定肩根不应随换摆跨到右喉/腰。8远大腿向后，而 v1 控制远上臂117.5°也向后，旧独立正弦控制被拒收，不能继续按其698795腕目标生图。肩根设计必须与原视角和完整骨段可达性对齐，现有身体画法与全远臂长度尚不能验证。源1远膝完全遮挡，保留未知，不凭脚在后就说大腿在后。\n\n';
for (const row of rows) markdown += `- ${row.index}/12：${row.notes}\n`;
markdown += '\n[Arellano & Kram 2014 原始跑步摆臂研究](https://journals.biologists.com/jeb/article/217/14/2456/12120/The-metabolic-cost-of-human-running-is-swinging) 支持摆臂平衡摆腿角动量原则；此拟人奶蛙没有按真实四足青蛙步态制作，数值不能称论文测量或客观生物认证。局部方向一致仍不等于完整循环、美术材质或接地通过。\n';
await fs.writeFile(`${root}/source-labels.md`, markdown);
await fs.writeFile(`${root}/source-integrity.json`, JSON.stringify({ sources, observations: rows, sourceArtStatus: 'failed', newImagegenPaused: true }, null, 2));
console.log(JSON.stringify({ actualSources: sources.length, hiddenFarRoots: report.frames.filter(f => !f.far.arm[0]).length, unchangedSources: sources.every(f => f.originalUnchanged), status: 'manual evidence; art failed; old sine control rejected' }));
