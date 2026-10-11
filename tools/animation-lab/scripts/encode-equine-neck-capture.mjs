import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir=path.resolve(process.argv[2]??''),output=path.resolve(process.argv[3]??path.join(dir,'fixed-12fps.mp4'));
if(!process.argv[2])throw Error('Usage: node scripts/encode-equine-neck-capture.mjs <unpacked-browser-capture> [output.mp4]');
const receipt=JSON.parse(await fs.readFile(path.join(dir,'capture.json'))),fps=receipt.receipt?.requestedFPS,hash=b=>createHash('sha256').update(b).digest('hex');
if(receipt.schema!=='equine-neck-capture/v1'||receipt.asset?.id!=='horse-side-v24'||receipt.algorithm!=='neck-path-v3'||!Number.isFinite(fps)||fps<1||fps>30||!Array.isArray(receipt.frames)||!receipt.frames.length||receipt.frames.length>1800)throw Error('Invalid actual equine capture receipt');
if(!output.endsWith('.mp4'))throw Error('Review output must be MP4');
const inputSHA=[];for(const [i,f]of receipt.frames.entries()){const expected=`frames/${String(i).padStart(3,'0')}.png`;if(f.file!==expected||f.width!==1024||f.height!==420||Math.abs(f.sourceTime-i/fps)>1e-6)throw Error(`Unexpected fixed capture sample ${i}`);const digest=hash(await fs.readFile(path.join(dir,expected)));if(digest!==f.sha256)throw Error(`Actual frame SHA mismatch ${i}`);inputSHA.push({file:expected,sha256:digest});}
for(const source of receipt.sourceRecords){if(!/^sources\/[a-z0-9-]+\.png$/.test(source.file)||hash(await fs.readFile(path.join(dir,source.file)))!==source.sha256)throw Error('Frozen source SHA mismatch');}
const args=['-y','-v','error','-framerate',String(fps),'-start_number','0','-i',path.join(dir,'frames/%03d.png'),'-map','0:v:0','-frames:v',String(receipt.frames.length),'-an','-c:v','libx264','-crf','18','-preset','veryslow','-pix_fmt','yuv420p','-movflags','+faststart',output];
execFileSync('/opt/homebrew/bin/ffmpeg',args,{maxBuffer:4*1024*1024});
const probe=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-select_streams','v:0','-show_streams','-show_frames','-of','json',output])),pts=probe.frames.map(f=>Number(f.best_effort_timestamp_time)),maxPTSError=Math.max(...pts.map((p,i)=>Math.abs(p-i/fps)));
const result={schema:'equine-neck-fixed-encode/v1',inputCapture:path.relative(process.cwd(),dir),captureRevision:receipt.captureRevision,asset:receipt.asset.id,algorithm:receipt.algorithm,clip:receipt.clip,speed:receipt.speed,inputSHA,sourceSHA:receipt.sourceRecords,fps,requestedDuration:receipt.receipt.requestedDuration,encodedDuration:Number(probe.streams[0].duration),durationPolicy:'CFR: one actual PNG per sample; final hold is quantized to one frame. No invented endpoint or interpolation.',encodedFrameCount:pts.length,expectedFrameCount:receipt.frames.length,maxPTSErrorSeconds:maxPTSError,output:path.relative(process.cwd(),output),outputSHA256:hash(await fs.readFile(output)),args,technical:pts.length===receipt.frames.length&&maxPTSError<.001?'passed':'failed',visual:'failed',gameIntegrated:false};
await fs.writeFile(output+'.receipt.json',JSON.stringify(result,null,2));console.log(JSON.stringify({clip:result.clip,speed:result.speed,frames:pts.length,maxPTSErrorSeconds:maxPTSError,duration:result.encodedDuration,technical:result.technical,visual:result.visual,output:result.output}));
if(result.technical==='failed')process.exitCode=1;
