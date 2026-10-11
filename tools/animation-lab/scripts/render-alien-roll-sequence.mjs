import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createAsset,pose} from '../game-core.mjs';
import {drawCanvas} from '../skin-renderer.mjs';

const root=path.resolve(import.meta.dirname,'..'),prefix='alien-roll-skeleton-v8',dir=path.join(root,'public/frame-animation-assets'),out=path.join(root,'examples/human-alien-v8/frame-sequence');
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/roll.cjs'),{createCanvas,ImageData}=require('@napi-rs/canvas'),sharp=require('sharp');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(dir,{recursive:true});await fs.mkdir(out,{recursive:true});
const skin=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json')))['human-alien'],atlasBytes=await fs.readFile(path.join(root,'public',skin.atlas)),raw=await sharp(atlasBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),image=createCanvas(raw.info.width,raw.info.height);
image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height),0,0);
const asset=createAsset('human',{skin:'alien'}),fixedCanvas={width:512,height:512,anchor:[256,440],scale:1.7};
asset.rendering.frame={anchor:fixedCanvas.anchor,scale:fixedCanvas.scale,frame:[512,512]};
const frames=Array.from({length:37},(_,i)=>({index:i,phase:i/36,durationMs:1000/30,state:pose(asset,i/36,{clip:'roll'})}));
const code=new Map();
async function collect(file){if(code.has(file))return;const text=await fs.readFile(path.join(root,file),'utf8');code.set(file,{text,sha256:sha(text)});for(const match of text.matchAll(/from\s+['"](\.\/?[^'"]+)['"]/g)){await collect(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])));}}
await collect('game-core.mjs');await collect('skin-renderer.mjs');
const sources={atlas:atlasBytes,asset:Buffer.from(JSON.stringify({asset,skin,fixedCanvas},null,2)),motion:Buffer.from(JSON.stringify({clip:'roll',fps:30,nominalMotionDurationSeconds:1.2,playbackDurationSeconds:37/30,terminalHoldSeconds:1/30,loop:false,frames},null,2)),renderer:Buffer.from(JSON.stringify({kind:'actual-source-code-snapshot',modules:Object.fromEntries(code),decoder:'sharp ensureAlpha raw → @napi-rs/canvas ImageData',renderer:'drawCanvas',perFrameFit:false},null,2))};
const sourceFiles={};
try{const previous=JSON.parse(await fs.readFile(path.join(out,'source-contract.json')));for(const [key,bytes]of Object.entries(sources))if(previous.sourceFiles[key].sha256!==sha(bytes))throw Error('Frozen source changed: '+key+'. Use a new version prefix and output directory.');}catch(error){if(error.code!=='ENOENT')throw error;}

for(const [key,bytes]of Object.entries(sources)){const file=`${prefix}-source-${key}.${key==='atlas'?'png':'json'}`;await fs.writeFile(path.join(dir,file),bytes);sourceFiles[key]={file,source:`/frame-animation-assets/${file}`,sha256:sha(bytes)};}
const sample={id:prefix,label:'外星探索者 · 骨骼翻滚 v8（37姿势）',origin:'skeletal-render',species:'human',skinId:asset.id,action:'roll',fps:30,loop:false,visualQA:'not-reviewed',frames:[]},bounds=[],nativeHashes=new Set();
const sheet=createCanvas(7*512,6*512),sc=sheet.getContext('2d');sc.fillStyle='#edf2f4';sc.fillRect(0,0,sheet.width,sheet.height);
for(const frame of frames){
 const canvas=createCanvas(512,512),ctx=canvas.getContext('2d');drawCanvas(ctx,asset,frame.state,skin,image,{maskCanvasFactory:(w,h)=>createCanvas(w,h)});
 const pixels=ctx.getImageData(0,0,512,512).data;let minX=512,minY=512,maxX=-1,maxY=-1;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(pixels[(y*512+x)*4+3]>24){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 const box={index:frame.index,phase:frame.phase,minX,minY,maxX,maxY,edgeTouch:minX===0||minY===0||maxX===511||maxY===511};bounds.push(box);
 const name=`${prefix}-${String(frame.index).padStart(2,'0')}`,bytes=canvas.toBuffer('image/png');nativeHashes.add(sha(bytes));await fs.writeFile(path.join(dir,name+'.png'),bytes);
 const receipt={kind:'skeletal-render-frame',tool:'renderCanvas',fileSha256:sha(bytes),species:'human',skinId:asset.id,action:'roll',frameIndex:frame.index,phase:frame.phase,fixedCanvas,sourceFiles,bounds:box};await fs.writeFile(path.join(dir,name+'-receipt.json'),JSON.stringify(receipt,null,2));
 sample.frames.push({source:`/frame-animation-assets/${name}.png`,receipt:`/frame-animation-assets/${name}-receipt.json`,durationMs:frame.durationMs,phase:frame.phase});
 sc.drawImage(canvas,frame.index%7*512,Math.floor(frame.index/7)*512);sc.fillStyle='#243b44';sc.font='18px sans-serif';sc.fillText(`${frame.index+1} / ${frame.phase.toFixed(3)}`,frame.index%7*512+12,Math.floor(frame.index/7)*512+24);
}
await fs.writeFile(path.join(out,'native-contact-sheet.png'),sheet.toBuffer('image/png'));await fs.writeFile(path.join(out,'sample-plan.json'),JSON.stringify(sample,null,2));await fs.writeFile(path.join(out,'source-contract.json'),JSON.stringify({assetId:asset.id,fixedCanvas,sourceFiles,originalAtlas:skin.atlas,originalAtlasSHA256:sha(atlasBytes),frames:37,distinctNativeImages:nativeHashes.size,duration:37/30,nominalMotionDuration:1.2,bounds,technical:{fixedCamera:true,noEdgeTouch:bounds.every(b=>!b.edgeTouch)},visual:'not-reviewed'},null,2));
console.log(JSON.stringify({samplePlan:path.join(out,'sample-plan.json'),frames:frames.length,edgeTouches:bounds.filter(b=>b.edgeTouch),sourceFiles},null,2));
