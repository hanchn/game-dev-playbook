import fs from 'node:fs';
import path from 'node:path';
import {png} from './read-png.mjs';
import {normalizeManifest,validateBounds} from '../src/model.js';
const [manifestPath,rootText] = process.argv.slice(2);
if(!manifestPath)throw Error('用法: npm run check -- 配置.json [图片根目录，默认配置所在目录]');
const root=path.resolve(rootText??path.dirname(manifestPath)), report=[];
for(const cfg of normalizeManifest(JSON.parse(fs.readFileSync(manifestPath,'utf8'))).characters) {
  const file=path.resolve(root,cfg.path.replace(/^\/+/,''));
  if(!file.startsWith(root+path.sep))throw Error(`${cfg.id}: 图片路径越出根目录`);
  const image=png(file);validateBounds(cfg,image.w,image.h);
  const frames=cfg.frames.map((f,index)=> {
    let left=f.width,top=f.height,right=-1,bottom=-1;
    for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++)if(image.pixels[((f.y+y)*image.w+f.x+x)*4+3]>128){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    const empty=right<0,margin=empty?null:Math.min(left,top,f.width-right-1,f.height-bottom-1);
    return {index,empty,margin,bounds:empty?null:[left,top,right,bottom],passed:!empty&&margin>=cfg.minMargin};
  });
  report.push({id:cfg.id,size:[image.w,image.h],playFrames:cfg.playFrames,frames,passed:frames.every(f=>f.passed)});
}
const passed=report.every(c=>c.passed);
console.log(JSON.stringify({passed,alphaThreshold:128,report,notice:'仅验证技术边界；换腿、摆臂、滑步与循环需视觉验收。'},null,2));
if(!passed)process.exitCode=1;
