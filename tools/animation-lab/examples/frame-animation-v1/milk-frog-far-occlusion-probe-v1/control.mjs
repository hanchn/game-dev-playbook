import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'), { createCanvas } = require('@napi-rs/canvas');
const root = path.dirname(new URL(import.meta.url).pathname), r = JSON.parse(await fs.readFile(`${root}/../milk-frog-far-reach-v1/report.json`)), p = r.proposedCycle.frames[8];
const c = createCanvas(1254, 1254), g = c.getContext('2d'); g.fillStyle = '#f1f3f4'; g.fillRect(0, 0, c.width, c.height);
g.strokeStyle = '#b5bdc4'; g.lineWidth = 4; g.beginPath(); g.ellipse(785, 230, 130, 142, -.1, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(705, 600, 155, 225, -.2, 0, Math.PI * 2); g.stroke();
g.strokeStyle = '#005cc8'; g.lineCap = g.lineJoin = 'round'; g.lineWidth = 45; g.beginPath(); g.moveTo(...p.shoulder); g.lineTo(...p.elbow); g.lineTo(...p.wrist); g.stroke();
for (const [label, point] of [['S', p.shoulder], ['E', p.elbow], ['W', p.wrist]]) { g.fillStyle = '#03386c'; g.beginPath(); g.arc(...point, 11, 0, Math.PI * 2); g.fill(); g.font = 'bold 24px sans-serif'; g.fillText(`${label} (${point.map(v => v.toFixed(1)).join(',')})`, point[0] + 30, point[1] - 14); }
g.fillStyle = '#eba1b6'; g.beginPath(); g.arc(p.wrist[0] + 22, p.wrist[1], 25, 0, Math.PI * 2); g.fill();
g.fillStyle = '#192f3d'; g.font = 'bold 30px sans-serif'; g.fillText('FAR ARM ONLY: proposed phase8 source-size chain', 50, 70);
g.font = '26px sans-serif'; const text = ['This chain goes BEHIND the unchanged SOURCE near arm/body.', 'The whole pink far fist MAY BE HIDDEN. Do not push it outside.', 'Upper127.6px / fore78.5px; source-relative socket(-120,-2.5).', 'Near OPEN palm/entire arm must remain unchanged from source.', 'Do not draw blue/gray guide or text in final sprite.'];
text.forEach((s, i) => g.fillText(s, 50, 980 + i * 50));
const bytes = c.toBuffer('image/png'); await fs.writeFile(`${root}/control-far-phase08.png`, bytes);
await fs.writeFile(`${root}/control.json`, JSON.stringify({ kind: 'code-native-inferred-far-arm-guide', source: '../milk-frog-far-reach-v1/report.json', canvas: [1254, 1254], phase8: p, sha256: createHash('sha256').update(bytes).digest('hex'), status: 'root-authorized-single-frame-probe; not anatomical truth or full motion approval', sourcePixelsTransformed: false, nearDiagramIncluded: false }, null, 2));
