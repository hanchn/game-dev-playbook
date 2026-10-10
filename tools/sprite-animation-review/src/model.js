const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const positive = (n) => finite(n) && n > 0;
const integer = (n) => Number.isInteger(n) && n >= 0;
export const wrap = (n, length) => ((n % length) + length) % length;

export function normalizeManifest(raw) {
  if (!raw || !Array.isArray(raw.characters) || !raw.characters.length) throw Error('配置需要非空 characters 数组');
  if (raw.characters.length > 100) throw Error('每批最多 100 个角色，请分批验收');
  const ids = new Set();
  return {characters: raw.characters.map((item) => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(item.id) || ids.has(item.id)) throw Error('角色 id 必须唯一，只含字母、数字、下划线或横线');
    ids.add(item.id);
    if (typeof item.path !== 'string' || !item.path || /^(?:[a-z]+:|\/\/)/i.test(item.path)) throw Error(`${item.id}: 使用本机文件名或本地服务路径`);
    let frames = item.frames;
    if (!frames) {
      const {columns, rows, frameWidth, frameHeight, count = columns * rows} = item.grid || {};
      if (![columns, rows, frameWidth, frameHeight, count].every(n => Number.isInteger(n) && n > 0) || count > columns * rows || count > 256) throw Error(`${item.id}: grid 无效`);
      frames = Array.from({length:count}, (_, i) => ({x:i % columns * frameWidth, y:Math.floor(i / columns) * frameHeight, width:frameWidth, height:frameHeight}));
    }
    if (!Array.isArray(frames) || !frames.length || frames.length > 256) throw Error(`${item.id}: 帧数应为 1–256`);
    frames = frames.map(f => {
      if (!f || !integer(f.x) || !integer(f.y) || !Number.isInteger(f.width) || !positive(f.width) || !Number.isInteger(f.height) || !positive(f.height)) throw Error(`${item.id}: 帧矩形无效`);
      const offsetX = f.offsetX ?? 0, offsetY = f.offsetY ?? 0;
      if (!finite(offsetX) || !finite(offsetY)) throw Error(`${item.id}: 偏移应为有限数字`);
      return {x:f.x,y:f.y,width:f.width,height:f.height,offsetX,offsetY};
    });
    if (frames.some(f => f.width !== frames[0].width || f.height !== frames[0].height)) throw Error(`${item.id}: 所有帧须使用相同逻辑画布`);
    const playFrames = item.playFrames ?? frames.map((_,i) => i);
    if (!Array.isArray(playFrames) || !playFrames.length || playFrames.some(i => !integer(i) || i >= frames.length)) throw Error(`${item.id}: 播放序列无效`);
    const fps = item.fps ?? item.walkFps ?? 7, stride = item.stride ?? 100, previewSpeed = item.previewSpeed ?? 80, bodyWidth = item.bodyWidth ?? frames[0].width;
    if (![fps,stride,bodyWidth].every(positive) || !finite(previewSpeed) || previewSpeed < 0) throw Error(`${item.id}: 帧率、步幅、身体宽度或模拟速度无效`);
    const originX = item.originX ?? .5, originY = item.originY ?? .9;
    if (![originX,originY].every(n => finite(n) && n >= 0 && n <= 1)) throw Error(`${item.id}: 锚点应在 0–1 内`);
    const direction = item.direction ?? 'right';
    if (!['left','right'].includes(direction)) throw Error(`${item.id}: 朝向应为 left 或 right`);
    const minMargin = item.minMargin ?? 3;
    if (!integer(minMargin)) throw Error(`${item.id}: minMargin 无效`);
    return {id:item.id,name:String(item.name ?? item.id),path:item.path,frames,playFrames:[...playFrames],fps,stride,previewSpeed,bodyWidth,originX,originY,direction,minMargin};
  })};
}
export function validateBounds(cfg, width, height) {
  if (cfg.frames.some(f => f.x + f.width > width || f.y + f.height > height)) throw Error(`${cfg.id}: 帧矩形越出图片 (${width}×${height})`);
}
export function frameAt(phase,cfg) { return cfg.playFrames[Math.floor(wrap(phase,1) * cfg.playFrames.length)]; }
export function advance(phase,dt,cfg,mode,speed=1) {
  const elapsed = Math.max(0,Math.min(dt, .05));
  const cycles = mode === 'distance' ? cfg.previewSpeed / cfg.stride : cfg.fps / cfg.playFrames.length;
  return wrap(phase + elapsed * cycles * speed,1);
}
export function placement(frame,scale,flip) { return {x:frame.offsetX * scale * (flip ? -1 : 1),y:frame.offsetY * scale}; }
export function exportConfig(cfg) {
  const columns = Math.min(4,cfg.frames.length), {width,height} = cfg.frames[0];
  return {...cfg,path:`${cfg.id}-review.png`,frames:cfg.frames.map((f,i) => ({...f,x:i % columns * width,y:Math.floor(i / columns) * height}))};
}
