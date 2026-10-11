import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { samplingPlan, gridCells, sheetLayout, frameManifest, receiptFrameReview, sourceAlphaBounds, frameAtTime, chronologicalFiles, generationRequest, storedZip } from '../frame-animation-core.mjs';
import { extractVideo, selectDecodedFrames, packImages } from '../scripts/frame-animation-cli.mjs';
const exec = promisify(execFile);
test('half-open video sampling, explicit sorted times, invalid/oversized sampling rejected', () => {
  assert.deepEqual(samplingPlan({ duration: 2, start: .5, end: 1.5, fps: 4 }).map(f => [f.sourceTime, f.durationMs]), [[.5, 250], [.75, 250], [1, 250], [1.25, 250]]);
  assert.deepEqual(samplingPlan({ duration: 2, end: 1, times: '.75, 0, .25' }).map(f => f.durationMs), [250, 500, 250]);
  for (const options of [{ duration: 1, times: '0,0' }, { duration: 1, times: '1' }, { duration: 2, start: 1, end: .5 }, { duration: 100, fps: 60 }]) assert.throws(() => samplingPlan(options));
  assert.throws(() => samplingPlan({ duration: 1, times: Array(129).fill(0).map((_, i) => i / 130) }));
});
test('chronology is numeric, per-frame durations affect playback, exact source rectangles and safe sheet bounds', () => {
  assert.deepEqual(chronologicalFiles(['10.png', '2.png', '1.png'].map(name => ({ name }))).map(f => f.name), ['1.png', '2.png', '10.png']);
  const frames = [{ width: 320, height: 160, durationMs: 100 }, { width: 100, height: 300, durationMs: 400 }];
  assert.equal(frameAtTime(frames, 100), 1); assert.equal(frameAtTime(frames, 501), 0); assert.equal(frameAtTime(frames, 900, false), 1);
  const manifest = frameManifest(frames, { cell: 256, columns: 2, padding: 12 });
  assert.equal(manifest.durationMs, 500); assert.deepEqual(manifest.frames[0].contentRect, [12, 19, 232, 218]);
  assert.equal(manifest.frames[1].timeMs, 100); assert.equal(manifest.visualQA, 'not-reviewed');
  assert.throws(() => sheetLayout(Array(128).fill(frames[0]), { cell: 1024, columns: 1 }));
  assert.throws(() => frameAtTime([{ width: 2, height: 2, durationMs: 0 }], 0));
});
test('decoded PTS follows containing source frame, reports duplicates without inventing timestamps', () => {
  const result = selectDecodedFrames([{ sourceTime: 0, durationMs: 50 }, { sourceTime: .05, durationMs: 50 }, { sourceTime: .26, durationMs: 50 }], [5, 5.125, 5.25, 5.375]);
  assert.deepEqual(result.map(f => f.sourceIndex), [0, 0, 2]); assert.deepEqual(result.map(f => f.decodedTime), [0, 0, .25]);
  assert.throws(() => selectDecodedFrames([], [2, 1]));
});
test('source failed QA and individual frame observations survive export without upgrading loop approval',()=>{
 const frame={width:50,height:100,durationMs:125,phase:'landing',sourceFrameIndex:6,sourceProvenance:{tool:'image_gen.imagegen',sha256:'actual-frame'},review:{state:'passed',notes:'this frame inspected'}};
 const manifest=frameManifest([frame],{provenance:{type:'imagegen',sourceQA:'failed'}});
 assert.equal(manifest.visualQA,'failed');assert.equal(manifest.frames[0].phase,'landing');assert.equal(manifest.frames[0].sourceFrameIndex,6);assert.equal(manifest.frames[0].sourceProvenance.sha256,'actual-frame');assert.equal(manifest.frames[0].review.state,'passed');assert.equal(frameManifest([frame]).visualQA,'not-reviewed');
});
test('generation requests remain pending until actual outputs; layout and limb continuity specified', () => {
  const request = generationRequest({ subject: '恐龙', action: '跑步', count: 8, columns: 4 });
  assert.equal(request.status, 'awaiting-real-imagegen-output'); assert.match(request.prompt, /near and far limbs/); assert.equal(request.transparent_background, true);
  assert.throws(() => generationRequest({ subject: 'a', action: 'run', count: 9, columns: 4 }));
});
test('odd source sheet is partitioned without lost or overlapping pixels', () => {
  const cells = gridCells(1774,887,4,2,8);
  assert.equal(cells.reduce((sum,[x,y,w,h])=>sum+w*h,0),1774*887);
  assert.deepEqual(cells[7],[1330,443,444,444]);
  assert.equal(cells[0][0]+cells[0][2],cells[1][0]);
  assert.equal(cells[0][1]+cells[0][3],cells[4][1]);
});
test('ZIP store files pass native CRC validation and preserve Unicode names and exact bytes',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'frame-zip-test-'));
 try{const data=new TextEncoder().encode('逐帧记录\n透明PNG来源'),archive=storedZip([{name:'frames/001.png',data:new Uint8Array([0,1,2,255])},{name:'逐帧QA.json',data}]);await fs.writeFile(path.join(dir,'animation.zip'),archive);const result=await exec('unzip',['-t',path.join(dir,'animation.zip')]);assert.match(result.stdout,/No errors detected/);const decoded=await exec('python3',['-c','import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',path.join(dir,'animation.zip'),'逐帧QA.json'],{encoding:'buffer'});assert.deepEqual(decoded.stdout,Buffer.from(data));assert.throws(()=>storedZip([{name:'../x',data}]));}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('real H264 video -> eight distinct exact decoded PNGs -> alpha-padded sheet; existing outputs rejected', { timeout: 180000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-animation-test-'));
  try {
    const input = path.join(dir, 'video with space `literal`.mp4'), output = path.join(dir, 'extracted');
    await exec('ffmpeg', ['-v', 'error', '-nostdin', '-f', 'lavfi', '-i', 'testsrc2=size=160x96:rate=8:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', input]);
    const manifest = await extractVideo({ input, output, fps: 4, cell: 192, columns: 4, padding: 12, loop: true });
    assert.equal(manifest.frames.length, 8); assert.equal(manifest.provenance.uniqueDecodedFrames, 8); assert.equal(manifest.provenance.duplicateSamples, 0);
    assert.deepEqual(manifest.frames.map(f => f.decodedTime), [0, .25, .5, .75, 1, 1.25, 1.5, 1.75]);
    assert.equal(new Set(manifest.frames.map(f => f.pngSha256)).size, 8);
    const bytes = await exec('ffmpeg', ['-v', 'error', '-i', path.join(output, 'sheet.png'), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
    assert.equal(bytes.stdout.length, 768 * 384 * 4); assert.equal(bytes.stdout[3], 0);
    assert.equal(bytes.stdout[(100 * 768 + 100) * 4 + 3], 255);
    const source = await exec('ffmpeg', ['-v', 'error', '-i', input, '-vf', 'select=eq(n\\,6)', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { encoding: 'buffer', maxBuffer: 1024 * 1024 });
    const png = await exec('ffmpeg', ['-v', 'error', '-i', path.join(output, 'frames', '004.png'), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { encoding: 'buffer', maxBuffer: 1024 * 1024 });
    assert.deepEqual(png.stdout, source.stdout, 'extracted frame must equal source decoded frame six, not frame zero');
    await assert.rejects(() => extractVideo({ input, output, fps: 4 }), /EEXIST/);
    const videoReceiptPath=path.join(dir,'video-receipt.json'),videoReceipt={tool:'test-fixture-generation (not actual AI output)',prompt:'Synthetic H264 provenance binding fixture only',generatedFileSha256:crypto.createHash('sha256').update(await fs.readFile(input)).digest('hex'),qa:{visual:'failed',notes:'Known source defect must persist through extraction'}};
    await fs.writeFile(videoReceiptPath,JSON.stringify(videoReceipt));
    const bound=await extractVideo({input,output:path.join(dir,'bound-video'),times:[0,.75],end:1,cell:192,columns:2,'video-receipt':videoReceiptPath});
    assert.equal(bound.visualQA,'failed');assert.equal(bound.provenance.generatedVideo.tool,videoReceipt.tool);assert.equal(bound.frames[1].review.notes,videoReceipt.qa.notes);assert.equal(bound.frames[1].sourceProvenance.sha256,videoReceipt.generatedFileSha256);
    videoReceipt.generatedFileSha256='wrong';await fs.writeFile(videoReceiptPath,JSON.stringify(videoReceipt));const badVideoOut=path.join(dir,'bad-video-receipt');
    await assert.rejects(()=>extractVideo({input,output:badVideoOut,times:[0],'video-receipt':videoReceiptPath}),/SHA/);await assert.rejects(()=>fs.stat(badVideoOut),/ENOENT/);
    const imported = path.join(dir, 'imports'); await fs.mkdir(imported); await fs.copyFile(path.join(output, 'frames', '001.png'), path.join(imported, 'frame-10.png')); await fs.copyFile(path.join(output, 'frames', '002.png'), path.join(imported, 'frame-2.png'));
    const packed = await packImages({ input: imported, output: path.join(dir, 'packed'), fps: 5, cell: 192, columns: 2, padding: 8 });
    assert.deepEqual(packed.frames.map(f => f.name), ['frame-2.png', 'frame-10.png']); assert.equal(packed.durationMs, 400); assert.equal(packed.provenance.type, 'imported-images');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

 test('receipt per-frame QA transfers notes without upgrading overall playback acceptance',()=>{
 const receipt={qa:{frames:[{index:1,status:'failed',notes:'near wrist freezes'},{index:0,status:'passed',notes:'looked at actual PNG'}]}};
 assert.equal(receiptFrameReview(receipt,1).notes,'near wrist freezes');
 assert.equal(receiptFrameReview(receipt,0).state,'passed');
 assert.equal(receiptFrameReview(null,0),undefined);
 const frames=[0,1].map(i=>({width:20,height:20,durationMs:125,review:receiptFrameReview(receipt,i)}));
 assert.equal(frameManifest(frames).visualQA,'failed');
 assert.equal(frameManifest([frames[0]]).visualQA,'not-reviewed');
 });

test('unequal source frames share a fixed affine transform and source anchor; no individual fitting',()=>{
 const frames=[{width:320,height:160,durationMs:100},{width:100,height:300,durationMs:100}];
 const layout=sheetLayout(frames,{cell:256,columns:2,padding:12});
 assert.deepEqual(layout.fixedTransform.sourceCanvasSize,[320,300]);
 assert.equal(layout.frames[0].scale,layout.frames[1].scale);
 assert.deepEqual(layout.frames[0].anchor,layout.frames[1].anchor);
 assert.deepEqual(layout.frames.map(f=>[f.contentRect[0]-f.rect[0],f.contentRect[1]-f.rect[1]]),[[12,19],[12,19]]);
 assert.deepEqual(layout.frames.map(f=>f.contentRect.slice(2)),[[232,218],[232,218]]);
 assert.ok(layout.frames.every(f=>f.contentRect[0]-f.rect[0]>=12&&f.contentRect[1]-f.rect[1]>=12&&f.contentRect[1]-f.rect[1]+f.contentRect[3]<=244));
});

test('original alpha boundary rejects clipped transparent sprite before padding; opaque video and faint border are distinguished',()=>{
 const a=new Uint8Array(100);a[0]=1;a[44]=255;let bounds=sourceAlphaBounds(a,10,10);assert.deepEqual(bounds.bounds,[4,4,1,1]);assert.equal(bounds.touchesEdge,false);
 a[5]=255;bounds=sourceAlphaBounds(a,10,10);assert.equal(bounds.edgePixels,1);assert.equal(bounds.hasTransparency,true);
 const f={width:10,height:10,durationMs:125,pixelBounds:bounds};assert.equal(frameManifest([f]).visualQA,'failed');assert.equal(frameManifest([f],{padding:20,cell:256}).visualQA,'failed');
 const opaque=sourceAlphaBounds(new Uint8Array(100).fill(255),10,10);assert.equal(opaque.touchesEdge,true);assert.equal(opaque.hasTransparency,false);assert.equal(frameManifest([{...f,pixelBounds:opaque}]).visualQA,'not-reviewed');
});
test('real unequal PNGs retain identical source-marker placement after one sequence transform',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'frame-common-'));
 try{const input=path.join(temp,'in');await fs.mkdir(input);
 for(const[i,size]of[[1,'160x96'],[2,'320x192']])await exec('ffmpeg',['-v','error','-nostdin','-f','lavfi','-i',`color=c=black:s=${size},format=rgba,drawbox=x=30:y=30:w=10:h=10:color=red:t=fill`,'-frames:v','1',path.join(input,`${i}.png`)]);
 const out=path.join(temp,'out'),manifest=await packImages({input,output:out,fps:8,cell:256,columns:2,padding:12});
 const {stdout}=await exec('ffmpeg',['-v','error','-nostdin','-i',path.join(out,'sheet.png'),'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{encoding:'buffer',maxBuffer:1024*1024});
 const centroids=[];for(let cell=0;cell<2;cell++){let n=0,sx=0,sy=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=(y*512+cell*256+x)*4;if(stdout[k]>150&&stdout[k+1]<30&&stdout[k+2]<30){n++;sx+=x;sy+=y;}}assert.ok(n>20);centroids.push([sx/n,sy/n]);}
 assert.ok(Math.hypot(centroids[0][0]-centroids[1][0],centroids[0][1]-centroids[1][1])<.1);
 assert.deepEqual(manifest.frames.map(f=>f.anchor),[[128,197],[128,197]]);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});

test('mixed-version generated PNGs follow receipt chronology; mismatched provenance rejects before output',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'frame-receipts-'));
 try{
  const input=path.join(temp,'in');await fs.mkdir(input);const names=['v9-phase-00.png','v1-phase-01.png'];
  for(const [i,name]of names.entries())await exec('ffmpeg',['-v','error','-nostdin','-f','lavfi','-i',`color=c=${i?'blue':'red'}:s=96x96`,'-frames:v','1',path.join(input,name)]);
  const receipt={visualQA:'failed',frames:await Promise.all(names.map(async(file,index)=>({file,phase:index/2,tool:'image_gen.imagegen',prompt:'Test receipt binding only; synthetic pixels are not an actual imagegen example',generatedFileSha256:crypto.createHash('sha256').update(await fs.readFile(path.join(input,file))).digest('hex'),qa:{visual:'failed',notes:'synthetic tool test; art not approved'}})))};
  const receiptPath=path.join(temp,'receipt.json');await fs.writeFile(receiptPath,JSON.stringify(receipt));
  const packed=await packImages({input,output:path.join(temp,'out'),fps:9,cell:128,columns:2,'sequence-receipt':receiptPath});
  assert.deepEqual(packed.frames.map(f=>f.name),names);assert.deepEqual(packed.frames.map(f=>f.phase),[0,.5]);assert.equal(packed.visualQA,'failed');assert.equal(packed.provenance.type,'imagegen-sequence');assert.equal(packed.frames[0].sourceProvenance.receipt.tool,'image_gen.imagegen');
  receipt.frames[0].generatedFileSha256='incorrect';await fs.writeFile(receiptPath,JSON.stringify(receipt));const rejectedOut=path.join(temp,'rejected');
  await assert.rejects(()=>packImages({input,output:rejectedOut,'sequence-receipt':receiptPath}),/SHA/);await assert.rejects(()=>fs.stat(rejectedOut),/ENOENT/);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});

test('existing project crops bind exact source PNG SHA and remain imports, not new generation',async()=>{
 const{existingProjectFrameProvenance}=await import('../frame-animation-core.mjs'),sha='a'.repeat(64),r={kind:'existing-project-frame',fileSha256:sha,tool:'native Canvas sourceRect crop',inputSource:{file:'/original/project/atlas.png',sha256:'b'.repeat(64),mappingSha256:'c'.repeat(64),sourceRect:[512,0,484,512],offset:[20,10]},fixedCanvas:[580,540],qa:{visual:'failed'}};
 const p=existingProjectFrameProvenance(r,sha);assert.equal(p.type,'imported-existing-project');assert.equal(p.prompt,undefined);assert.deepEqual(p.originalAtlas.sourceRect,[512,0,484,512]);
 for(const mutate of [x=>x.fileSha256='d'.repeat(64),x=>x.kind='imagegen',x=>x.inputSource.sourceRect[2]=0,x=>x.inputSource.mappingSha256='',x=>x.fixedCanvas[0]=Infinity]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>existingProjectFrameProvenance(bad,sha));}
 assert.equal(frameManifest([{width:580,height:540,durationMs:100,pixelBounds:{touchesEdge:false},sourceProvenance:p,review:{state:'failed'}}],{provenance:{type:p.type,sourceQA:'failed'}}).visualQA,'failed');
});

test('fractional FPS recording boundaries choose every frame once without rounding to prior frame',()=>{
 for(const count of[6,12,24,30]){const frames=Array.from({length:count},()=>({width:2,height:2,durationMs:1000/count}));for(let i=0;i<count;i++){assert.equal(frameAtTime(frames,i/count*1000,false),i);if(i>0)assert.equal(frameAtTime(frames,i/count*1000-.001,false),i-1);}}
});

test('multi-cycle capture repeats source chronology across last-to-first boundaries',()=>{
 for(const count of[6,12,24,30]){const frames=Array.from({length:count},()=>({width:2,height:2,durationMs:1000/count}));for(let i=0;i<count*3;i++)assert.equal(frameAtTime(frames,i/count*1000,true),i%count);for(let cycle=1;cycle<=2;cycle++)assert.equal(frameAtTime(frames,cycle*1000-.001,true),count-1);}
});

test('skeletal rendered frames verify actual PNG plus four independent source byte hashes and reject forged origins',async()=>{
 const{skeletalRenderedFrameProvenance}=await import('../frame-animation-core.mjs'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),sources=new Map(['atlas','asset','motion','renderer'].map(role=>['/'+role,Buffer.from(role+' actual source bytes fixture')])),png=Buffer.from('rendered PNG hash fixture'),r={kind:'skeletal-render-frame',tool:'renderCanvas',fileSha256:sha(png),species:'human',skinId:'alien',action:'roll',frameIndex:0,phase:0,fixedCanvas:[512,512],qa:{visual:'failed'},sourceFiles:Object.fromEntries([...sources].map(([source,b])=>[source.slice(1),{file:source+'.fixture',source,sha256:sha(b)}]))};
 const read=async url=>{if(!sources.has(url))throw Error('missing bytes');return sources.get(url);},p=await skeletalRenderedFrameProvenance(r,sha(png),read,sha);
 assert.equal(p.type,'skeletal-render');assert.equal(p.prompt,undefined);assert.equal(Object.keys(p.verifiedSourceFiles).length,4);assert.equal(frameManifest([{width:512,height:512,durationMs:125,sourceProvenance:p,review:{state:'failed'}}],{provenance:{type:'skeletal-render-sequence',sourceQA:'failed'}}).visualQA,'failed');
 for(const mutate of[x=>x.kind='imagegen',x=>x.tool='image_gen.imagegen',x=>x.fileSha256='a'.repeat(64),x=>delete x.sourceFiles.asset,x=>x.sourceFiles.motion.sha256='b'.repeat(64),x=>x.phase=2,x=>x.fixedCanvas[0]=Infinity]){const bad=structuredClone(r);mutate(bad);await assert.rejects(()=>skeletalRenderedFrameProvenance(bad,sha(png),read,sha));}
 await assert.rejects(()=>skeletalRenderedFrameProvenance(r,sha(png),async url=>url==='/atlas'?Buffer.from('altered atlas pixels'):read(url),sha),/atlas.*SHA/);
 const objectCanvas=structuredClone(r);objectCanvas.fixedCanvas={width:512,height:512,anchor:[256,440],scale:1.7};assert.deepEqual((await skeletalRenderedFrameProvenance(objectCanvas,sha(png),read,sha)).fixedCanvasSize,[512,512]);objectCanvas.fixedCanvas.anchor[0]=Infinity;await assert.rejects(()=>skeletalRenderedFrameProvenance(objectCanvas,sha(png),read,sha));
 await assert.rejects(()=>skeletalRenderedFrameProvenance(r,sha(png)),/实际源文件字节/);
});

test('skeletal CLI import binds actual source snapshots and refuses replaced source before making output',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'skeletal-pack-')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 try{
 const input=path.join(temp,'in');await fs.mkdir(input);await exec('ffmpeg',['-v','error','-nostdin','-f','lavfi','-i','color=c=red:s=96x96','-frames:v','1',path.join(input,'00.png')]);
 const sources={};for(const role of ['atlas','asset','motion','renderer']){const file=role+'.fixture',bytes=Buffer.from(role+' synthetic test source snapshot');await fs.writeFile(path.join(temp,file),bytes);sources[role]={file,source:'/fixture/'+file,sha256:hash(bytes)};}
 const receipt={origin:'skeletal-render',visualQA:'failed',frames:[{file:'00.png',kind:'skeletal-render-frame',tool:'renderCanvas',fileSha256:hash(await fs.readFile(path.join(input,'00.png'))),species:'human',skinId:'test-fixture',action:'roll',frameIndex:0,phase:0,fixedCanvas:{width:96,height:96,anchor:[48,90],scale:1},sourceFiles:sources,qa:{visual:'failed'}}]},receiptPath=path.join(temp,'sequence.json');await fs.writeFile(receiptPath,JSON.stringify(receipt));
 const result=await packImages({input,output:path.join(temp,'out'),'sequence-receipt':receiptPath,cell:128,fps:30});assert.ok(Math.abs(result.durationMs-1000/30)<1e-9);assert.equal(result.provenance.type,'skeletal-render-sequence');assert.equal(result.frames[0].sourceProvenance.type,'skeletal-render');assert.equal(result.visualQA,'failed');
 await fs.writeFile(path.join(temp,'renderer.fixture'),'replaced renderer bytes');const rejected=path.join(temp,'rejected');await assert.rejects(()=>packImages({input,output:rejected,'sequence-receipt':receiptPath}),/renderer.*SHA/);await assert.rejects(()=>fs.stat(rejected),/ENOENT/);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});

test('30fps sample durations retain fractional milliseconds and exact 37-frame source duration',()=>{const plan=samplingPlan({duration:37/30,fps:30});assert.equal(plan.length,37);assert.ok(Math.abs(plan.reduce((s,f)=>s+f.durationMs,0)-37000/30)<1e-9);for(const f of plan)assert.ok(Math.abs(f.durationMs-1000/30)<1e-9);});
