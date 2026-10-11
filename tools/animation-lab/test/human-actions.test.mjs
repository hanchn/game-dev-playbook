import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {createAsset,pose,runTests,generateAnimation} from '../game-core.mjs';
import {skinnedSheet} from '../skin-renderer.mjs';
const human=createAsset('human');
test('八种完整动作逐关节检查，拉长和末姿偏移会被拒收',()=>{
 for(const clip of human.clips.filter(c=>c!=='extend')){const report=runTests(human,{clip});assert.equal(report.passed,true,JSON.stringify({clip,failed:report.checks.filter(c=>!c.passed)}));if(clip!=='walk'){assert.equal(runTests(human,{clip,fault:'stretch'}).passed,false);assert.equal(runTests(human,{clip,fault:'seam'}).passed,false);}}
});
test('深蹲和弯腰确实改变身体姿势，支撑脚固定',()=>{
 const stand=pose(human,0,{clip:'squat'}),squat=pose(human,.5,{clip:'squat'}),bend=pose(human,.5,{clip:'bend'});
 assert.ok(squat.nodes.head.y-stand.nodes.head.y>40);assert.ok(bend.nodes.body.angle>60);assert.ok(bend.nodes.head.x-stand.nodes.head.x>70);
 for(const clip of ['squat','bend','punch'])for(let i=0;i<65;i++){const s=pose(human,i/64,{clip}),first=pose(human,0,{clip});for(let j=0;j<2;j++)assert.ok(Math.hypot(s.legs[j].foot.x-first.legs[j].foot.x,s.legs[j].foot.y-first.legs[j].foot.y)<.01);}
});
test('跳跃双脚离地、落地恢复；拳击横向出拳并收回',()=>{
 const start=pose(human,0,{clip:'jump'}),air=pose(human,.48,{clip:'jump'}),finish=pose(human,1,{clip:'jump'});assert.ok(air.legs.every(l=>l.foot.y<-65));assert.ok(air.nodes.head.y<start.nodes.head.y-60);for(const id of Object.keys(start.nodes)){assert.ok(Math.hypot(finish.nodes[id].x-start.nodes[id].x,finish.nodes[id].y-start.nodes[id].y)<.0001);}
 const guard=pose(human,0,{clip:'punch'}).nodes['arm-0-hand'].end,hit=pose(human,.4,{clip:'punch'}).nodes['arm-0-hand'].end;assert.ok(hit.x-guard.x>35);assert.ok(Math.abs(hit.y-pose(human,.4,{clip:'punch'}).nodes['arm-0-upper'].y)<12);
});
test('单次动作导出末姿与真实时长；循环动作不重复首帧',async()=>{
 const skin=JSON.parse(await fs.readFile(new URL('../public/art/skins.json',import.meta.url))).human;
 for(const clip of ['jump','punch','squat','bend','roll']){const motion=generateAnimation(human,{clip});assert.equal(motion.loop,false);assert.equal(motion.frames.at(-1).t,1);assert.ok(Math.abs(motion.frames.at(-1).time-motion.duration)<.001);const sheet=skinnedSheet(human,{...skin,href:'test'},{clip});assert.equal(sheet.manifest.loop,false);assert.equal(sheet.manifest.duration,motion.duration);}
 assert.equal(generateAnimation(human,{clip:'walk'}).frames.at(-1).t,31/32);assert.throws(()=>generateAnimation(human,{clip:'missing'}));
});
test('调整大小腿比例时保留总腿长、行走脚端与躯干，肩轴下移5px',async()=>{
 const previous=JSON.parse(await fs.readFile(new URL('../examples/human-side-v2.asset.json',import.meta.url)));previous.clips=human.clips;
 for(let i=0;i<32;i++){const actual=pose(human,i/32).nodes,old=pose(previous,i/32).nodes;for(const id of ['body','head','neck'])assert.deepEqual(actual[id],old[id]);for(const id of Object.keys(actual).filter(k=>k.startsWith('arm-'))){const expected=structuredClone(old[id]);expected.y+=5;expected.end.y+=5;assert.deepEqual(actual[id],expected);}for(const side of [0,1])assert.ok(Math.hypot(actual[`leg-${side}-foot`].x-old[`leg-${side}-foot`].x,actual[`leg-${side}-foot`].y-old[`leg-${side}-foot`].y)<.001);}
 assert.equal(human.parts.find(p=>p.id==='leg-0-upper').dimensions[0]+human.parts.find(p=>p.id==='leg-0-lower').dimensions[0],98);
});
