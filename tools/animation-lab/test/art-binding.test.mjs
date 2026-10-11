import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createAsset,pose,runTests,validateAsset} from '../game-core.mjs';
import {commands,skinnedSheet} from '../skin-renderer.mjs';import {stripTriangles,renderStrip} from '../strip-skin.mjs';
import {commandContour,sourcePointWorld} from '../human-soft-skin.mjs';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';
const skins=JSON.parse(fs.readFileSync(new URL('../public/art/skins.json',import.meta.url)));
test('换皮肤后翻滚仍先双掌触地，靴底在触地准备阶段保持平放',()=>{for(const variant of ['classic','alien']){const a=createAsset('human',{skin:variant});for(const t of [.24,.28,.32]){const s=pose(a,t,{clip:'roll'}),cs=commands(a,s,skins[a.rendering.skinKey]);assert.equal(s.rollRotation,0);assert.equal(s.rootX,0);for(const i of [0,1]){assert.ok(Math.abs(Math.max(...commandContour(cs.find(c=>c.id===`arm-${i}-hand`)).map(p=>p[1])))<.01);assert.equal(s.nodes[`leg-${i}-foot`].angle,0);}assert.ok(Math.max(...commandContour(cs.find(c=>c.id==='head')).map(p=>p[1]))<-20);}}});
test('外星人的衣孔有真实透明度及上层衣缘，独立运动默认保留装配遮挡',()=>{const a=createAsset('human',{skin:'alien'}),skin=skins['human-alien'],im=png(new URL('../public'+skin.atlas,import.meta.url));assert.ok(im.pixels[(155*im.w+121)*4+3]<8);for(const t of [0,.25,.75]){const cs=commands(a,pose(a,t,{clip:'extend',scope:'component',partId:'neck'}),skin,{scope:'component',selected:'neck'});assert.ok(cs.every(c=>c.opacity===1));assert.ok(cs.findIndex(c=>c.id==='shoulder-rim')>cs.findIndex(c=>c.id==='arm-0-upper'));}});
test('换皮肤保留骨架身份，独立头身比、轴点、抓握和接地轮廓随皮肤导出',()=>{
 const classic=createAsset('human'),alien=createAsset('human',{skin:'alien'});validateAsset(alien);assert.deepEqual(alien.parts.map(p=>[p.id,p.parent]),classic.parts.map(p=>[p.id,p.parent]));assert.notEqual(alien.rendering.atlas,classic.rendering.atlas);assert.notEqual(alien.parts.find(p=>p.id==='head').dimensions[0],classic.parts.find(p=>p.id==='head').dimensions[0]);
 for(const clip of alien.clips.filter(c=>c!=='extend'))assert.ok(runTests(alien,{clip}).passed,clip);
 for(const key of ['human','human-alien'])for(const grip of ['bottle','knife','gun']){const a=createAsset('human',{skin:key==='human'?'classic':'alien'});a.rendering.grip=grip;const cs=commands(a,pose(a,.4,{clip:'punch'}),skins[key]),c=cs.find(c=>c.id==='arm-0-hand');assert.equal(c.href,skins[key].grips.atlas);const sheet=skinnedSheet(a,{...skins[key],href:'main'});assert.equal(sheet.manifest.source.atlas,a.rendering.atlas);assert.equal(sheet.manifest.source.grip,grip);}
 assert.throws(()=>createAsset('human',{skin:'missing'}));
});
test('真人比例检查区分头颅和带颈的整个贴图，避免小头与过宽躯干',()=>{
 const a=createAsset('human'),cs=commands(a,pose(a,0,{clip:'idle'}),skins.human),ys=cs.flatMap(commandContour).map(p=>p[1]),stature=Math.max(...ys)-Math.min(...ys),head=cs.find(c=>c.id==='head');
 // Project silhouette range, not a population statistic. The source's upper
 // 70% is skull/face, while the bottom 30% includes neck insertion.
 assert.ok(head.h*.7/stature>.12&&head.h*.7/stature<.16);assert.ok(cs.find(c=>c.id==='body').w/stature<.17);
});
test('鳄鱼前后腿的素材归属和折叠脚方向一致',()=>{for(const species of ['crocodile']){const a=createAsset(species);assert.equal(a.parts.find(p=>p.id==='leg-0-upper').tile,7);assert.equal(a.parts.find(p=>p.id==='leg-2-upper').tile,2);for(const id of [0,2]){const s=pose(a,.25,{clip:'extend',scope:'component',partId:`leg-${id}-lower`}),low=s.nodes[`leg-${id}-lower`];assert.ok(Math.abs(s.nodes[`leg-${id}-foot`].angle-(Math.atan2(low.end.y-low.y,low.end.x-low.x)*180/Math.PI-90))<.001);}}});
test('鸡的收翅朝身后，头颈共用完整羽毛源而不叠加柱形颈',()=>{const a=createAsset('chicken'),s=pose(a,0,{clip:'idle'});assert.ok(s.nodes['arm-0'].end.x<s.nodes['arm-0'].x);const cs=commands(a,s,skins.chicken);const neck=cs.find(c=>c.id==='neck'),head=cs.find(c=>c.id==='head');assert.equal(neck.slot,1);assert.equal(head.slot,1);assert.deepEqual(neck.rect,head.rect);assert.deepEqual(neck.mask,head.mask);assert.ok(neck.mesh.length>20&&head.mesh.length>20,'head and under-body root use measured regions of one continuous feather source, not synthetic neck tile');assert.ok(cs.indexOf(neck)<cs.findIndex(c=>c.id==='body'));assert.ok(cs.indexOf(head)>cs.findIndex(c=>c.id==='body'));});
test('柔性角色沿前端切线运动，连续源身体的相邻UV没有跨素材跳变',()=>{for(const species of ['snake','worm']){const a=createAsset(species);for(const clip of ['walk','raise',...(species==='snake'?['strike']:['burrow'])])for(const t of [0,.25,.5,.75,1]){const s=pose(a,t,{clip}),n=s.nodes['segment-0'],expected=Math.atan2(n.y-n.end.y,n.x-n.end.x);assert.ok(Math.abs(s.nodes.head.angle*Math.PI/180-expected)<.001);const ts=stripTriangles(a,s,skins[species]);assert.ok(ts.every(t=>t.matrix.every(Number.isFinite)));for(let i=2;i<ts.length;i+=2){const left=ts[i-1].src[2],right=ts[i].src[1];assert.ok(Math.hypot(left.x-right.x,left.y-right.y)<1e-6,'纹理接头不能换到另一源横截面');}if(species==='worm')assert.ok(!commands(a,s,skins.worm).some(c=>c.id==='head'),'完整蚯蚓素材不能再叠一个头帽');assert.match(renderStrip(a,s,skins[species],{scope:'component',selected:'segment-3'}),/opacity="1"/);}}});
test('蝎子步足不重复带爪的胫节，夹螯闭合时两指尖汇合',()=>{const a=createAsset('scorpion');assert.ok(!a.parts.some(p=>p.leg!==undefined&&p.tile===3));const s=pose(a,.5,{clip:'pinch'});for(const i of [0,1])assert.ok(Math.hypot(s.nodes[`claw-${i}-finger`].end.x-s.nodes[`claw-${i}-palm`].end.x,s.nodes[`claw-${i}-finger`].end.y-s.nodes[`claw-${i}-palm`].end.y)<.5);});

test('衣缘遮挡随躯干转动，与原衣片使用同一个源点位置',()=>{const a=createAsset('human',{skin:'alien'}),skin=skins['human-alien'];for(const clip of ['idle','bend','roll'])for(const t of [0,.25,.5,.75,1]){const cs=commands(a,pose(a,t,{clip}),skin),body=cs.find(c=>c.id==='body'),rim=cs.find(c=>c.id==='shoulder-rim');for(const source of [[72,145],[150,110]]){const b=sourcePointWorld(body,source),r=sourcePointWorld(rim,source);assert.ok(b&&r,'检验点必须属于实际衣边');assert.ok(Math.hypot(b[0]-r[0],b[1]-r[1])<.00001,clip+' '+t);}}});

test('团身后的滚动由衣服肩背和四肢承重，真人与大头皮肤不以头部作为地面支点',()=>{for(const skinVariant of ['classic','alien']){const a=createAsset('human',{skin:skinVariant});for(let i=24;i<=95;i++){const cs=commands(a,pose(a,i/100,{clip:'roll'}),skins[a.rendering.skinKey]);assert.ok(Math.max(...commandContour(cs.find(c=>c.id==='head')).map(p=>p[1]))<-.5,skinVariant+' '+i);}}});

// Source v4 uses distinct equine humerus/radius/cannon and femur/tibia/cannon.
// This checks actual hierarchy and support across poses, not only renamed tiles.
test('马的前腕链与后飞节链使用独立素材，骨长和下游连接在完整及单件动作保持',()=>{
 const a=createAsset('horse');assert.equal(a.rendering.horseLegSegments,3);
 for(let i=0;i<4;i++){const front=i>=2,chain=['upper','middle','lower','foot'].map(role=>a.parts.find(p=>p.id===`leg-${i}-${role}`));assert.deepEqual(chain.map(p=>p.tile),front?[7,8,9,10]:[2,3,4,5]);assert.equal(chain[1].parent,chain[0].id);assert.equal(chain[2].parent,chain[1].id);assert.equal(chain[3].parent,chain[2].id);assert.notEqual(chain[1].tile,chain[2].tile);
 for(const clip of a.clips.filter(c=>c!=='extend'))for(let k=0;k<=32;k++){const s=pose(a,k/32,{clip});for(const p of chain.slice(0,3)){const n=s.nodes[p.id];assert.ok(Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-p.dimensions[0])<1e-6);const child=s.nodes[chain[chain.indexOf(p)+1].id];assert.ok(Math.hypot(n.end.x-child.x,n.end.y-child.y)<1e-6);}}
 for(const p of chain)assert.ok(runTests(a,{clip:'extend',scope:'component',partId:p.id}).passed,p.id);
 }
 const s=pose(a,0,{clip:'idle'}),front=s.nodes['leg-2-middle'],hind=s.nodes['leg-0-middle'];assert.ok(front.end.x>front.x,'前腕屈曲方向在肘前');assert.ok(hind.end.x<hind.x,'后飞节在膝后');
 for(const clip of ['walk','run']){const result=runTests(a,{clip});assert.ok(result.passed,JSON.stringify(result.checks));}
});
