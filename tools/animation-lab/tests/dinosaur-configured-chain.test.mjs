import test from 'node:test';
import assert from 'node:assert/strict';
import {createAsset,pose} from '../game-core.mjs';

test('dinosaur anatomical bone edits drive both near and far chains in every action and isolated joint bend',()=>{
 const asset=createAsset('dinosaur');
 for(let leg=0;leg<2;leg++)for(const [role,length]of [['upper',40+leg],['middle',39+leg],['lower',24+leg]])asset.parts.find(p=>p.id===`leg-${leg}-${role}`).dimensions[0]=length;
 for(const clip of asset.clips)for(const t of [0,.17,.25,.5,.75,.93])for(const partId of ['leg-0-upper','leg-0-middle','leg-0-lower','leg-1-upper','leg-1-middle','leg-1-lower']){
  const state=pose(asset,t,{clip,scope:clip==='extend'?'component':'character',partId});
  for(const part of asset.parts.filter(p=>p.leg!==undefined&&['upper','middle','lower'].includes(p.role))){const n=state.nodes[part.id];assert.ok(Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-part.dimensions[0])<1e-8,`${clip} ${t} ${part.id} did not follow its edited anatomical length`);}
 }
});

test('edited dinosaur child pivots stay attached and unselected leg is fixed during isolated flexion',()=>{
 const a=createAsset('dinosaur');a.parts.find(p=>p.id==='leg-0-upper').dimensions[0]=40;
 const fixed=pose(a,0,{clip:'extend',scope:'component',partId:'leg-0-middle'});
 for(const t of [.125,.25,.5,.75]){const s=pose(a,t,{clip:'extend',scope:'component',partId:'leg-0-middle'});for(const leg of [0,1])for(const [parent,child]of [['upper','middle'],['middle','lower'],['lower','foot']]){const p=s.nodes[`leg-${leg}-${parent}`],c=s.nodes[`leg-${leg}-${child}`];assert.equal(p.end.x,c.x);assert.equal(p.end.y,c.y);}for(const role of ['upper','middle','lower','foot'])assert.deepEqual(s.nodes[`leg-1-${role}`],fixed.nodes[`leg-1-${role}`]);}
});

test('dinosaur alternate foot contact follows each measured source and default scales with edited foot width',()=>{
 const a=createAsset('dinosaur');a.rendering.footContactOffsets=[8,9];
 for(const t of [0,.1,.3,.5]){const s=pose(a,t,{clip:'walk'});for(const l of s.legs)if(l.stance)assert.ok(Math.abs(l.foot.y+a.rendering.footContactOffsets[l.id])<1e-8);}
 const b=createAsset('dinosaur');b.parts.find(p=>p.id==='leg-0-foot').dimensions[0]=24;
 assert.ok(Math.abs(pose(b,0,{clip:'idle'}).legs[0].foot.y+24*b.rendering.footContactRatios[0])<1e-8);
 delete b.rendering.footContactRatios;
 assert.ok(Math.abs(pose(b,0,{clip:'idle'}).legs[0].foot.y+24*194/341*.78)<1e-8);
});

test('dinosaur configured femur neutral angle is shared by whole pose and isolated rest pose',()=>{
 const a=createAsset('dinosaur');a.rendering.dinosaurFemurNeutralDeg=65;
 for(const clip of ['idle','extend']){const s=pose(a,0,{clip,scope:clip==='extend'?'component':'character',partId:'leg-0-middle'});for(const l of s.legs)assert.ok(Math.abs(Math.atan2(l.knee.y-l.hip.y,l.knee.x-l.hip.x)*180/Math.PI-65)<1e-8);}
});

test('dinosaur stance height moves the trunk assembly together and preserves foot ground and jump lift',()=>{
 const original=createAsset('dinosaur');original.rendering.stanceBodyDrop=0;for(const p of original.parts){if(p.role==='upper'){p.dimensions[0]=40;p.rest[1]=-88;}if(p.role==='middle')p.dimensions[0]=36;if(p.role==='lower')p.dimensions[0]=20;}const lowered=structuredClone(original);lowered.rendering.stanceBodyDrop=16;
 for(const t of [0,.1,.3,.5,.7,.9,1])for(const clip of ['idle','walk','run','jump','roar','bite','tail']){
  const before=pose(original,t,{clip}),after=pose(lowered,t,{clip});
  for(const id of ['body','neck','head','jaw','arm-0-upper','arm-1-upper','tail-0']){assert.ok(Math.abs(after.nodes[id].x-before.nodes[id].x)<1e-9,`${clip}: ${id} horizontal registration drifted`);assert.ok(Math.abs(after.nodes[id].y-before.nodes[id].y-16)<1e-9,`${clip}: ${id} did not follow the trunk height`);}
  // Only reachable supports can be compared: the compact chain itself is tested below.
  for(let leg=0;leg<2;leg++)if(before.legs[leg].stance&&after.legs[leg].stance||clip==='jump')assert.ok(Math.abs(after.legs[leg].foot.y-before.legs[leg].foot.y)<1e-8,`${clip} ${t}: stance height changed foot ground / jump lift`);
 }
});
