import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createAsset,pose} from '../game-core.mjs';
import {drawCanvas} from '../skin-renderer.mjs';
import {scanAtlas} from './scan-atlas.mjs';

const out='examples/dinosaur-leg-straight-v1',require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const sharp=require('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
// Once created, retain the actual v12 baseline instead of silently rebasing a failed comparison.
const asset=JSON.parse(await fs.readFile(out+'/asset.json','utf8').catch(()=>JSON.stringify(createAsset('dinosaur'))));
const baseline=JSON.parse(await fs.readFile(out+'/baseline-skin.json','utf8').catch(async()=>JSON.stringify(JSON.parse(await fs.readFile('public/art/skins.json')).dinosaur)));
const candidate=structuredClone(baseline),file=out+'/leg-parts-v1.png',scan=scanAtlas(file,{precision:true,tileCount:3,rows:1});
const landmarks=[[[357,185],[469,870]],[[827,225],[859,870]],[[1224.5,400],[1229,870]]];
const normalize=(point,r)=>[(point[0]-r[0])/r[2],(point[1]-r[1])/r[3]];
for(let i=0;i<3;i++)candidate.tiles[i+2]={...scan.tiles[i],pivot:normalize(landmarks[i][0],scan.tiles[i].rect),distal:normalize(landmarks[i][1],scan.tiles[i].rect),source:'neutralLeg',ownership:['髋至膝的单一股段','膝至踝的单一胫段','踝至趾根的单一跖段'][i],sourceOwnership:{kind:'one-anatomical-segment',landmarks:landmarks[i],sourcePixelsUnmodified:true}};
candidate.sources={...candidate.sources,neutralLeg:{atlas:'/qa-evidence/dinosaur-leg-straight-v1/leg-parts-v1.png',width:scan.width,height:scan.height,transparent:true}};
candidate.qa={...candidate.qa,visual:'candidate-not-accepted',scope:'only tiles2/3/4; all other source tiles and rig unchanged'};
async function load(file){const {data,info}=await sharp(await fs.readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),image=createCanvas(info.width,info.height);image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data),info.width,info.height),0,0);return image;}
const image=await load(path.join('public',baseline.atlas));image.sourceImages={neutralLeg:await load(file)};
const sourceRecords=[];for(const [key,sourceFile] of [['original',path.join('public',baseline.atlas)],['neutralLeg',file]])sourceRecords.push({key,file:sourceFile,sha256:createHash('sha256').update(await fs.readFile(sourceFile)).digest('hex')});
await fs.writeFile(out+'/candidate-skin.json',JSON.stringify(candidate,null,2));
await fs.writeFile(out+'/baseline-skin.json',JSON.stringify(baseline,null,2));
await fs.writeFile(out+'/asset.json',JSON.stringify(asset,null,2));
const items=[];
for(const clip of ['idle','walk','run','jump','roar','bite','tail','extend'])for(const [name,color] of [['light','#edf2f4'],['dark','#172e39']]){
 const sheet=createCanvas(2048,2048),ctx=sheet.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,sheet.width,sheet.height);
 for(let i=0;i<16;i++){
  const phase=i/(clip==='jump'?15:16),state=pose(asset,phase,{clip}),pair=createCanvas(1024,512),pc=pair.getContext('2d');pc.fillStyle=color;pc.fillRect(0,0,1024,512);
  for(const [j,skin]of [baseline,candidate].entries()){
   const c=createCanvas(512,512),cx=c.getContext('2d');cx.fillStyle=color;cx.fillRect(0,0,512,512);drawCanvas(cx,asset,state,skin,image,{maskCanvasFactory:createCanvas});
   pc.drawImage(c,j*512,0);pc.fillStyle=name==='dark'?'white':'#172e39';pc.font='16px sans-serif';pc.fillText(`${j?'candidate':'production12'} ${clip} ${phase.toFixed(3)}`,j*512+14,24);
  }
  // Contact sheet is diagnostic, with paired fixed-camera 512px native frames scaled to fit.
  ctx.drawImage(pair,(i%4)*512,Math.floor(i/4)*512+48,512,256);
  if(i===0||i===4||i===8||i===12){const f=`${clip}-${i}-${name}-pair.png`;await fs.writeFile(out+'/'+f,pair.toBuffer('image/png'));items.push({file:f,clip,phase,background:name,kind:'native-pair'});}
 }
 const f=`${clip}-${name}-sheet.png`;await fs.writeFile(out+'/'+f,sheet.toBuffer('image/png'));items.push({file:f,clip,background:name,kind:'diagnostic-sheet'});
}
const implementation=[];for(const file of ['animal-rig.mjs','game-core.mjs','skin-renderer.mjs','strip-skin.mjs','human-soft-skin.mjs'])implementation.push({file,url:'/'+file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});
await fs.writeFile(out+'/manifest.json',JSON.stringify({assetId:asset.id,frame:asset.rendering.frame,sources:sourceRecords,implementation,landmarks,items,visual:'not-reviewed',productionChanged:false},null,2));
console.log({out,items:items.length,sourceMasks:scan.tiles.map(t=>t.mask.qa)});
