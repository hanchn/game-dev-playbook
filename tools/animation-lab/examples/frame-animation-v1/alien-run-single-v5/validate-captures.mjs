import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const sharp=require('sharp');
const root=path.dirname(new URL(import.meta.url).pathname);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function rgb(p){return sharp(await fs.readFile(p)).removeAlpha().raw().toBuffer();}
function mae(a,b){if(a.length!==b.length)throw Error('pixel dimensions differ');let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/a.length;}
const p=path.join(root,'browser-v9-capture'), m=JSON.parse(await fs.readFile(path.join(p,'animation.json'))), probe=JSON.parse(await fs.readFile(path.join(p,'ffprobe.json')));
const movie=await fs.readFile(path.join(p,'recording.webm')), v=await Promise.all(probe.frames.map((f,i)=>rgb(path.join(p,`video-${String(i+1).padStart(3,'0')}.png`))));
const checks=[];for(let i=0;i<m.frames.length;i++){let f=m.frames[i],b=await fs.readFile(path.join(p,f.file));if(sha(b)!==f.pngSha256)throw Error('PNG hash mismatch');let a=await rgb(path.join(p,f.file));checks.push({index:i,sourceFrameIndex:f.sourceFrameIndex,requestedTimeSeconds:f.sourceTime,pts:Number(probe.frames[i].best_effort_timestamp_time),rgbMAE255:mae(a,v[i])});}
if(sha(movie)!==m.provenance.videoSha256)throw Error('movie hash mismatch');
const report={technicalStatus:checks.length===12&&probe.frames.length===13&&checks.every((f,i)=>f.sourceFrameIndex===i&&f.rgbMAE255<3)?'passed':'failed',sourceArtStatus:m.visualQA,sourceSequence:'all-frames-reviewed-v9.json',sourceFrameCount:m.provenance.recordedFrom.frames.length,capturedPNGs:m.frames.length,videoDurationSeconds:Number(probe.format.duration),requestedDurationSeconds:m.provenance.requestedDurationSeconds,decodedVideoFrameCount:probe.frames.length,videoCodec:probe.streams[0].codec_name,videoPTS:probe.frames.map(f=>+f.best_effort_timestamp_time),comparisons:checks,maxRGBMAE255:Math.max(...checks.map(f=>f.rgbMAE255)),terminalHold:'Extra encoded final hold is excluded from frame animation timing',sha256Video:sha(movie),actualOrigin:'real browser /frame-animation MediaRecorder export, no synthetic substitution'};
await fs.writeFile(path.join(root,'browser-v9-recording-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
const ep=path.join(root,'browser-v8-reextracted12-interior'), em=JSON.parse(await fs.readFile(path.join(ep,'animation.json')));
const oldv=await Promise.all(Array.from({length:13},(_,i)=>rgb(path.join(root,'browser-v8-capture',`video-${String(i+1).padStart(3,'0')}.png`))));
let result=[];for(const f of em.frames){const a=await rgb(path.join(ep,f.file)),scores=oldv.map(b=>mae(a,b)),best=scores.indexOf(Math.min(...scores));result.push({index:f.index,sourceTime:f.sourceTime,reportedDecodedTime:f.decodedTime,actualPixelMatchedVideoFrame:best,matchingRGBMAE255:scores[best]});}
const rr={technicalStatus:result.every((f,i)=>f.actualPixelMatchedVideoFrame===i)?'passed':'failed',artStatus:'not-reviewed / original video source sequence known failed',selection:'requested timestamps +5ms inside each original frame interval; no timestamp mutation by extractor',boundaryRetest:'Initial rounded-PTS boundary selection remains retained as browser-v8-extract-pixel-matches.json; browser honestly reported prior decoded frame at several boundaries. Exact frame-index CLI remains preferred for source PTS-boundary extraction.',frames:result};
await fs.writeFile(path.join(root,'browser-v8-extract-interior-pixel-matches.json'),JSON.stringify(rr,null,2));console.log(JSON.stringify(rr));
