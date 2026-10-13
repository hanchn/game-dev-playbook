import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Model,RULES} from '../src/model.js';
import {Renderer} from '../src/render.js';
import {stripTriangles} from '../src/vendor/strip-skin.mjs';

const skin=JSON.parse(readFileSync(new URL('../public/art/skins-cute.json',import.meta.url))).worm;
const area=p=>(p[1].x-p[0].x)*(p[2].y-p[0].y)-(p[1].y-p[0].y)*(p[2].x-p[0].x);
const chain=m=>m.body.reduce((sum,b,i)=>sum+(i?Math.hypot(b.x-m.body[i-1].x,b.y-m.body[i-1].y):0),0);

function check(m,r,context){
 const expected=RULES.bodyLength*m.player.length;
 assert.ok(chain(m)>expected*.85);
 assert.ok(chain(m)<expected*1.16);
 for(let i=1;i<m.body.length;i++)assert.ok(Math.hypot(m.body[i].x-m.body[i-1].x,m.body[i].y-m.body[i-1].y)>6);
 r.worm.rendering.tailMesh.sourceRange=[1,1-m.player.length];
 const ts=stripTriangles(r.worm,r.wormState(m),skin);
 // Tight bends can discard locally folded faces; at least 2/3 of the 96
 // triangles must remain, so a collapsed/mostly invisible skin still fails.
 assert.ok(ts.length>=64,JSON.stringify({context,triangles:ts.length,body:m.body}));
 for(const t of ts){assert.ok(t.matrix.every(Number.isFinite));assert.ok(area(t.dst)>1e-3)}
}

test('crawl, jump and reversals preserve the complete chain on every exit frame',()=>{
 for(const fps of [30,60,120])for(const exit of ['crawl','jump','left','right'])for(const damaged of [false,true]){
  const m=new Model,r=new Renderer;
  m.state='playing';m.player.protect=999;m.enemies.clear();
  if(damaged){m.player.protect=0;m.bite({species:'bird'});m.player.stun=0;m.player.protect=999}
  for(let i=0;i<fps*.6;i++)m.step(1/fps,{down:true});
  let emerged=false;
  for(let i=0;i<fps*2;i++){
   const input=emerged?(exit==='left'?{left:true}:exit==='right'?{right:true}:{}):{up:true,jump:exit==='jump'&&m.player.y<490};
   m.step(1/fps,input);
   if(m.player.zone!=='underground'){
    if(!emerged&&exit==='jump')assert.ok(m.player.vy< -400,'Fixture must perform an actual jump');
    emerged=true;
   }
   if(emerged)check(m,r,{fps,exit,damaged,frame:i});
  }
  assert.ok(emerged);
 }
});

test('collapsed chains and zero source spans never create invalid or folded affine draws',()=>{
 const m=new Model,r=new Renderer;
 m.body=m.body.map(()=>({...m.body[0]}));
 const state=r.wormState(m);
 for(const t of stripTriangles(r.worm,state,skin)){assert.ok(area(t.dst)>1e-3);assert.ok(t.matrix.every(Number.isFinite))}
 r.worm.rendering.tailMesh.sourceRange=[1,1];
 assert.deepEqual(stripTriangles(r.worm,state,skin),[]);
});
