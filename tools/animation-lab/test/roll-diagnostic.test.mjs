import test from 'node:test';import assert from 'node:assert/strict';import {createAsset,pose} from '../game-core.mjs';
test('roll diagnostic zero curl has finite geometry and invalid angle values reject',()=>{
 const a=createAsset('human',{skin:'alien'});a.rendering.rollGeometry={spineCurlDegrees:0,chinDegrees:0,chinCurlDegrees:0};
 for(let i=0;i<=32;i++){const state=pose(a,i/32,{clip:'roll'});for(const node of Object.values(state.nodes)){assert.ok(Number.isFinite(node.x)&&Number.isFinite(node.y));if(node.end)assert.ok(Number.isFinite(node.end.x)&&Number.isFinite(node.end.y));}}
 for(const profile of [{spineCurlDegrees:NaN},{spineCurlDegrees:'48'},{chinDegrees:Infinity},{chinCurlDegrees:null,spineCurlDegrees:Infinity}]){a.rendering.rollGeometry=profile;assert.throws(()=>pose(a,.5,{clip:'roll'}),/有限数字/);}
});
test('alien roll turns the torso once and recovers arms without changing rigid bone lengths',()=>{
 const a=createAsset('human',{skin:'alien'}),samples=Array.from({length:101},(_,i)=>pose(a,i/100,{clip:'roll'}));
 for(let i=41;i<samples.length;i++)assert.ok(samples[i].nodes.body.angle>=samples[i-1].nodes.body.angle-1e-8,'torso must not overspin then reverse during recovery');
 assert.ok(Math.abs(samples.at(-1).nodes.body.angle-360)<1e-8);
 assert.equal(samples[40].rollRotation,0,'global turn starts after hand contact');
 for(const s of samples)for(const p of a.parts){const n=s.nodes[p.id];if(n?.end)assert.ok(Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-p.dimensions[0])<.01,p.id);}
 for(const id of ['arm-0-upper','arm-0-lower','arm-0-hand','arm-1-upper','arm-1-lower','arm-1-hand'])for(const key of ['x','y']){assert.ok(Math.abs(samples[0].nodes[id][key]-samples.at(-1).nodes[id][key])<1e-8);assert.ok(Math.abs(samples[0].nodes[id].end[key]-samples.at(-1).nodes[id].end[key])<1e-8);}
});
test('roll control switches reject truthy strings and malformed values',()=>{
 for(const key of ['handReachThroughCurl','spinByBodyOrientation','recoveryArms'])for(const value of ['false',1,null]){const a=createAsset('human',{skin:'alien'});a.rendering.rollGeometry[key]=value;assert.throws(()=>pose(a,.5,{clip:'roll'}),/布尔值/);}
});
