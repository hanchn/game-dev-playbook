export const presets = [
  {id:'human',name:'人',group:'人形',legs:2,body:[30,65],head:[0,-92,16],stride:32,lift:25,gait:'左右腿交替；支撑脚锁地，摆动脚抬起向前',special:'双臂反向摆动，骨盆轻微起伏'},
  {id:'chicken',name:'鸡',group:'两腿动物',legs:2,body:[48,36],head:[27,-67,13],stride:30,lift:22,gait:'双足交替，短步幅快速迈步',special:'脚爪保持方向，翅膀和头部稳定'},
  {id:'dinosaur',name:'恐龙',group:'两腿动物',legs:2,body:[78,42],head:[53,-57,20],stride:46,lift:27,gait:'双足交替，股骨与胫骨两段运动',special:'尾链平衡，短前肢独立测试'},
  {id:'horse',name:'马',group:'四腿动物',legs:4,body:[115,44],head:[69,-73,22],stride:40,lift:24,gait:'对角小跑：左前/右后同相，右前/左后同相',special:'前后腿身份固定；本样本为小跑，非所有马步态'},
  {id:'crocodile',name:'鳄鱼',group:'四腿动物',legs:4,body:[130,24],head:[82,-27,18],stride:25,lift:12,gait:'对角交替的低姿态行走',special:'身体贴近地面，尾链分节摆动'},
  {id:'centipede',name:'百足虫',group:'多腿动物',legs:20,body:[150,20],head:[86,-32,14],stride:16,lift:12,gait:'左右配对反相，相邻腿对逐段延迟',special:'十对腿使用稳定索引，波相位沿躯干传播'},
  {id:'spider',name:'蜘蛛',group:'多腿动物',legs:8,body:[60,32],head:[38,-44,16],stride:23,lift:22,gait:'交替四足组；先验证每条腿伸展，再验证协调',special:'八条腿各有髋、膝、脚端；示意步态不是物种级生物仿真'},
  {id:'scorpion',name:'蝎子',group:'多腿动物',legs:8,body:[72,28],head:[43,-38,15],stride:22,lift:18,gait:'交替四足组，低位抬脚',special:'左右螯独立开合；五节尾链独立屈伸'},
  {id:'snake',name:'蛇',group:'无足动物',legs:0,body:[160,22],head:[87,0,15],stride:35,lift:0,gait:'横向波沿十二节身体链传播',special:'逐段保持长度；此版本为运动学波形示意，不验证地面摩擦推进'},
  {id:'worm',name:'蚯蚓',group:'无足动物',legs:0,body:[145,19],head:[82,0,10],stride:20,lift:0,gait:'收缩与舒展沿十二节身体链传播',special:'节段长度允许在规定范围内变化；此版本不模拟土壤接触'}
];
const tau=Math.PI*2;
export function preset(id){const p=presets.find(p=>p.id===id);if(!p)throw Error('未知角色类型');return p;}
function num(n,lo,hi,label){if(!Number.isFinite(n)||n<lo||n>hi)throw Error(`${label}须在 ${lo}–${hi} 之间`);return n;}
export function createAsset(id,options={}){
 const p=preset(id),color=options.color??'#e1a34c';if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('颜色须为六位 HEX');
 const size=num(options.size??1,.65,1.35,'比例'),stride=num(options.stride??p.stride,4,55,'步幅');
 const parts=[]; const add=(id,name,parent,shape,rest,dimensions,layer=1,extra={})=>parts.push({id,name,parent,shape,rest,dimensions,layer,material:color,socket:parent?'pivot':null,...extra});
 add('root','装配原点',null,'anchor',[0,0],[0,0],0);
 if(!p.legs){for(let i=0;i<12;i++)add(`segment-${i}`,`身体节段 ${i+1}`,i?`segment-${i-1}`:'root','ellipse',[-p.body[0]/2+i*14,0],[18,p.body[1]],2,{range:[-35,35],role:'body-chain'});add('head','头部','segment-11','ellipse',[p.head[0],0],[p.head[2]*2,p.head[2]*1.6],3);}
 else{
 add('body','躯干','root','ellipse',[0,-48],p.body,2);const hasNeck=['human','chicken','dinosaur','horse'].includes(id);if(hasNeck){const start=[id==='human'?0:p.body[0]*.25,-48-p.body[1]*.3];add('neck','颈部连接','body','bone',start,[Math.hypot(p.head[0]-start[0],p.head[1]-25-start[1]),10],3,{role:'neck'});}add('head','头部',hasNeck?'neck':'body','ellipse',[p.head[0],p.head[1]-25],[p.head[2]*2,p.head[2]*1.65],4);
 for(let i=0;i<p.legs;i++){
 const pair=Math.floor(i/2),side=i%2?'far':'near',x=p.legs===2?(i%2?7:-7):(-p.body[0]*.35+pair/(p.legs/2-1)*p.body[0]*.7),y=p.id==='human'?-24:p.id==='horse'?-38:-32;
 const phase=p.legs===4?([0,.5,.5,0][i]):p.legs===20?(pair*.12+(i%2)*.5)%1:((pair%2)*.5+(i%2)*.5)%1;
 add(`leg-${i}-upper`,`${side==='near'?'近':'远'}侧第 ${pair+1} 腿 · 上段`,'body','bone',[x,y],[p.legs>4?27:31,7],side==='far'?0:5,{range:[-110,110],leg:i,side,phase,role:'upper'});
 add(`leg-${i}-lower`,`${side==='near'?'近':'远'}侧第 ${pair+1} 腿 · 下段`,`leg-${i}-upper`,'bone',[x+15,y+22],[p.legs>4?27:31,5],side==='far'?0:5,{range:[0,155],leg:i,side,phase,role:'lower'});
 add(`leg-${i}-foot`,`${side==='near'?'近':'远'}侧第 ${pair+1} 腿 · 脚端`,`leg-${i}-lower`,'foot',[x,0],[12,4],side==='far'?0:6,{leg:i,side,phase,role:'foot'});
 }
 if(p.id==='human'||p.id==='dinosaur'||p.id==='chicken'){for(let i=0;i<2;i++)add(`arm-${i}`,p.id==='chicken'?`翅膀 ${i+1}`:`手臂 ${i+1}`,'body','bone',[i?13:-13,-65],[30,7],i?1:6,{range:[-60,60],role:'arm'});}
 if(['dinosaur','crocodile','scorpion'].includes(id)){for(let i=0;i<5;i++)add(`tail-${i}`,`尾链 ${i+1}`,i?`tail-${i-1}`:'body','bone',[-p.body[0]/2-i*15,-48-i*(id==='scorpion'?13:0)],[18,8-i],3,{range:[-40,40],role:'tail'});}
 if(id==='scorpion'){for(let i=0;i<2;i++){add(`claw-${i}`,`螯臂 ${i+1}`,'body','bone',[45,-45+i*20],[35,9],6,{range:[-50,50],role:'claw'});add(`pincer-${i}`,`螯钳 ${i+1}`,`claw-${i}`,'pincer',[80,-45+i*20],[18,12],7,{range:[0,45],role:'pincer'});}}
 }
 const asset={schemaVersion:1,id:`${id}-kit`,species:id,name:p.name,version:1,design:{color,size,stride,view:'侧面 / 近远侧错层示意'},parts,clips:['walk','extend'],status:'draft',qa:{technical:'untested',visual:'pending'},source:{kind:'procedural',description:'可编辑参数化零件；无外部图像或 AI 美术生成'}};
 asset.actionDesign=actionDesign(asset);return asset;
}
export function actionDesign(asset){const p=preset(asset.species);return {title:`${p.name} · 动作设计 v${asset.version}`,scope:'零件 → 局部组合 → 完整角色',assembly:'每个零件保留稳定 ID；通过父级连接组装。爆炸图位移只用于检视，不写入动作数据。',actions:[
 {id:'extend',name:p.legs?'单腿收拢与伸展':'单节屈伸',participants:p.legs?'选中腿的上段、下段和脚端':'选中身体节段及相邻连接',duration:1,keyPoses:['0% 收拢','25% 逐渐伸展','50% 最大伸展','75% 收回','100% 回到初始姿势'],ranges:p.legs?'膝关节 0–155°；髋关节 ±110°':'蛇：节段转角 ±35°；蚯蚓：长度为静息长度的 0.75–1.25',contact:'局部伸展为悬空测试，不应用落地锁脚规则',acceptance:['固定连接点','骨段长度不漂移','伸展幅度达到至少 10 px','循环接缝连续'],failure:'关节超限、零件掉落、脚端不动、骨段拉长'},
 {id:'walk',name:p.legs?'完整步态':'身体波传播',participants:asset.parts.filter(x=>x.id!=='root').map(x=>x.id),duration:1,keyPoses:p.legs?['0% A 组支撑、B 组摆动','25% 摆动脚到达最高点','50% 支撑组交换','75% 另一组摆动','100% 返回循环起点']:['0% 波峰起始','25% 波沿节段前进','50% 相位反转','75% 波继续传播','100% 返回循环起点'],timing:p.gait,ranges:p.legs?'固定两段腿长；脚离地高度由物种预设控制':'蛇保持段长；蚯蚓收缩波允许有限长度变化',contact:p.legs?'前半周期支撑；世界坐标脚端固定。后半周期抬脚回摆。':'仅检查运动学波形，接触与推进效率待外部仿真验证',acceptance:p.legs?['每条腿完整经历支撑与摆动','按预设保持组间相位','支撑脚不滑动','脚端不穿地','头尾循环连续']:['波形沿节段传播','段长在设计范围','节段无跳变','头尾循环连续'],secondary:p.special}
 ],layers:{component:'每条腿 / 每个身体节段单独检查',subassembly:'选中零件及其子树检视和回放',character:'全角色步态与地面关系'},visualReview:['正常速度与 0.25 倍速观察','近远侧身份、轮廓重叠与动作自然度','目标游戏尺寸及实际场景验证'],limitations:['程序化二维示意资产，非照片或原画自动拆分','运动学测试不等于生物真实性或用户美术验收','没有实现 Spine / Blender 导出适配器']};}
const mod=x=>((x%1)+1)%1;
export function pose(asset,t,{clip='walk',fault='none'}={}){
 num(t,0,1,'相位');if(!['walk','extend'].includes(clip))throw Error('未知动作');if(!['none','phase','slide','stretch','seam','frozen'].includes(fault))throw Error('未知故障');
 const p=preset(asset.species),nodes={},legs=[],rootX=asset.design.stride*4*t;
 nodes.root={x:0,y:0};
 if(!p.legs){let prev=null;for(let i=0;i<12;i++){const angle=p.id==='snake'?Math.sin(t*tau-i*.6)*.37:0;const len=14*(p.id==='worm'?1+.2*Math.sin(t*tau-i*.6):1)*(fault==='stretch'&&i===5?1.7:1);let x=prev?prev.x+Math.cos(angle)*len:-p.body[0]/2,y=prev?prev.y+Math.sin(angle)*len:Math.sin(t*tau)*4;if(clip==='extend'){x=-p.body[0]/2+i*14;y=Math.sin(t*tau)*i*1.3;}nodes[`segment-${i}`]={x,y,angle:angle*180/Math.PI,length:len};prev={x,y};}nodes.head={x:prev.x+12,y:prev.y};}
 else{
 nodes.body={x:0,y:-48};nodes.head={x:p.head[0],y:p.head[1]-25};const neck=asset.parts.find(x=>x.role==='neck');if(neck){const a=Math.atan2(nodes.head.y-neck.rest[1],nodes.head.x-neck.rest[0]);nodes.neck={x:neck.rest[0],y:neck.rest[1],end:{x:neck.rest[0]+Math.cos(a)*neck.dimensions[0],y:neck.rest[1]+Math.sin(a)*neck.dimensions[0]}};nodes.head={...nodes.neck.end};}
 for(const upper of asset.parts.filter(x=>x.role==='upper')){
 const i=upper.leg,phase=mod(t+(fault==='phase'?0:upper.phase)),stance=phase<.5;let fx=upper.rest[0]+asset.design.stride*(phase<.5?1-phase*4:-1+(phase-.5)*4),fy=phase<.5?0:-Math.sin((phase-.5)*tau)*p.lift;
 if(clip==='extend'){fx=upper.rest[0]+10-Math.cos(t*tau)*13;fy=-12-Math.sin(t*tau)*8;}
 if(fault==='slide'&&stance)fx+=Math.sin(phase*tau)*12;
 if(fault==='frozen'){fx=upper.rest[0];fy=0;}
 const hip={x:upper.rest[0],y:upper.rest[1]},L=upper.dimensions[0],B=asset.parts.find(x=>x.id===`leg-${i}-lower`).dimensions[0],dx=fx-hip.x,dy=fy-hip.y,d=Math.hypot(dx,dy),c=Math.min(L+B-.001,Math.max(Math.sqrt(L*L+B*B+2*L*B*Math.cos(155*Math.PI/180))+.001,d)),a=Math.atan2(dy,dx),b=Math.acos(Math.min(1,Math.max(-1,(L*L+c*c-B*B)/(2*L*c)))),knee={x:hip.x+Math.cos(a-b)*L,y:hip.y+Math.sin(a-b)*L};
 // Clamp unreachable targets using IK, keeping both rigid bone lengths.
 if(d!==c){fx=hip.x+dx*c/d;fy=hip.y+dy*c/d;}
 nodes[upper.id]={...hip,end:knee};nodes[`leg-${i}-lower`]={...knee,end:{x:fx,y:fy}};nodes[`leg-${i}-foot`]={x:fx,y:fy};
 if(fault==='stretch'&&i===0)nodes[`leg-${i}-lower`].end={x:fx+20,y:fy};
 legs.push({id:i,phase,stance,hip,knee,foot:{x:fx,y:fy},worldX:fx+rootX});
 }
 for(const part of asset.parts.filter(x=>['arm','tail','claw','pincer'].includes(x.role))){let x=part.rest[0],y=part.rest[1];if(part.role==='tail'&&part.id!=='tail-0'){const parent=nodes[part.parent];x=parent.end.x;y=parent.end.y;}const angle=part.role==='tail'?-2.8+Math.sin(t*tau+Number(part.id.split('-')[1])*.5)*.3:1+Math.sin(t*tau)*.45;nodes[part.id]={x,y,end:{x:x+Math.cos(angle)*part.dimensions[0],y:y+Math.sin(angle)*part.dimensions[0]}};}
 }
 if(fault==='seam'){for(const n of Object.values(nodes)){n.x+=t*20;if(n.end)n.end.x+=t*20;}}
 return {nodes,legs,rootX,t};
}
export function validateAsset(asset){
 if(!asset||asset.schemaVersion!==1||!Array.isArray(asset.parts)||asset.parts.length<2||asset.parts.length>150)throw Error('无效资产结构');preset(asset.species);
 num(asset.design?.size,.65,1.35,'比例');num(asset.design?.stride,4,55,'步幅');if(!/^#[0-9a-f]{6}$/i.test(asset.design?.color))throw Error('无效颜色');
 const ids=new Set();for(const p of asset.parts){if(typeof p.id!=='string'||ids.has(p.id))throw Error('零件 ID 缺失或重复');ids.add(p.id);if(!Array.isArray(p.rest)||p.rest.length!==2||p.rest.some(x=>!Number.isFinite(x)))throw Error('零件位置无效');if(!Array.isArray(p.dimensions)||p.dimensions.length!==2||p.dimensions.some(x=>!Number.isFinite(x)||x<0||x>500))throw Error('零件尺寸无效');}
 for(const p of asset.parts){let current=p,seen=new Set();while(current?.parent){if(seen.has(current.id))throw Error('连接关系存在循环');seen.add(current.id);current=asset.parts.find(x=>x.id===current.parent);if(!current)throw Error('父零件不存在');}}
 const expected=createAsset(asset.species).parts;for(const e of expected){const actual=asset.parts.find(x=>x.id===e.id);if(!actual)continue;if(actual.role!==e.role||actual.leg!==e.leg||actual.parent!==e.parent)throw Error('零件身份或连接不符合该物种资产契约');num(actual.layer,0,9,'绘制层级');if(e.phase!==undefined)num(actual.phase,0,.999999,'步态相位');}if(expected.length!==asset.parts.length||expected.some(x=>!ids.has(x.id)))throw Error('该物种零件集合不完整');return asset;
}
export function runTests(asset,{clip='walk',fault='none',scope='character',partId=null}={}){
 validateAsset(asset);if(!['component','subassembly','character'].includes(scope))throw Error('未知测试层级');if(scope!=='character'&&!asset.parts.some(x=>x.id===partId&&x.id!=='root'))throw Error('请选择有效零件');
 const samples=Array.from({length:65},(_,i)=>pose(asset,i/64,{clip,fault})),checks=[];const add=(id,label,pass,detail)=>checks.push({id,label,passed:pass,detail});
 const selected=new Set(scope==='character'?asset.parts.map(x=>x.id):[partId]);if(scope==='subassembly'){let changed=true;while(changed){changed=false;for(const p of asset.parts)if(selected.has(p.parent)&&!selected.has(p.id)){selected.add(p.id);changed=true;}}}
 // A component test of a leg segment evaluates that leg's complete linkage.
 const selectedLegs=new Set(asset.parts.filter(x=>selected.has(x.id)&&Number.isInteger(x.leg)).map(x=>x.leg));
 add('assembly','零件身份与父级连接',true,`${asset.parts.length} 个稳定 ID，无缺失父级或循环`);
 let maxLengthError=0,maxAttachment=0,maxAngle=0;
 for(const s of samples)for(const part of asset.parts.filter(x=>x.shape==='bone'&&(selected.has(x.id)||selectedLegs.has(x.leg)))){const n=s.nodes[part.id];if(!n?.end)continue;maxLengthError=Math.max(maxLengthError,Math.abs(Math.hypot(n.end.x-n.x,n.end.y-n.y)-part.dimensions[0]));if(part.role==='lower'){const up=s.nodes[part.parent];maxAttachment=Math.max(maxAttachment,Math.hypot(n.x-up.end.x,n.y-up.end.y));const v1={x:up.end.x-up.x,y:up.end.y-up.y},v2={x:n.end.x-n.x,y:n.end.y-n.y};const angle=Math.acos(Math.max(-1,Math.min(1,(v1.x*v2.x+v1.y*v2.y)/(Math.hypot(v1.x,v1.y)*Math.hypot(v2.x,v2.y)))))*180/Math.PI;maxAngle=Math.max(maxAngle,angle);}}
 add('rigidity','刚性骨段长度',maxLengthError<.01,`最大漂移 ${maxLengthError.toFixed(3)} px`);add('attachment','关节连接点',maxAttachment<.01,`最大脱离 ${maxAttachment.toFixed(3)} px`);
 if(preset(asset.species).legs){add('joint-range','膝关节活动范围',maxAngle<=155,`最大弯折 ${maxAngle.toFixed(1)}° / 上限 155°`);
 const relevant=i=>scope==='character'||selectedLegs.has(i);let slip=0,movement=0,ground=0,amplitude=0;
 for(let i=1;i<samples.length;i++)for(const leg of samples[i].legs.filter(l=>relevant(l.id))){const prev=samples[i-1].legs.find(l=>l.id===leg.id);if(leg.stance&&prev.stance)slip=Math.max(slip,Math.abs(leg.worldX-prev.worldX));ground=Math.max(ground,leg.foot.y);movement=Math.max(movement,Math.hypot(leg.foot.x-prev.foot.x,leg.foot.y-prev.foot.y));}
 for(const leg of samples[0].legs.filter(l=>relevant(l.id))){const xs=samples.map(s=>s.legs[leg.id].foot.x);amplitude=Math.max(amplitude,Math.max(...xs)-Math.min(...xs));}if(selectedLegs.size||scope==='character'){if(clip==='extend')add('extension','配件伸展幅度',amplitude>=10,`脚端横向范围 ${amplitude.toFixed(2)} px / 最低 10 px`);add('motion','脚端实际运动',movement>.1,`最大相邻帧位移 ${movement.toFixed(2)} px`);if(clip==='walk'){add('contact','接地不滑步',slip<.1,`支撑帧最大世界位移 ${slip.toFixed(3)} px`);add('ground','脚端不穿地',ground<.1,`最大穿地 ${Math.max(0,ground).toFixed(3)} px`);if(scope==='character'){let ok=true;for(const part of asset.parts.filter(p=>p.role==='upper')){const actual=samples[Math.round(.25*64)].legs[part.leg].phase;const expected=mod(.25+part.phase);if(Math.abs(actual-expected)>.01)ok=false;}add('phase','物种步态分组与相位',ok,preset(asset.species).gait);}}}
 }else{
 let min=Infinity,max=0;for(const s of samples)for(let i=1;i<12;i++)if(scope==='character'||selected.has(`segment-${i}`)){const a=s.nodes[`segment-${i-1}`],b=s.nodes[`segment-${i}`],len=Math.hypot(a.x-b.x,a.y-b.y)/14;min=Math.min(min,len);max=Math.max(max,len);}
 if(Number.isFinite(min))add('segment-length','身体节段长度范围',asset.species==='worm'?min>=.75&&max<=1.25:Math.abs(min-1)<.01&&Math.abs(max-1)<.01,`相对静息长度 ${min.toFixed(2)}–${max.toFixed(2)}`);
 if(clip==='walk'&&scope==='character'){const a=samples[0].nodes['segment-3'],b=samples[16].nodes['segment-3'];add('wave','身体波随时间传播',Math.hypot(a.x-b.x,a.y-b.y)>.1,'检查节段位置变化；不作为生物真实性验收');}
 }
 let seam=0;for(const id of selected){const a=samples[0].nodes[id],b=samples.at(-1).nodes[id];if(a&&b)seam=Math.max(seam,Math.hypot(a.x-b.x,a.y-b.y));if(a?.end&&b?.end)seam=Math.max(seam,Math.hypot(a.end.x-b.end.x,a.end.y-b.end.y));}add('loop','末首循环接缝',seam<.01,`最大接缝 ${seam.toFixed(3)} px`);
 return {schemaVersion:1,assetId:asset.id,version:asset.version,species:asset.species,clip,scope,partId,fault,samples:samples.length,passed:checks.every(x=>x.passed),checks,visualStatus:'pending',limitations:asset.actionDesign.limitations,timestamp:new Date().toISOString()};
}
function esc(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
export function renderParts(asset,state,{explosion=0,selected=null,scope='character',bones=false}={}){
 const p=preset(asset.species),body=[];let index=0;const ordered=[...asset.parts].sort((a,b)=>a.layer-b.layer),offsets=new Map();const columns=Math.ceil(Math.sqrt(asset.parts.length-1)),rows=Math.ceil((asset.parts.length-1)/columns);let counter=0;for(const part of ordered){if(part.id==='root'||!state.nodes[part.id])continue;offsets.set(part.id,{x:explosion*(((counter%columns)-(columns-1)/2)*Math.min(60,380/columns)-state.nodes[part.id].x),y:explosion*((Math.floor(counter/columns)-(rows-1)/2)*Math.min(52,290/rows)-35-state.nodes[part.id].y)});counter++;}if(explosion>.05)for(const part of ordered){const parent=state.nodes[part.parent],n=state.nodes[part.id],a=offsets.get(part.parent),b=offsets.get(part.id);if(parent&&n&&a&&b)body.push(`<line x1="${parent.x+a.x}" y1="${parent.y+a.y}" x2="${n.x+b.x}" y2="${n.y+b.y}" stroke="#718b97" stroke-width=".5" stroke-dasharray="2 4"/>`);}
 const active=new Set([selected]);if(scope==='subassembly'){for(let k=0;k<asset.parts.length;k++)for(const part of asset.parts)if(active.has(part.parent))active.add(part.id);}
 for(const part of [...asset.parts].sort((a,b)=>a.layer-b.layer)){
 if(part.id==='root')continue;const n=state.nodes[part.id];if(!n)continue;const j=index++,dx=offsets.get(part.id).x,dy=offsets.get(part.id).y,highlight=selected===part.id,col=highlight?'#45e5b2':asset.design.color,opacity=scope!=='character'&&!active.has(part.id)?.12:part.side==='far'?.48:1;let shape='';
 if(part.shape==='bone'||part.shape==='pincer'){shape=`<line x1="${n.x}" y1="${n.y}" x2="${n.end.x}" y2="${n.end.y}" stroke="${col}" stroke-width="${bones?3:part.dimensions[1]}" stroke-linecap="round"/><circle cx="${n.x}" cy="${n.y}" r="3" fill="#d4f2e9"/>`;if(part.shape==='pincer')shape+=`<path d="M${n.end.x},${n.end.y} l14,-10 m-14,10 l14,10" fill="none" stroke="${col}" stroke-width="4"/>`;}
 else if(part.shape==='foot')shape=`<path d="M${n.x-4},${n.y} h12" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
 else shape=`<ellipse cx="${n.x}" cy="${n.y}" rx="${part.dimensions[0]/2}" ry="${part.dimensions[1]/2}" fill="${bones?'none':col}" stroke="${col}" stroke-width="2"/>`;
 if(part.id==='head')shape+=`<circle cx="${n.x+part.dimensions[0]*.22}" cy="${n.y-3}" r="2.6" fill="#101d29"/>`;
 if(explosion>.05)shape+=`<text x="${n.x}" y="${n.y-10}" font-size="8" fill="#cadadf">${esc(part.id)}</text>`;
 body.push(`<g data-part="${esc(part.id)}" opacity="${opacity}" transform="translate(${dx} ${dy})">${shape}</g>`);
 }
 return `<g transform="translate(256 260) scale(${asset.design.size})">${body.join('')}</g>`;
}
export function spriteSheet(asset,{frames=16,columns=4,clip='walk'}={}){validateAsset(asset);num(frames,4,64,'帧数');num(columns,1,16,'列数');if(!Number.isInteger(frames)||!Number.isInteger(columns))throw Error('帧数和列数须为整数');const rows=Math.ceil(frames/columns),size=512;const metadata=[];let content='';for(let i=0;i<frames;i++){content+=`<g transform="translate(${i%columns*size} ${Math.floor(i/columns)*size})">${renderParts(asset,pose(asset,i/frames,{clip}))}</g>`;metadata.push({index:i,x:i%columns*size,y:Math.floor(i/columns)*size,width:size,height:size,anchor:[256,260]});}return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*size}" height="${rows*size}" viewBox="0 0 ${columns*size} ${rows*size}">${content}</svg>`,manifest:{assetId:asset.id,version:asset.version,clip,fps:frames,loop:true,format:'svg',frames:metadata,source:asset.source,qa:{technical:'generated',visual:'pending'}}};}
export function analyzePerformance(samples,target=60){num(target,1,240,'目标 FPS');if(!Array.isArray(samples)||!samples.length||samples.length>100000||samples.some(x=>!Number.isFinite(x)||x<=0||x>60000))throw Error('帧耗时必须为有效正数毫秒数组');const sorted=[...samples].sort((a,b)=>a-b),total=samples.reduce((a,b)=>a+b,0);return {count:samples.length,averageFPS:1000*samples.length/total,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),overBudget:samples.filter(x=>x>1000/target*1.05).length,target,note:'仅代表被采样的工作台渲染，不代表目标游戏设备性能'};}
export function generateAnimation(asset,{clip='walk',frames=32,fps=32}={}){
 validateAsset(asset);num(frames,4,120,'采样帧数');num(fps,1,120,'FPS');if(!Number.isInteger(frames))throw Error('采样帧数须为整数');
 return {assetId:asset.id,version:asset.version,clip,fps,loop:true,coordinateSpace:'character-local-pixels',rootMotion:'rootX 单独记录；默认循环预览原地播放',frames:Array.from({length:frames},(_,i)=>({index:i,time:i/fps,...pose(asset,i/frames,{clip})})),qa:{technical:'generated',visual:'pending'}};
}
