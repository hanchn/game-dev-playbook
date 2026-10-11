#!/usr/bin/env node
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { samplingPlan, chronologicalFiles, gridCells, frameManifest, receiptFrameReview, sourceAlphaBounds, generationRequest, storedZip, skeletalRenderedFrameProvenance } from '../frame-animation-core.mjs';
const exec = promisify(execFile), sha = value => crypto.createHash('sha256').update(value).digest('hex');
async function hashFile(file){const hash=crypto.createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
const command = async (program, args) => exec(program, args, { timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
export async function probeMedia(input, frames = false) {
  const args = ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_format'];
  if (frames) args.push('-show_frames', '-show_entries', 'frame=best_effort_timestamp_time:stream=width,height,codec_name,duration:format=duration');
  args.push('-of', 'json', input);
  const { stdout } = await command('ffprobe', args), info = JSON.parse(stdout);
  if (!info.streams?.length) throw new Error('文件没有视频/图像流');
  return info;
}
export function selectDecodedFrames(plan, timestamps) {
  if (!timestamps.length || timestamps.some((t, i) => !Number.isFinite(t) || i && t < timestamps[i - 1])) throw new Error('源视频时间戳缺失或乱序');
  const origin = timestamps[0], normalized = timestamps.map(t => t - origin);
  return plan.map(sample => {
    let low = 0, high = normalized.length;
    while (low < high) { const mid = Math.floor((low + high) / 2); if (normalized[mid] <= sample.sourceTime + 1e-8) low = mid + 1; else high = mid; }
    const sourceIndex = Math.max(0, low - 1);
    return { ...sample, sourceIndex, decodedTime: normalized[sourceIndex], sourcePTS: timestamps[sourceIndex] };
  });
}
async function newOutput(output) {
  output = path.resolve(output); await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.mkdir(output); await fs.mkdir(path.join(output, 'frames')); return output;
}
async function finish(frames, output, options, provenance) {
  const manifest = frameManifest(frames, { ...options, provenance });
  // Keep each source bitmap intact. The manifest describes the same letterboxing as FFmpeg.
  const cells=manifest.frames,maxW=manifest.sheet.cell;
  for(const f of cells){const alphaPath=path.join(output,`.alpha-${f.index}.raw`);await command('ffmpeg',['-v','error','-nostdin','-i',path.join(output,'frames',`${String(f.index+1).padStart(3,'0')}.png`),'-vf','format=rgba,alphaextract','-frames:v','1','-pix_fmt','gray','-f','rawvideo',alphaPath]);f.pixelBounds=sourceAlphaBounds(await fs.readFile(alphaPath),...f.sourceSize);await fs.unlink(alphaPath);}
  if(cells.some(f=>f.pixelBounds.hasTransparency&&f.pixelBounds.touchesEdge))manifest.visualQA='failed';
  // Packing uses normalized intermediate cells, allowing unequal imported PNG dimensions.
  const cellDir = path.join(output, '.cells'); await fs.mkdir(cellDir);
  for (const f of cells) {
    const [x,y,w,h]=f.contentRect,localX=x-f.rect[0],localY=y-f.rect[1],[ew,eh]=manifest.sheet.fixedTransform.sourceCanvasSize;
    await command('ffmpeg', ['-v', 'error', '-nostdin', '-i', path.join(output, 'frames', `${String(f.index + 1).padStart(3, '0')}.png`), '-vf', `format=rgba,pad=${ew}:${eh}:0:0:color=0x00000000,scale=${w}:${h}:flags=lanczos,pad=${maxW}:${maxW}:${localX}:${localY}:color=0x00000000,setsar=1`, '-frames:v', '1', path.join(cellDir, `${String(f.index + 1).padStart(3, '0')}.png`)]);
  }
  await command('ffmpeg', ['-v', 'error', '-nostdin', '-framerate', '1', '-start_number', '1', '-i', path.join(cellDir, '%03d.png'), '-vf', `tile=${manifest.sheet.columns}x${manifest.sheet.rows}:nb_frames=${frames.length}:color=0x00000000`, '-frames:v', '1', path.join(output, 'sheet.png')]);
  manifest.sheet.sha256 = sha(await fs.readFile(path.join(output, 'sheet.png')));
  manifest.createdAt = new Date().toISOString();
  manifest.frames.forEach((f, i) => { f.file = `frames/${String(i + 1).padStart(3, '0')}.png`; f.pngSha256 = frames[i].pngSha256; f.sourceIndex = frames[i].sourceIndex ?? null; f.sourcePTS = frames[i].sourcePTS ?? null; });
  await fs.writeFile(path.join(output, 'animation.json'), JSON.stringify(manifest, null, 2));
  if(options.zip){const files=[{name:'sheet.png',data:await fs.readFile(path.join(output,'sheet.png'))},{name:'animation.json',data:await fs.readFile(path.join(output,'animation.json'))}];for(const f of manifest.frames)files.push({name:f.file,data:await fs.readFile(path.join(output,f.file))});await fs.writeFile(path.join(output,'animation.zip'),storedZip(files),{flag:'wx'});}
  await fs.rm(cellDir, { recursive: true });
  return manifest;
}
export async function extractVideo(options) {
  if (!options.input || !options.output) throw new Error('extract 需要 --input 视频和 --output 新目录');
  const input = path.resolve(options.input), basic = await probeMedia(input), duration = [Number(basic.streams[0].duration),Number(basic.format?.duration)].find(n=>Number.isFinite(n)&&n>0);
  if (!Number.isFinite(duration) || duration > 600) throw new Error('CLI 抽帧一次支持最多 600 秒；请先裁切长视频');
  const plan = samplingPlan({ duration, start: options.start ?? 0, end: options.end ?? duration, fps: options.fps ?? 8, times: options.times });
  const decoded = await probeMedia(input, true), selected = selectDecodedFrames(plan, (decoded.frames || []).map(f => Number(f.best_effort_timestamp_time)));
  const unique = [...new Set(selected.map(f => f.sourceIndex))], sourceSha256 = await hashFile(input);
  let videoReceipt;
  if(options['video-receipt']){
    videoReceipt=JSON.parse(await fs.readFile(options['video-receipt'],'utf8'));
    if(videoReceipt.generatedFileSha256!==sourceSha256||!videoReceipt.tool||!videoReceipt.prompt)throw new Error('视频来源记录与真实视频 SHA-256/工具/提示不匹配');
  }
  const output = await newOutput(options.output);
  try {
    const expression = unique.map(n => `eq(n\\,${n})`).join('+');
    await command('ffmpeg', ['-v', 'error', '-nostdin', '-i', input, '-map', '0:v:0', '-an', '-vf', `select=${expression}`, '-fps_mode', 'passthrough', '-frames:v', String(unique.length), '-start_number', '1', path.join(output, 'frames', 'decoded-%03d.png')]);
    const frames = [];
    for (let i = 0; i < selected.length; i++) {
      const sample = selected[i], n = unique.indexOf(sample.sourceIndex) + 1, source = path.join(output, 'frames', `decoded-${String(n).padStart(3, '0')}.png`), bytes = await fs.readFile(source), target = path.join(output, 'frames', `${String(i + 1).padStart(3, '0')}.png`);
      await fs.writeFile(target, bytes); const info = (await probeMedia(target)).streams[0];
      frames.push({ ...sample, width: info.width, height: info.height, name: path.basename(target), sourceSha256, pngSha256: sha(bytes) });
      if(videoReceipt){const f=frames.at(-1);f.sourceProvenance={type:'generated-video',tool:videoReceipt.tool,prompt:videoReceipt.prompt,receipt:videoReceipt,sha256:sourceSha256};f.review={state:videoReceipt.qa?.visual||videoReceipt.visualQA||'not-reviewed',notes:videoReceipt.qa?.notes||'',origin:'SHA-bound actual source video receipt'};}
    }
    await Promise.all(unique.map((_, i) => fs.unlink(path.join(output, 'frames', `decoded-${String(i + 1).padStart(3, '0')}.png`))));
    const version = (await command('ffmpeg', ['-version'])).stdout.split('\n')[0];
    const provenance={ type: 'video', file: path.basename(input), sha256: frames[0].sourceSha256, decoder: version, timestampAccuracy: 'ffprobe original decoded PTS, normalized to first frame; sample selects containing frame', sourceDuration: duration, requestedSampling: { start: options.start ?? 0, end: options.end ?? duration, fps: options.fps ?? 8, times: options.times ?? null }, uniqueDecodedFrames: unique.length, duplicateSamples: selected.length - unique.length, verification: 'actual source bytes and decoded video frames; video background retained' };
    if(videoReceipt){provenance.generatedVideo={tool:videoReceipt.tool,prompt:videoReceipt.prompt,receipt:videoReceipt};provenance.sourceQA=videoReceipt.qa?.visual||videoReceipt.visualQA||'not-reviewed';}
    return await finish(frames, output, options, provenance);
  } catch (error) { await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ status: 'failed', error: error.message }, null, 2)); throw error; }
}
export async function packImages(options) {
  if (!options.input || !options.output) throw new Error('pack 需要 --input PNG 目录和 --output 新目录');
  let files = chronologicalFiles((await fs.readdir(options.input)).filter(n => /\.png$/i.test(n)).map(name => ({ name })));
  if (!files.length || files.length > 128) throw new Error('PNG 目录需要 1–128 张图片');
  const fps = Number(options.fps ?? 8); if (!Number.isFinite(fps) || fps < 1 || fps > 60) throw new Error('FPS 必须在 1–60');
  let receipt;const skeletalSources=[],sourceCache=new Map();
  if(options['sequence-receipt']){
    receipt=JSON.parse(await fs.readFile(options['sequence-receipt'],'utf8'));
    if(receipt.frames?.length!==files.length)throw new Error('逐张生图来源记录数量不匹配');
    const names=receipt.frames.map(r=>r.file);
    if(new Set(names).size!==names.length||names.some(n=>!files.some(f=>f.name===n)))throw new Error('逐张生图来源记录文件缺失或重复');
    // Receipt order is the explicit animation chronology. Version numbers in file
    // names must never put a repaired frame before the wrong phase.
    files=names.map(name=>({name}));
    for(const [i,f]of files.entries()){
      const r=receipt.frames[i];
      const actualSha=await hashFile(path.join(options.input,f.name));
      if(receipt.origin==='skeletal-render'){
        const read=async(_url,record)=>{const file=path.resolve(path.dirname(options['sequence-receipt']),record.file);if(!sourceCache.has(file))sourceCache.set(file,fs.readFile(file));return sourceCache.get(file);};
        const p=await skeletalRenderedFrameProvenance(r,actualSha,read,sha),info=(await probeMedia(path.join(options.input,f.name))).streams[0];
        if(r.frameIndex!==i||p.fixedCanvasSize[0]!==info.width||p.fixedCanvasSize[1]!==info.height)throw new Error('骨骼序列索引或实际 PNG 画布不匹配');
        skeletalSources.push(p);
      }else if(r.generatedFileSha256!==actualSha||!r.tool||!r.prompt)throw new Error('逐张生图来源记录与真实 PNG 名称/SHA/工具/提示不匹配');
    }
  }
  const output = await newOutput(options.output), frames = [];
  for (const [i, file] of files.entries()) { const source = path.join(options.input, file.name), bytes = await fs.readFile(source), info = (await probeMedia(source)).streams[0]; await fs.writeFile(path.join(output, 'frames', `${String(i + 1).padStart(3, '0')}.png`), bytes); frames.push({ width: info.width, height: info.height, name: file.name, durationMs: 1000 / fps, sourceSha256: sha(bytes), pngSha256: sha(bytes) }); }
  let provenance={type:'imported-images',order:'numeric filename sort',verification:'actual imported PNG bytes; imagegen origin unverified'};
  if(receipt){
    for(const [i,f]of frames.entries()){const r=receipt.frames[i];f.phase=r.phase;f.review={state:r.qa?.visual||'not-reviewed',notes:r.qa?.notes||'',origin:'SHA-bound separate frame receipt; supplied by importer'};f.sourceProvenance=skeletalSources[i]||{type:'imagegen',receipt:r,tool:r.tool,prompt:r.prompt,sha256:f.sourceSha256};}
    provenance=receipt.origin==='skeletal-render'?{type:'skeletal-render-sequence',tool:'renderCanvas',receipt,sourceQA:receipt.visualQA||'not-reviewed',verification:'actual PNG and four actual source snapshot byte SHA verified; skeletal origin declared by producer, not imagegen or rerender equivalence proof'}:{type:'imagegen-sequence',tool:'image_gen.imagegen',receipt,sourceQA:receipt.visualQA||'not-reviewed',verification:'receipt-specified chronological order and separate actual PNG SHA; sheet packing is deterministic, not an imagegen atlas call'};
  }
  return finish(frames,output,options,provenance);
}
export async function splitSheet(options) {
  if (!options.input || !options.output) throw new Error('split 需要 --input 图集和 --output 新目录');
  const columns = Number(options.columns ?? 4), rows = Number(options.rows ?? 2), count = Number(options.count ?? columns * rows), fps = Number(options.fps ?? 8);
  if (![columns, rows, count].every(Number.isInteger) || columns < 1 || columns > 16 || rows < 1 || rows > 32 || count < 1 || count > 128 || count > columns * rows || !Number.isFinite(fps) || fps < 1 || fps > 60) throw new Error('图集网格、帧数或 FPS 无效');
  const bytes = await fs.readFile(options.input), sourceSha256 = sha(bytes), info = (await probeMedia(options.input)).streams[0];
  const cells = gridCells(info.width, info.height, columns, rows, count);
  let provenance = { type: 'imported-images', file: path.basename(options.input), sha256: sourceSha256, grid: { columns, rows, count }, verification: 'actual imported sheet; generation origin unverified' };
  if (options.receipt) { const receipt = JSON.parse(await fs.readFile(options.receipt, 'utf8')); if (receipt.generatedFileSha256 !== sourceSha256 || !receipt.prompt || !receipt.tool) throw new Error('生图来源记录的 SHA-256、提示或工具不匹配'); provenance = { ...provenance, type: 'imagegen', tool: receipt.tool, prompt: receipt.prompt, receipt, sourceQA:receipt.visualQA||receipt.qa?.visual||'not-reviewed', verification: 'generation receipt matches actual output SHA-256; receipt claim supplied by caller' }; }
  const output = await newOutput(options.output), frames = [];
  for (const [i,sourceRect] of cells.entries()) { const [x,y,width,height] = sourceRect, filename = path.join(output,'frames',`${String(i+1).padStart(3,'0')}.png`); await command('ffmpeg',['-v','error','-nostdin','-i',options.input,'-vf',`format=rgba,crop=${width}:${height}:${x}:${y}`,'-frames:v','1',filename]); frames.push({width,height,sourceRect,name:`${path.basename(options.input)}#${i+1}`,durationMs:1000/fps,phase:provenance.receipt?.qa?.frames?.[i]?.phase,review:receiptFrameReview(provenance.receipt,i),sourceSha256,pngSha256:sha(await fs.readFile(filename))}); }
  return finish(frames, output, { ...options, columns }, provenance);
}
async function main() {
  const [action, ...args] = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) { if (!args[i].startsWith('--')) throw new Error(`未知参数 ${args[i]}`); const key = args[i].slice(2); if (key === 'loop' || key === 'zip') options[key] = true; else { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${args[i]} 缺少值`); options[key] = args[++i]; } }
  if (action === 'request') { const request = generationRequest(options); if (!options.output) throw new Error('request 需要 --output JSON 路径'); await fs.writeFile(options.output, JSON.stringify(request, null, 2), { flag: 'wx' }); console.log(JSON.stringify(request)); }
  else { const manifest = action === 'extract' ? await extractVideo(options) : action === 'pack' ? await packImages(options) : action === 'split' ? await splitSheet(options) : null; if (!manifest) throw new Error('用法: frame-animation-cli.mjs extract|pack|split|request --input ... --output ...'); console.log(JSON.stringify({ output: path.resolve(options.output), frames: manifest.frames.length, durationMs: manifest.durationMs, provenance: manifest.provenance, visualQA: manifest.visualQA })); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
