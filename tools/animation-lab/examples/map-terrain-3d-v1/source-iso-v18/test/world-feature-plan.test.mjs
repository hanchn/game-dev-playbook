import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldFeaturePlanner} from '../world-feature-plan.mjs';
const sample=({x,z})=>({height:18-z*.018+Math.sin(x/30)*.1,normalY:.99,waterHeight:3,walkable:true});
test('global feature identity survives independent chunk queries and cache eviction',()=>{
  const a=new WorldFeaturePlanner({seed:'terrain',sample,cacheLimit:1}),b=new WorldFeaturePlanner({seed:'terrain',sample});
  const before=a.plan({x:-32,z:-32,width:64,depth:64});a.region(80,60);assert.deepEqual(a.plan(before.bounds),before);assert.deepEqual(b.plan(before.bounds),before);
});
test('buildings validate whole footprints and reject flooded/steep terrain',()=>{
  const planner=new WorldFeaturePlanner({sample:({x,z})=>({height:4,normalY:.6,waterHeight:5,walkable:false})});
  assert.equal(planner.plan({x:0,z:0,width:128,depth:128}).features.length,0);
  const suitable=new WorldFeaturePlanner({sample});for(const f of suitable.region(0,0).filter(f=>['castle','village','cave'].includes(f.type)))assert.equal(f.validation.samples,25);
});
test('streams descend across negative-coordinate regions, with bounded source travel',()=>{
  const p=new WorldFeaturePlanner({sample}),streams=p.region(-1,-1).filter(f=>f.type==='stream');assert.ok(streams.length);
  for(const f of streams){assert.ok(f.path.length>=5&&f.sourcePath.length<=32&&f.path.length<=212);for(let i=1;i<f.path.length;i++)assert.ok(f.path[i].surfaceHeight<f.path[i-1].surfaceHeight);assert.ok(Math.hypot(f.path.at(-1).x-f.position.x,f.path.at(-1).z-f.position.z)<=128);}
});
test('prepared neighboring terrain chunks apply the identical global river/ground height',()=>{
  const p=new WorldFeaturePlanner({sample}),left=p.prepareHeightModifier({x:-32,z:-32,width:32,depth:64}),right=p.prepareHeightModifier({x:0,z:-32,width:32,depth:64});
  for(let z=-32;z<=32;z+=.5)assert.equal(left.delta(0,z),right.delta(0,z));
  const river=p.region(0,0).find(f=>f.type==='stream'),point=river.path[2];assert.ok(p.heightDelta(point.x,point.z)<0);
});
test('invalid samples fail explicitly rather than placing bad objects',()=>{assert.throws(()=>new WorldFeaturePlanner({sample:()=>({height:NaN,waterHeight:1})}).region(0,0),/finite/);});
test('unrelated foundations cannot reset an active foundation height',()=>{
 const planner=new WorldFeaturePlanner({sample:()=>({height:10,normalY:1,waterHeight:0,walkable:true})});
 const active={type:'castle',position:{x:0,z:0},footprint:{width:20,depth:20},surfaceHeight:14};
 const inactive={type:'village',position:{x:100,z:100},footprint:{width:20,depth:20},surfaceHeight:7};
 assert.equal(planner.heightDeltaFrom(0,0,[active,inactive]),4);
 assert.equal(planner.heightDeltaFrom(0,0,[inactive,active]),4);
 assert.equal(planner.heightDeltaFrom(100,100,[active,inactive]),-3);
});
test('foundation priority is independent of river enumeration order',()=>{
 const planner=new WorldFeaturePlanner({sample:()=>({height:10,waterHeight:0})}),foundation={id:'castle',type:'castle',position:{x:0,z:0},footprint:{width:20,depth:20},surfaceHeight:14},river={type:'stream',path:[{x:-20,z:0,width:4,bedHeight:5},{x:20,z:0,width:4,bedHeight:4}]};
 assert.equal(planner.heightDeltaFrom(0,0,[foundation,river]),4);assert.equal(planner.heightDeltaFrom(0,0,[river,foundation]),4);
 assert.ok(planner.heightDeltaFrom(15,0,[river,foundation])<0);
});
test('global river paths avoid neighboring foundations with room for water width',()=>{
 const planner=new WorldFeaturePlanner({seed:'terrain',sample});let streams=0;
 for(let rx=-1;rx<=1;rx++)for(let rz=-1;rz<=1;rz++){
  const features=planner.region(rx,rz),foundations=[];for(let x=rx-1;x<=rx+1;x++)for(let z=rz-1;z<=rz+1;z++)foundations.push(...planner.placements(x,z).filter(f=>['castle','village','cave'].includes(f.type)));
  for(const river of features.filter(f=>f.type==='stream')){streams++;for(let i=1;i<river.path.length;i++)for(let j=0;j<=40;j++){const a=river.path[i-1],b=river.path[i],x=a.x+(b.x-a.x)*j/40,z=a.z+(b.z-a.z)*j/40;for(const f of foundations)assert.ok(Math.abs(x-f.position.x)>f.footprint.width/2+a.width/2||Math.abs(z-f.position.z)>f.footprint.depth/2+a.width/2);}}
 }
 assert.ok(streams>0);
});

test('v3 source turns reject sharp return hooks and source curves retain downhill bank avoidance',()=>{const p=new WorldFeaturePlanner({seed:'terrain',sample});for(const f of p.region(-1,-1).filter(f=>f.type==='stream')){assert.equal(f.validation.pathVersion,4);assert.ok(['travel-budget','water-body','local-basin','visited-basin'].includes(f.termination));for(let i=2;i<f.sourcePath.length;i++){const a=f.sourcePath[i-2],b=f.sourcePath[i-1],c=f.sourcePath[i],dot=((b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z))/(Math.hypot(b.x-a.x,b.z-a.z)*Math.hypot(c.x-b.x,c.z-b.z));assert.ok(dot>=Math.cos(Math.PI/6)-1e-9);}assert.deepEqual(f.path[0],f.sourcePath[0]);assert.equal(f.path.at(-1).x,f.sourcePath.at(-1).x);assert.equal(f.path.at(-1).z,f.sourcePath.at(-1).z);assert.equal(f.path.at(-1).surfaceHeight,f.sourcePath.at(-1).surfaceHeight);}});

test('height-only river sampling preserves full-sampler geography and foundation checks',()=>{let heightQueries=0,fullQueries=0;const fast=({x,z,detail})=>{if(detail==='height'){heightQueries++;const p=sample({x,z});return{height:p.height,waterHeight:p.waterHeight};}fullQueries++;return sample({x,z});};const legacy=new WorldFeaturePlanner({seed:'terrain',sample}),optimized=new WorldFeaturePlanner({seed:'terrain',sample:fast});for(const[x,z]of[[-1,-1],[0,0],[1,-1]])assert.deepEqual(optimized.region(x,z),legacy.region(x,z));assert.ok(heightQueries>fullQueries,'river candidates should avoid unnecessary normals and tile resources');assert.ok(fullQueries>0,'complete foundation validation must retain full sampling');});

test('foundation early rejection retains original accepted placements and 25-point heights',()=>{const slow=new WorldFeaturePlanner({seed:'terrain',sample});slow.footprint=function(p,w,d){const points=[];for(let ix=-2;ix<=2;ix++)for(let iz=-2;iz<=2;iz++)points.push(this.base(p.x+ix*w/4,p.z+iz*d/4));const heights=points.map(p=>p.height),range=Math.max(...heights)-Math.min(...heights);return{valid:points.every(p=>p.walkable&&p.height>p.waterHeight+this.heightScale*.025&&p.normalY>.88)&&range<this.heightScale*.06,range,height:heights.reduce((a,b)=>a+b,0)/heights.length};};const fast=new WorldFeaturePlanner({seed:'terrain',sample});for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)assert.deepEqual(fast.placements(x,z),slow.placements(x,z));let count=0;const rejecting=new WorldFeaturePlanner({sample:()=>{count++;return{height:0,waterHeight:1};}});assert.equal(rejecting.footprint({x:0,z:0},10,10).valid,false);assert.equal(count,1);});

test('v4 generated terminal depressions have explicit widths, provenance and full neighboring avoidance',()=>{const p=new WorldFeaturePlanner({seed:'terrain',sample});let basins=0;for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const foundations=[];for(let rx=x-1;rx<=x+1;rx++)for(let rz=z-1;rz<=z+1;rz++)foundations.push(...p.placements(rx,rz).filter(f=>['castle','village','cave'].includes(f.type)));for(const f of p.region(x,z).filter(f=>f.terminalBasin)){basins++;assert.equal(f.terminalBasin.hydrologicallyValidated,false);const end=f.path.at(-1);assert.equal(end.width,f.terminalBasin.radius*2);assert.deepEqual(f.terminalBasin.position,{x:end.x,z:end.z});for(let i=1;i<f.path.length;i++)for(let j=0;j<=20;j++){const a=f.path[i-1],b=f.path[i],t=j/20,px=a.x+(b.x-a.x)*t,pz=a.z+(b.z-a.z)*t,r=(a.width+(b.width-a.width)*t)/2;for(const o of foundations)assert.ok(Math.abs(px-o.position.x)>o.footprint.width/2+r||Math.abs(pz-o.position.z)>o.footprint.depth/2+r);}}}assert.ok(basins>0);});
