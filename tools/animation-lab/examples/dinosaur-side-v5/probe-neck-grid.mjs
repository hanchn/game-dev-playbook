import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {createAsset,pose} from '../../game-core.mjs';
import {commands,drawCanvas} from '../../skin-renderer.mjs';
import {bindSoftSkin,sourcePointWorld} from '../../human-soft-skin.mjs';

// Experimental command-list replacement only: no production source is edited.
const out=path.join(path.dirname(fileURLToPath(import.meta.url)),'neck-grid-probe'),root=path.resolve(out,'../../..');
await fs.mkdir(out,{recursive:true});
const require=createRequire(path.join(process.env.ANIMATION_LAB_TEST_NODE_MODULES??'/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','neck-probe.cjs'));
const {createCanvas,ImageData}=require('@napi-rs/canvas'),sharp=require('sharp');
const a=createAsset('dinosaur'),skin=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'),'utf8')).dinosaur,raw=await sharp(path.join(root,'public',skin.atlas)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const source=createCanvas(raw.info.width,raw.info.height);source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height),0,0);
const xs=[.25,.5,.62,.75],ys=[.56,.58,.60,.65,.70,.75,.80,.85,.90,.95];
const replacement=(c,state)=>{
 if(!['head','neck'].includes(c.id))return c;
 const {template,kind,id,options}=c.bind;
 // All shared rows and columns have exactly the same source breakpoints. The
 // skull above v=.56 is affine and requires only one row of polygons.
 return bindSoftSkin({...c,...template,angle:template.angle+(state.nodes[id].angle??0)},kind,id,state.nodes,{...options,rows:1,columns:1,cutsX:xs,cutsY:ys});
};
const contains=(mask,x,y)=>mask.components.some(([rx,ry,w,h])=>x>=rx&&x<rx+w&&y>=ry&&y<ry+h);
const samples=[],baselineTimes=[],candidateTimes=[],raster=[];
for(const clip of a.clips.filter(c=>c!=='extend'))for(let f=0;f<16;f++){
 const loop=a.actionDesign.actions.find(m=>m.id===clip).loop,state=pose(a,f/(loop?16:15),{clip}),baseline=commands(a,state,skin),candidate=baseline.map(c=>replacement(c,state));
 let maxError=0,sumSquared=0,n=0,worst;
 for(const c of candidate.filter(c=>c.mesh)){
  const old=baseline.find(v=>v.id===c.id),[rx,ry,rw,rh]=c.rect;
  for(let y=ry+1;y<ry+rh;y+=5)for(let x=rx+1;x<rx+rw;x+=5){
   if(!contains(c.mask,x+.5,y+.5)||raw.data[(y*raw.info.width+x)*4+3]<24)continue;
   const b=sourcePointWorld(old,[x+.5,y+.5]),p=sourcePointWorld(c,[x+.5,y+.5]);if(!b&&!p)continue;if(!b||!p)throw Error('Candidate dropped an owned source point');
   const e=Math.hypot(p[0]-b[0],p[1]-b[1])*a.rendering.frame.scale;n++;sumSquared+=e*e;if(e>maxError){maxError=e;worst={id:c.id,source:[x+.5,y+.5],old:b,candidate:p};}
  }
 }
 const canvases=[];for(const [list,times] of [[baseline,baselineTimes],[candidate,candidateTimes]]){
  const canvas=createCanvas(512,512),ctx=canvas.getContext('2d'),begin=performance.now();drawCanvas(ctx,a,state,skin,source,{commandList:list,maskCanvasFactory:createCanvas});times.push(performance.now()-begin);canvases.push(canvas);
 }
 const [b,p]=canvases.map(c=>c.getContext('2d').getImageData(0,0,512,512).data);let lostOpaque=0,gainedOpaque=0,alphaAbs=0,owned=0;
 for(let i=3;i<b.length;i+=4){if(b[i]>240&&p[i]<128)lostOpaque++;if(p[i]>240&&b[i]<128)gainedOpaque++;if(b[i]>0||p[i]>0){owned++;alphaAbs+=Math.abs(b[i]-p[i]);}}
 raster.push({clip,frame:f+1,t:state.t,lostOpaque,gainedOpaque,meanAlphaDifference:alphaAbs/owned});
 samples.push({clip,frame:f+1,t:state.t,baselineTriangles:baseline.reduce((n,c)=>n+(c.mesh?.length??0),0),candidateTriangles:candidate.reduce((n,c)=>n+(c.mesh?.length??0),0),sourceSamples:n,maxErrorPx:maxError,rmsErrorPx:Math.sqrt(sumSquared/n),worst});
 if([0,4,7,12].includes(f)){
  const contact=createCanvas(1536,768),ctx=contact.getContext('2d');ctx.fillStyle='#edf2f4';ctx.fillRect(0,0,1536,768);
  for(let k=0;k<2;k++){ctx.drawImage(canvases[k],40,100,365,270,k*768,100,768,568);ctx.fillStyle='#203943';ctx.font='24px sans-serif';ctx.fillText(`${clip} ${f+1} t=${state.t.toFixed(4)} ${k?'candidate':'20 x 8 baseline'}`,k*768+20,40);}
  await fs.writeFile(path.join(out,`${clip}-${String(f+1).padStart(2,'0')}-comparison.png`),contact.toBuffer('image/png'));
 }
}
const percentile=(values,q)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)];};
const report={kind:'experimental-command-list-only',sourceEdited:false,productionEdited:false,grid:{columns:[0,...xs,1],rows:[0,...ys,1],headRange:[0,.70],neckRange:[.58,1],sharedRows:[.58,.60,.65,.70],sharedColumns:[0,...xs,1]},samples,raster,summary:{frames:samples.length,maxSourceErrorPx:Math.max(...samples.map(s=>s.maxErrorPx)),maxCandidateTriangles:Math.max(...samples.map(s=>s.candidateTriangles)),maxBaselineTriangles:Math.max(...samples.map(s=>s.baselineTriangles)),sumLostOpaque:raster.reduce((n,r)=>n+r.lostOpaque,0),sumGainedOpaque:raster.reduce((n,r)=>n+r.gainedOpaque,0),nativeDrawOnlyMs:{baselineMedian:percentile(baselineTimes.slice(1),.5),baselineP95:percentile(baselineTimes.slice(1),.95),candidateMedian:percentile(candidateTimes.slice(1),.5),candidateP95:percentile(candidateTimes.slice(1),.95)}},status:'experimental-not-approved',limitations:['Draw-only timing excludes command construction, SVG DOM and browser playback.','Old 20x8 warp is a reference, not proof of correct anatomy.','Pixel differences include antialias edge changes; lost opaque pixels do not by themselves identify holes.','Probe preserves exact source masks and both pieces share all grid breakpoints in overlap.']};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));
