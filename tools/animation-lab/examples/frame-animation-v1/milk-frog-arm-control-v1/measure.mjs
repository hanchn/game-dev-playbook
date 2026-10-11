import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'), sharp = require('sharp');
const root = path.dirname(new URL(import.meta.url).pathname), report = [];
for (const version of [5, 6, 7, 8]) {
  const { data, info } = await sharp(`${root}/frame-08-v${version}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height), groups = [];
  const pink = n => {
    const x = n % info.width, y = Math.floor(n / info.width), i = n * 4;
    return x >= 350 && x < 1150 && y >= 450 && y < 850 && data[i + 3] >= 24 && data[i] > 150 && data[i] - data[i + 1] > 30 && data[i + 2] > 120 && data[i + 2] > data[i + 1] * .9;
  };
  for (let y = 450; y < 850; y++) for (let x = 350; x < 1150; x++) {
    const n = y * info.width + x;
    if (seen[n] || !pink(n)) continue;
    const q = [n]; seen[n] = 1;
    let minX = x, maxX = x, minY = y, maxY = y, sumX = 0, sumY = 0;
    for (let k = 0; k < q.length; k++) {
      const a = q[k], xx = a % info.width, yy = Math.floor(a / info.width);
      minX = Math.min(minX, xx); maxX = Math.max(maxX, xx); minY = Math.min(minY, yy); maxY = Math.max(maxY, yy); sumX += xx; sumY += yy;
      for (const b of [a - 1, a + 1, a - info.width, a + info.width]) if (!seen[b] && pink(b)) { seen[b] = 1; q.push(b); }
    }
    if (q.length > 1000) groups.push({ pixels: q.length, bounds: [minX, minY, maxX, maxY], centroid: [sumX / q.length, sumY / q.length] });
  }
  report.push({ version, components: groups, limitation: 'Color-connected regions support manual observations; not semantic hand detection or proof of arm anatomy.' });
}
await fs.writeFile(`${root}/native-pink-components.json`, JSON.stringify({ roi: [350, 450, 800, 400], threshold: 'RGBA alpha>=24, r>150,r-g>30,b>120,b>g*.9,4-neighbor,1000px minimum. Initial g<165 found no region >1000px and was invalid for this source palette; not used for pass/fail.', report }, null, 2));
console.log(JSON.stringify(report, null, 2));
