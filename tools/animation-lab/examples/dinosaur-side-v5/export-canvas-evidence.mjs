import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createAsset,pose,runTests,generateAnimation} from '../../game-core.mjs';
import {drawCanvas,frameFor,commands} from '../../skin-renderer.mjs';
import {auditAsset} from '../../scripts/audit-gait.mjs';

// Actual atlas bitmap -> native Canvas -> PNG, with the production renderer.
// The source PNG, rig and registration metadata are never edited here.
const out=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(out,'../..');
const modules=process.env.ANIMATION_LAB_TEST_NODE_MODULES??'/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require=createRequire(path.join(modules,'dinosaur-evidence.cjs'));
const {createCanvas,ImageData}=require('@napi-rs/canvas'),sharp=require('sharp');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const impl=['animal-rig.mjs','game-core.mjs','human-soft-skin.mjs','skin-renderer.mjs','strip-skin.mjs','scripts/audit-gait.mjs'];
const hashes=Object.fromEntries(await Promise.all(impl.map(async p=>[p,sha(await fs.readFile(path.join(root,p)))])));
const skin=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'),'utf8')).dinosaur,a=createAsset('dinosaur');
if(a.id!=='dinosaur-side-v5'||!skin.tiles[1].mask)throw Error('This receipt requires v5 and precise component masks');
const sourcePath=path.join(root,'public',skin.atlas),bytes=await fs.readFile(sourcePath);
const decoded=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const image=createCanvas(decoded.info.width,decoded.info.height);
image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(decoded.data),decoded.info.width,decoded.info.height),0,0);
const source={atlas:skin.atlas,sha256:sha(bytes),bytes:bytes.length,size:[decoded.info.width,decoded.info.height],skinSha256:sha(JSON.stringify(skin)),implementationSha256:hashes};
const width=512,columns=4,frames=16,factory=(w,h)=>createCanvas(w,h),actions=[];
const bounds=(rgba,w,h,threshold=128)=>{let x0=w,y0=h,x1=-1,y1=-1,count=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(rgba[(y*w+x)*4+3]>threshold){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}return {threshold,bounds:[x0,y0,x1,y1],alphaPixels:count,margin:count?Math.min(x0,y0,w-1-x1,h-1-y1):null,empty:!count};};
const writeJSON=(name,value)=>fs.writeFile(path.join(out,name),JSON.stringify(value,null,2)+'\n');
await fs.mkdir(path.join(out,'frames'),{recursive:true});
await writeJSON('asset.json',a);await writeJSON('skin.json',skin);
for(const clip of a.clips.filter(c=>c!=='extend')){
 const motion=a.actionDesign.actions.find(m=>m.id===clip),loop=motion.loop!==false,metadata=[],sheet=createCanvas(2048,2048),sheetCtx=sheet.getContext('2d');
 const stages=Object.fromEntries([['dark','#172e39'],['light','#edf2f4']].map(([name,color])=>{const canvas=createCanvas(2048,2048),ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,2048,2048);return [name,{canvas,ctx,color}];}));
 const footEvidence=[];
 for(let f=0;f<frames;f++){
  const t=f/(loop?frames:frames-1),state=pose(a,t,{clip}),canvas=createCanvas(width,width),ctx=canvas.getContext('2d');
  drawCanvas(ctx,a,state,skin,image,{maskCanvasFactory:factory});
  const frameName=`frames/${clip}-${String(f+1).padStart(2,'0')}.png`,png=canvas.toBuffer('image/png');await fs.writeFile(path.join(out,frameName),png);
  // Check the encoded PNG itself, not a mathematical part rectangle.
  const pngRaw=await sharp(png).ensureAlpha().raw().toBuffer();
  const edgeChecks=[1,24,128].map(threshold=>bounds(pngRaw,width,width,threshold));
  const x=f%columns*width,y=Math.floor(f/columns)*width;sheetCtx.drawImage(canvas,x,y);
  // An unclipped 1024 image tests whether any nontransparent silhouette was lost
  // beyond the fixed frame, including low-alpha antialias fringes.
  const padded=createCanvas(1024,1024),pctx=padded.getContext('2d');pctx.translate(256,256);drawCanvas(pctx,a,state,skin,image,{maskCanvasFactory:factory});
  const pb=bounds(pctx.getImageData(0,0,1024,1024).data,1024,1024,1).bounds;
  const clipped=pb[0]<256||pb[1]<256||pb[2]>=768||pb[3]>=768;
  const foots=commands(a,state,skin).filter(c=>c.id.endsWith('-foot')).map(c=>{
   const footCanvas=createCanvas(width,width),fctx=footCanvas.getContext('2d'),onlyFoot={...a,rendering:{...a.rendering,tailMesh:undefined}};
   drawCanvas(fctx,onlyFoot,state,skin,image,{commandList:[c],maskCanvasFactory:factory});
   const pixels=fctx.getImageData(0,0,width,width).data,b= bounds(pixels,width,width,128);
   return {id:c.id,node:state.nodes[c.id],...b,soleBottom:b.bounds[3],groundLine:frameFor(a).anchor[1],soleGap:frameFor(a).anchor[1]-b.bounds[3]};
  });footEvidence.push({frame:f+1,t,airborne:state.airborne,foots});
  metadata.push({index:f,number:f+1,t,time:t*motion.duration,x,y,width,height:width,anchor:frameFor(a).anchor,png:frameName,sha256:sha(png),edgeChecks,clipped});
  for(const {ctx:stage} of Object.values(stages)){
   stage.strokeStyle='#67858b66';stage.lineWidth=1;stage.beginPath();stage.moveTo(x+20,y+frameFor(a).anchor[1]+.5);stage.lineTo(x+492,y+frameFor(a).anchor[1]+.5);stage.stroke();
   stage.drawImage(canvas,x,y);stage.fillStyle=stages.dark.ctx===stage?'#d7e5e8':'#233942';stage.font='18px sans-serif';stage.fillText(`${clip}  ${String(f+1).padStart(2,'0')}  t=${t.toFixed(4)}`,x+16,y+30);
   stage.strokeStyle='#879b9e66';stage.strokeRect(x+.5,y+.5,511,511);
  }
 }
 const png=sheet.toBuffer('image/png');await fs.writeFile(path.join(out,clip+'.png'),png);
 for(const [name,{canvas}] of Object.entries(stages))await fs.writeFile(path.join(out,`${clip}-${name}-contact.png`),canvas.toBuffer('image/png'));
 const marginPassed=metadata.every(m=>!m.clipped&&m.edgeChecks.every(e=>!e.empty&&e.margin>=3));
 const baseline=runTests(a,{clip}),faults=['stretch','seam',...(['walk','run'].includes(clip)?['phase','frozen','slide']:[])].map(fault=>{const result=runTests(a,{clip,fault});return {fault,rejected:!result.passed,failedChecks:result.checks.filter(c=>!c.passed)};});
 const manifest={schemaVersion:1,assetId:a.id,clip,scope:'character',duration:motion.duration,fps:(loop?frames:frames-1)/motion.duration,loop,format:'png',image:clip+'.png',imageSha256:sha(png),size:[2048,2048],frameSize:[512,512],columns,rows:4,frames:metadata,source,projection:a.rendering.projection,facing:a.rendering.facing,qa:{technical:baseline.passed&&marginPassed?'passed':'failed',visual:'not-approved',userAccepted:false},background:'transparent'};
 await writeJSON(clip+'-frames.json',manifest);await writeJSON(clip+'-animation.json',generateAnimation(a,{clip,frames}));
 actions.push({clip,baseline,faults,pngMarginPassed:marginPassed,frames:metadata,footEvidence,paths:{sheet:clip+'.png',manifest:clip+'-frames.json',animation:clip+'-animation.json',dark:clip+'-dark-contact.png',light:clip+'-light-contact.png'},visual:'not-approved'});
 console.log(`${clip}: 16 actual PNG frames, margins ${marginPassed?'pass':'FAIL'}`);
}
const nowHashes=Object.fromEntries(await Promise.all(impl.map(async p=>[p,sha(await fs.readFile(path.join(root,p)))])));
if(JSON.stringify(hashes)!==JSON.stringify(nowHashes)||source.sha256!==sha(await fs.readFile(sourcePath)))throw Error('Source changed during export; discard this receipt and rerun');
const report={schemaVersion:1,createdAt:new Date().toISOString(),assetId:a.id,source,renderer:'@napi-rs/canvas drawCanvas; Sharp only decodes source and verifies encoded PNG',sourceEdited:false,actions,gait:auditAsset(a,{pixelCheck:false}),qa:{technical:actions.every(r=>r.baseline.passed&&r.pngMarginPassed)?'passed':'failed',visual:'not-approved',userAccepted:false},limitations:['This is native Canvas output from actual atlas pixels, not a live browser screenshot or a motion-playback review.','Math checks, rejection of injected faults and PNG margins do not establish anatomical, texture or motion quality.','Transparent PNG sheets are export artifacts. Dark/light contact sheets are labeled review artifacts.']};
await writeJSON('technical-report.json',report);
console.log(`Wrote ${actions.length} PNG sheets and ${actions.length*frames} frames to ${out}`);
