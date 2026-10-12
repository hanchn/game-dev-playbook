import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {pose} from '../game-core.mjs';
import {drawCanvas} from '../skin-renderer.mjs';
import {scanAtlas} from './scan-atlas.mjs';
const require=createRequire(import.meta.url),runtime='/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,ImageData}=require(runtime+'/@napi-rs/canvas'),sharp=require(runtime+'/sharp');
const sourceRoot='examples/dinosaur-foot-proportion-v1',revision=process.argv.includes('--v3')?3:2,out=sourceRoot+'/review-v'+revision;await fs.mkdir(out,{recursive:true});
const asset=JSON.parse(await fs.readFile(sourceRoot+'/baseline-asset.json')),baseline=JSON.parse(await fs.readFile(sourceRoot+'/baseline-skin.json'));
await fs.writeFile(out+'/baseline-asset.json',JSON.stringify(asset,null,2));await fs.writeFile(out+'/baseline-skin.json',JSON.stringify(baseline,null,2));
const scan=scanAtlas(sourceRoot+'/parts-v1.png',{precision:true,tileCount:2,rows:1}),candidate=structuredClone(baseline);
const landmarks=[[[409,180],[417,721]],[[874,448],[1510,700]]];
for(const [i,slot] of [[0,4],[1,10]]){const t=scan.tiles[i],norm=([x,y])=>[(x-t.rect[0])/t.rect[2],(y-t.rect[1])/t.rect[3]];candidate.tiles[slot]={...t,pivot:norm(landmarks[i][0]),distal:norm(landmarks[i][1]),source:'compactFoot',ownership:i?'三趾脚，近远趾自然遮挡':'踝至趾根单段候选，细长感仍待验',sourceOwnership:{landmarks:landmarks[i],sourcePixelsUnmodified:true}};}
candidate.sources.compactFoot={atlas:'/qa-evidence/dinosaur-foot-proportion-v1/parts-v1.png',width:scan.width,height:scan.height,transparent:true};
const metaFile=`metatarsus-v${revision}.png`,metaLandmarks=revision===3?[[732,236],[753,910]]:[[732,236],[743,842]],stout=scanAtlas(sourceRoot+'/'+metaFile,{precision:true,tileCount:1,rows:1}),mt=stout.tiles[0],norm=([x,y])=>[(x-mt.rect[0])/mt.rect[2],(y-mt.rect[1])/mt.rect[3]];
candidate.tiles[4]={...mt,pivot:norm(metaLandmarks[0]),distal:norm(metaLandmarks[1]),source:'stoutMetatarsus',ownership:'踝至趾根单骨粗跖段候选',sourceOwnership:{landmarks:metaLandmarks,sourcePixelsUnmodified:true}};
candidate.sources.stoutMetatarsus={atlas:'/qa-evidence/dinosaur-foot-proportion-v1/'+metaFile,width:stout.width,height:stout.height,transparent:true};
const raw=await sharp(sourceRoot+'/parts-v1.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),footRect=scan.tiles[1].rect;let bottom=-1;
for(let y=footRect[1];y<footRect[1]+footRect[3];y++)for(let x=footRect[0];x<footRect[0]+footRect[2];x++)if(raw.data[(y*raw.info.width+x)*4+3]>=24)bottom=Math.max(bottom,y);
const contactRatio=(bottom-landmarks[1][0][1])/footRect[2];
const variants=[{label:'脚25 / 旧跖22',metatarsus:22,footWidth:25,newMetatarsus:false},{label:'粗跖20 / 脚25',metatarsus:20,footWidth:25,newMetatarsus:true},{label:'粗跖18 / 脚25',metatarsus:18,footWidth:25,newMetatarsus:true},{label:'髋-88 / 股65° / 粗跖20',metatarsus:20,footWidth:25,newMetatarsus:true,hip:-88,neutral:65},{label:'髋-88 / 股65° / 粗跖18',metatarsus:18,footWidth:25,newMetatarsus:true,hip:-88,neutral:65},{label:'髋-90 / 股68° / 粗跖20',metatarsus:20,footWidth:25,newMetatarsus:true,hip:-90,neutral:68}];
await fs.writeFile(out+'/candidate-skin.json',JSON.stringify(candidate,null,2));await fs.writeFile(out+'/variants.json',JSON.stringify(variants,null,2));
async function decode(file){const r=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),c=createCanvas(r.info.width,r.info.height);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(r.data),r.info.width,r.info.height),0,0);return c;}
const image=await decode(path.join('public',baseline.atlas));image.sourceImages={};const sources=[{key:'primary',url:baseline.atlas,file:path.join('public',baseline.atlas)},...Object.entries(baseline.sources).map(([key,s])=>({key,url:s.atlas,file:path.join('public',s.atlas)})),{key:'compactFoot',url:candidate.sources.compactFoot.atlas,file:sourceRoot+'/parts-v1.png'},{key:'stoutMetatarsus',url:candidate.sources.stoutMetatarsus.atlas,file:sourceRoot+'/'+metaFile}];
for(const s of sources){s.sha256=createHash('sha256').update(await fs.readFile(s.file)).digest('hex');if(s.key!=='primary')image.sourceImages[s.key]=await decode(s.file);}
const items=[];
const models=variants.map(cfg=>{const a=structuredClone(asset),skin=structuredClone(candidate);for(const p of a.parts){if(p.role==='upper'&&cfg.hip!==undefined)p.rest[1]=cfg.hip;if(p.role==='lower')p.dimensions[0]=cfg.metatarsus;if(p.role==='foot')p.dimensions[0]=cfg.footWidth;}if(cfg.neutral!==undefined)a.rendering.dinosaurFemurNeutralDeg=cfg.neutral;a.rendering.footContactOffsets=[cfg.footWidth*contactRatio,cfg.footWidth*contactRatio];if(!cfg.newMetatarsus)skin.tiles[4]=baseline.tiles[4];return {a,skin};});
for(const clip of ['idle','walk','run','jump']){
 const sheet=createCanvas(2048,variants.length*512),sc=sheet.getContext('2d');
 for(let v=0;v<variants.length;v++)for(let k=0;k<4;k++){
  const cfg=variants[v],{a,skin}=models[v];
  const phase=k/(clip==='jump'?3:4),pair=createCanvas(1024,512),pc=pair.getContext('2d');
  for(const [j,aa,ss]of [[0,asset,baseline],[1,a,skin]]){const c=createCanvas(512,512),cx=c.getContext('2d');cx.fillStyle='#edf2f4';cx.fillRect(0,0,512,512);drawCanvas(cx,aa,pose(aa,phase,{clip}),ss,image,{maskCanvasFactory:createCanvas});pc.drawImage(c,j*512,0);pc.fillStyle='#17333d';pc.font='14px sans-serif';pc.fillText(`${j?cfg.label:'baseline v13'} ${clip} ${phase.toFixed(3)}`,j*512+12,24);}
  const file=`${clip}-variant${v}-phase${k}-native.png`;await fs.writeFile(out+'/'+file,pair.toBuffer('image/png'));items.push({file,clip,phase,variant:v,kind:'native-pair'});sc.drawImage(pair,k*512,v*512+32,512,256);
 }
 const file=clip+'-proportion-sheet.png';await fs.writeFile(out+'/'+file,sheet.toBuffer('image/png'));items.push({file,clip,kind:'diagnostic-scaled-sheet'});
}
const implementation=[];for(const file of ['animal-rig.mjs','game-core.mjs','skin-renderer.mjs','strip-skin.mjs','human-soft-skin.mjs'])implementation.push({file,url:'/'+file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});
await fs.writeFile(out+'/manifest.json',JSON.stringify({assetId:asset.id,study:'foot',sources,implementation,variants,contactRatio,sourceFootBottom:bottom,landmarks,items,visual:'not-reviewed',productionChanged:false},null,2));console.log({out,items:items.length,contactRatio,bottom,sourceMaskQA:scan.tiles.map(t=>t.mask.qa)});
