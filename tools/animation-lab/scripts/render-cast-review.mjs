import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
import {createAsset,pose,productionSpecies} from '../game-core.mjs';
import {drawCanvas} from '../skin-renderer.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(process.argv[2]??path.join(root,'examples/cast-review-v1'));
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/review.cjs');
const {createCanvas,ImageData}=require('@napi-rs/canvas'),sharp=require('sharp');
const skins=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'))),receipt={scope:'actual production Canvas raster, all clips at four phases plus every movable joint neutral/extremes; visual conclusions recorded separately',characters:[]};
await fs.mkdir(out,{recursive:true});
for(const id of [...productionSpecies,'alien']){
 const asset=createAsset(id==='alien'?'human':id,id==='alien'?{skin:'alien'}:{}),skin=skins[asset.rendering.skinKey??asset.species],bytes=await fs.readFile(path.join(root,'public',skin.atlas)),raw=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),image=createCanvas(raw.info.width,raw.info.height);image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height),0,0);
 const jobs=[];for(const clip of asset.clips.filter(c=>c!=='extend'))for(const t of [0,.25,.5,.75])jobs.push({clip,t,scope:'character'});
 for(const p of asset.parts.filter(p=>p.id!=='root'&&(p.range||p.arm!==undefined||p.leg!==undefined||['head','neck','body-chain','tail-chain','leg-segment'].includes(p.role))))for(const t of [0,.25,.75])jobs.push({clip:'extend',scope:'component',partId:p.id,t});
 const folder=path.join(out,id);await fs.mkdir(folder,{recursive:true});const pages=[];
 for(let start=0;start<jobs.length;start+=16){const batch=jobs.slice(start,start+16);for(const [bg,color] of [['dark','#172e39'],['light','#edf2f4']]){const sheet=createCanvas(2048,2048),ctx=sheet.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,2048,2048);
 for(let j=0;j<batch.length;j++){const opts=batch[j],state=pose(asset,opts.t,opts),frame=createCanvas(512,512);drawCanvas(frame.getContext('2d'),asset,state,skin,image,{maskCanvasFactory:(w,h)=>createCanvas(w,h),scope:opts.scope,selected:opts.partId});ctx.drawImage(frame,j%4*512,Math.floor(j/4)*512);ctx.fillStyle=bg==='dark'?'#e6eff2':'#172e39';ctx.font='16px sans-serif';ctx.fillText(`${id} ${opts.partId??opts.clip} ${opts.t}`,j%4*512+12,Math.floor(j/4)*512+28);}
 const name=`${String(start/16+1).padStart(2,'0')}-${bg}.png`;await fs.writeFile(path.join(folder,name),sheet.toBuffer('image/png'));pages.push({path:id+'/'+name,background:bg,jobs:batch});}}
 receipt.characters.push({id,assetId:asset.id,atlas:skin.atlas,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),asset,skin,frames:jobs.length,pages,status:'not-reviewed'});
}
receipt.implementationSha256=Object.fromEntries(await Promise.all(['skin-renderer.mjs','strip-skin.mjs','human-rig.mjs','flex-rig.mjs','animal-rig.mjs','arthropod-rig.mjs'].map(async f=>[f,crypto.createHash('sha256').update(await fs.readFile(path.join(root,f))).digest('hex')])));
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({out,characters:receipt.characters.map(c=>({id:c.id,frames:c.frames,pages:c.pages.length}))}));
