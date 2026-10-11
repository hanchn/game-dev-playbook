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
