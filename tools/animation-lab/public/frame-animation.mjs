import { samplingPlan, chronologicalFiles, gridCells, frameAtTime, sheetLayout, frameManifest, receiptFrameReview, sourceAlphaBounds, generationRequest, storedZip, existingProjectFrameProvenance, skeletalRenderedFrameProvenance } from '/frame-animation-core.mjs';
const $ = id => document.getElementById(id), video = $('decoder'), preview = $('preview'), ctx = preview.getContext('2d');
let frames = [], selected = 0, playing = false, epoch = 0, videoFile, videoURL, sheetFile, receipt, provenance = {}, playStart = 0, offset = 0, mode = 'video', videoReady = false, samples = [], recording = false, recordCancelled = false;
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const guarded = fn => async (...args) => { try { await fn(...args); } catch (e) { status(e.message, true); } };
const hash = async file => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
const blob = canvas => new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG 编码失败')), 'image/png'));
const download = (value, name) => { const url = URL.createObjectURL(value instanceof Blob ? value : new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); };
const image = file => new Promise((resolve, reject) => { const url = URL.createObjectURL(file), img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`无法解码 ${file.name}`)); }; img.src = url; });
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const waitEvent = (el, type, trigger) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => finish(new Error('视频解码超时；可改用 FFmpeg CLI')), 15000);
  const finish = error => { clearTimeout(timer); el.removeEventListener(type, success); el.removeEventListener('error', fail); error ? reject(error) : resolve(); };
  const success = () => finish(), fail = () => finish(new Error('浏览器无法解码该视频；可用 FFmpeg CLI 转换或抽帧'));
  el.addEventListener(type, success, { once: true }); el.addEventListener('error', fail, { once: true }); trigger?.();
});
function stop() { playing = false; $('play').textContent = '▶ 播放'; }
function draw() {
  ctx.clearRect(0, 0, preview.width, preview.height);
  const f = frames[selected]; $('empty').hidden = Boolean(f);
  if (f) { const ew=Math.max(...frames.map(x=>x.width)),eh=Math.max(...frames.map(x=>x.height)),scale=Math.min((preview.width-32)/ew,(preview.height-32)/eh);ctx.drawImage(f.image,(preview.width-ew*scale)/2,(preview.height-eh*scale)/2,f.width*scale,f.height*scale); }
  $('scrub').max = Math.max(0, frames.length - 1); $('scrub').value = selected;
  $('time').textContent = `${frames.length ? selected + 1 : 0} / ${frames.length}`;
  $('frame-duration').value = f?.durationMs ?? 125;
  $('frame-qa').value = f?.review?.state ?? 'not-reviewed'; $('qa-notes').value = f?.review?.notes ?? '';
  $('total').textContent = frames.length ? `${(frames.reduce((s, f) => s + f.durationMs, 0) / 1000).toFixed(3)} 秒` : '';
  $('identity').textContent = `${frames.length} 帧 · ${provenance.type === 'video' ? '视频抽帧' : provenance.type === 'imagegen' || provenance.type === 'imagegen-sequence' ? '生图结果（来源记录已绑定）' : provenance.type==='imported-existing-project'?'原项目已有帧（非新生成）':provenance.type==='skeletal-render-sequence'?'骨骼渲染序列（非生图）':'导入图片'}${f ? ` · ${f.width} × ${f.height}` : ''}`;
  $('source').textContent = f ? `${f.name} · ${f.sourceTime === undefined ? '独立帧图' : `请求时间 ${f.sourceTime.toFixed(4)} s${f.decodedTime != null ? ` · 解码时间 ${f.decodedTime.toFixed(4)} s` : ' · 浏览器未提供解码时间戳'}`} · ${provenance.verification || ''}` : '';
  document.querySelectorAll('#timeline button').forEach((button, i) => button.classList.toggle('active', i === selected));
}
function refresh() {
  stop(); selected = Math.min(Math.max(0, selected), Math.max(0, frames.length - 1)); $('timeline').replaceChildren();
  frames.forEach((f, i) => { const button = document.createElement('button'), thumbnail = document.createElement('img'), small = canvas(88, 64); const scale = Math.min(88 / f.width, 64 / f.height); small.getContext('2d').drawImage(f.image, (88 - f.width * scale) / 2, (64 - f.height * scale) / 2, f.width * scale, f.height * scale); thumbnail.src = small.toDataURL('image/png'); thumbnail.alt = `第 ${i + 1} 帧`; const label = document.createElement('span'); label.textContent = `${i + 1} · ${f.durationMs} ms`; button.append(thumbnail, label); button.onclick = () => { stop(); selected = i; draw(); }; $('timeline').append(button); });
  draw();
}
const animationOptions = () => ({ name: $('name').value, loop: $('loop').checked, cell: +$('cell').value, columns: +$('columns').value, padding: +$('padding').value, provenance });
function setMode(next) { mode = next; document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode)); $('video-panel').hidden = mode !== 'video'; $('generated-panel').hidden = mode !== 'generated'; $('images-panel').hidden = mode === 'video'; }
function clearSampleContext(){$('samples').value='';$('sample-review').textContent='当前使用本机导入素材；来源与美术 QA 保留在导出中。';}
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
async function loadVideoFile(file) {
  epoch++; stop(); video.pause(); videoReady=false; videoFile = file; if (!videoFile) return;
  if(videoFile.size>268435456)throw new Error('网页导入最多 256 MB，请用 FFmpeg CLI 处理更大的视频');
  if (videoURL) URL.revokeObjectURL(videoURL); videoURL = URL.createObjectURL(videoFile);
  await waitEvent(video, 'loadeddata', () => { video.src = videoURL; video.load(); });
  if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 3600) throw new Error('需要时长 0–3600 秒的有限视频');
  videoReady=true; $('end').value = video.duration.toFixed(6); $('start').value = 0;
  $('video-info').textContent = `${videoFile.name} · ${video.videoWidth} × ${video.videoHeight} · ${video.duration.toFixed(3)} 秒`;
  status('视频已解码。设置范围后抽帧；新抽帧会替换当前时间轴。');
}
$('video-file').onchange = guarded(() => loadVideoFile($('video-file').files[0]));
$('cancel').onclick = () => { epoch++; status('正在停止；已经完成的帧保留。'); };
async function extractCurrentVideoFrames() {
  if (!videoFile || !videoReady || video.readyState < 2) throw new Error('请先导入可播放的视频');
  const plan = samplingPlan({ duration: video.duration, start: +$('start').value, end: +$('end').value, fps: +$('sample-fps').value, times: $('times').value.trim() || undefined });
  const myEpoch = ++epoch, file = videoFile; clearSampleContext();$('name').value=file.name.replace(/\.[^.]+$/,''); frames = []; selected = 0; refresh(); $('extract').disabled = true; $('video-file').disabled = true; $('cancel').hidden = false;
  document.querySelectorAll('[data-mode],#image-files,#sheet-file,#split-sheet,#export,#export-preview,#export-zip,#record,#load-sample').forEach(el => { el.disabled = true; });
  try {
    provenance = { type: 'video', file: file.name, sha256: await hash(file), decoder: 'HTMLVideoElement + Canvas', timestampAccuracy: 'requested browser seek time; decoded mediaTime recorded when supplied', verification: 'local video bytes SHA-256; no automatic background removal' };
    for (const sample of plan) {
      if (myEpoch !== epoch) break;
      let decodedTime = null, callback;
      if (video.requestVideoFrameCallback && Math.abs(video.currentTime - sample.sourceTime) > 1e-7) {
        callback = video.requestVideoFrameCallback((_, info) => { decodedTime = info.mediaTime; });
      }
      if (Math.abs(video.currentTime - sample.sourceTime) > 1e-7) await waitEvent(video, 'seeked', () => { video.currentTime = sample.sourceTime; });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (callback) video.cancelVideoFrameCallback(callback);
      if (myEpoch !== epoch) break;
      const scale = Math.min(512 / video.videoWidth, 512 / video.videoHeight, 1), c = canvas(Math.max(1, Math.round(video.videoWidth * scale)), Math.max(1, Math.round(video.videoHeight * scale)));
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      frames.push({ ...sample, decodedTime, image: c, width: c.width, height: c.height, name: `video-${frames.length + 1}.png`, sourceSha256: provenance.sha256 });
      status(`已抽取 ${frames.length} / ${plan.length} 帧 · ${sample.sourceTime.toFixed(3)} 秒`);
    }
    refresh(); status(`完成 ${frames.length} 帧。请逐帧检查动作与顺序。`);
  } finally { $('extract').disabled = false; $('video-file').disabled = false; $('cancel').hidden = true; document.querySelectorAll('[data-mode],#image-files,#sheet-file,#split-sheet,#export,#export-preview,#export-zip,#record,#load-sample').forEach(el => { el.disabled = false; }); }
}
$('extract').onclick = guarded(extractCurrentVideoFrames);
async function imageProvenance(file) {
  const sha256 = await hash(file);
  if (mode === 'generated' && receipt?.generatedFileSha256 === sha256 && receipt?.tool && receipt?.prompt) return { type: 'imagegen', file: file.name, sha256, tool: receipt.tool, prompt: receipt.prompt, receipt, sourceQA: receipt.visualQA || receipt.qa?.visual || 'not-reviewed', verification: 'receipt bound by output SHA-256; generation claim supplied by importer' };
  return { type: 'imported-images', file: file.name, sha256, verification: mode === 'generated' ? 'no matching generation receipt; generation origin unverified' : 'local imported bitmap; generation origin unverified' };
}
$('generation-receipt').onchange = guarded(async () => { receipt = JSON.parse(await $('generation-receipt').files[0].text()); status('来源记录已读取，导入图集时会核对 SHA-256。'); });
$('image-files').onchange = guarded(async () => {
  const files = chronologicalFiles($('image-files').files); if (!files.length || files.length > 128) throw new Error('请选择 1–128 张图片');
  const durationMs = 1000 / +$('image-fps').value; if (!Number.isFinite(durationMs) || durationMs < 1000/60 || durationMs > 1000) throw new Error('播放 FPS 必须在 1–60');
  const imported = []; let pixels = 0;
  for (const file of files) { const img = await image(file); pixels += img.width * img.height; if (img.width * img.height > 16777216 || pixels > 33554432) throw new Error('单张图片最多 1600 万像素，序列合计最多 3200 万像素'); const raw=canvas(img.width,img.height);raw.getContext('2d').drawImage(img,0,0);imported.push({image:img,width:img.width,height:img.height,durationMs,name:file.name,sourceSha256:await hash(file),pixelBounds:sourceAlphaBounds(raw.getContext('2d').getImageData(0,0,img.width,img.height).data,img.width,img.height,{stride:4,alphaOffset:3})}); }
  provenance = { type: 'imported-images', order: 'numeric filename sort; user can reorder', files: imported.map(f => ({ file: f.name, sha256: f.sourceSha256 })), verification: 'actual imported image bytes; generation origin unverified' };
  clearSampleContext();frames = imported; selected = 0; refresh(); status(`已导入 ${frames.length} 张图片。`);
});
$('sheet-file').onchange = () => { sheetFile = $('sheet-file').files[0]; status(sheetFile ? `已选 ${sheetFile.name}，设置网格后拆分。` : '未选图集'); };
async function splitImportedSheet() {
  if (!sheetFile) throw new Error('请先选择图集图片'); const cols = +$('import-cols').value, rows = +$('import-rows').value, count = +$('import-count').value;
  if (![cols, rows, count].every(Number.isInteger) || cols < 1 || cols > 16 || rows < 1 || rows > 32 || count < 1 || count > 128 || count > cols * rows) throw new Error('网格或有效帧数无效');
  const img = await image(sheetFile), cells = gridCells(img.width, img.height, cols, rows, count);
  if (img.width * img.height > 16777216) throw new Error('源图集最多 1600 万像素');
  const durationMs = 1000 / +$('image-fps').value; if (!Number.isFinite(durationMs) || durationMs < 1000/60 || durationMs > 1000) throw new Error('播放 FPS 必须在 1–60');
  provenance = { ...await imageProvenance(sheetFile), grid: { columns: cols, rows, count }, sourceSize: [img.width, img.height] };
  frames = cells.map((sourceRect, i) => { const [x,y,w,h] = sourceRect, c = canvas(w,h); c.getContext('2d').drawImage(img, x,y,w,h,0,0,w,h); return { image:c,width:w,height:h,sourceRect,durationMs,pixelBounds:sourceAlphaBounds(c.getContext('2d').getImageData(0,0,w,h).data,w,h,{stride:4,alphaOffset:3}),phase:provenance.type==='imagegen'?receipt?.qa?.frames?.[i]?.phase:null,review:provenance.type==='imagegen'?receiptFrameReview(receipt,i):undefined,name:`${sheetFile.name}#${i+1}`,sourceSha256:provenance.sha256 }; });
  selected = 0; refresh(); status(`已拆分 ${count} 帧；请检查角色是否越过格子边界。`);
}
$('split-sheet').onclick = guarded(async()=>{clearSampleContext();await splitImportedSheet();});
$('generation-request').onclick = guarded(() => { const request = generationRequest({ subject: $('subject').value, action: $('action').value, count: +$('gen-count').value, columns: +$('gen-cols').value, fps: +$('image-fps').value }); download(request, 'imagegen-frame-request.json'); $('import-cols').value = request.layout.columns; $('import-rows').value = request.layout.rows; $('import-count').value = request.layout.count; status('生图请求已导出。Codex 完成 imagegen 后，导入真实图集与来源记录。'); });
async function buildExport(exportFrames=frames,options=animationOptions()) {
  const layout = sheetLayout(exportFrames, options), c = canvas(layout.width, layout.height), g = c.getContext('2d'); layout.frames.forEach((f,i)=>{const [ew,eh]=layout.fixedTransform.sourceCanvasSize,padded=canvas(ew,eh);padded.getContext('2d').drawImage(exportFrames[i].image,0,0);g.drawImage(padded,...f.contentRect);});
  const png=await blob(c),manifest=frameManifest(exportFrames,options);manifest.sheet.sha256=await hash(png);manifest.exportedAt=new Date().toISOString();return{png,manifest,layout};
}
async function zipExport(exportFrames=frames, options=animationOptions(), extras=[]) {
  const {png,manifest}=await buildExport(exportFrames,options),files=[{name:'sheet.png',data:await png.arrayBuffer()},...extras];
  for(const [i,f]of exportFrames.entries()){const c=canvas(f.width,f.height);c.getContext('2d').drawImage(f.image,0,0);const bitmap=await blob(c);manifest.frames[i].pngSha256=await hash(bitmap);files.push({name:manifest.frames[i].file,data:await bitmap.arrayBuffer()});}
  files.push({name:'animation.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});return new Blob([storedZip(files)],{type:'application/zip'});
}
$('export').onclick=guarded(async()=>{const{png,manifest,layout}=await buildExport();download(png,'sheet.png');download(manifest,'animation.json');status(`已导出 ${layout.width} × ${layout.height} PNG 与 animation.json。浏览器若拦截第二个文件，请允许本页多文件下载。`);});
$('export-zip').onclick=guarded(async()=>{stop();status('正在打包单帧、图集和时序…');download(await zipExport(),`${$('name').value.replace(/[^\p{L}\p{N}_-]+/gu,'-')||'frame-animation'}.zip`);status('ZIP 已导出，包含真实单帧 PNG、sheet.png 和 animation.json。');});
$('export-preview').onclick = guarded(async () => { const f = frames[selected]; if (!f) throw new Error('没有帧图'); const c = canvas(f.width, f.height); c.getContext('2d').drawImage(f.image, 0, 0); download(await blob(c), `frame-${String(selected + 1).padStart(3, '0')}.png`); });
$('scrub').oninput = () => { stop(); selected = +$('scrub').value; draw(); };
$('background').onchange = () => { $('stage').className = $('background').value; };
$('frame-duration').onchange = guarded(() => { if (!frames[selected]) return; const duration = +$('frame-duration').value; if (!Number.isFinite(duration) || duration < 1 || duration > 60000) throw new Error('时长必须在 1–60000 ms'); frames[selected].durationMs = duration; refresh(); });
$('apply-duration').onclick = guarded(() => { const duration = +$('frame-duration').value; if (!Number.isFinite(duration) || duration < 1 || duration > 60000) throw new Error('时长必须在 1–60000 ms'); frames.forEach(f => { f.durationMs = duration; }); refresh(); });
function move(delta) { stop(); const index = selected + delta; if (index < 0 || index >= frames.length) return; [frames[selected], frames[index]] = [frames[index], frames[selected]]; selected = index; refresh(); }
$('previous').onclick = () => move(-1); $('next').onclick = () => move(1);
$('remove').onclick = () => { frames.splice(selected, 1); refresh(); };
$('play').onclick = () => { if (!frames.length || recording) return; if (playing) return stop(); playing = true; offset = frames.slice(0, selected).reduce((s, f) => s + f.durationMs, 0); playStart = performance.now(); $('play').textContent = 'Ⅱ 暂停'; };
function tick(now) { if (playing) { const elapsed = now - playStart + offset, total = frames.reduce((s, f) => s + f.durationMs, 0); selected = frameAtTime(frames, elapsed, $('loop').checked); draw(); if (!$('loop').checked && elapsed >= total) stop(); } requestAnimationFrame(tick); }
$('save-qa').onclick=()=>{if(!frames[selected])return;frames[selected].review={state:$('frame-qa').value,notes:$('qa-notes').value,reviewedAt:new Date().toISOString()};status(`已记录第 ${selected+1} 帧 QA；整体循环仍需单独检查。`);};
$('frame-qa').onfocus=stop;$('qa-notes').onfocus=stop;
$('export-qa').onclick=guarded(()=>{const manifest=frameManifest(frames,animationOptions());download({format:'frame-animation-qa',schemaVersion:1,provenance,visualQA:manifest.visualQA,playbackQA:'not-reviewed',frames:manifest.frames.map(f=>({index:f.index,name:f.name,sourceRect:f.sourceRect,sourceSha256:f.sourceSha256,review:f.review}))},'frame-qa.json');});
async function loadSamples(){try{const response=await fetch('/frame-animation-samples.json');if(!response.ok)throw new Error('样例列表尚未配置');const value=await response.json();samples=value.samples||[];$('samples').replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=samples.length?'选择动作样例':'暂无动作序列样例';$('samples').append(placeholder);samples.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=`${s.label} · ${s.visualQA==='passed'?'已审查':s.visualQA==='failed'?'有问题':'待审查'}`;$('samples').append(o);});}catch(e){$('samples').options[0].textContent=e.message;}}
$('load-sample').onclick=guarded(async()=>{
 const sample=samples.find(s=>s.id===$('samples').value);if(!sample)throw new Error('请选择动作样例');
 const safe=url=>{const u=new URL(url,location.origin);if(u.origin!==location.origin||!u.pathname.startsWith('/frame-animation-assets/'))throw new Error('样例只能读取本机帧动画素材目录');return u.href;};
 const read=async(url,json=false)=>{const r=await fetch(safe(url));if(!r.ok)throw new Error('样例素材或来源记录不存在');return json?r.json():r.blob();};
 status('正在载入真实样例…');setMode('generated');$('loop').checked=sample.loop!==false;$('name').value=sample.id;
 if(sample.video){
  const source=await read(sample.video),r=await read(sample.receipt,true),sha256=await hash(source);
  if(r.generatedFileSha256!==sha256||!r.tool||!r.prompt)throw new Error('视频来源记录与真实 MP4 SHA-256 不匹配');
  setMode('video');await loadVideoFile(new File([source],sample.video.split('/').pop(),{type:source.type}));
  $('sample-fps').value=sample.fps||12;$('times').value=sample.times||'';
  await extractCurrentVideoFrames();
  $('samples').value=sample.id;$('name').value=sample.id;
  provenance={...provenance,sampleId:sample.id,generatedVideo:{tool:r.tool,prompt:r.prompt,receipt:r},sourceQA:sample.visualQA||'not-reviewed',sourceQANotes:sample.qaNotes||[],verification:'actual generated video SHA bound to task receipt; browser-decoded frames retain original background and reported mediaTime'};
  frames=frames.map(f=>({...f,review:{state:r.qa?.visual||'not-reviewed',notes:r.qa?.notes||'',origin:'SHA-bound generated video source review'}}));selected=0;refresh();
 }else if(sample.frames){
  if(!sample.frames.length||sample.frames.length>128)throw new Error('样例帧数无效');
  const imported=[];let pixels=0;const sourceByteCache=new Map(),readSkeletalSource=async(url)=>{if(!sourceByteCache.has(url))sourceByteCache.set(url,read(url));return sourceByteCache.get(url);};
  for(const [i,item]of sample.frames.entries()){
   const source=await read(item.source),r=await read(item.receipt,true),sha256=await hash(source);
   if(!['existing-project','skeletal-render'].includes(sample.origin)&&(r.generatedFileSha256!==sha256||!r.tool||!r.prompt))throw new Error('单帧来源记录与实际图片 SHA-256 不匹配');
   const sourceProvenance=sample.origin==='existing-project'?existingProjectFrameProvenance(r,sha256):sample.origin==='skeletal-render'?await skeletalRenderedFrameProvenance(r,sha256,readSkeletalSource,hash):{type:'imagegen',tool:r.tool,prompt:r.prompt,receipt:r,sha256};
   if(sample.origin==='skeletal-render'&&r.frameIndex!==i)throw new Error('骨骼样例来源帧索引与序列顺序不匹配');
   const file=new File([source],item.source.split('/').pop(),{type:source.type}),img=await image(file);pixels+=img.width*img.height;
   if(sample.origin==='skeletal-render'&&(sourceProvenance.fixedCanvasSize[0]!==img.width||sourceProvenance.fixedCanvasSize[1]!==img.height))throw new Error('骨骼样例实际 PNG 与固定画布不匹配');
   if(img.width*img.height>16777216||pixels>33554432)throw new Error('单张图片最多1600万像素，序列最多3200万像素');
   const raw=canvas(img.width,img.height);raw.getContext('2d').drawImage(img,0,0);
   imported.push({image:img,width:img.width,height:img.height,name:file.name,durationMs:item.durationMs||1000/(sample.fps||8),phase:item.phase??r.phase,sourceSha256:sha256,sourceProvenance:{...sourceProvenance,file:file.name},pixelBounds:sourceAlphaBounds(raw.getContext('2d').getImageData(0,0,img.width,img.height).data,img.width,img.height,{stride:4,alphaOffset:3}),review:{state:r.qa?.visual||'not-reviewed',notes:r.qa?.notes||'',origin:sample.origin==='existing-project'?'SHA-bound original project crop receipt':sample.origin==='skeletal-render'?'SHA-bound skeletal render with independently verified source snapshots':'SHA-bound actual single-frame receipt'}});
  }
  frames=imported;provenance={type:sample.origin==='existing-project'?'imported-existing-project':sample.origin==='skeletal-render'?'skeletal-render-sequence':'imagegen-sequence',sampleId:sample.id,tool:sample.origin==='existing-project'?'original project sourceRect import':sample.origin==='skeletal-render'?'renderCanvas':'image_gen.imagegen',verification:sample.origin==='existing-project'?'original project frame SHA bound to atlas/mapping crop receipt; not new generation':sample.origin==='skeletal-render'?'actual PNG and atlas/asset/motion/renderer snapshot byte SHA verified; skeletal render, not imagegen':'each actual source PNG SHA matches separate generation receipt; packing is deterministic, not an imagegen sheet call',files:frames.map(f=>({file:f.name,sha256:f.sourceSha256})),sourceQA:sample.visualQA||'not-reviewed',sourceQANotes:sample.qaNotes||[]};selected=0;refresh();
 }else{
  const source=await read(sample.source);receipt=sample.receipt?await read(sample.receipt,true):null;sheetFile=new File([source],sample.source.split('/').pop(),{type:source.type});
  $('import-cols').value=sample.columns;$('import-rows').value=sample.rows;$('import-count').value=sample.count;$('image-fps').value=sample.fps||8;
  await splitImportedSheet();if(receipt&&provenance.type!=='imagegen')throw new Error('样例来源记录与真实图片 SHA-256 不匹配');
  provenance={...provenance,sampleId:sample.id,sourceQA:sample.visualQA||'not-reviewed',sourceQANotes:sample.qaNotes||[]};
 }
 $('sample-review').textContent=`${sample.label} · ${sample.visualQA==='failed'?'素材美术未通过':sample.visualQA==='passed'?'源素材已审查；编辑后需复查':'素材美术待审查'}${sample.qaNotes?.length?' · '+sample.qaNotes.join('；'):''}`;draw();status('样例已载入。逐帧检查、播放或拍摄后导出。');
});
$('record-stop').onclick=()=>{recordCancelled=true;status('正在停止拍摄；完整帧会保留在拍摄包。');};
$('record').onclick=guarded(async()=>{
  if(recording)return;if(!frames.length)throw new Error('先导入帧动画');
  const {captureCanvasSequence}=await import('/canvas-sequence-capture.mjs');
  const frozen=frames.map(f=>({...f})),cycleDuration=frozen.reduce((s,f)=>s+f.durationMs,0)/1000,cycles=+$('record-cycles').value,duration=cycleDuration*cycles,fps=+$('record-fps').value;
  if(!Number.isInteger(cycles)||cycles<1||cycles>16)throw new Error('拍摄循环圈数必须为1–16整数');
  if(duration>60||!Number.isFinite(fps)||fps<1||fps>30)throw new Error('拍摄支持最多60秒、1–30 FPS');
  const capture=canvas(512,512),background=$('background').value,ew=Math.max(...frozen.map(x=>x.width)),eh=Math.max(...frozen.map(x=>x.height)),scale=Math.min(488/ew,488/eh);
  stop();recording=true;recordCancelled=false;$('record-stop').hidden=false;
  const disabled=[...document.querySelectorAll('button,input,select,textarea')].filter(el=>el.id!=='record-stop').map(el=>[el,el.disabled]);disabled.forEach(([el])=>{el.disabled=true;});
  try{
    const result=await captureCanvasSequence({canvas:capture,duration,fps,shouldCancel:()=>recordCancelled,drawFrame:({context:g,timeSeconds,index})=>{
      const sourceIndex=frameAtTime(frozen,timeSeconds*1000,cycles>1),f=frozen[sourceIndex];g.fillStyle=background==='light'?'#e5e9e7':'#172e39';g.fillRect(0,0,512,512);
      if(background==='checker'){for(let y=0;y<512;y+=24)for(let x=0;x<512;x+=24){g.fillStyle=(x/24+y/24)%2?'#879797':'#bdc9c8';g.fillRect(x,y,24,24);}}
      g.drawImage(f.image,(512-ew*scale)/2,(512-eh*scale)/2,f.width*scale,f.height*scale);
      return {name:`capture-${index+1}.png`,sourceSha256:f.sourceSha256,sourceFrameIndex:sourceIndex,sourceProvenance:f.sourceProvenance,phase:f.phase,review:f.review};
    },onFrame:(frame,index,total)=>{selected=frame.sourceFrameIndex;draw();status(`正在拍摄 ${index+1}/${total} 帧`);}});
    const recordingInfo={type:'canvas-recording',recordedFrom:frameManifest(frozen,animationOptions()),...result.receipt,requestedCycles:cycles,cycleDurationSeconds:cycleDuration,cyclePolicy:'source index repeats chronologically; original PNG count unchanged',mimeType:result.mimeType,background,videoFile:`recording.${result.extension}`,videoSha256:await hash(result.movie),fixedTransform:{sourceCanvasSize:[ew,eh],scale,offset:[(512-ew*scale)/2,(512-eh*scale)/2]},sourceQA:frameManifest(frozen,animationOptions()).visualQA};
    const packageOptions={...animationOptions(),name:`${$('name').value}-capture`,cell:512,columns:Math.min(8,result.frames.length),padding:0,loop:false,provenance:recordingInfo};
    download(await zipExport(result.frames,packageOptions,[{name:`recording.${result.extension}`,data:await result.movie.arrayBuffer()}]),'animation-capture.zip');status(`拍摄包已导出：${result.extension.toUpperCase()} 视频 + ${result.frames.length} 张 PNG + 图集 + 时序。视频时长需用 FFprobe 核查。`);
  }finally{recording=false;$('record-stop').hidden=true;disabled.forEach(([el,was])=>{el.disabled=was;});}
});
refresh(); requestAnimationFrame(tick);loadSamples();
