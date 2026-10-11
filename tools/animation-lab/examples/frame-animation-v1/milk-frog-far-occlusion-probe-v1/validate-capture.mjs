import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'), sharp = require('sharp'), { createCanvas, ImageData } = require('@napi-rs/canvas');
const root = path.dirname(new URL(import.meta.url).pathname), pub = path.resolve(root, '../../../public'), old = JSON.parse(await fs.readFile(root + '/../milk-frog-run-sequence-v7/source-manifest.json')).sample;
const sourceFiles = [pub + old.frames[7].source, root + '/frame-08-occluded-v1.png', pub + old.frames[9].source], hash = b => crypto.createHash('sha256').update(b).digest('hex'), expected = await Promise.all(sourceFiles.map(async p => hash(await fs.readFile(p))));
const rgb = async file => sharp(await fs.readFile(file)).removeAlpha().raw().toBuffer(), mae = (a, b) => { assert.equal(a.length, b.length); let sum = 0; for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]); return sum / a.length; };
const reports = [];
for (const speed of ['normal', 'slow']) {
  const dir = root + `/browser-${speed}-capture`, movie = dir + '/recording.webm', manifest = JSON.parse(await fs.readFile(dir + '/animation.json'));
  const probeResult = spawnSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_frames', '-show_format', movie], { encoding: 'utf8' }); assert.equal(probeResult.status, 0, probeResult.stderr);
  const probe = JSON.parse(probeResult.stdout); await fs.writeFile(dir + '/ffprobe.json', JSON.stringify(probe, null, 2));
  const decoded = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', movie, '-fps_mode', 'passthrough', dir + '/video-%03d.png'], { encoding: 'utf8' }); assert.equal(decoded.status, 0, decoded.stderr);
  assert.equal(hash(await fs.readFile(movie)), manifest.provenance.videoSha256);
  assert.equal(manifest.frames.length, speed === 'normal' ? 3 : 12);
  const comparison = [];
  for (const frame of manifest.frames) {
    const sourceIndex = speed === 'normal' ? frame.index : Math.floor(frame.index / 4), png = await fs.readFile(dir + '/' + frame.file);
    assert.equal(sourceIndex, frame.sourceFrameIndex); assert.equal(frame.sourceSha256, expected[sourceIndex]); assert.equal(hash(png), frame.pngSha256);
    const difference = mae(await rgb(dir + '/' + frame.file), await rgb(dir + '/video-' + String(frame.index + 1).padStart(3, '0') + '.png'));
    comparison.push({ index: frame.index, originalFramePhase: [7 / 12, 8 / 12, 9 / 12][sourceIndex], sourceIndex, ptsSeconds: Number(probe.frames[frame.index].best_effort_timestamp_time), rgbMAE255: difference });
  }
  const unique = new Set(manifest.frames.map(f => f.pngSha256)).size, max = Math.max(...comparison.map(f => f.rgbMAE255)); assert.equal(unique, 3); assert(max < 3); assert.equal(probe.frames.length, manifest.frames.length + 1);
  const c = createCanvas(1536, 544), g = c.getContext('2d'); g.fillStyle = '#192f39'; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 3; i++) { const index = speed === 'normal' ? i + 1 : i * 4 + 1, file = dir + '/video-' + String(index).padStart(3, '0') + '.png', { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), t = createCanvas(info.width, info.height); t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), info.width, info.height), 0, 0); g.drawImage(t, i * 512, 32); g.fillStyle = '#eee'; g.font = '22px sans-serif'; g.fillText(`actual ${speed} movie: source${[7, 8, 9][i]}`, i * 512 + 12, 25); }
  await fs.writeFile(root + `/movie-${speed}-contact.png`, c.toBuffer('image/png'));
  reports.push({ speed, technicalStatus: 'passed', sourceArtStatus: 'failed', sourceGeneratedProbeCount: 1, distinctOriginals: 3, originalPhases: [7 / 12, 8 / 12, 9 / 12], capturedPNGs: manifest.frames.length, uniqueCapturedPNG: unique, encodedFrames: probe.frames.length, seconds: Number(probe.format.duration), expectedSeconds: speed === 'normal' ? .375 : 1.5, maxRGBMAE255: max, comparison, policy: 'Three real source PNGs. Slow capture holds each for4samples, not12newposes. One encoded terminal hold excluded from PNG timeline. Partial context NOT complete loop.' });
}
await fs.writeFile(root + '/technical-qa.json', JSON.stringify({ technicalStatus: 'passed', sourceArtStatus: 'failed', origin: 'real browser Canvas MediaRecorder -> actual FFprobe/FFmpeg native PTS decode -> every captured PNG comparison', sourceFiles, sourceHashes: expected, reports }, null, 2));
console.log(JSON.stringify(reports.map(({ speed, capturedPNGs, encodedFrames, seconds, maxRGBMAE255 }) => ({ speed, capturedPNGs, encodedFrames, seconds, maxRGBMAE255 }))));
