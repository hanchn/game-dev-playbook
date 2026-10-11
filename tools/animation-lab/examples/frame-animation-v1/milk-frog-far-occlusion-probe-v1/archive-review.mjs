import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { sourceAlphaBounds } from '../../../frame-animation-core.mjs';
const require = createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'), sharp = require('sharp'), { createCanvas, ImageData } = require('@napi-rs/canvas');
const root = path.dirname(new URL(import.meta.url).pathname), pub = path.resolve(root, '../../../public'), input = JSON.parse(await fs.readFile(root + '/generation-input.json')), old = JSON.parse(await fs.readFile(root + '/../milk-frog-run-sequence-v7/source-manifest.json')).sample, hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const generated = await fs.readFile(input.path), { data, info } = await sharp(generated).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), bounds = sourceAlphaBounds(data, info.width, info.height, { stride: 4, alphaOffset: 3 });
const receipt = { tool: input.tool, prompt: input.prompt, generatedFile: input.path, generatedFileSha256: hash(generated), referenceFiles: await Promise.all(input.refs.map(async file => ({ file, sha256: hash(await fs.readFile(file)) }))), sourceSize: [info.width, info.height], phase: 8 / 12, pixelBounds: bounds, qa: { visual: 'failed', notes: ['One local phase8 occlusion probe; old outer-right oversized far fist removed.', 'Near open hand and overall face/leg poses visually retained, exact pixels still change; unreviewed source-scale hidden shoulder chain cannot be measured.', 'Not a complete loop: source9 etc retain overscale far arm and material/ground registration failed.'] } };
for (const name of [root + '/frame-08-occluded-v1.png', pub + '/frame-animation-assets/milk-frog-far-occluded-phase08-v1.png']) {
  try { await fs.writeFile(name, generated, { flag: 'wx' }); } catch (e) { if (e.code !== 'EEXIST' || hash(await fs.readFile(name)) !== hash(generated)) throw e; }
}
for (const name of [root + '/receipt.json', pub + '/frame-animation-assets/milk-frog-far-occluded-phase08-v1-receipt.json']) {
  try { await fs.writeFile(name, JSON.stringify(receipt, null, 2), { flag: 'wx' }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
}
const rawOriginal = await sharp(pub + old.frames[8].source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const regions = [['head-face', 610, 60, 480, 370], ['near-open-hand', 550, 550, 210, 190], ['near-upper-arm', 460, 330, 290, 230], ['lower-both-legs', 400, 760, 750, 470]];
const preserved = regions.map(([name, x, y, w, h]) => {
  let rgbSum = 0, rgbChannels = 0, changedRgbPixels = 0, bothOpaque = 0, alphaIntersection = 0, alphaUnion = 0, alphaXor = 0;
  const aBound = [Infinity, Infinity, -Infinity, -Infinity], bBound = [...aBound];
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * info.width + xx) * 4, a = rawOriginal.data, b = data, ap = a[i + 3] >= 24, bp = b[i + 3] >= 24;
    if (ap) { aBound[0] = Math.min(aBound[0], xx); aBound[1] = Math.min(aBound[1], yy); aBound[2] = Math.max(aBound[2], xx); aBound[3] = Math.max(aBound[3], yy); }
    if (bp) { bBound[0] = Math.min(bBound[0], xx); bBound[1] = Math.min(bBound[1], yy); bBound[2] = Math.max(bBound[2], xx); bBound[3] = Math.max(bBound[3], yy); }
    if (ap || bp) alphaUnion++; if (ap && bp) { alphaIntersection++; bothOpaque++; let changed = false; for (let k = 0; k < 3; k++) { const d = Math.abs(a[i + k] - b[i + k]); rgbSum += d; rgbChannels++; changed ||= d > 2; } if (changed) changedRgbPixels++; }
    if (ap !== bp) alphaXor++;
  }
  return { region: name, rect: [x, y, w, h], originalAlphaBounds: aBound, candidateAlphaBounds: bBound, alphaIoU: alphaIntersection / alphaUnion, alphaXorPixels: alphaXor, opaqueRGBMAE: rgbSum / rgbChannels, changedRGBPixelsOver2: changedRgbPixels, bothOpaquePixels: bothOpaque, strictPixelPreservation: changedRgbPixels === 0 && alphaXor === 0, limitation: 'ROI contains whole source pixels; approximate silhouette/pose registration evidence only, not identity or anatomical proof.' };
});
const compare = [{ label: 'SOURCE7 unchanged', file: pub + old.frames[7].source }, { label: 'SOURCE8 BEFORE', file: pub + old.frames[8].source }, { label: 'SOURCE8 ONE NEW PROBE', file: root + '/frame-08-occluded-v1.png' }, { label: 'SOURCE9 unchanged / still overscale', file: pub + old.frames[9].source }];
for (const [name, color] of [['light', '#e5e9e7'], ['dark', '#192f39']]) {
  const c = createCanvas(2510, 2620), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < compare.length; i++) { const { data, info } = await sharp(compare[i].file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), t = createCanvas(info.width, info.height); t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), info.width, info.height), 0, 0); g.drawImage(t, i % 2 * 1255, Math.floor(i / 2) * 1310 + 50); g.fillStyle = name === 'light' ? '#192f39' : '#eee'; g.font = '25px sans-serif'; g.fillText(compare[i].label, i % 2 * 1255 + 15, Math.floor(i / 2) * 1310 + 30); }
  await fs.writeFile(root + `/compare-${name}.png`, c.toBuffer('image/png'));
}
const qa = { sourceArtStatus: 'failed', localFarOversizeRemoval: 'observed-local-improvement', hiddenFarChain: 'not-measurable; allowed occlusion is not missing-limb failure by itself', nativeCanvas: [info.width, info.height], nativeBounds: bounds, soleY: bounds.bounds[1] + bounds.bounds[3] - 1, preservedRegions: preserved, samePixelsGuaranteed: false, source7And9: 'Unchanged source7/9 intentionally used for real continuity context. Source9 wrist far outside source-calibrated reach; 8occluded->9overscale still abrupt. Do not upgrade whole loop.', artifacts: compare, sourceMutation: 'none; original bytes copied; no per-frame fit or source bitmap manipulation', original8Sha256: hash(await fs.readFile(pub + old.frames[8].source)), new8Sha256: hash(generated), pending: 'Manual full native and actual UI 7->8->9 review; root assessment' };
await fs.writeFile(root + '/source-qa.json', JSON.stringify(qa, null, 2));
const file = pub + '/frame-animation-samples.json', samples = JSON.parse(await fs.readFile(file)), probe = { source: '/frame-animation-assets/milk-frog-far-occluded-phase08-v1.png', receipt: '/frame-animation-assets/milk-frog-far-occluded-phase08-v1-receipt.json', phase: 8 / 12, durationMs: 125 };
for (const sample of [{ id: 'milk-frog-far-occlusion-phase08-v1', label: '奶蛙 · 第8帧远臂遮挡探针（单帧美术未通过）', fps: 8, loop: false, visualQA: 'failed', qaNotes: receipt.qa.notes, frames: [probe] }, { id: 'milk-frog-far-occlusion-context-v1', label: '奶蛙 · 7→8探针→9连续对照（3帧，完整loop未通过）', fps: 8, loop: false, visualQA: 'failed', qaNotes: ['Three real original PNGs: source7, new8probe, source9; not a new completed12frame loop.', 'Far fist naturally hidden in8, source9 remains overscale/abrupt; source failed art and registration retained.'], frames: [old.frames[7], probe, old.frames[9]] }]) if (!samples.samples.some(s => s.id === sample.id)) samples.samples.push(sample);
await fs.writeFile(file, JSON.stringify(samples, null, 2) + '\n');
console.log(JSON.stringify({ bounds, preserved }));
