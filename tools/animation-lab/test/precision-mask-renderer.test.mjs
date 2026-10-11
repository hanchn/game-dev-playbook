import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pose} from '../game-core.mjs';
import {commands,maskedSource,drawCanvas,renderSkinned} from '../skin-renderer.mjs';
import {bindSoftSkin,sourcePointAt,sourcePointWorld} from '../human-soft-skin.mjs';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';

// Keep the actual contaminated v5 atlas as a stable regression fixture; a
// later cleaner source must not remove coverage of foreign-pixel rejection.
const skin=JSON.parse(fs.readFileSync(new URL('../examples/dinosaur-side-v5/skin.json',import.meta.url))),tile=skin.tiles[1];
const fixtureAsset=JSON.parse(fs.readFileSync(new URL('../examples/dinosaur-side-v5/asset.json',import.meta.url))); 
const sourceFile=new URL('../public'+skin.atlas,import.meta.url),bytes=fs.readFileSync(sourceFile),im=png(bytes);
const maskContains=(mask,x,y)=>mask.components.some(([rx,ry,w,h])=>x>=rx&&x<rx+w&&y>=ry&&y<ry+h);
const inside=(poly,x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;};
const foreign=[];for(let y=tile.rect[1];y<tile.rect[1]+tile.rect[3];y++)for(let x=tile.rect[0];x<tile.rect[0]+tile.rect[2];x++)if(im.pixels[(y*im.w+x)*4+3]>=24&&inside(tile.clip,x+.5,y+.5)&&!maskContains(tile.mask,x+.5,y+.5))foreign.push([x,y]);
assert.ok(foreign.length,'Real source must reproduce adjacent-part contamination');
const nativeCommand=()=>{const [x,y,w,h]=tile.rect;return {id:'head',slot:1,rect:tile.rect,clip:tile.clip,mask:tile.mask,x,y,w,h,cx:0,cy:0,angle:0,opacity:1};};
const nativeMesh=()=>bindSoftSkin(nativeCommand(),'head-neck','head',{head:{x:0,y:0,angle:0},neck:{x:0,y:0}},{rows:20,columns:8,rootAnchor:[0,0]});
const require=createRequire(process.env.ANIMATION_LAB_TEST_NODE_MODULES?path.join(process.env.ANIMATION_LAB_TEST_NODE_MODULES,'precision-mask-test.cjs'):import.meta.url);
let createCanvas,ImageData,sharp;try{({createCanvas,ImageData}=require('@napi-rs/canvas'));sharp=require('sharp');}catch{}
const nativeAvailable=!!createCanvas&&!!sharp;
const nativeImage=()=>{const image=createCanvas(im.w,im.h);image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.pixels),im.w,im.h),0,0);return image;};

test('precise mask is independent of mesh topology and preserves neck layering',()=>{
 const a=structuredClone(fixtureAsset),state=pose(a,.5,{clip:'roar'}),cs=commands(a,state,skin),legacy=structuredClone(skin);for(const t of legacy.tiles)delete t.mask;
 const withoutMask=commands(a,state,legacy),head=cs.find(c=>c.id==='head'),neck=cs.find(c=>c.id==='neck');
 assert.deepEqual(head.mesh,withoutMask.find(c=>c.id==='head').mesh);assert.deepEqual(neck.mesh,withoutMask.find(c=>c.id==='neck').mesh);
 assert.ok(head.mesh.length+neck.mesh.length<200,'Only the neck transition needs dense geometry; pixel masks cannot multiply mesh count');
 assert.ok(cs.findIndex(c=>c.id==='neck')<cs.findIndex(c=>c.id==='body'));assert.ok(cs.findIndex(c=>c.id==='head')>cs.findIndex(c=>c.id==='body'));
 const c=nativeMesh(),[x,y]=foreign[0];assert.equal(sourcePointWorld(c,[x+.5,y+.5]),null);assert.equal(sourcePointAt(c,x+.5,y+.5),null);
});

test('coarse skull and neck share every overlap vertex and stay within half a screen pixel of the old grid',()=>{
 const a=structuredClone(fixtureAsset);
 for(const clip of a.clips.filter(c=>c!=='extend'))for(const t of [0,.25,.5,.75,1]){
  const state=pose(a,t,{clip}),cs=commands(a,state,skin),head=cs.find(c=>c.id==='head'),neck=cs.find(c=>c.id==='neck');
  const shared=c=>new Map(c.mesh.flatMap(tri=>tri.src.map((p,i)=>({p,d:tri.dst[i].map((v,j)=>v+(j?c.cy:c.cx))}))).filter(({p})=>(p[1]-tile.rect[1])/tile.rect[3]>=.58-1e-8&&(p[1]-tile.rect[1])/tile.rect[3]<=.70+1e-8).map(({p,d})=>[p.join(','),d]));
  const h=shared(head),n=shared(neck);assert.deepEqual([...h.keys()].sort(),[...n.keys()].sort(),'Both pieces use an identical overlapping source grid');for(const [key,p] of h)assert.deepEqual(p,n.get(key),'Shared source vertex is in the exact same world position');
  assert.ok(head.mesh.length+neck.mesh.length<200);
  for(const c of [head,neck]){
   const {template,kind,id,options}=c.bind,old=bindSoftSkin({...c,...template,angle:template.angle+(state.nodes[id].angle??0)},kind,id,state.nodes,{...options,rows:20,columns:8,cutsX:[],cutsY:[.58,.70]});
   const [rx,ry,rw,rh]=tile.rect;let sampled=0,max=0;
   for(let y=ry+1;y<ry+rh;y+=10)for(let x=rx+1;x<rx+rw;x+=10){if(im.pixels[(y*im.w+x)*4+3]<24||!maskContains(tile.mask,x+.5,y+.5))continue;const p=sourcePointWorld(c,[x+.5,y+.5]),q=sourcePointWorld(old,[x+.5,y+.5]);if(!p&&!q)continue;assert.ok(p&&q,'Owned source point is retained');sampled++;max=Math.max(max,Math.hypot(p[0]-q[0],p[1]-q[1])*a.rendering.frame.scale);}
   assert.ok(sampled>30);assert.ok(max<.5,`${clip}/${t}/${c.id} changed by ${max} screen pixels`);
  }
 }
});

test('cached native source bitmap removes foreign alpha, keeps fringe and reuses head/neck crop', {skip:!nativeAvailable&&'Set ANIMATION_LAB_TEST_NODE_MODULES to runtime dependencies for native Canvas/Sharp checks'},async()=>{
 const image=nativeImage(),ctx=createCanvas(im.w,im.h).getContext('2d');let allocations=0;
 const factory=(w,h)=>{allocations++;return createCanvas(w,h);},c=nativeCommand(),first=maskedSource(ctx,image,c,{maskCanvasFactory:factory}),again=maskedSource(ctx,image,{...c,id:'neck'},{maskCanvasFactory:factory});
 assert.equal(allocations,1);assert.equal(first,again);
 const crop=first.image.getContext('2d').getImageData(0,0,first.rect[2],first.rect[3]).data,[rx,ry,rw,rh]=first.rect;let preservedFringe=0;
 for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
  const sourceAlpha=im.pixels[((ry+y)*im.w+rx+x)*4+3],actual=crop[(y*rw+x)*4+3],expected=maskContains(tile.mask,rx+x+.5,ry+y+.5)?sourceAlpha:0;
  assert.equal(actual,expected,'Cached alpha equals original alpha within exact ownership');if(actual>0&&actual<24)preservedFringe++;
 }
 assert.ok(preservedFringe>0,'Native source antialias fringe is preserved');for(const [x,y] of foreign)assert.equal(crop[((y-ry)*rw+x-rx)*4+3],0);
 const changed=maskedSource(ctx,image,{...c,mask:structuredClone(c.mask)},{maskCanvasFactory:factory});assert.notEqual(changed,first);assert.equal(allocations,2,'Replacing metadata invalidates identity cache');
 assert.deepEqual(fs.readFileSync(sourceFile),bytes,'Source PNG remains unchanged');
});

test('coarse Canvas mesh uses cached source at correct atlas offset and rejects foreign pixels', {skip:!nativeAvailable&&'Native Canvas dependencies unavailable'},async()=>{
 const image=nativeImage(),canvas=createCanvas(im.w,im.h),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;let allocations=0;
 const a={parts:[{id:'head'}],design:{size:1},rendering:{frame:{anchor:[0,0],scale:1}}},state={clip:'idle',t:0},c=nativeMesh(),factory=(w,h)=>{allocations++;return createCanvas(w,h);};
 drawCanvas(ctx,a,state,skin,image,{commandList:[c],maskCanvasFactory:factory});const data=ctx.getImageData(0,0,im.w,im.h).data;
 for(const [x,y] of foreign)assert.equal(data[(y*im.w+x)*4+3],0,'Affine source offset cannot restore neighboring body pixels');
 const legacyCtx=createCanvas(im.w,im.h).getContext('2d');legacyCtx.imageSmoothingEnabled=false;drawCanvas(legacyCtx,a,state,skin,image,{commandList:[{...c,mask:undefined}]});const legacy=legacyCtx.getImageData(0,0,im.w,im.h).data;
 let owned=0;for(let y=tile.rect[1]+5;y<tile.rect[1]+tile.rect[3]-5;y+=5)for(let x=tile.rect[0]+5;x<tile.rect[0]+tile.rect[2]-5;x+=5)if(maskContains(tile.mask,x+.5,y+.5)&&im.pixels[(y*im.w+x)*4+3]>200){owned++;assert.equal(data[(y*im.w+x)*4+3],legacy[(y*im.w+x)*4+3],'Existing skull/neck pixels retain the same mesh rasterization');}
 assert.ok(owned>100);
 drawCanvas(ctx,a,state,skin,image,{commandList:[{...c,id:'neck'}],maskCanvasFactory:factory});assert.equal(allocations,1);
});

test('SVG applies one shared source-space precision mask inside affine triangles', {skip:!nativeAvailable&&'Native Canvas/Sharp dependencies unavailable'},async()=>{
 const [rx,ry,rw,rh]=tile.rect,a={species:'dinosaur',design:{size:1},parts:[{id:'neck',shape:'anchor',tile:5,layer:1,rest:[0,0],dimensions:[1,1]},{id:'head',shape:'ellipse',tile:1,layer:5,rest:[0,0],dimensions:[rw,rh]}],rendering:{continuousNeck:true,frame:{anchor:[0,0],scale:1}}};
 const head={x:rx+rw/2,y:ry+rh/2,angle:0},state={clip:'idle',t:0,nodes:{head,neck:{x:head.x+(tile.neckRoot[0]-.5)*rw,y:head.y+(tile.neckRoot[1]-.5)*rh}}};
 const markup=renderSkinned(a,state,{...skin,imageId:'test-atlas'});
 assert.match(markup,/<g transform="matrix\([^"]+\)"><g clip-path="url\(#source-mask-/);
 assert.equal((markup.match(/id="source-mask-/g)??[]).length,2,'One definition per unique source mask, including invisible neck');
 const buffer=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${im.w}" height="${im.h}"><defs><image id="test-atlas" href="data:image/png;base64,${bytes.toString('base64')}" width="${im.w}" height="${im.h}"/></defs>${markup}</svg>`)).ensureAlpha().raw().toBuffer();
 for(const [x,y] of foreign)assert.equal(buffer[(y*im.w+x)*4+3],0,'SVG mask must clip atlas pixels before triangle deformation');
 assert.ok(buffer.some((a,i)=>i%4===3&&a>200),'Owned head pixels remain visible');
});
