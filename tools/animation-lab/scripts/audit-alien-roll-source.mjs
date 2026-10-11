import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'examples/alien-direct-roll-v1');
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/source-audit.cjs');
const sharp=require('sharp'),{createCanvas,ImageData}=require('@napi-rs/canvas');
const files=['source-v1.png','source-v2.png','key-0-v1.png','key-0-v2.png','key-4-v1.png'],records=[],decoded=new Map();
for(const file of files){
 const bytes=await fs.readFile(path.join(dir,file)),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1,visible=0,redRGB=0,visibleRed=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const k=(y*info.width+x)*4,red=data[k]>150&&data[k+1]<60&&data[k+2]<60;
  if(red)redRGB++;if(data[k+3]<=24)continue;if(red)visibleRed++;
  visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
 }
 const bbox=visible?[minX,minY,maxX,maxY]:null,margin=visible?Math.min(minX,minY,info.width-1-maxX,info.height-1-maxY):null;
 records.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),width:info.width,height:info.height,alphaThreshold:24,visiblePixels:visible,bbox,minimumSafetyMargin:margin,redRGBPixels:redRGB,redPixelsAboveAlphaThreshold:visibleRed,...(file.startsWith('source-')?{grid:{columns:4,rows:4,exactIntegerCells:info.width%4===0&&info.height%4===0}}:{targetGroundY:1199,bottomDeltaFromGround:maxY-1199}),visual:'failed'});
 const canvas=createCanvas(info.width,info.height);canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data),info.width,info.height),0,0);decoded.set(file,canvas);
}
const names=['key-0-v2.png','key-4-v1.png'],sheet=createCanvas(2508,1294),ctx=sheet.getContext('2d');ctx.fillStyle='#e4edf0';ctx.fillRect(0,0,sheet.width,sheet.height);
names.forEach((name,i)=>{ctx.drawImage(decoded.get(name),i*1254,40);ctx.strokeStyle='#587184';ctx.beginPath();ctx.moveTo(i*1254,1239);ctx.lineTo((i+1)*1254,1239);ctx.stroke();ctx.strokeStyle='#bb4b36';ctx.strokeRect(i*1254+40,80,1174,1174);ctx.fillStyle='#21363f';ctx.font='24px sans-serif';ctx.fillText(name+' / SAME 1:1 camera / floor 1199',i*1254+20,30);});
await fs.writeFile(path.join(dir,'fixed-source-registration.png'),sheet.toBuffer('image/png'));
const report={schemaVersion:1,generatedAt:new Date().toISOString(),inspection:'All source PNGs actually viewed. Common 1:1 comparison is a diagnostic render, never a replacement source or per-frame normalization.',visual:'failed',productionRegistration:false,records,findings:[
 'Both 4x4 atlases have non-integer equal cells and sprites cross intended cell boundaries; reject before extraction.',
 'Neutral v1 turns to 3/4 camera and has separate projected sole levels. Neutral v2 fixes one-eye side camera but far limbs are hidden in neutral.',
 'Contact v1 shows both arms/legs coherently, but head grows and the common floor is missed. Do not fit each pose independently.',
 'Red RGB in zero-alpha pixels is not a visible colored halo. Alpha-aware decoding/compositing is required before diagnosing fringe.',
 'No complete roll sequence has passed anatomy, camera, fixed scale, ground registration, or UI playback review.'
]};
await fs.writeFile(path.join(dir,'source-qa.json'),JSON.stringify(report,null,2));console.log(records.map(({file,width,height,bbox,bottomDeltaFromGround,redPixelsAboveAlphaThreshold})=>({file,width,height,bbox,bottomDeltaFromGround,redPixelsAboveAlphaThreshold})));
