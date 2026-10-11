import {presets} from './core.mjs';import {curve} from './human-actions.mjs';
const TAU=Math.PI*2,rad=d=>d*Math.PI/180;
export const animalSpecs={
 chicken:{body:[66,45],center:[0,-60],head:[34,-96,35,37],neck:[22,-73,29,-92],legs:2,hip:[0,-43],bones:[19,24],stride:9,lift:13,wing:[-10,-69,32,25],tail:[-27,-62,31,22],clips:['idle','walk','run','jump','peck','flap','extend']},
 dinosaur:{body:[94,60],center:[-2,-95],head:[58,-133,74,42],neck:[24,-104,49,-129],jaw:[45,-132,39,10],legs:2,hip:[-14,-70],bones:[34,36],foot:[35,12],stride:14,lift:23,arms:[21,-96,14,13],tailChain:[-34,-95,[29,27,25,24,30],[36,26,19,12,7]],scale:1.25,clips:['idle','walk','run','jump','roar','bite','tail','extend']},
 horse:{body:[108,58],center:[-5,-99],head:[61,-148,46,49],neck:[25,-108,43,-137],legs:4,hip:[0,-86],bones:[36,43],foot:[15,11],stride:15,lift:19,tail:[-52,-107,62,16],scale:1.3,clips:['idle','walk','run','jump','graze','rear','tail','extend']},
 crocodile:{body:[119,37],center:[-9,-37],head:[70,-49,73,25],neck:[37,-39,48,-45],jaw:[43,-37,59,8],legs:4,hip:[0,-29],bones:[15,16],foot:[18,7],stride:7,lift:8,tailChain:[-50,-37,[35,30,25,22],[32,24,14,6]],scale:1.18,clips:['idle','walk','run','bite','roar','tail','swim','extend']}
};
export const motionInfo={idle:['呼吸待机',2,true,['站立','轻微呼吸','回位']],walk:['行走',1,true,['落脚支撑','抬脚回摆','交换支撑']],run:['快跑',.65,true,['蹬地','快速回摆','交替落脚']],jump:['跳跃',1.2,false,['屈腿蓄力','起跳','腾空收腿','落地缓冲']],peck:['啄食',1.4,false,['观察','屈颈低头','啄食','抬头']],flap:['振翅',.8,true,['收翅','伸展','下拍','收回']],roar:['仰头咆哮',1.6,false,['蓄力','仰头','张嘴咆哮','闭嘴回位']],bite:['咬击',.85,false,['观察','张嘴','快速咬合','收回']],tail:['摆尾',1.2,true,['尾根驱动','波动传至尾尖','反向回摆']],graze:['低头吃草',2,false,['观察','低头','吃草','抬头']],rear:['扬前蹄',1.6,false,['后腿支撑','前腿抬起','回落','恢复站姿']],swim:['游动',1.3,true,['收腿','尾根驱动','摆尾推进']],extend:['单配件屈伸',1,true,['中性','屈曲','伸展','回位']]};
const rotate=(v,a)=>({x:v.x*Math.cos(a)-v.y*Math.sin(a),y:v.x*Math.sin(a)+v.y*Math.cos(a)});
const plus=(a,b)=>({x:a.x+b.x,y:a.y+b.y});const polar=(p,l,a)=>plus(p,{x:l*Math.cos(a),y:l*Math.sin(a)});
function ik(hip,target,L,B,sign=1){const dx=target.x-hip.x,dy=target.y-hip.y,d=Math.hypot(dx,dy)||.001,r=Math.min(L+B-.001,Math.max(Math.abs(L-B)+.001,d)),theta=Math.atan2(dy,dx),bend=Math.acos(Math.max(-1,Math.min(1,(L*L+r*r-B*B)/(2*L*r))));return {knee:polar(hip,L,theta-sign*bend),foot:polar(hip,r,theta)};}
export function createAnimal(id,options={}){
 if(id==='chicken'&&options.sex!==undefined&&!['hen','rooster'].includes(options.sex))throw Error('鸡的性别素材须为 hen 或 rooster');
 const spec=animalSpecs[id],preset=presets.find(p=>p.id===id);if(!spec||!preset)throw Error('角色尚未完成侧面制作');const size=options.size??1,stride=options.stride??spec.stride,color=options.color??'#e1a34c';if(!Number.isFinite(size)||size<.65||size>1.35||!Number.isFinite(stride)||stride<4||stride>55||!/^#[0-9a-f]{6}$/i.test(color))throw Error('资产参数无效');
 if(id==='horse')return createHorseArtRig({size,stride,color});
 const parts=[],make=(id,name,parent,shape,rest,dimensions,layer,tile,extra={})=>parts.push({id,name,parent,shape,rest,dimensions,layer,tile,material:color,...extra});
 make('root','装配原点',null,'anchor',[0,0],[0,0],0,0);make('body','躯干','root','ellipse',spec.center,spec.body,3,0);
 if(spec.neck){const [x,y,ex,ey]=spec.neck;make('neck','颈部','body','bone',[x,y],[Math.hypot(ex-x,ey-y),12],id==='dinosaur'?2:4,5,{role:'neck'});}
 make('head','头部',spec.neck?'neck':'body','ellipse',spec.head.slice(0,2),spec.head.slice(2),5,1);
 for(let i=0;i<spec.legs;i++){const pair=Math.floor(i/2),side=i%2?'far':'near',layer=side==='far'?1:6,x=spec.legs===2?spec.hip[0]+(i?4:0):-spec.body[0]*.32+pair/(spec.legs/2-1)*spec.body[0]*.64+(i%2?3:0),hip=[x,spec.hip[1]],phase=spec.legs===4?[0,.5,.5,0][i]:(pair*.13+i%2*.5)%1;
  make(`leg-${i}-upper`,`${side==='near'?'近':'远'}侧第${pair+1}腿 · 上段`,'body','bone',hip,[spec.bones[0],8],layer,['horse','crocodile'].includes(id)&&pair===0?7:2,{leg:i,side,role:'upper',phase,range:[-100,100]});make(`leg-${i}-lower`,`${side==='near'?'近':'远'}侧第${pair+1}腿 · 下段`,`leg-${i}-upper`,'bone',hip,[spec.bones[1],5],layer,['horse','crocodile'].includes(id)&&pair===0?8:3,{leg:i,side,role:'lower',phase,range:[0,150]});make(`leg-${i}-foot`,'脚端',`leg-${i}-lower`,'foot',[x,-5],spec.foot??[13,6],layer,4,{leg:i,side,role:'foot',phase,range:[-20,20]});
 }
 if(spec.wing)for(let i=0;i<2;i++)make(`arm-${i}`,`翅膀 ${i+1}`,'body','bone',spec.wing.slice(0,2),spec.wing.slice(2),i?2:7,7,{arm:i,role:'wing',range:[-80,80]});
 if(spec.tail)make('tail-0','尾羽','body','bone',spec.tail.slice(0,2),spec.tail.slice(2),2,6,{role:'tail'});
 if(spec.tailChain)for(let i=0;i<spec.tailChain[2].length;i++)make(`tail-${i}`,`尾链 ${i+1}`,i?`tail-${i-1}`:'body','bone',spec.tailChain.slice(0,2),[spec.tailChain[2][i],spec.tailChain[3][i]],2,i===spec.tailChain[2].length-1?13:6,{role:'tail-chain',segment:i,skinHeight:spec.tailChain[3][i]});
 if(spec.arms)for(let i=0;i<2;i++){const [x,y,U,L]=spec.arms;make(`arm-${i}-upper`,'短前肢 · 上臂','body','bone',[x,y],[U,8],i?1:6,7,{arm:i,role:'arm-upper'});make(`arm-${i}-lower`,'短前肢 · 前臂',`arm-${i}-upper`,'bone',[x,y],[L,5],i?1:6,8,{arm:i,role:'arm-lower'});make(`arm-${i}-hand`,'指爪',`arm-${i}-lower`,'bone',[x,y],[8,5],i?1:6,9,{arm:i,role:'hand'});}
 if(spec.jaw)make('jaw','下颌','head','bone',spec.jaw.slice(0,2),spec.jaw.slice(2),5,12,{role:'jaw'});
 const a={schemaVersion:1,id:`${id}-side-v2`,species:id,name:preset.name,version:2,design:{color,size,stride,view:'侧面 · 正交 · 朝右'},parts,clips:spec.clips,status:'draft',qa:{technical:'untested',visual:'pending'},source:{kind:'redrawn-rounded-part-atlas',description:'重绘自然圆弧零件，内部旋转轴与透明重叠区域'},rendering:{rig:'animal-side-v2',atlas:`/art/${id}-side-parts-v2.png`,view:'side',projection:'orthographic',facing:'right',frame:{anchor:[256,350],scale:spec.scale??1.5}}};if(id==='chicken'){a.rendering.continuousNeck=true;a.parts.find(p=>p.id==='head').skinAspect=true;}if(['chicken','horse','crocodile','dinosaur'].includes(id)){a.version=3;a.id=id+'-side-v3';if(['dinosaur','chicken'].includes(id))a.rendering.atlas='/art/'+id+'-side-parts-v3.png';}if(spec.tailChain)a.rendering.tailMesh={tile:13,width:spec.tailChain[3][0]};if(id==='dinosaur'){a.version=5;a.id='dinosaur-side-v5';a.rendering.atlas='/art/dinosaur-side-parts-v5.png';a.rendering.continuousNeck=true;a.rendering.neckUnderBody=true;a.parts.find(p=>p.id==='head').skinAspect=true;a.rendering.tailMesh={tile:6,width:36,sourceRange:[.92,.015]};}if(id==='crocodile'){a.version=6;a.id='crocodile-side-v6';a.rendering.atlas='/art/crocodile-side-parts-v4.png';a.parts.find(p=>p.id==='head').skinAspect=true;a.rendering.tailMesh={tile:6,width:32,sourceRange:[.86,.005]};}if(id==='dinosaur')configureDinosaurArtRig(a);if(id==='chicken')configureChickenContact(a);if(id==='chicken'&&options.sex==='hen')configureHenVariant(a);a.actionDesign=animalDesign(a);return a;
}
function configureChickenContact(a){a.id='chicken-side-v6';a.version=6;a.rendering.neckUnderBody=true;a.parts.find(p=>p.id==='neck').layer=2;for(const part of a.parts.filter(p=>p.leg!==undefined&&p.side==='near'))part.layer=2.8-(part.role==='lower'?.1:part.role==='foot'?.2:0);a.rendering.peckBodyDrop=30.912145139748873;a.rendering.footContactOffsets=[8.087619047619048,8.058102189781023];a.parts.find(p=>p.id==='leg-1-foot').tile=9;}
function configureHenVariant(a){
 a.id='chicken-hen-side-v7';a.name='母鸡';a.version=7;a.design.sex='hen';Object.assign(a.rendering,{sex:'hen',neckUnderBody:true,peckBodyDrop:30.741712318445877,skinKey:'chicken-hen',atlas:'/art/chicken-hen-parts-v1.png',footContactOffsets:[7.0877524429967425,7.651166077738517]});
 a.parts.find(p=>p.id==='neck').layer=2;for(const part of a.parts.filter(p=>p.leg!==undefined)){const base=part.side==='near'?2.8:1;part.layer=base-(part.role==='lower'?.1:part.role==='foot'?.2:0);}a.parts.find(p=>p.id==='tail-0').dimensions=[27,22];a.parts.find(p=>p.id==='leg-1-foot').tile=9;
 a.source={kind:'generated-female-hen-anatomical-atlas',description:'母鸡小冠、短尾与独立羽毛/腿爪；新源精确alpha归属；装配美术待验收'};
}
export function animalDesign(a){return {title:`${a.name} · 侧面多动作`,assembly:'圆弧端部围绕内部轴点自然重叠。远侧肢体 → 身体 → 近侧肢体；动作保留稳定零件身份。',actions:a.clips.map(id=>{const [name,duration,loop,keyPoses]=motionInfo[id];return {id,name,duration,loop,keyPoses,participants:a.parts.filter(p=>p.id!=='root').map(p=>p.id),timing:'按独立动作时长播放；关节缓入缓出；完整动作与单件测试分开',ranges:'骨段保持固定长度；按当前物种比例绑定',contact:['walk','run'].includes(id)?'逐脚支撑锁地，抬脚期间向前回摆':id==='jump'?'蓄力 → 腾空 → 落地缓冲':'静止双足支撑，单件测试可悬空',acceptance:['骨长固定','连接连续','支撑稳定','轮廓完整','动作与视角一致']};}),visualReview:['正常速度与0.25倍速','深浅背景检查关节裂缝','检查眼睛、脚爪、尾羽朝向','固定画布逐帧检视'],limitations:['二维关节动画；不代表物种级生物或地面摩擦仿真。','侧面资产，俯拍和背面需要独立素材。']};}
export function validateAnimal(a){if(!a||a.schemaVersion!==1||!Array.isArray(a.parts)||!animalSpecs[a.species])throw Error('无效侧面资产');const expected=createAnimal(a.species,a.design).parts;if(expected.length!==a.parts.length)throw Error('零件数量不完整');const ids=new Set();for(const e of expected){const p=a.parts.find(p=>p.id===e.id);if(!p||ids.has(p.id)||p.parent!==e.parent||p.role!==e.role||p.tile!==e.tile||p.leg!==e.leg||p.arm!==e.arm||!p.dimensions.every(x=>Number.isFinite(x)&&x>=0&&x<200))throw Error('零件身份、尺寸或连接无效');ids.add(p.id);}return a;}
export function animalPose(a,t,{clip='walk',scope='character',partId=null,fault='none'}={}){
 if(a.species==='dinosaur'&&a.rendering.dinosaurLegSegments===3)return dinosaurArtPose(a,t,{clip,scope,partId,fault});
 if(a.species==='horse'&&a.rendering.horseLegSegments===3)return horseArtPose(a,t,{clip,scope,partId,fault});
 const spec=animalSpecs[a.species];if(!Number.isFinite(t)||t<0||t>1||!a.clips.includes(clip))throw Error('未知动作或无效相位');if(!['character','component','subassembly'].includes(scope))throw Error('无效测试层级');if(scope!=='character'&&clip!=='extend')throw Error('单件测试使用屈伸动作');const selected=a.parts.find(p=>p.id===partId),nodes={root:{x:0,y:0}},legs=[];
 let dy=0,lean=0,air=0,neckAngle=clip==='extend'&&selected?.role==='neck'?Math.sin(t*TAU)*.45:0;
 if(clip==='idle')dy=Math.sin(t*TAU)*.6;
 if(clip==='peck'){const q=curve(t,[[0,0],[.3,1],[.52,1],[1,0]]);dy=(a.rendering.peckBodyDrop??26)*q;lean=rad(28)*q;neckAngle=rad(65)*q;}
 if(clip==='graze'){const q=curve(t,[[0,0],[.3,1],[.7,1],[1,0]]);dy=28*q;lean=rad(19)*q;neckAngle=rad(80)*q;}
 if(clip==='rear'){const q=curve(t,[[0,0],[.32,1],[.6,1],[1,0]]);lean=-rad(35)*q;}
 if(clip==='roar'){const q=curve(t,[[0,0],[.32,1],[.65,1],[1,0]]);lean=-rad(7)*q;neckAngle=-rad(a.species==='crocodile'?6:13)*q;}
 if(clip==='bite'){const q=curve(t,[[0,0],[.25,1],[.4,1],[1,0]]);lean=rad(7)*q;neckAngle=rad(8)*q;}
 if(clip==='swim')dy=-14+Math.sin(t*TAU)*1.5;
 if(clip==='jump'){const crouch=curve(t,[[0,0],[.14,1],[.24,0],[.75,0],[.86,1],[1,0]]),u=Math.max(0,Math.min(1,(t-.2)/.57));air=t>.2&&t<.77?4*u*(1-u)*36:0;dy=12*crouch-air;}
 if(['walk','run'].includes(clip))dy=Math.sin(t*TAU*2)*(clip==='run'?1:.5);
 const center={x:spec.center[0],y:spec.center[1]+dy},place=rest=>plus(center,rotate({x:rest[0]-spec.center[0],y:rest[1]-spec.center[1]},lean));nodes.body={...center,angle:lean*180/Math.PI};
 if(spec.neck){const p=a.parts.find(p=>p.id==='neck'),base=place(p.rest),na=Math.atan2(spec.neck[3]-spec.neck[1],spec.neck[2]-spec.neck[0])+lean+neckAngle;nodes.neck={...base,end:polar(base,p.dimensions[0],na)};nodes.head={...plus(nodes.neck.end,rotate({x:spec.head[0]-spec.neck[2],y:spec.head[1]-spec.neck[3]},lean+neckAngle)),angle:(lean+neckAngle)*180/Math.PI};}else nodes.head={...place(spec.head),angle:lean*180/Math.PI};
 const gait=['walk','run'].includes(clip),stride=a.design.stride*(clip==='run'?1.2:1),duty=clip==='run'?.4:.5,rootX=gait?2*stride/duty*t:0;
 for(const up of a.parts.filter(p=>p.role==='upper')){
  const i=up.leg,low=a.parts.find(p=>p.id===`leg-${i}-lower`),phase=(t+(fault==='phase'?0:(a.species==='horse'&&clip==='walk'?[0,.5,.25,.75][up.leg]:up.phase)))%1,stance=gait?phase<duty:!air,hip=place(up.rest);const ankle=a.rendering.footContactOffsets?.[i]??{chicken:8.13,horse:11.04,dinosaur:10.91745,crocodile:11.45}[a.species];let target={x:up.rest[0],y:-ankle-air-(air?8:0)},knee,foot;
  if(gait){target={x:up.rest[0]+stride*(stance?1-2*phase/duty:-1+2*(phase-duty)/(1-duty)),y:-ankle-(stance?0:Math.sin((phase-duty)/(1-duty)*Math.PI)*spec.lift*(clip==='run'?1.6:1))};}
  if(clip==='rear'&&i>=2){const q=curve(t,[[0,0],[.32,1],[.6,1],[1,0]]);target.y-=56*q;target.x+=12*q;}
  if(clip==='swim'){target.x+=10;target.y=hip.y+5;}
  if(clip==='extend'){let ua=Math.PI/2-.25,flex=.5;if(selected?.leg===i){if(selected.role==='upper')ua+=Math.sin(t*TAU)*.5;if(selected.role==='lower')flex=.8+Math.sin(t*TAU)*.6;if(scope==='subassembly'){ua+=Math.sin(t*TAU)*.3;flex=.7+Math.sin(t*TAU)*.5;}}knee=polar(hip,up.dimensions[0],ua);foot=polar(knee,low.dimensions[0],ua-flex);}else{if(fault==='slide'&&stance)target.x+=Math.sin(phase*TAU)*12;if(fault==='frozen'&&i===0)target={x:up.rest[0],y:-ankle};const sol=ik(hip,target,up.dimensions[0],low.dimensions[0],a.species==='horse'&&i<2?-1:1);knee=sol.knee;foot=sol.foot;}
  nodes[up.id]={...hip,end:knee};nodes[low.id]={...knee,end:foot};nodes[`leg-${i}-foot`]={...foot,angle:(clip==='extend'||air?Math.atan2(foot.y-knee.y,foot.x-knee.x)*180/Math.PI-90:0)+(clip==='extend'&&selected?.id===`leg-${i}-foot`?Math.sin(t*TAU)*18:0)};legs.push({id:i,hip,knee,foot,stance,phase,worldX:foot.x+rootX});
 }
 for(const p of a.parts.filter(p=>p.role==='wing'||p.role==='tail')){const base=place(p.rest);let angle=p.role==='tail'?(a.species==='horse'?rad(115):rad(-155)):rad(155);if(p.role==='tail'&&clip==='tail')angle+=Math.sin(t*TAU)*.4;if(p.role==='wing'&&clip==='flap')angle=rad(155)+Math.sin(t*TAU)*rad(70);if(p.role==='wing'&&clip==='jump')angle+=Math.sin(Math.max(0,Math.min(1,(t-.2)/.57))*Math.PI)*rad(75);if(clip==='extend'&&selected?.id===p.id)angle+=Math.sin(t*TAU)*.7;nodes[p.id]={...base,end:polar(base,p.dimensions[0],angle+(a.species==='horse'&&p.role==='tail'?0:lean))};}
 for(const p of a.parts.filter(p=>p.role==='tail-chain')){const base=p.segment?nodes[p.parent].end:place(p.rest),angle=rad(185)+lean+(['tail','swim'].includes(clip)?Math.sin(t*TAU-p.segment*.5)*.22:clip==='extend'?(selected?.role==='tail-chain'&&p.segment>=selected.segment?Math.sin(t*TAU)*.3:0):Math.sin(t*TAU-p.segment*.5)*.035);nodes[p.id]={...base,end:polar(base,p.dimensions[0],angle)};}
 if(spec.arms)for(let i=0;i<2;i++){const up=a.parts.find(p=>p.id===`arm-${i}-upper`),low=a.parts.find(p=>p.id===`arm-${i}-lower`),hand=a.parts.find(p=>p.id===`arm-${i}-hand`),base=place(up.rest);let ua=rad(72)+lean,flex=rad(77);if(clip==='extend'&&selected?.arm===i){if(selected.role==='arm-upper'||scope==='subassembly')ua+=Math.sin(t*TAU)*.5;if(selected.role==='arm-lower'||scope==='subassembly')flex+=Math.sin(t*TAU)*.4;}const e=polar(base,up.dimensions[0],ua),w=polar(e,low.dimensions[0],ua-flex);nodes[up.id]={...base,end:e};nodes[low.id]={...e,end:w};nodes[hand.id]={...w,end:polar(w,hand.dimensions[0],ua-flex+(clip==='extend'&&selected?.id===hand.id?Math.sin(t*TAU)*.4:0))};}
 if(spec.jaw){const p=a.parts.find(p=>p.id==='jaw'),angle=lean+neckAngle,q=clip==='roar'?curve(t,[[0,0],[.3,1],[.68,1],[1,0]]):clip==='bite'?curve(t,[[0,0],[.27,1],[.39,0],[1,0]]):clip==='extend'&&selected?.role==='jaw'?(1+Math.sin(t*TAU))*.5:0,base=plus(nodes.head,rotate({x:spec.jaw[0]-spec.head[0],y:spec.jaw[1]-spec.head[1]},angle));nodes.jaw={...base,end:polar(base,p.dimensions[0],angle+q*rad(38))};}
 if(fault==='stretch')nodes['leg-0-lower'].end.x+=12;if(fault==='seam')for(const n of Object.values(nodes)){n.x+=t*20;if(n.end)n.end.x+=t*20;}
 return {nodes,legs,rootX,t,clip,airborne:air>0};
}
export function testAnimal(a,options={}){
 validateAnimal(a);const {clip='walk',scope='character',partId=null,fault='none'}=options,selected=a.parts.find(p=>p.id===partId);if(scope!=='character'&&!selected)throw Error('请选择零件');const samples=Array.from({length:97},(_,i)=>animalPose(a,i/96,options)),checks=[],active=new Set(scope==='character'?a.parts.map(p=>p.id):[partId]);for(let k=0;k<a.parts.length;k++)for(const p of a.parts)if(active.has(p.parent))active.add(p.id);let len=0,join=0,seam=0,move=0,still=0,slide=0;
 for(const p of a.parts.filter(p=>p.id!=='root')){const f=samples[0].nodes[p.id],l=samples.at(-1).nodes[p.id];seam=Math.max(seam,Math.hypot(f.x-l.x,f.y-l.y));if(f.end)seam=Math.max(seam,Math.hypot(f.end.x-l.end.x,f.end.y-l.end.y));for(const s of samples){const n=s.nodes[p.id],parent=s.nodes[p.parent];if(n.end)len=Math.max(len,Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-p.dimensions[0]));if(parent?.end&&p.id!=='head')join=Math.max(join,Math.hypot(n.x-parent.end.x,n.y-parent.end.y));const d=n.end?Math.hypot(n.end.x-f.end.x,n.end.y-f.end.y):Math.hypot(n.x-f.x,n.y-f.y)+Math.abs((n.angle??0)-(f.angle??0))*.1;if(active.has(p.id))move=Math.max(move,d);else still=Math.max(still,d);}}
 const add=(id,label,passed,detail)=>checks.push({id,label,passed,detail});add('length','骨段长度固定',len<.01,`${len.toFixed(4)} px`);add('join','逐关节连接连续',join<.01,`${join.toFixed(4)} px`);add('loop','末首或动作回位',seam<.01,`${seam.toFixed(4)} px`);const movable=scope==='character'||selected?.leg!==undefined||selected?.arm!==undefined||['tail','tail-chain','neck','jaw'].includes(selected?.role);add('movement','选中关节确实运动',!movable||move>.25,`${move.toFixed(2)} px`);
 if(scope!=='character')add('isolation','其余肢体固定',still<.01,`${still.toFixed(4)} px`);
 if(['walk','run'].includes(clip)){let minMotion=Infinity;for(let i=0;i<samples[0].legs.length;i++){const xs=samples.map(s=>s.legs[i].foot.x);minMotion=Math.min(minMotion,Math.max(...xs)-Math.min(...xs));for(let j=1;j<96;j++){const x=samples[j].legs[i],y=samples[j-1].legs[i];if(x.stance&&y.stance)slide=Math.max(slide,Math.abs(x.worldX-y.worldX));}}add('support','支撑脚世界坐标稳定',slide<.05,`${slide.toFixed(4)} px`);add('participation','每条腿参与步态',minMotion>3,`${minMotion.toFixed(2)} px`);const expected=samples[0].legs.map((l,i)=>a.species==='horse'&&clip==='walk'?[0,.5,.25,.75][i]:a.parts.find(p=>p.role==='upper'&&p.leg===i).phase);add('phase','物种步态相位',samples[0].legs.every((l,i)=>Math.abs(l.phase-expected[i])<.001),'实测近远腿的相位分组');}
 if(clip==='jump')add('air','有离地与落地',samples.some(s=>s.airborne)&&!samples[0].airborne&&!samples.at(-1).airborne,'蓄力、腾空、缓冲分段');
 return {passed:checks.every(c=>c.passed),checks,scope,clip,fault,samples:samples.length,qa:{technical:'sampled',visual:'pending'}};
}

// Equine forearms and hind hocks are separate structures. A two-bone human-style
// leg makes the long cannon impersonate both joints and cannot preserve anatomy.
function createHorseArtRig({size,stride,color}){
 const parts=[],add=(id,name,parent,shape,rest,dimensions,layer,tile,extra={})=>parts.push({id,name,parent,shape,rest,dimensions,layer,tile,material:color,...extra});
 add('root','装配原点',null,'anchor',[0,0],[0,0],0,0);add('body','胸廓与臀部','root','ellipse',[-4,-105],[110,60],3,0);
 add('neck','连续颈根','body','bone',[32,-108],[Math.hypot(22.5,-66.4),24],2,1,{role:'neck',range:[-35,125]});
 add('head','完整头颈','neck','ellipse',[50,-155],[90,96],5,1,{skinAspect:true});
 for(let i=0;i<4;i++){
  const front=i>=2,far=i%2===1,layer=far?.8:2,hip=[front?33:-39+(far?3:0),front?-108:-101],phase=[0,.12,.40,.52][i];
  add(`leg-${i}-upper`,front?'肩至肘上臂':'髋至膝股段','body','bone',hip,[front?28:36,front?18:23],layer,front?7:2,{leg:i,side:far?'far':'near',role:'upper',phase,range:[-80,80]});
  add(`leg-${i}-middle`,front?'肘至腕前臂':'膝至飞节胫段',`leg-${i}-upper`,'bone',hip,[front?34:29,front?13:14],layer-.1,front?8:3,{leg:i,side:far?'far':'near',role:'middle',phase,range:[-100,100]});
  add(`leg-${i}-lower`,front?'腕至球节前跖段':'飞节至球节后跖段',`leg-${i}-middle`,'bone',hip,[front?32:26,10],layer-.2,front?9:4,{leg:i,side:far?'far':'near',role:'lower',phase,range:[-120,120]});
  add(`leg-${i}-foot`,'系部与蹄',`leg-${i}-lower`,'foot',[hip[0],-15],[18,15],layer-.3,front?10:5,{leg:i,side:far?'far':'near',role:'foot',phase,range:[-22,22]});
 }
 add('tail-0','尾根与完整尾毛','body','bone',[-52,-119],[92,28],2,6,{role:'tail',range:[-30,30]});
 const a={schemaVersion:1,id:'horse-side-v24',species:'horse',name:'马',version:24,design:{color,size,stride,view:'侧面 · 正交 · 朝右'},parts,clips:[...animalSpecs.horse.clips],status:'draft',qa:{technical:'untested',visual:'pending'},source:{kind:'generated-equine-anatomical-atlas',description:'完整连续头颈；前肘腕与后膝飞节独立三段解剖素材'},rendering:{rig:'animal-side-v2',horseLegSegments:3,footContactOffsets:[12.084957983193277,12.084957983193277,11.735714285714286,11.735714285714286],stanceBodyDrop:4,grazeNeckAngleDeg:114.3,atlas:'/art/horse-side-parts-v5.png',continuousNeck:true,neckUnderBody:true,view:'side',projection:'orthographic',facing:'right',frame:{anchor:[256,350],scale:1.3}}};a.actionDesign=animalDesign(a);return a;
}
function horseArtPose(a,t,{clip,scope,partId,fault}){
 if(!Number.isFinite(t)||t<0||t>1||!a.clips.includes(clip))throw Error('未知动作或无效相位');if(!['character','component','subassembly'].includes(scope)||scope!=='character'&&clip!=='extend')throw Error('无效测试层级');
 const selected=a.parts.find(p=>p.id===partId),nodes={root:{x:0,y:0}},legs=[],running=clip==='run',gait=['walk','run'].includes(clip),duty=running?.24:.62,stride=a.design.stride*(running?1.65:1.0),rootX=gait?2*stride/duty*t:0;
 let lean=0,dy=clip==='idle'?Math.sin(t*TAU)*.35:0,air=0,neckAngle=0,headAngle=0;
 if(clip==='graze'){const q=curve(t,[[0,0],[.3,1],[.7,1],[1,0]]);lean=rad(8)*q;neckAngle=rad(a.rendering.grazeNeckAngleDeg??120)*q;headAngle=rad(82)*q;dy=4*q;}
 if(clip==='rear'){const q=curve(t,[[0,0],[.3,1],[.65,1],[1,0]]);lean=-rad(30)*q;dy=2*q;}
 if(clip==='jump'){const q=curve(t,[[0,0],[.14,1],[.24,0],[.75,0],[.86,1],[1,0]]),u=Math.max(0,Math.min(1,(t-.2)/.57));air=t>.2&&t<.77?4*u*(1-u)*34:0;dy=7*q-air;}
 if(running){const u=t%1;air=u>.24&&u<.48?Math.sin((u-.24)/.24*Math.PI)*7:0;dy=6-air+Math.sin(t*TAU)*.8;}
 if(clip==='walk')dy=6;
 if(clip==='extend'&&selected?.role==='neck')neckAngle=headAngle=Math.sin(t*TAU)*rad(30);
 const center={x:-4,y:-105+dy+(a.rendering.stanceBodyDrop??0)},place=rest=>plus(center,rotate({x:rest[0]+4,y:rest[1]+105},lean));nodes.body={...center,angle:lean*180/Math.PI};
 const nb=place([32,-108]),na=Math.atan2(-66.4,22.5)+lean+neckAngle;nodes.neck={...nb,end:polar(nb,Math.hypot(22.5,-66.4),na)};nodes.head={...plus(nodes.neck.end,rotate({x:-4.5,y:19.4},lean+headAngle)),angle:(lean+headAngle)*180/Math.PI};
 for(const up of a.parts.filter(p=>p.role==='upper')){
  const i=up.leg,front=i>=2,mid=a.parts.find(p=>p.id===`leg-${i}-middle`),low=a.parts.find(p=>p.id===`leg-${i}-lower`),hip=place(up.rest),phase=(t+(fault==='phase'?0:clip==='walk'?[0,.5,.25,.75][i]:up.phase))%1,stance=gait?phase<duty:!air;
  const ankle=a.rendering.footContactOffsets?.[i]??18*(front?145/160:167/162)*.80;let target={x:up.rest[0]+(front?-1:3),y:-ankle-air-(clip==='jump'&&air?8:0)};
  if(gait)target={x:up.rest[0]+stride*(stance?1-2*phase/duty:-1+2*(phase-duty)/(1-duty)),y:-ankle-(stance?0:Math.sin((phase-duty)/(1-duty)*Math.PI)*(running?26:15))-air};
  if(clip==='rear'&&front){const q=curve(t,[[0,0],[.3,1],[.65,1],[1,0]]);target.x+=25*q;target.y-=48*q;}
  if(fault==='frozen'&&i===0)target={x:up.rest[0],y:-ankle};if(fault==='slide'&&stance)target.x+=Math.sin(phase*TAU)*12;
  let ua=gait?Math.atan2(target.y-hip.y,target.x-hip.x)+rad(front?8:-16):rad(front?105:70)+lean,elbow=polar(hip,up.dimensions[0],ua),sol=ik(elbow,target,mid.dimensions[0],low.dimensions[0],front?1:-1),wrist=sol.knee,foot=sol.foot;
  if(clip==='extend'){
   const uaBase=rad(front?105:70),e0=polar(hip,up.dimensions[0],uaBase),s0=ik(e0,{x:up.rest[0]+(front?-1:3),y:-ankle},mid.dimensions[0],low.dimensions[0],front?1:-1),m0=Math.atan2(s0.knee.y-e0.y,s0.knee.x-e0.x),l0=Math.atan2(s0.foot.y-s0.knee.y,s0.foot.x-s0.knee.x),q=selected?.leg===i?Math.sin(t*TAU)*.40:0;
   const uq=selected?.role==='upper'||scope==='subassembly'&&selected?.leg===i?q:0,mq=selected?.role==='middle'?q:0,lq=selected?.role==='lower'?q:0;
   elbow=polar(hip,up.dimensions[0],uaBase+uq);wrist=polar(elbow,mid.dimensions[0],m0+uq+mq);foot=polar(wrist,low.dimensions[0],l0+uq+mq+lq);
  }
  nodes[up.id]={...hip,end:elbow};nodes[mid.id]={...elbow,end:wrist};nodes[low.id]={...wrist,end:foot};nodes[`leg-${i}-foot`]={...foot,angle:clip==='extend'&&selected?.id===`leg-${i}-foot`?Math.sin(t*TAU)*18:gait&&!stance?Math.sin((phase-duty)/(1-duty)*Math.PI)*-12:air?-12:0};legs.push({id:i,hip,knee:wrist,elbow,foot,stance,phase,worldX:foot.x+rootX});
 }
 const base=place([-52,-119]),angle=rad(111)+(clip==='tail'?Math.sin(t*TAU)*.26:clip==='extend'&&selected?.role==='tail'?Math.sin(t*TAU)*.45:(clip==='extend'?0:Math.sin(t*TAU)*.035));nodes['tail-0']={...base,end:polar(base,92,angle)};
 if(fault==='stretch')nodes['leg-0-lower'].end.x+=12;if(fault==='seam')for(const n of Object.values(nodes)){n.x+=t*20;if(n.end)n.end.x+=t*20;}return {nodes,legs,rootX,t,clip,airborne:air>0};
}

function configureDinosaurArtRig(a){
 a.id='dinosaur-side-v13';a.version=13;a.rendering.atlas='/art/dinosaur-side-parts-v8.png';a.rendering.dinosaurLegSegments=3;a.rendering.tailMesh={tile:6,width:28,sourceRange:[.92,.008]};a.rendering.legSourceReview='partial-fix-overall-visual-failed';
 for(let i=0;i<2;i++){const up=a.parts.find(p=>p.id===`leg-${i}-upper`),low=a.parts.find(p=>p.id===`leg-${i}-lower`),foot=a.parts.find(p=>p.id===`leg-${i}-foot`);up.name='髋至膝股段';up.rest=[-14+i*4,-78];up.dimensions=[40,29];up.layer=i?1:2;low.name='踝至趾根跖段';low.parent=`leg-${i}-middle`;low.dimensions=[22,15];low.tile=4;low.layer=i?.8:1.8;foot.layer=i?.7:1.7;foot.name='短趾垫与三趾爪';foot.tile=10;foot.dimensions=[28,16];a.parts.splice(a.parts.indexOf(low),0,{...low,id:`leg-${i}-middle`,name:'膝至踝胫段',parent:up.id,dimensions:[36,22],layer:i?.9:1.9,tile:3,role:'middle'});}
 a.source={kind:'generated-theropod-anatomical-atlas',description:'独立股段、胫段、踝下跖段与短三趾脚片，完整连续头颈和长尾'};
}
function dinosaurArtPose(a,t,{clip,scope,partId,fault}){
 const s=animalPose({...a,rendering:{...a.rendering,dinosaurLegSegments:0}},t,{clip,scope,partId,fault:'none'}),selected=a.parts.find(p=>p.id===partId),gait=['walk','run'].includes(clip),running=clip==='run',duty=running?.4:.5,stride=a.design.stride*(running?1.2:1),center=s.nodes.body,lean=(center.angle??0)*Math.PI/180,place=r=>plus(center,rotate({x:r[0]+2,y:r[1]+95},lean));s.legs=[];s.rootX=gait?2*stride/duty*t:0;
 for(const up of a.parts.filter(p=>p.role==='upper')){const i=up.leg,mid=a.parts.find(p=>p.id===`leg-${i}-middle`),low=a.parts.find(p=>p.id===`leg-${i}-lower`),hip=place(up.rest),phase=(t+(fault==='phase'?0:up.phase))%1,stance=gait?phase<duty:!s.airborne,ankle=28*194/341*.78;let target={x:up.rest[0]+4,y:-ankle-(s.airborne?Math.max(0,-center.y-95)+8:0)};
 if(gait)target={x:up.rest[0]+stride*(stance?1-2*phase/duty:-1+2*(phase-duty)/(1-duty)),y:-ankle-(stance?0:Math.sin((phase-duty)/(1-duty)*Math.PI)*(running?30:19))};
 if(fault==='frozen'&&i===0)target={x:up.rest[0]+4,y:-ankle};if(fault==='slide'&&stance)target.x+=Math.sin(phase*TAU)*12;
 const femur=up.dimensions[0],tibia=mid.dimensions[0],metatarsus=low.dimensions[0];
 let ua=rad(50)+lean+(gait?Math.sin(phase*TAU)*rad(12):0),knee=polar(hip,femur,ua),sol=ik(knee,target,tibia,metatarsus,-1),hock=sol.knee,foot=sol.foot;
 if(clip==='extend'){const k0=polar(hip,femur,rad(50)),p0=ik(k0,{x:up.rest[0]+4,y:-ankle},tibia,metatarsus,-1),ma=Math.atan2(p0.knee.y-k0.y,p0.knee.x-k0.x),la=Math.atan2(p0.foot.y-p0.knee.y,p0.foot.x-p0.knee.x),q=selected?.leg===i?Math.sin(t*TAU)*.42:0,uq=selected?.role==='upper'||scope==='subassembly'&&selected?.leg===i?q:0,mq=selected?.role==='middle'?q:0,lq=selected?.role==='lower'?q:0;knee=polar(hip,femur,rad(50)+uq);hock=polar(knee,tibia,ma+uq+mq);foot=polar(hock,metatarsus,la+uq+mq+lq);}
 s.nodes[up.id]={...hip,end:knee};s.nodes[mid.id]={...knee,end:hock};s.nodes[low.id]={...hock,end:foot};s.nodes[`leg-${i}-foot`]={...foot,angle:clip==='extend'&&selected?.id===`leg-${i}-foot`?Math.sin(t*TAU)*18:gait&&!stance?-Math.sin((phase-duty)/(1-duty)*Math.PI)*14:0};s.legs.push({id:i,hip,knee,hock,foot,phase,stance,worldX:foot.x+s.rootX});}
 if(fault==='stretch')s.nodes['leg-0-lower'].end.x+=12;if(fault==='seam')for(const n of Object.values(s.nodes)){n.x+=t*20;if(n.end)n.end.x+=t*20;}return s;
}
