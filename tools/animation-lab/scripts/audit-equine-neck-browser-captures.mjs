import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/retest.cjs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=process.argv[2]??'examples/horse-neck-path-v3/browser',revision=process.argv[3]??'r4',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schema:'equine-neck-browser-review-audit/v1',revision,productionChanged:false,visual:'failed',criteria:{sourceAndPngSHA:'exact',captureVsExportRGBA:'exact',videoFrameCount:'one per PNG plus terminal hold',maxNominalPTSErrorSeconds:.020},captures:[],exports:[]};
const entries=await fs.readdir(root,{withFileTypes:true});
for(const entry of entries.filter(e=>e.isDirectory()&&e.name.endsWith(`-${revision}-capture`))){
 const dir=path.join(root,entry.name),c=JSON.parse(await fs.readFile(path.join(dir,'capture.json'))),probe=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-select_streams','v:0','-show_streams','-show_frames','-of','json',path.join(dir,c.movie.file)]));
 const pts=probe.frames.map(f=>Number(f.best_effort_timestamp_time));
 const sourceChecks=[];for(const s of c.sourceRecords)sourceChecks.push({atlas:s.atlas,sha256:s.sha256,match:hash(await fs.readFile(path.join(dir,s.file)))===s.sha256});
 let frameHashes=true;for(const f of c.frames)frameHashes&&=hash(await fs.readFile(path.join(dir,f.file)))===f.sha256;
 const countMatches=pts.length===c.frames.length+1,deltas=countMatches?c.frames.map((f,i)=>Math.abs(pts[i]-f.sourceTime)):[],maxError=deltas.length?Math.max(...deltas):null;
 const sheet=createCanvas(2048,1680),ctx=sheet.getContext('2d');ctx.fillStyle='#edf2f4';ctx.fillRect(0,0,2048,1680);const indices=[];
 for(let i=0;i<16;i++){const index=Math.round(i*(c.frames.length-1)/15),im=await loadImage(path.join(dir,c.frames[index].file));ctx.drawImage(im,512,0,512,420,i%4*512,Math.floor(i/4)*420,512,420);indices.push({index,phase:c.frames[index].phase});}
 await fs.writeFile(path.join(dir,'candidate-contact16.png'),sheet.toBuffer('image/png'));
 const item={directory:entry.name,clip:c.clip,speed:c.speed,asset:c.asset.id,binding:c.skin.bindingVersion,pngCount:c.frames.length,decodedCount:pts.length,countMatches,requestedDuration:c.receipt.requestedDuration,lastPTS:pts.at(-1),maxNominalPTSErrorSeconds:maxError,videoTiming:countMatches&&maxError<=.020?'passed':'failed',sourceChecks,frameHashes,movieSHA:hash(await fs.readFile(path.join(dir,c.movie.file)))===c.movie.sha256,dimensions:[probe.streams[0].width,probe.streams[0].height],indices,contactSheet:'candidate-contact16.png',visual:'pending-actual-image-review'};
 report.captures.push(item);await fs.writeFile(path.join(dir,'ffprobe.json'),JSON.stringify(probe,null,2));
}
for(const entry of entries.filter(e=>e.isDirectory()&&e.name.endsWith(`-${revision}-16frames`))){
 const dir=path.join(root,entry.name),r=JSON.parse(await fs.readFile(path.join(dir,'review.json'))),capture=path.join(root,`${r.clip}-1x-${revision}-capture`),c=JSON.parse(await fs.readFile(path.join(capture,'capture.json'))),single=createCanvas(512,420),combined=createCanvas(512,420);
 single.getContext('2d').drawImage(await loadImage(path.join(dir,'candidate/00.png')),0,0);combined.getContext('2d').drawImage(await loadImage(path.join(capture,c.frames[0].file)),512,0,512,420,0,0,512,420);
 const a=single.getContext('2d').getImageData(0,0,512,420).data,b=combined.getContext('2d').getImageData(0,0,512,420).data;let differences=0;for(let i=0;i<a.length;i++)differences+=a[i]!==b[i];let hashes=true,sources=true;
 for(const f of r.frames)for(const im of Object.values(f.images))hashes&&=hash(await fs.readFile(path.join(dir,im.file)))===im.sha256;
 for(const s of r.sourceRecords)sources&&=hash(await fs.readFile(path.join(dir,s.file)))===s.sha256;
 report.exports.push({directory:entry.name,clip:r.clip,asset:r.asset.id,binding:r.skin.bindingVersion,phaseCount:r.frames.length,imageCount:r.frames.flatMap(f=>Object.values(f.images)).length,sourceHashes:sources,pngHashes:hashes,capturePhase0SameRGBA:differences===0,rgbaDifferences:differences,camera:r.frame,visual:'failed'});
}
report.assetIdentity=[...report.captures,...report.exports].every(x=>x.asset==='horse-side-v24'&&x.binding===24)?'passed':'failed';
report.scope='Actual browser downloads, real Canvas PNG buffers, source byte hashes, and decoded MediaRecorder frames. No game integration or anatomical acceptance.';
await fs.writeFile(path.join(root,`${revision}-audit.json`),JSON.stringify(report,null,2));
console.log(JSON.stringify({revision,identity:report.assetIdentity,captures:report.captures.map(c=>({clip:c.clip,speed:c.speed,png:c.pngCount,decoded:c.decodedCount,ptsError:c.maxNominalPTSErrorSeconds,timing:c.videoTiming})),exports:report.exports.map(e=>({clip:e.clip,pixelMatch:e.capturePhase0SameRGBA,differences:e.rgbaDifferences,hashes:e.sourceHashes&&e.pngHashes}))},null,2));
