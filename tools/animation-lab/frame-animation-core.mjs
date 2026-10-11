export const MAX_FRAMES = 128;
const number = (value, name, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} 必须在 ${min}–${max} 之间`);
  return n;
};

// Sampling is half-open: the end time is not an extra duplicate loop frame.
export function samplingPlan({ duration, start = 0, end = duration, fps = 8, times } = {}) {
  duration = number(duration, '视频时长', .001, 3600);
  start = number(start, '开始时间', 0, duration);
  end = number(end, '结束时间', 0, duration);
  if (end <= start) throw new Error('结束时间必须晚于开始时间');
  fps = number(fps, '采样 FPS', .1, 60);
  let points;
  if (times !== undefined && times !== '') {
    points = Array.isArray(times) ? [...times] : String(times).split(/[\s,，]+/).filter(Boolean).map(Number);
    if (!points.length) throw new Error('时间点不能为空');
    points = points.map(t => number(t, '采样时间', start, end));
    if (points.some(t => t >= end)) throw new Error('采样时间必须小于结束时间');
    points.sort((a, b) => a - b);
    if (points.some((t, i) => i && Math.abs(t - points[i - 1]) < 1e-6)) throw new Error('采样时间不能重复');
  } else {
    const count = Math.ceil((end - start) * fps - 1e-9);
    if (count > MAX_FRAMES) throw new Error(`一次最多 ${MAX_FRAMES} 帧，请缩短范围或降低 FPS`);
    points = Array.from({ length: count }, (_, i) => start + i / fps);
  }
  if (points.length > MAX_FRAMES) throw new Error(`一次最多 ${MAX_FRAMES} 帧`);
  return points.map((sourceTime, i) => ({ sourceTime, durationMs: Math.max(1, ((points[i + 1] ?? end) - sourceTime) * 1000) }));
}

export function chronologicalFiles(files) {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
}
export function gridCells(width, height, columns, rows, count = columns * rows) {
  for (const [key, value, min, max] of [['width', width, 1, 16384], ['height', height, 1, 16384], ['columns', columns, 1, 16], ['rows', rows, 1, 32], ['count', count, 1, MAX_FRAMES]]) {
    number(value, key, min, max); if (!Number.isInteger(value)) throw new Error('网格尺寸必须为整数');
  }
  if (count > columns * rows || width < columns || height < rows) throw new Error('网格帧数或尺寸无效');
  // Integer partition covers every source pixel even for odd imagegen output dimensions.
  return Array.from({ length: count }, (_, i) => { const col = i % columns, row = Math.floor(i / columns), x = Math.floor(col * width / columns), y = Math.floor(row * height / rows); return [x, y, Math.floor((col + 1) * width / columns) - x, Math.floor((row + 1) * height / rows) - y]; });
}

export function validateFrames(frames) {
  if (!Array.isArray(frames) || !frames.length || frames.length > MAX_FRAMES) throw new Error(`需要 1–${MAX_FRAMES} 张帧图`);
  frames.forEach((f, i) => {
    number(f.width, `帧 ${i + 1} 宽度`, 1, 16384);
    number(f.height, `帧 ${i + 1} 高度`, 1, 16384);
    number(f.durationMs, `帧 ${i + 1} 时长`, 1, 60000);
  });
  return frames.reduce((sum, f) => sum + f.durationMs, 0);
}

export function frameAtTime(frames, milliseconds, loop = true) {
  const total = validateFrames(frames);
  let t = Math.max(0, Number(milliseconds) || 0);
  t = loop ? t % total : Math.min(t, total - .000001);
  // The summed fractional frame durations may put an exact cycle boundary just below total.
  if (loop && total - t <= 1e-7) t = 0;
  for (let i = 0; i < frames.length; i++) {
    // Sub-microsecond rounding at fractional-FPS boundaries must select the new frame.
    if (t < frames[i].durationMs - 1e-7) return i;
    t -= frames[i].durationMs;
  }
  return frames.length - 1;
}

export function sheetLayout(frames, { cell = 256, columns = 4, padding = 12 } = {}) {
  validateFrames(frames);
  cell = number(cell, '格子大小', 32, 1024);
  columns = number(columns, '列数', 1, 16);
  padding = number(padding, '留边', 0, cell / 3);
  if (![cell, columns, padding].every(Number.isInteger)) throw new Error('图集尺寸必须为整数');
  columns = Math.min(columns, frames.length);
  const rows = Math.ceil(frames.length / columns), width = columns * cell, height = rows * cell;
  if (width > 8192 || height > 8192 || width * height > 33554432) throw new Error('图集过大，请增加列数或缩小格子');
  const area = cell - padding * 2, sourceCanvasSize=[Math.max(...frames.map(f=>f.width)),Math.max(...frames.map(f=>f.height))];
  const scale=Math.min(area/sourceCanvasSize[0],area/sourceCanvasSize[1],1);
  const w=Math.max(1,Math.round(sourceCanvasSize[0]*scale)),h=Math.max(1,Math.round(sourceCanvasSize[1]*scale));
  const offset=[Math.floor((cell-w)/2),Math.floor((cell-h)/2)];
  const fixedTransform={mode:'sequence-common-canvas',sourceCanvasSize,sourceOrigin:[0,0],scale,scaleXY:[w/sourceCanvasSize[0],h/sourceCanvasSize[1]],offset,sourceAnchor:[sourceCanvasSize[0]/2,sourceCanvasSize[1]],anchor:[offset[0]+w/2,offset[1]+h],rasterRoundingPx:0.5,registration:'source coordinates retained; no per-frame alpha fitting or automatic recentering'};
  return { width, height, cell, columns, rows, padding, fixedTransform, frames: frames.map((f, i) => {
    const x = i % columns * cell, y = Math.floor(i / columns) * cell;
    return { index: i, rect: [x, y, cell, cell], contentRect: [x+offset[0],y+offset[1],w,h],sourceSize:[f.width,f.height],sourceCanvasSize,scale,anchor:fixedTransform.anchor };
  }) };
}

export function receiptFrameReview(receipt,index){
  const source=receipt?.qa?.frames?.find(f=>f.index===index)||receipt?.qa?.frames?.[index];
  if(!source)return undefined;
  const state=source.review?.state||source.status||'not-reviewed';
  return {state:['failed','passed','not-reviewed'].includes(state)?state:'not-reviewed',notes:String(source.review?.notes||source.notes||''),origin:'SHA-bound source receipt; review claim supplied by importer'};
}
export function sourceAlphaBounds(bytes,width,height,{stride=1,alphaOffset=0,threshold=24}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||bytes.length<width*height*stride)throw new Error('原帧 alpha 缓冲区无效');
  let x0=width,y0=height,x1=-1,y1=-1,edgePixels=0,transparentPixels=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=bytes[(y*width+x)*stride+alphaOffset];if(a===0)transparentPixels++;if(a>=threshold){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);if(x===0||y===0||x===width-1||y===height-1)edgePixels++;}}
  return{threshold,bounds:x1<0?null:[x0,y0,x1-x0+1,y1-y0+1],edgePixels,hasTransparency:transparentPixels>0,touchesEdge:edgePixels>0,definition:'original bitmap alpha, before export padding/scale; opaque video borders are not sprite clipping'};
}
export function frameManifest(frames, options = {}) {
  const durationMs = validateFrames(frames), layout = sheetLayout(frames, options);
  let timeMs = 0;
  return { format: 'sprite-frame-animation', schemaVersion: 1, name: String(options.name || 'frame-animation'),
    loop: Boolean(options.loop), durationMs, sheet: { file: 'sheet.png', width: layout.width, height: layout.height, cell: layout.cell, columns: layout.columns, rows: layout.rows, padding: layout.padding,fixedTransform:layout.fixedTransform },
    provenance: options.provenance || { type: 'imported-images', verification: 'user-supplied; not verified as generated' },
    visualQA: options.provenance?.sourceQA === 'failed' || frames.some(f=>f.review?.state==='failed'||f.pixelBounds?.hasTransparency&&f.pixelBounds?.touchesEdge) ? 'failed' : 'not-reviewed', frames: frames.map((f, i) => {
      const result = { ...layout.frames[i], name: f.name || `frame-${i + 1}`, phase:f.phase??null, file:`frames/${String(i+1).padStart(3,'0')}.png`, timeMs, durationMs: f.durationMs, sourceTime: f.sourceTime ?? null, decodedTime: f.decodedTime ?? null, sourceFrameIndex:f.sourceFrameIndex??null, sourceRect: f.sourceRect ?? null, sourceSha256: f.sourceSha256 ?? null,sourceProvenance:f.sourceProvenance??null,pixelBounds:f.pixelBounds??null, review:f.review||{state:'not-reviewed',notes:''} };
      timeMs += f.durationMs;
      return result;
    }) };
}

// ZIP store format: PNGs are already compressed. No dependency or network code required.
export function storedZip(files) {
  if (!files.length || files.length > 256) throw new Error('ZIP 文件数无效');
  const encoder = new TextEncoder(), table = Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc = bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const parts=[],directories=[];let offset=0;
  for(const file of files){
    if(!file.name || file.name.startsWith('/') || file.name.includes('\\') || file.name.split('/').includes('..'))throw new Error('ZIP 路径无效');
    const name=encoder.encode(file.name),data=file.data instanceof Uint8Array?file.data:new Uint8Array(file.data);
    if(name.length>65535 || offset+data.length>134217728)throw new Error('ZIP 最多 128 MB');
    const checksum=crc(data),local=new Uint8Array(30+name.length),l=new DataView(local.buffer);
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,0x21,true);l.setUint32(14,checksum,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,name.length,true);local.set(name,30);
    const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);c.setUint32(16,checksum,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
    parts.push(local,data);directories.push(central);offset+=local.length+data.length;
  }
  const directorySize=directories.reduce((s,d)=>s+d.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,directorySize,true);e.setUint32(16,offset,true);
  const result=new Uint8Array(offset+directorySize+22);let pos=0;for(const part of [...parts,...directories,end]){result.set(part,pos);pos+=part.length;}return result;
}

export function generationRequest({ subject, action, count = 8, fps = 8, columns = 4, reference = '' } = {}) {
  if (!String(subject || '').trim() || !String(action || '').trim()) throw new Error('请填写角色和动作');
  count = number(count, '生成帧数', 2, 32);
  columns = number(columns, '列数', 1, 8);
  fps = number(fps, '播放 FPS', 1, 60);
  if (!Number.isInteger(count) || !Number.isInteger(columns) || count % columns) throw new Error('生成帧数须是列数的整数倍');
  const prompt = `Use case: stylized-concept\nAsset type: game sprite frame animation sheet\nSubject: ${subject}\nAction: ${action}\nLayout: exactly ${count} chronological frames in ${columns} columns and ${count / columns} rows, equal-size cells, read left-to-right then top-to-bottom.\nBackground: genuine alpha transparency. No text, grid lines or frame numbers.\nContinuity: same character identity, anatomy, proportions, material, camera, lighting and ground baseline across every frame. Full body and extremities fit inside each cell with generous margin. Motion progresses in time; include both near and far limbs alternating naturally and keep attachment points continuous. No character may cross into adjacent cells.\nBiological motion: preserve permanent near/far limb identities. For quadrupeds distinguish near/far forelegs and hindlegs, species-appropriate footfall order, support, lift, passing and landing. Never add legs to legless animals. Keep the same face/eye shape and appropriate stable gaze; expression follows the action, no identity drift or forced blink in every short loop. A separate long idle may have a coherent open/half-closed/closed/open eyelid sequence. Humanoid grip actions need real matching hand states (open, fist, gripping, releasing) with fingers around the held object and correct wrist/prop occlusion.\nFraming: fixed camera, canvas, scale, pivot and ground baseline; sufficient motion envelope and safe alpha margin on every raw frame. No per-frame zoom or recentering to hide clipping.\n${reference ? `Reference: ${reference}\n` : ''}Output is a bitmap sprite sequence, not a skeleton pose JSON.`;
  return { format: 'imagegen-frame-request', schemaVersion: 1, status: 'awaiting-real-imagegen-output', tool: 'image_gen.imagegen', transparent_background: true, prompt, layout: { count, columns, rows: count / columns }, timing: { fps, durationMs: Math.round(1000 / fps) }, provenanceRequired: ['tool', 'prompt', 'generatedFile', 'generatedFileSha256'], visualQA: 'not-reviewed' };
}

// Existing project imports are provenance-bound crops, never newly generated images.
export function existingProjectFrameProvenance(receipt,sha256){
 if(receipt?.kind!=='existing-project-frame'||receipt.fileSha256!==sha256||!receipt.tool||!receipt.inputSource?.file||!/^([a-f0-9]{64})$/.test(receipt.inputSource.sha256)||!/^([a-f0-9]{64})$/.test(receipt.inputSource.mappingSha256))throw Error('已有项目帧来源或实际图片 SHA-256 不匹配');
 const rect=receipt.inputSource.sourceRect,offset=receipt.inputSource.offset,size=receipt.fixedCanvas;
 if(!Array.isArray(rect)||rect.length!==4||rect.some(x=>!Number.isFinite(x))||rect[0]<0||rect[1]<0||rect[2]<=0||rect[3]<=0||!Array.isArray(offset)||offset.length!==2||offset.some(x=>!Number.isFinite(x))||!Array.isArray(size)||size.length!==2||size.some(x=>!Number.isInteger(x)||x<1||x>16384))throw Error('已有项目裁切范围无效');
 return {type:'imported-existing-project',tool:receipt.tool,receipt,sha256,originalAtlas:receipt.inputSource};
}

// Bind rendered PNGs to the actual source snapshots; this is not image generation.
export async function skeletalRenderedFrameProvenance(receipt,sha256,readSource,hashBytes){
 const isHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 if(receipt?.kind!=='skeletal-render-frame'||!isHash(sha256)||receipt.fileSha256!==sha256||!['renderCanvas','skin-renderer.renderCanvas'].includes(receipt.tool)||!receipt.species||!receipt.skinId||!receipt.action)throw Error('骨骼序列来源类型、身份或实际 PNG SHA-256 不匹配');
 const fixed=receipt.fixedCanvas,dimensions=Array.isArray(fixed)?fixed:[fixed?.width,fixed?.height];
 if(!Number.isInteger(receipt.frameIndex)||receipt.frameIndex<0||!Number.isFinite(receipt.phase)||receipt.phase<0||receipt.phase>1||dimensions.length!==2||dimensions.some(x=>!Number.isInteger(x)||x<1||x>16384)||(!Array.isArray(fixed)&&(!Array.isArray(fixed?.anchor)||fixed.anchor.length!==2||fixed.anchor.some(x=>!Number.isFinite(x))||!Number.isFinite(fixed.scale)||fixed.scale<=0)))throw Error('骨骼序列帧索引、phase或固定画布无效');
 if(typeof readSource!=='function'||typeof hashBytes!=='function')throw Error('骨骼序列必须核对实际源文件字节');
 const verifiedSourceFiles={};
 for(const role of ['atlas','asset','motion','renderer']){
  const source=receipt.sourceFiles?.[role],url=source?.source??source?.sourceURL;
  if(!source?.file||!url||!isHash(source.sha256))throw Error(`骨骼序列缺失${role}源记录`);
  if(await hashBytes(await readSource(url,source))!==source.sha256)throw Error(`骨骼序列${role}源文件实际 SHA-256 不匹配`);
  verifiedSourceFiles[role]={...source,integrityVerification:'actual source bytes SHA-256 verified'};
 }
 return {type:'skeletal-render',tool:receipt.tool,sha256,receipt,species:receipt.species,skinId:receipt.skinId,action:receipt.action,frameIndex:receipt.frameIndex,phase:receipt.phase,fixedCanvasSize:dimensions,verifiedSourceFiles,verification:'PNG and atlas/asset/motion/renderer snapshot byte SHA verified; rendering origin declared by producer, not imagegen or a rerender equivalence proof'};
}
