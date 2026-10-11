import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createAsset,pose} from '../game-core.mjs';
import {drawCanvas,commands} from '../skin-renderer.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'examples/human-alien-roll-v10-candidate');
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/roll.cjs'),{createCanvas,ImageData}=require('@napi-rs/canvas'),sharp=require('sharp');
const skin=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json')))['human-alien'],bytes=await fs.readFile(path.join(root,'public',skin.atlas)),raw=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),image=createCanvas(raw.info.width,raw.info.height);image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height),0,0);
const profiles=[['handReach',{spineCurlDegrees:100,chinDegrees:0,chinCurlDegrees:0,footRearShift:-20,footLowerShift:23,armExtensionDegrees:0,elbowFlexDegrees:10,handReachThroughCurl:true}]],receipt={source:skin.atlas,sourceSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),fixedCamera:{anchor:[256,440],scale:1.7,frame:[512,512]},visual:'not-reviewed',candidates:[]};
await fs.mkdir(out,{recursive:true});
for(const [name,profile]of profiles){
 const asset=createAsset('human',{skin:'alien'});asset.rendering.rollGeometry=profile;asset.rendering.frame=receipt.fixedCamera;const dir=path.join(out,name);await fs.mkdir(dir,{recursive:true});const sheet=createCanvas(2048,2048),sc=sheet.getContext('2d'),samples=[];
 for(let i=0;i<16;i++){
  const t=i/15,state=pose(asset,t,{clip:'roll'}),frame=createCanvas(512,512),ctx=frame.getContext('2d');ctx.fillStyle='#edf2f4';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#9daeb5';ctx.beginPath();ctx.moveTo(10,440);ctx.lineTo(502,440);ctx.stroke();drawCanvas(ctx,asset,state,skin,image,{maskCanvasFactory:(w,h)=>createCanvas(w,h)});ctx.fillStyle='#243b44';ctx.font='16px sans-serif';ctx.fillText(`${name} / ${t.toFixed(3)} / fixed 1.7`,15,25);const file=`${String(i).padStart(2,'0')}.png`;await fs.writeFile(path.join(dir,file),frame.toBuffer('image/png'));sc.drawImage(frame,i%4*512,Math.floor(i/4)*512);
  const cs=commands(asset,state,skin),masks=[];for(const ids of [['head'],['leg-0-upper','leg-0-lower','leg-0-foot']]){const c=createCanvas(512,512);drawCanvas(c.getContext('2d'),asset,state,skin,image,{maskCanvasFactory:(w,h)=>createCanvas(w,h),commandList:cs.filter(c=>ids.includes(c.id))});masks.push(c.getContext('2d').getImageData(0,0,512,512).data);}
  let overlap=0;for(let k=3;k<masks[0].length;k+=4)if(masks[0][k]>24&&masks[1][k]>24)overlap++;samples.push({t,file,headNearLegProjectedOverlapPixels:overlap});
 }
 await fs.writeFile(path.join(out,name+'-fixed.png'),sheet.toBuffer('image/png'));receipt.candidates.push({name,profile,samples});
}
await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));console.log(receipt.candidates.map(c=>({name:c.name,maxOverlap:Math.max(...c.samples.map(s=>s.headNearLegProjectedOverlapPixels))})));
