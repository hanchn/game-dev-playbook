import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlex,flexPose,testFlex} from '../flex-rig.mjs';
import {stripTriangles} from '../strip-skin.mjs';
import fs from 'node:fs';
const a=createFlex('worm'),parts=a.parts.filter(p=>p.role==='body-chain');
test('worm stretch and shortening preserve per-segment hydraulic volume',()=>{
 for(const clip of ['walk','run','contract','idle'])for(let k=0;k<=96;k++){
  const s=flexPose(a,k/96,{clip});for(const p of parts){const n=s.nodes[p.id],l=Math.hypot(n.end.x-n.x,n.end.y-n.y);assert.ok(Math.abs(l*n.width**2-p.dimensions[0]*14**2)<1e-6);}
 }
 const extended=flexPose(a,.25,{clip:'walk'}).nodes['segment-0'],shortened=flexPose(a,.75,{clip:'walk'}).nodes['segment-0'];
 assert.ok(extended.width<14&&shortened.width>14);assert.ok(extended.x-extended.end.x>shortened.x-shortened.end.x);
});
test('elongation phase travels from anterior towards posterior',()=>{
 const peak=index=>{let best=-Infinity,phase;for(let i=0;i<=1000;i++){const s=flexPose(a,i/1000,{clip:'walk'}),n=s.nodes['segment-'+index],l=Math.hypot(n.end.x-n.x,n.end.y-n.y);if(l>best){best=l;phase=i/1000;}}return phase;};
 assert.ok(peak(0)<peak(3)&&peak(3)<peak(6));
});
test('material coordinates and joins survive variable body lengths',()=>{
 const skin=JSON.parse(fs.readFileSync(new URL('../public/art/skins.json',import.meta.url))).worm;
 const neutral=stripTriangles(a,flexPose(a,0,{clip:'walk'}),skin);
 for(const phase of [.25,.5,.75,1]){const s=flexPose(a,phase,{clip:'walk'}),ts=stripTriangles(a,s,skin);assert.deepEqual(ts.map(t=>t.src),neutral.map(t=>t.src));for(let i=1;i<parts.length;i++)assert.deepEqual({x:s.nodes[parts[i].id].x,y:s.nodes[parts[i].id].y},{x:s.nodes[parts[i-1].id].end.x,y:s.nodes[parts[i-1].id].end.y});assert.ok(ts.every(t=>t.matrix.every(Number.isFinite)));}
 for(const clip of ['walk','run','contract'])assert.ok(testFlex(a,{clip}).passed);
});
