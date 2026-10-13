import {arthropodSpecs,createArthropod,arthropodPose,testArthropod,validateArthropod,arthropodDesign} from './arthropod-rig.mjs';
import {flexSpecs,createFlex,flexPose,testFlex,validateFlex,flexDesign} from './flex-rig.mjs';
import {animalSpecs,createAnimal,animalPose,testAnimal,validateAnimal,animalDesign} from './animal-rig.mjs';
export const productionSpecies=['human',...Object.keys(animalSpecs),...Object.keys(flexSpecs),...Object.keys(arthropodSpecs)];
import {createHuman,humanPose,testHuman,validateHuman,humanDesign} from './human-rig.mjs';
import * as base from './core.mjs';
export {presets,preset,analyzePerformance} from './core.mjs';
const names=['基节','转节','股节','膝节','胫节','跖节','跗节'],lengths=[7,8,32,8,29,23,12];
export function createAsset(id,options={}){
 if(arthropodSpecs[id])return createArthropod(id,options);if(flexSpecs[id])return createFlex(id,options);if(id==='human')return createHuman(options);if(animalSpecs[id])return createAnimal(id,options);const a=base.createAsset(id,options);a.source={kind:'generated-transparent-part-atlas',description:'生成的透明关节零件；轴点可调整，视觉待验收'};a.rendering={atlas:`/art/${id}-parts-v1.png`,view:id==='spider'?'top':'side',qa:'visual-pending'};
 if(id!=='spider')return a;
 const part=(id,name,parent,shape,rest,dimensions,layer,extra={})=>({id,name,parent,shape,rest,dimensions,layer,material:a.design.color,socket:parent?'pivot':null,...extra});
 a.parts=[part('root','装配原点',null,'anchor',[0,0],[0,0],0),part('abdomen','腹部','body','ellipse',[0,-60],[60,82],3,{tile:0}),part('body','头胸部','root','ellipse',[0,0],[48,58],4,{tile:1}),part('pedicel','腹柄连接','body','ellipse',[0,-32],[12,16],2,{tile:9})];
 for(let i=0;i<8;i++)for(let j=0;j<7;j++)a.parts.push(part(`leg-${i}-${j}`,`腿 ${i+1} · ${names[j]}`,j?`leg-${i}-${j-1}`:'body','bone',[(i<4?-1:1)*18,-19+(i%4)*13],[lengths[j],j<4?9:6],1,{leg:i,segment:j,role:j===0?'upper':j===6?'foot':'leg-segment',tile:j+2,range:[-155,155]}));
 for(let i=0;i<2;i++){a.parts.push(part(`palp-${i}`,`触肢 ${i+1}`,'body','ellipse',[i?-16:16,32],[18,22],5,{tile:10+i}));a.parts.push(part(`fang-${i}`,`螯肢 ${i+1}`,'body','ellipse',[i?-6:6,32],[9,14],5,{tile:12+i}));}
 a.actionDesign=base.actionDesign(a);a.actionDesign.assembly='真实透明贴图；八条步足各七节，按基节→转节→股节→膝节→胫节→跖节→跗节逐关节连接。';a.actionDesign.limitations=['蜘蛛为俯视七节运动学演示；生物运动自然度、遮挡和贴图接缝仍需人工验收。','其余角色暂使用原型骨架，真实贴图不等于完成物种级骨骼设计。'];return a;
}
function solve(hip,target,ls,side){
 const total=ls.reduce((a,b)=>a+b,0),dist=Math.hypot(target.x-hip.x,target.y-hip.y),p=[hip];let sum=0;
 for(const l of ls){sum+=l;const f=sum/total;p.push({x:hip.x+(target.x-hip.x)*f+side*Math.sin(f*Math.PI)*23,y:hip.y+(target.y-hip.y)*f-29*Math.sin(f*Math.PI)});}
 if(dist>=total){for(let i=1;i<p.length;i++)p[i]={x:p[i-1].x+(target.x-hip.x)/dist*ls[i-1],y:p[i-1].y+(target.y-hip.y)/dist*ls[i-1]};return p;}
 const place=(a,b,l)=>{const d=Math.hypot(a.x-b.x,a.y-b.y)||1;return {x:b.x+(a.x-b.x)/d*l,y:b.y+(a.y-b.y)/d*l};};
 for(let k=0;k<80;k++){p[7]={...target};for(let i=6;i>=0;i--)p[i]=place(p[i],p[i+1],ls[i]);p[0]={...hip};for(let i=1;i<=7;i++)p[i]=place(p[i],p[i-1],ls[i-1]);if(Math.hypot(p[7].x-target.x,p[7].y-target.y)<.00001)break;}
 return p;
}
export function pose(a,t,{clip='walk',fault='none',scope='character',partId=null}={}){
 if(a.rendering?.rig==='arthropod-side-v2')return arthropodPose(a,t,{clip,fault,scope,partId});if(a.rendering?.rig==='flex-side-v2')return flexPose(a,t,{clip,fault,scope,partId});if(a.rendering?.rig==='animal-side-v2')return animalPose(a,t,{clip,fault,scope,partId});if(a.rendering?.rig==='human-side-v2')return humanPose(a,t,{clip,fault,scope,partId});if(a.species!=='spider'||!a.rendering)return base.pose(a,t,{clip,fault});if(!Number.isFinite(t)||t<0||t>1)throw Error('相位须在 0–1');
 const nodes={root:{x:0,y:0}},legs=[],selectedLeg=a.parts.find(p=>p.id===partId)?.leg;
 for(const p of a.parts.filter(p=>p.shape!=='bone'&&p.id!=='root'))nodes[p.id]={x:p.rest[0],y:p.rest[1]};
 for(let i=0;i<8;i++){
  const side=i<4?-1:1,pair=i%4,phase=(t+(fault==='phase'?0:(pair%2+(side>0?1:0))%2*.5))%1,stance=phase<.5,hip={x:side*18,y:-19+pair*13},stride=Math.min(a.design.stride,35),fixed=clip==='extend'&&selectedLeg!==undefined&&selectedLeg!==i;
  const target={x:side*(clip==='extend'?(fixed?90:72+24*Math.sin(t*Math.PI*2)):96+(stance?0:10*Math.sin((phase-.5)*Math.PI*2))),y:-75+pair*42+(clip==='extend'?(fixed?0:18*Math.cos(t*Math.PI*2)):stance?-stride+4*stride*phase:stride-4*stride*(phase-.5))};
  if(fault==='slide'&&stance)target.y+=14*Math.sin(phase*Math.PI*2);const ls=a.parts.filter(p=>p.leg===i).map(p=>p.dimensions[0]),chain=solve(hip,target,ls,side);if(fault==='frozen'&&i===0)chain.splice(0,chain.length,...solve(hip,{x:side*96,y:-75+pair*42},ls,side));
  for(let j=0;j<7;j++)nodes[`leg-${i}-${j}`]={...chain[j],end:{...chain[j+1]}};
  if(fault==='stretch'&&i===0)nodes['leg-0-3'].end.x+=12;
  legs.push({hip,knee:chain[3],foot:chain[7],stance,phase});
 }
 if(fault==='seam')for(const n of Object.values(nodes)){n.x+=t*20;if(n.end)n.end.x+=t*20;}
 return {nodes,legs,rootX:0,rootY:-4*Math.min(a.design.stride,35)*t,t};
}
export function runTests(a,options={}){
 if(a.rendering?.rig==='arthropod-side-v2')return testArthropod(a,options);if(a.rendering?.rig==='flex-side-v2')return testFlex(a,options);if(a.rendering?.rig==='animal-side-v2')return testAnimal(a,options);if(a.rendering?.rig==='human-side-v2')return testHuman(a,options);if(a.species!=='spider'||!a.rendering)return base.runTests(a,options);validateAsset(a);
 const {clip='walk',fault='none',scope='character',partId='leg-0-2'}=options,checks=[],leg=a.parts.find(p=>p.id===partId)?.leg,parts=a.parts.filter(p=>p.shape==='bone'&&(scope==='character'||p.leg===leg)),samples=Array.from({length:65},(_,i)=>pose(a,i/64,options));let len=0,join=0,seam=0,move=0;
 for(const p of parts){let xs=[];for(const s of samples){const n=s.nodes[p.id],parent=s.nodes[p.parent];len=Math.max(len,Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-p.dimensions[0]));if(parent?.end)join=Math.max(join,Math.hypot(n.x-parent.end.x,n.y-parent.end.y));xs.push(n.end.x);}move=Math.max(move,Math.max(...xs)-Math.min(...xs));const x=samples[0].nodes[p.id],y=samples[64].nodes[p.id];seam=Math.max(seam,Math.hypot(x.x-y.x,x.y-y.y));}
 const add=(id,label,passed,detail)=>checks.push({id,label,passed,detail});add('bones','七节步足长度稳定',len<.01,`误差 ${len.toFixed(4)} px`);add('sockets','逐关节连接连续',join<.01,`接缝 ${join.toFixed(4)} px`);add('loop','末首循环连续',seam<.01,`接缝 ${seam.toFixed(4)} px`);add('movement','所选配件有动作',move>1,`末端横向幅度 ${move.toFixed(2)} px`);
 if(clip==='walk'&&scope==='character'){const phases=samples[0].legs.map(l=>l.phase);add('phases','两组四足交替',phases.filter(p=>p===0).length===4&&phases.filter(p=>p===.5).length===4,'实测八足的相位分组');let minMotion=Infinity,slide=0;for(let i=0;i<8;i++){const xs=samples.map(s=>s.legs[i].foot.y);minMotion=Math.min(minMotion,Math.max(...xs)-Math.min(...xs));for(let k=1;k<64;k++)if(samples[k].legs[i].stance&&samples[k-1].legs[i].stance){const x=samples[k],y=samples[k-1];slide=Math.max(slide,Math.abs(x.legs[i].foot.y+x.rootY-y.legs[i].foot.y-y.rootY));}}add('frozen','每条步足参与步态',minMotion>1,`最小纵向幅度 ${minMotion.toFixed(2)} px`);add('support','支撑脚世界坐标稳定',slide<.05,`采样位移 ${slide.toFixed(4)} px`);}
 return {passed:checks.every(c=>c.passed),checks,scope,clip,fault,samples:samples.length,qa:{technical:'sampled',visual:'pending'}};
}
export function generateAnimation(a,{clip='walk',frames=32,fps=null,scope='character',partId=null}={}){validateAsset(a);const motion=a.actionDesign.actions.find(c=>c.id===clip),loop=motion?.loop!==false,duration=motion?.duration??1;fps??=(loop?frames:frames-1)/duration;if(!Number.isInteger(frames)||frames<4||frames>120||!Number.isFinite(fps)||fps<1||fps>120||!a.clips.includes(clip))throw Error('无效动作采样参数');return {assetId:a.id,clip,fps,loop:a.actionDesign.actions.find(c=>c.id===clip)?.loop??true,duration:a.actionDesign.actions.find(c=>c.id===clip)?.duration??1,source:a.rendering,coordinateSpace:'character-local-pixels',frames:Array.from({length:frames},(_,i)=>({index:i,time:i/fps,...pose(a,i/(loop?frames:frames-1),{clip,scope,partId})})),qa:{visual:'pending'}};}

export function validateAsset(a){if(a?.rendering?.rig==='arthropod-side-v2')return validateArthropod(a);if(a?.rendering?.rig==='flex-side-v2')return validateFlex(a);if(a?.rendering?.rig==='animal-side-v2')return validateAnimal(a);if(a?.rendering?.rig==='human-side-v2')return validateHuman(a);if(a?.species!=='spider'||!a.rendering)return base.validateAsset(a);base.createAsset('spider',a.design);const expected=createAsset('spider').parts;if(!Array.isArray(a.parts)||a.parts.length!==expected.length)throw Error('七节蜘蛛零件集合不完整');for(const p of expected){const actual=a.parts.find(x=>x.id===p.id);if(!actual||actual.parent!==p.parent||actual.tile!==p.tile||actual.leg!==p.leg)throw Error('蜘蛛零件连接错误');if(!actual.dimensions?.every(x=>Number.isFinite(x)&&x>=0&&x<=170))throw Error('零件尺寸无效');}return a;}

export function actionDesign(a){if(a.rendering?.rig==='arthropod-side-v2')return arthropodDesign(a);if(a.rendering?.rig==='flex-side-v2')return flexDesign(a);if(a.rendering?.rig==='animal-side-v2')return animalDesign(a);return a.rendering?.rig==='human-side-v2'?humanDesign(a):base.actionDesign(a);}
