// Choreographed joint motion. Walk and isolated component tests remain in human-rig.mjs.
import {humanContactBounds} from './human-contact.mjs';
const TAU=Math.PI*2,rad=d=>d*Math.PI/180;
const smooth=x=>x*x*(3-2*x);
export function curve(t,keys){for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth(Math.max(0,Math.min(1,(t-a)/(b-a))));}}return keys.at(-1)[1];}
const rotate=(v,a)=>({x:v.x*Math.cos(a)-v.y*Math.sin(a),y:v.x*Math.sin(a)+v.y*Math.cos(a)});
const add=(p,v)=>({x:p.x+v.x,y:p.y+v.y});
const end=(p,l,a)=>add(p,{x:l*Math.cos(a),y:l*Math.sin(a)});
function ik(hip,foot,L,B){const dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.hypot(dx,dy)||.001,r=Math.min(L+B-.001,Math.max(Math.abs(L-B)+.001,d)),theta=Math.atan2(dy,dx),bend=Math.acos(Math.max(-1,Math.min(1,(L*L+r*r-B*B)/(2*L*r))));return {knee:end(hip,L,theta-bend),foot:end(hip,r,theta)};}
export const humanClips=[
 {id:'idle',name:'呼吸待机',duration:2,loop:true,poses:['直立','胸肩轻微起伏','回到直立']},
 {id:'walk',name:'侧面行走',duration:1,loop:true,poses:['支撑','回摆','交换支撑']},
 {id:'run',name:'快跑',duration:.65,loop:true,poses:['落脚','蹬地','腾空','换腿']},
 {id:'jump',name:'跳跃',duration:1.3,loop:false,poses:['屈膝蓄力','蹬地起跳','腾空收腿','落地缓冲','恢复']},
 {id:'punch',name:'拳击',duration:.9,loop:false,poses:['格斗预备','蓄力','快速出拳','短暂保持','收拳']},
 {id:'squat',name:'深蹲',duration:1.8,loop:false,poses:['站立','屈髋屈膝','深蹲保持','起身']},
 {id:'bend',name:'弯腰',duration:1.6,loop:false,poses:['站立','屈髋前倾','手臂自然垂落','抬身']},
 {id:'roll',name:'翻滚',duration:1.2,loop:false,poses:['屈膝前倾','双手触地','收下巴团身','肩背接地翻滚','落脚恢复']},
 {id:'extend',name:'单配件屈伸',duration:1,loop:true,poses:['中间角度','最大弯曲','伸直 / 最小角度','回位']}
];
export function complexHumanPose(a,t,{clip,fault='none'}={}){
 if(!Number.isFinite(t)||t<0||t>1||!humanClips.some(c=>c.id===clip))throw Error('未知动作或无效相位');
 const part=id=>a.parts.find(p=>p.id===id),nodes={root:{x:0,y:0}},legs=[];
 let hipY=-106,hipX=0,lean=0,rootX=0,air=0,rollRotation=0,armA=[rad(86),rad(86)],armB=[rad(15),rad(15)],footX=[8,-8],feetY=[-11,-11],stance=[true,true];
 const q=curve(t,[[0,0],[.36,1],[.56,1],[1,0]]);
 if(clip==='idle'){hipY+=Math.sin(t*TAU)*.7;armA=[rad(88)+Math.sin(t*TAU)*.012,rad(88)+Math.sin(t*TAU)*.012];if(a.rendering.grip&&a.rendering.grip!=='none'){armA[0]=rad(70);armB[0]=rad(70);}}
 if(clip==='squat'){hipY+=49*q;hipX-=13*q;lean=rad(17)*q;armA=[rad(88)-rad(87)*q,rad(88)-rad(83)*q];armB=[rad(12)+rad(10)*q,rad(12)+rad(10)*q];}
 if(clip==='bend'){lean=rad(67)*q;hipX=-10*q;hipY+=7*q;armA=[rad(86)-lean*.94,rad(86)-lean*.94];}
 if(clip==='punch'){
  const hit=curve(t,[[0,0],[.22,-.15],[.36,1],[.44,1],[.72,0],[1,0]]),shift=curve(t,[[0,0],[.36,1],[.55,.6],[1,0]]);
  hipY=-99;hipX=shift*8;lean=rad(8)*shift;footX=[29,-27];
  armA=[rad(35)*(1-hit)-rad(8)*hit,rad(35)];armB=[rad(130)*(1-hit)+rad(4)*hit,rad(125)];
 }
 if(clip==='jump'){
  const crouch=curve(t,[[0,0],[.13,1],[.23,0],[.75,0],[.85,1],[1,0]]),u=Math.max(0,Math.min(1,(t-.2)/.57));
  air=t>.2&&t<.77?4*u*(1-u)*72:0;hipY+=24*crouch-air;
  const tuck=Math.sin(u*Math.PI)*18;feetY=air?[ -11-air-tuck,-11-air-tuck]:[-11,-11];stance=[!air,!air];
  lean=rad(8)*crouch;armA=[rad(88)-rad(195)*Math.sin(u*Math.PI),rad(88)-rad(182)*Math.sin(u*Math.PI)];
 }
 if(clip==='run'){
  hipY=-103+Math.cos(t*TAU*2)*1.5;lean=rad(8);rootX=58/.36*t;
  for(let i=0;i<2;i++){
   const p=(t+i*.5)%1;stance[i]=p<.36;
   footX[i]=p<.36?26-58*p/.36:curve(p,[[.36,-32],[.52,-24],[.76,34],[.9,34],[1,26]]);
   feetY[i]=p<.36?-11:curve(p,[[.36,-11],[.52,-69],[.76,-72],[.9,-33],[1,-11]]);
  }
 }
 if(clip==='roll'){
  const tuck=curve(t,[[0,0],[.24,1],[.8,1],[1,0]]),plant=curve(t,[[0,0],[.22,1],[.32,1],[.42,0],[1,0]]);hipY+=(44+(a.rendering.skin==='alien'?6:30)*plant)*tuck;hipX-=8*tuck;lean=rad(50+30*plant)*tuck;
  armA=[rad(88)-rad(108)*tuck,rad(88)-rad(103)*tuck];armB=[rad(15)+rad(120)*tuck,rad(15)+rad(115)*tuck];
  footX=[8-(23+20*plant)*tuck,-8-(10+17*plant)*tuck];feetY=[-11-22*tuck*(1-plant),-11-22*tuck*(1-plant)];stance=[t<.18||t>.84,t<.18||t>.84];
  rootX=curve(t,[[0,0],[.32,0],[.8,120],[1,120]]);
 }
 const hip={x:hipX,y:hipY},bodyOffset=rotate({x:part('body').rest[0],y:part('body').rest[1]-part('leg-0-upper').rest[1]},lean);nodes.body={...add(hip,bodyOffset),angle:lean*180/Math.PI};
 const shoulder=add(hip,rotate({x:part('arm-0-upper').rest[0],y:part('arm-0-upper').rest[1]-part('leg-0-upper').rest[1]},lean)),neckBase=add(hip,rotate({x:part('neck').rest[0],y:part('neck').rest[1]-part('leg-0-upper').rest[1]},lean));
 nodes.neck={...neckBase,end:add(neckBase,rotate({x:0,y:-part('neck').dimensions[0]},lean))};nodes.head={...add(hip,rotate({x:part('head').rest[0],y:part('head').rest[1]-part('leg-0-upper').rest[1]},lean)),angle:lean*180/Math.PI};
 for(let i=0;i<2;i++){
  const up=part(`leg-${i}-upper`),low=part(`leg-${i}-lower`),sol=ik(hip,{x:footX[i],y:feetY[i]},up.dimensions[0],low.dimensions[0]);
  if(clip==='run'){armA[i]=rad(88)+rad(43)*Math.max(-1,Math.min(1,(sol.knee.x-hip.x-12)/32));armB[i]=rad(90)-rad(8)*Math.cos((t+i*.5)*TAU);}
  nodes[up.id]={...hip,end:sol.knee};nodes[low.id]={...sol.knee,end:sol.foot};nodes[`leg-${i}-foot`]={...sol.foot,angle:clip==='roll'?(Math.atan2(sol.foot.y-sol.knee.y,sol.foot.x-sol.knee.x)*180/Math.PI-90)*curve(t,[[0,0],[.32,0],[.42,1],[.84,1],[1,0]]):air?-10:0};
  legs.push({id:i,hip,knee:sol.knee,foot:sol.foot,stance:stance[i],phase:(t+i*.5)%1,worldX:sol.foot.x+rootX});
  const upper=part(`arm-${i}-upper`),lower=part(`arm-${i}-lower`),hand=part(`arm-${i}-hand`),ua=armA[i]+lean,la=ua-armB[i],elbow=end(shoulder,upper.dimensions[0],ua),wrist=end(elbow,lower.dimensions[0],la);
  nodes[upper.id]={...shoulder,end:elbow};nodes[lower.id]={...elbow,end:wrist};nodes[hand.id]={...wrist,end:end(wrist,hand.dimensions[0],la)};
 }
 if(clip==='roll'){
  const tuck=curve(t,[[0,0],[.24,1],[.8,1],[1,0]]),plant=curve(t,[[0,0],[.22,1],[.32,1],[.42,0],[1,0]]),na=lean+rad(25)*tuck;nodes.neck.end=add(neckBase,rotate({x:0,y:-part('neck').dimensions[0]},na));nodes.head={...add(nodes.neck.end,rotate({x:part('head').rest[0]-part('neck').rest[0],y:part('head').rest[1]-part('neck').rest[1]+part('neck').dimensions[0]},na)),angle:na*180/Math.PI};
  // Hands reach the floor before any global rotation. Elbow flexion solves
  // from the actual shoulder and a floor-directed wrist target.
  for(let i=0;i<2;i++){
   const upper=part(`arm-${i}-upper`),lower=part(`arm-${i}-lower`),hand=part(`arm-${i}-hand`),w=nodes[lower.id].end,target=a.rendering.skin==='alien'?{x:shoulder.x+6-i*3,y:Math.min(21.5,shoulder.y+Math.min(...[0,1].map(j=>Math.sqrt((part(`arm-${j}-upper`).dimensions[0]+part(`arm-${j}-lower`).dimensions[0]-.001)**2-6**2))))}:{x:56-i*3,y:21.5};
   const wrist={x:w.x+(target.x-w.x)*plant,y:w.y+(target.y-w.y)*plant},dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,d=Math.min(upper.dimensions[0]+lower.dimensions[0]-.001,Math.hypot(dx,dy)),theta=Math.atan2(dy,dx),bend=Math.acos(Math.max(-1,Math.min(1,(upper.dimensions[0]**2+d*d-lower.dimensions[0]**2)/(2*upper.dimensions[0]*d)))),elbow=end(shoulder,upper.dimensions[0],theta+bend),actual=end(shoulder,d,theta),la=Math.atan2(actual.y-elbow.y,actual.x-elbow.x);
   nodes[upper.id]={...shoulder,end:elbow};nodes[lower.id]={...elbow,end:actual};nodes[hand.id]={...actual,end:end(actual,hand.dimensions[0],la*(1-plant))};
  }
  const spin=curve(t,[[0,0],[.32,0],[.8,TAU],[1,TAU]]),center={x:30,y:-78};rollRotation=spin;
  for(const [id,n] of Object.entries(nodes)){if(id==='root')continue;const r=add(center,rotate({x:n.x-center.x,y:n.y-center.y},spin));n.x=r.x;n.y=r.y;if(n.end)n.end=add(center,rotate({x:n.end.x-center.x,y:n.end.y-center.y},spin));if(n.angle!==undefined)n.angle+=spin*180/Math.PI;}
  // Use measured, rotated source silhouettes; an axis-aligned height misses floor crossings.
  const maxY=humanContactBounds(nodes,a.rendering.contactProfiles).maxY;
  for(const [id,n] of Object.entries(nodes)){if(id==='root')continue;n.y-=maxY;if(n.end)n.end.y-=maxY;}
  for(let i=0;i<2;i++)Object.assign(legs[i],{hip:{x:nodes[`leg-${i}-upper`].x,y:nodes[`leg-${i}-upper`].y},knee:nodes[`leg-${i}-upper`].end,foot:nodes[`leg-${i}-lower`].end,worldX:nodes[`leg-${i}-lower`].end.x+rootX});
 }
 if(fault==='stretch')nodes['leg-0-lower'].end.x+=12;
 if(fault==='seam')for(const n of Object.values(nodes)){n.x+=t*20;if(n.end)n.end.x+=t*20;}
 return {nodes,legs,rootX,t,clip,rollRotation,events:clip==='roll'?[{phase:.24,name:'hands-contact'},{phase:.32,name:'roll-start'},{phase:.8,name:'feet-recover'}]:clip==='jump'?[{phase:.2,name:'takeoff'},{phase:.77,name:'land'}]:clip==='punch'?[{phase:.36,name:'impact'}]:[],airborne:air>0};
}
export function testComplexHuman(a,options={}){
 const samples=Array.from({length:97},(_,i)=>complexHumanPose(a,i/96,options)),checks=[],add=(id,label,passed,detail)=>checks.push({id,label,passed,detail});let length=0,join=0,seam=0,move=0,ground=0;
 for(const p of a.parts.filter(p=>p.id!=='root')){const f=samples[0].nodes[p.id],l=samples.at(-1).nodes[p.id];seam=Math.max(seam,Math.hypot(f.x-l.x,f.y-l.y));if(f.end)seam=Math.max(seam,Math.hypot(f.end.x-l.end.x,f.end.y-l.end.y));for(const s of samples){const n=s.nodes[p.id],parent=s.nodes[p.parent];if(n.end)length=Math.max(length,Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-p.dimensions[0]));if(parent?.end&&p.id!=='head')join=Math.max(join,Math.hypot(n.x-parent.end.x,n.y-parent.end.y));move=Math.max(move,Math.hypot(n.x-f.x,n.y-f.y));} }
 for(const s of samples)for(const l of s.legs)ground=Math.max(ground,l.foot.y+11);
 add('length','刚性骨长固定',length<.01,`${length.toFixed(4)} px`);add('join','肢体连接连续',join<.01,`${join.toFixed(4)} px`);add('return','回到动作起点',seam<.01,`${seam.toFixed(4)} px`);add('movement','动作确实驱动关节',move>.2,`${move.toFixed(2)} px`);
 if(['squat','bend','punch'].includes(options.clip)){let slide=0;for(const s of samples)for(let i=0;i<2;i++)slide=Math.max(slide,Math.hypot(s.legs[i].foot.x-samples[0].legs[i].foot.x,s.legs[i].foot.y-samples[0].legs[i].foot.y));add('planted','脚掌稳定支撑',slide<.01,`${slide.toFixed(4)} px`);}
 if(options.clip!=='roll')add('ground','脚踝不穿地',ground<.02,`${ground.toFixed(4)} px`);
 if(options.clip==='roll'){const errors=samples.map(s=>Math.abs(humanContactBounds(s.nodes,a.rendering.contactProfiles).maxY)),error=Math.max(...errors);add('roll-ground','翻滚按旋转后的贴图轮廓接地',error<.01,`穿地 / 悬空误差 ${error.toFixed(4)} px`);const start=humanContactBounds(samples[0].nodes,a.rendering.contactProfiles),tuck=humanContactBounds(complexHumanPose(a,.2,{clip:'roll'}).nodes,a.rendering.contactProfiles),ratio=(tuck.maxY-tuck.minY)/(start.maxY-start.minY);add('roll-tuck','旋转前先收腿团身',ratio<.7,`团身高度为直立 ${Math.round(ratio*100)}%`);}
 if(options.clip==='jump')add('air','有起跳与落地',samples.some(s=>s.airborne)&&!samples[0].airborne&&!samples.at(-1).airborne,'腾空与落地分段');
 if(options.clip==='punch'){const xs=samples.map(s=>s.nodes['arm-0-hand'].end.x),range=Math.max(...xs)-Math.min(...xs);add('reach','出拳有伸展距离',range>22,`${range.toFixed(2)} px`);}
 return {passed:checks.every(c=>c.passed),checks,clip:options.clip,scope:'character',fault:options.fault??'none',samples:samples.length,qa:{technical:'sampled',visual:'pending'}};
}
