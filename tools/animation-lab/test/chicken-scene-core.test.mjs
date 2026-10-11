import test from 'node:test';import assert from 'node:assert/strict';import {sampleChickenScene,validateChickenScene,blendChickenPose,createChickenFlock} from '../chicken-scene-core.mjs';import {createAsset,pose} from '../game-core.mjs';
const actor=(id,sex='rooster',x=100,facing=1)=>({id,sex,x,groundY:350,facing});
test('a rooster asset cannot silently substitute for a laying hen',()=>assert.throws(()=>validateChickenScene({scenario:'lay',actors:[actor('r')]}),/母鸡/));
test('multiple chickens retain independent phases and stable identities',()=>{const s=sampleChickenScene({scenario:'flock',actors:[actor('a'),{...actor('b'),phaseOffset:3.2}]},1);assert.deepEqual(s.actors.map(a=>a.id),['a','b']);assert.notEqual(s.actors[0].clip,s.actors[1].clip);});
test('egg starts behind pelvis and persists once after recovery across repeated seeks',()=>{const scene={scenario:'lay',actors:[actor('h','hen')]};assert.equal(sampleChickenScene(scene,2).props.length,0);const born=sampleChickenScene(scene,2.9).props[0];assert.equal(born.origin,'pelvis');assert.equal(born.occlusion,'behind-hen');const done=sampleChickenScene(scene,5);assert.equal(done.props.length,1);assert.equal(done.actors[0].bodyDrop,0);assert.deepEqual(sampleChickenScene(scene,5),done);assert.equal(done.props[0].id,born.id);});
test('fight requires opposing actors; feather particles are seek-safe and recover',()=>{const scene={scenario:'fight',actors:[actor('left','rooster',100,1),actor('right','rooster',260,-1)]};assert.equal(sampleChickenScene(scene,.5).props.length,0);const hit=sampleChickenScene(scene,1.5);assert.equal(new Set(hit.props.map(p=>p.id)).size,5);assert.deepEqual(sampleChickenScene(scene,1.5),hit);assert.equal(sampleChickenScene(scene,4).props.length,0);assert.throws(()=>validateChickenScene({...scene,actors:[actor('a'),actor('b','rooster',260,1)]}),/相向/);});
test('crow distinguishes beak opening from a whole head rotation and closes on recovery',()=>{const scene={scenario:'crow',actors:[actor('r')]};assert.equal(sampleChickenScene(scene,0).actors[0].beakOpen,0);assert.ok(sampleChickenScene(scene,1).actors[0].beakOpen>.9);assert.equal(sampleChickenScene(scene,3).actors[0].beakOpen,0);});
test('walking to pecking inbetweens rotate bones without shortening them or separating joints',()=>{const asset=createAsset('chicken'),a=pose(asset,.9,{clip:'walk'}),b=pose(asset,0,{clip:'peck'});for(const w of [0,.25,.5,.75,1]){const s=blendChickenPose(asset,a,b,w);for(const p of asset.parts){const n=s.nodes[p.id],parent=s.nodes[p.parent];if(n?.end)assert.ok(Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-p.dimensions[0])<1e-9);if(parent?.end&&p.id!=='head')assert.ok(Math.hypot(n.x-parent.end.x,n.y-parent.end.y)<1e-9);}}assert.deepEqual(pose(asset,.9,{clip:'walk'}),a);});

// Observe world-space support, including the scale applied by drawCanvas.
test('flock travel holds either stance foot for both facings and the actual render scale',async()=>{
  const {chickenSceneFrame}=await import('../chicken-scene-core.mjs'),asset=createAsset('chicken'),scale=1.7*asset.design.size*asset.rendering.frame.scale;
  for(const facing of [-1,1]){
    const scene={scenario:'flock',actorScale:1.7,actors:[actor('a','rooster',500,facing)]},previous=new Map();
    for(let i=0;i<80;i++){
      const a=chickenSceneFrame(asset,scene,i/100).actors[0];
      for(const leg of a.state.legs){
        const x=a.x+a.offsetX+facing*scale*a.state.nodes[`leg-${leg.id}-foot`].x;
        if(leg.stance&&previous.get(leg.id)?.stance)assert.ok(Math.abs(x-previous.get(leg.id).x)<1e-8,`support slipped at ${i/100}`);
        previous.set(leg.id,{x,stance:leg.stance});
      }
    }
  }
});
test('stop transition pins the planted foot, idle does not slide home, and scene end holds',async()=>{
  const {chickenSceneFrame}=await import('../chicken-scene-core.mjs'),asset=createAsset('chicken'),scene={scenario:'flock',actorScale:1.7,actors:[actor('a')]},scale=1.7*asset.design.size*asset.rendering.frame.scale;
  const start=chickenSceneFrame(asset,scene,.8).actors[0],support=start.state.legs.find(l=>l.stance).id,world=a=>a.x+a.offsetX+scale*a.state.nodes[`leg-${support}-foot`].x;
  for(let i=80;i<=100;i++)assert.ok(Math.abs(world(chickenSceneFrame(asset,scene,i/100).actors[0])-world(start))<1e-8);
  const stopped=chickenSceneFrame(asset,scene,1).actors[0].offsetX;
  for(const t of [1.5,2.8,4,5.9])assert.equal(chickenSceneFrame(asset,scene,t).actors[0].offsetX,stopped);
  assert.deepEqual(chickenSceneFrame(asset,scene,6),chickenSceneFrame(asset,scene,60));
});
test('all 1–12 actors move and their source-bound silhouettes stay in the common fixed output frame',async()=>{
  const {chickenSceneFrame,createChickenFlock}=await import('../chicken-scene-core.mjs'),{commands}=await import('../skin-renderer.mjs'),{commandContour}=await import('../human-soft-skin.mjs'),fs=await import('node:fs/promises');
  const asset=createAsset('chicken'),skin=JSON.parse(await fs.readFile(new URL('../public/art/skins.json',import.meta.url))).chicken;
  for(let count=1;count<=12;count++){
    const scene=createChickenFlock(count),scale=scene.actorScale*asset.design.size*asset.rendering.frame.scale,participated=new Set();
    for(let i=0;i<=72;i++)for(const a of chickenSceneFrame(asset,scene,i/12).actors){
      if(a.clip==='walk')participated.add(a.id);
      for(const c of commands(asset,a.state,skin))for(const [x,y]of commandContour(c)){
        const px=a.x+a.offsetX+a.facing*scale*x,py=a.groundY+scale*y;
        assert.ok(px>=12&&px<=1268&&py>=12&&py<=708,`${count} chickens: ${a.id}/${c.id} leaves safe frame at ${i/12}: ${px},${py}`);
      }
    }
    assert.equal(participated.size,count);
  }
});

test('fight has no unsupported recovery hop and eases wings into the held idle',()=>{const scene={scenario:'fight',actors:[actor('left','rooster',100,1),actor('right','rooster',260,-1)]};for(const t of [2,2.25,2.5,3,3.5,4])assert.equal(sampleChickenScene(scene,t).actors[0].bodyLift,0);const closing=sampleChickenScene(scene,2.4).actors[0];assert.equal(closing.blend.clip,'idle');assert.ok(closing.blend.weight>.5);});

test('flocks expose true female walking and pecking with stable mixed identities',()=>{assert.throws(()=>createChickenFlock(3,{sex:'invalid'}),/公母/);for(const sex of ['hen','rooster','mixed']){const scene=createChickenFlock(6,{sex});assert.equal(new Set(scene.actors.map(a=>a.id)).size,6);assert.ok(scene.actors.every(a=>sex==='mixed'||a.sex===sex));if(sex==='mixed')assert.deepEqual(scene.actors.map(a=>a.sex),['rooster','hen','hen','rooster','hen','hen']);for(const a of scene.actors){assert.equal(sampleChickenScene(scene,a.phaseOffset+.4).actors.find(x=>x.id===a.id).clip,'walk');assert.equal(sampleChickenScene(scene,a.phaseOffset+1.5).actors.find(x=>x.id===a.id).clip,'peck');}}});

test('delayed takeoff starts at the actual idle pose, pins its sole and has no boundary snap',async()=>{
  const {chickenSceneFrame}=await import('../chicken-scene-core.mjs');
  for(const sex of ['rooster','hen'])for(const facing of [-1,1]){
    const asset=createAsset('chicken',sex==='hen'?{sex:'hen'}:{}),scene={scenario:'flock',actorScale:1.7,actors:[{...actor('a',sex,500,facing),phaseOffset:.73}]},scale=1.7*asset.design.size*asset.rendering.frame.scale,idle=pose(asset,0,{clip:'idle'}),first=pose(asset,0,{clip:'walk'}).legs.find(l=>l.stance).id,footId=`leg-${first}-foot`,sample=t=>chickenSceneFrame(asset,scene,t).actors[0];
    const onset=sample(.73);
    for(const [id,n]of Object.entries(idle.nodes)){assert.ok(Math.hypot(onset.state.nodes[id].x-n.x,onset.state.nodes[id].y-n.y)<1e-9);if(n.end)assert.ok(Math.hypot(onset.state.nodes[id].end.x-n.end.x,onset.state.nodes[id].end.y-n.end.y)<1e-9);}
    const planted=500+facing*scale*idle.nodes[footId].x;
    for(let i=0;i<200;i++){
      const a=sample(.73+i/1000),foot=a.state.nodes[footId];assert.ok(Math.abs(a.x+a.offsetX+facing*scale*foot.x-planted)<1e-8);assert.ok(Math.abs(foot.y-idle.nodes[footId].y)<1e-9);
      for(const p of asset.parts){const n=a.state.nodes[p.id];if(n.end)assert.ok(Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-p.dimensions[0])<1e-8);}
    }
    for(const boundary of [.73,.93]){const a=sample(boundary-1e-6),b=sample(boundary+1e-6);for(const id of Object.keys(a.state.nodes)){const n=a.state.nodes[id],m=b.state.nodes[id];assert.ok(Math.hypot(a.offsetX+facing*scale*n.x-b.offsetX-facing*scale*m.x,scale*(n.y-m.y))<.002,`${sex}/${facing}/${id} snaps at ${boundary}`);}}
  }
});
