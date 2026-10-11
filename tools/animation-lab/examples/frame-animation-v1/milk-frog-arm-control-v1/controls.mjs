import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { createCanvas } = require('@napi-rs/canvas');
const dir = path.dirname(new URL(import.meta.url).pathname);
const rad = d => d * Math.PI / 180;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const endpoint = (a, length, angle) => [a[0] + length * Math.cos(rad(angle)), a[1] + length * Math.sin(rad(angle))];
const shoulder = { far: [650, 430], near: [625, 450] };
function makeArm(side, phase) {
  const c = Math.cos(2 * Math.PI * (phase + (side === 'near' ? .5 : 0)));
  const upperDegrees = 90 - 55 * c;
  const elbowFlexDegrees = 80 + 20 * c;
  const a = shoulder[side], b = endpoint(a, 225, upperDegrees), wrist = endpoint(b, 225, upperDegrees - elbowFlexDegrees);
  return { shoulder: [...a], elbow: b, wrist, upperDegrees, elbowFlexDegrees, hand: side === 'far' ? 'permanent curled fist' : 'permanent open palm' };
}
const frames = Array.from({ length: 12 }, (_, index) => ({ index, phase: index / 12, far: makeArm('far', index / 12), near: makeArm('near', index / 12) }));
export function inspect(sequence) {
  const errors = [], wristExcursion = {}, maxAdjacentWristStep = {};
  for (const side of ['far', 'near']) {
    let maxStep = 0;
    for (const f of sequence) {
      const a = f[side];
      if (distance(a.shoulder, shoulder[side]) > .01) errors.push(`${side}: shoulder anchor drift ${f.index}`);
      if (Math.abs(distance(a.shoulder, a.elbow) - 225) > .01 || Math.abs(distance(a.elbow, a.wrist) - 225) > .01) errors.push(`${side}: bone length ${f.index}`);
      const flex = Math.acos(Math.max(-1, Math.min(1, ((a.elbow[0] - a.shoulder[0]) * (a.wrist[0] - a.elbow[0]) + (a.elbow[1] - a.shoulder[1]) * (a.wrist[1] - a.elbow[1])) / (225 * 225)))) * 180 / Math.PI;
      if (flex < 59.99 || flex > 100.01) errors.push(`${side}: elbow flex ${f.index}`);
      const next = sequence[(f.index + 1) % sequence.length][side];
      const step = distance(a.wrist, next.wrist); maxStep = Math.max(maxStep, step);
      // Bound follows 55deg upper and 75deg absolute forearm cosine amplitudes sampled every 1/12 cycle.
      const analyticalStepBound = 450 * (Math.sin(rad(55 * Math.sin(Math.PI / 12))) + Math.sin(rad(75 * Math.sin(Math.PI / 12))));
      if (step > analyticalStepBound + .01) errors.push(`${side}: adjacent/loop wrist jump ${f.index}`);
      const expected = makeArm(side, f.phase);
      if (distance(a.elbow, expected.elbow) > .01 || distance(a.wrist, expected.wrist) > .01) errors.push(`${side}: differs from continuous cycle ${f.index}`);
    }
    const xs = sequence.map(f => f[side].wrist[0]), ys = sequence.map(f => f[side].wrist[1]);
    wristExcursion[side] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    maxAdjacentWristStep[side] = maxStep;
    if (wristExcursion[side][0] < 400 || wristExcursion[side][1] < 400) errors.push(`${side}: insufficient full cycle excursion`);
    if (new Set(sequence.map(f => f[side].elbow.map(v => v.toFixed(3)).join(','))).size < 7) errors.push(`${side}: missing elbow passing phases`);
  }
  for (const f of sequence) {
    const nearX = f.near.elbow[0] - f.near.shoulder[0], farX = f.far.elbow[0] - f.far.shoulder[0];
    if (Math.abs(nearX + farX) > .01) errors.push(`upper arms not half-cycle opposed ${f.index}`);
  }
  return { passed: !errors.length, errors, wristExcursion, maxAdjacentWristStep, limitation: 'Mathematical arm guide only, not generated image agreement, mocap, leg contact or art approval.' };
}
const clean = inspect(frames);
assert.equal(clean.passed, true, JSON.stringify(clean));
const injected = {};
for (const type of ['frozenFar', 'samePhase', 'driftingRoot', 'disconnectedWrist']) {
  const bad = structuredClone(frames);
  if (type === 'frozenFar') for (const f of bad) f.far = structuredClone(bad[0].far);
  if (type === 'samePhase') for (const f of bad) { const near = f.near; f.far = structuredClone(near); const shift = shoulder.far.map((v, i) => v - shoulder.near[i]); for (const joint of ['shoulder', 'elbow', 'wrist']) f.far[joint] = f.far[joint].map((v, i) => v + shift[i]); }
  if (type === 'driftingRoot') bad[8].far.shoulder[0] += 100;
  if (type === 'disconnectedWrist') bad[8].far.wrist[0] += 200;
  injected[type] = inspect(bad); assert.equal(injected[type].passed, false, type);
}
const hashes = [];
for (const f of frames) {
  const c = createCanvas(1254, 1254), g = c.getContext('2d');
  g.fillStyle = '#f0f2f4'; g.fillRect(0, 0, 1254, 1254);
  g.strokeStyle = '#d4d8dd'; g.lineWidth = 1;
  for (let x = 50; x < 1254; x += 100) { g.beginPath(); g.moveTo(x, 50); g.lineTo(x, 1204); g.stroke(); }
  for (let y = 50; y < 1254; y += 100) { g.beginPath(); g.moveTo(50, y); g.lineTo(1204, y); g.stroke(); }
  g.fillStyle = '#ccd1d7'; g.beginPath(); g.ellipse(785, 230, 130, 142, -.10, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(705, 600, 155, 225, -.20, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7c8791'; g.lineWidth = 5; g.setLineDash([15, 15]); g.beginPath(); g.moveTo(725, 380); g.lineTo(725, 970); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#7c8791'; g.beginPath(); g.arc(725, 760, 12, 0, Math.PI * 2); g.fill();
  for (const side of ['far', 'near']) {
    const a = f[side]; g.strokeStyle = g.fillStyle = side === 'far' ? '#087ded' : '#e6383b'; g.lineWidth = 28; g.lineCap = 'round';
    g.beginPath(); g.moveTo(...a.shoulder); g.lineTo(...a.elbow); g.lineTo(...a.wrist); g.stroke();
    for (const joint of ['shoulder', 'elbow', 'wrist']) { g.beginPath(); g.arc(...a[joint], 20, 0, Math.PI * 2); g.fill(); }
    g.font = 'bold 22px sans-serif'; g.fillText(`${side} elbow`, a.elbow[0] + 20, a.elbow[1] - 20); g.fillText(`${side} wrist`, a.wrist[0] + 20, a.wrist[1] - 20);
  }
  g.fillStyle = '#182937'; g.font = 'bold 28px sans-serif'; g.fillText(`ARM CONTROL ONLY | phase ${f.index}/12`, 60, 55);
  g.font = '24px sans-serif'; g.fillText('BLUE = permanent far fist arm; RED = permanent near open-hand arm', 60, 1120);
  g.fillText('Fixed shoulders, 225px upper + 225px forearm. NOT final character art.', 60, 1160);
  g.fillText('Legs / face / body in the source frame remain unchanged.', 60, 1200);
  const file = `control-${String(f.index).padStart(2, '0')}.png`, bytes = c.toBuffer('image/png'); await fs.writeFile(path.join(dir, file), bytes); hashes.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const report = { purpose: 'Code-native mathematical arm constraints, NOT final generated art or motion capture.', sourceGaitCoupling: { status: 'failed', rejectForNewGeneration: true, reason: 'Independent sine was not coupled to source12 leg phases. Source8 far thigh back and this far upperarm back conflict. Fixed650430 socket is proposed, not measured. See source-labels.json/md before any revision.' }, canvas: [1254, 1254], fps: 8, cycleSeconds: 1.5, hipAxisX: 725, sourcePngTransformed: false, permanentIdentities: { far: 'blue / curled fist / rear layer', near: 'red / open palm / foreground' }, frameSourceArtStatus: 'not-applicable', references: [{ url: 'https://journals.biologists.com/jeb/article/217/14/2456/12120/The-metabolic-cost-of-human-running-is-swinging', use: 'Arm swing counterbalances swinging-leg angular momentum. Guide angles are our stylized anthropomorphic adaptation, not measurements from the paper.' }], frames, checks: clean, faultInjection: injected, controls: hashes };
await fs.writeFile(path.join(dir, 'controls.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checks: clean, rejectedFaults: Object.keys(injected), files: hashes.length }));
