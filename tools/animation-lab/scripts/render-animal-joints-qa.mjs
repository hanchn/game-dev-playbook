import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createAsset,pose} from '../game-core.mjs';
import {drawCanvas,frameFor} from '../skin-renderer.mjs';
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/joint-qa.cjs');
const {createCanvas,ImageData}=require('@napi-rs/canvas'),sharp=require('sharp');
const root=path.resolve(import.meta.dirname,'..'),species=process.argv[2],out=path.resolve(process.argv[3]),a=createAsset(species),skin=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json')))[species],source=await fs.readFile(path.join(root,'public',skin.atlas));
const raw=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),im=createCanvas(raw.info.width,raw.info.height);im.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height),0,0);
await fs.mkdir(out,{recursive:true});const record={assetId:a.id,atlas:skin.atlas,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),rendering:'production drawCanvas; full opacity; each selected joint only; same fixed crop across all phases',visual:'not-reviewed',items:[]},frame=frameFor(a);
for(const p of a.parts.filter(p=>p.role)){
 const phases=[0,.125,.25,.375,.5,.625,.75,.875,1],s0=pose(a,0,{clip:'extend',scope:'component',partId:p.id}),n=s0.nodes[p.id],center={x:n.x+(n.end?(n.end.x-n.x)*.3:0),y:n.y+(n.end?(n.end.y-n.y)*.3:0)},span=130;
 for(const [background,color] of [['dark','#172e39'],['light','#edf2f4']]){
  const sheet=createCanvas(1024,1024),ctx=sheet.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<9;i++){const full=createCanvas(512,512);drawCanvas(full.getContext('2d'),a,pose(a,phases[i],{clip:'extend',scope:'component',partId:p.id}),skin,im,{maskCanvasFactory:(w,h)=>createCanvas(w,h)});const sx=frame.anchor[0]+(center.x-span/2)*frame.scale*a.design.size,sy=frame.anchor[1]+(center.y-span/2)*frame.scale*a.design.size,ss=span*frame.scale*a.design.size;ctx.drawImage(full,sx,sy,ss,ss,i%3*341,Math.floor(i/3)*341+36,341,305);ctx.fillStyle=background==='dark'?'#fff':'#172e39';ctx.font='14px sans-serif';ctx.fillText(`${p.id} t=${phases[i]} fixed130world`,i%3*341+8,Math.floor(i/3)*341+23);}
  const file=p.id+'-'+background+'.png';await fs.writeFile(path.join(out,file),sheet.toBuffer('image/png'));record.items.push({partId:p.id,background,phases,file,center,span,review:'not-reviewed'});
 }
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(record,null,2));console.log({asset:a.id,out,items:record.items.length});
