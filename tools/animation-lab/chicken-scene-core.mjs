import {pose} from './game-core.mjs';
export const CHICKEN_SCENE_VERSION=11;
export const CHICKEN_SCENARIOS={
  flock:{duration:6,loop:false,requiredAssets:['rooster-or-hen','near-and-far-leg','both-wings']},
  lay:{duration:5,loop:false,requiredAssets:['hen','egg','nest','pelvic-overlap']},
  crow:{duration:3,loop:false,requiredAssets:['rooster','open-beak','closed-beak','throat-states']},
  fight:{duration:4,loop:false,requiredAssets:['two-roosters','both-wings','open-beak','feather']}
};
export function createChickenFlock(count=3,{sex='rooster'}={}){
  if(!['rooster','hen','mixed'].includes(sex))throw Error('未知公母配置');
  if(!Number.isInteger(count)||count<1||count>12)throw Error('场景支持1至12只鸡');
  const columns=count<=4?count:4,rows=Math.ceil(count/columns),gap=1100/columns;
  return {scenario:'flock',actorScale:rows===1?(count===4?1.25:count===3?1.6:1.7):rows===2?1.2:.8,actors:Array.from({length:count},(_,i)=>({id:'chicken-'+(i+1),sex:sex==='mixed'?(i%3===0?'rooster':'hen'):sex,x:90+gap*(i%columns+.5),groundY:rows===1?560:rows===2?370+Math.floor(i/columns)*250:290+Math.floor(i/columns)*195,facing:1,phaseOffset:i*.73%2.4}))};
}
const hop=(t,a,b)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return 4*u*(1-u);};
const smooth=(t,a,b)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export function validateChickenScene(scene){
  if(!CHICKEN_SCENARIOS[scene?.scenario])throw Error('未知鸡场景');
  if(!Array.isArray(scene.actors)||scene.actors.length<1||scene.actors.length>12)throw Error('场景支持1至12只鸡');
  const ids=new Set();for(const a of scene.actors){if((a.phaseOffset??0)<0||!a.id||ids.has(a.id)||!['hen','rooster'].includes(a.sex)||![a.x,a.groundY,a.phaseOffset??0].every(Number.isFinite)||![-1,1].includes(a.facing))throw Error('鸡身份、位置、性别或朝向无效');ids.add(a.id);}
  if(scene.scenario==='lay'&&!scene.actors.some(a=>a.sex==='hen'))throw Error('下蛋场景必须有母鸡素材');
  if(scene.scenario==='crow'&&!scene.actors.some(a=>a.sex==='rooster'))throw Error('打鸣场景必须有公鸡素材');
  if(scene.scenario==='fight'){
    const pair=scene.actors.filter(a=>a.sex==='rooster').sort((a,b)=>a.x-b.x);
    if(pair.length!==2||pair[0].facing!==1||pair[1].facing!==-1||pair[1].x-pair[0].x<80)throw Error('格斗需要两只相向、有独立身份和安全间距的公鸡');
  }
  return scene;
}
// Declarative state is seek-safe: rendering the same timestamp twice cannot
// lay another egg or spawn another batch of feathers. Consumers key props by id.
export function sampleChickenScene(scene,time){
  validateChickenScene(scene);if(!Number.isFinite(time)||time<0)throw Error('无效拍摄时间');
  const spec=CHICKEN_SCENARIOS[scene.scenario],t=spec.loop?time%spec.duration:Math.min(time,spec.duration),cycle=spec.loop?Math.floor(time/spec.duration):0,props=[],actors=[];
  for(const actor of scene.actors){
    let clip='idle',phase=0,bodyDrop=0,bodyLift=0,neckLift=0,beakOpen=0,wingLift=0,offsetX=0,blend=null,reaction=0,legTuck=0;
    if(scene.scenario==='flock'){
      const elapsed=t-(actor.phaseOffset??0),local=Math.max(0,elapsed);
      clip=elapsed<0?'idle':local<1?'walk':local<2.4?'peck':'idle';phase=clip==='walk'?Math.min(local,.8):clip==='peck'?(local-1)/1.4:Math.max(0,Math.min(1,(local-2.4)/3.6));
      if(elapsed>=0&&local<.2)blend={clip:'idle',phase:0,weight:1-smooth(local,0,.2)};
      if(local>=.8&&local<1)blend={clip:'peck',phase:0,weight:smooth(local,.8,1)};
      if(local>=2.2&&local<2.4)blend={clip:'idle',phase:0,weight:smooth(local,2.2,2.4)};
      // World displacement follows the actual stance foot in chickenSceneFrame.
      // No idle return slide or automatic reset to the start position.
      offsetX=0;
    }else if(scene.scenario==='lay'&&actor.sex==='hen'){
      bodyDrop=30*(smooth(t,.5,1.2)-smooth(t,3.5,4.4));wingLift=.16*(smooth(t,.8,1.4)-smooth(t,3.5,4.4));
      if(t>=2.8)props.push({id:`${actor.id}:egg:0`,type:'egg',origin:'pelvis',actorId:actor.id,x:actor.x-actor.facing*18,y:actor.groundY-4*(1-smooth(t,2.8,3.15)),occlusion:t<3.15?'behind-hen':'nest',scale:1});
    }else if(scene.scenario==='crow'&&actor.sex==='rooster'){
      neckLift=10*(smooth(t,.25,.65)-smooth(t,2.5,2.9));beakOpen=smooth(t,.65,.8)-smooth(t,2.6,2.8);wingLift=.12*(smooth(t,.5,.8)-smooth(t,2.5,2.95));
    }else if(scene.scenario==='fight'&&actor.sex==='rooster'){
      const attack=smooth(t,.6,1.0)-smooth(t,1.3,1.9),recover=smooth(t,2.7,3.5);offsetX=actor.facing*(attack*20-recover*4);bodyLift=18*hop(t,.65,1.9);clip=t>.75&&t<2.5?'flap':'idle';phase=clip==='flap'?((t-.75)/.8)%1:0;beakOpen=.4*attack;if(t>.75&&t<.9)blend={clip:'idle',phase:0,weight:1-smooth(t,.75,.9)};if(t>=2.25&&t<2.5)blend={clip:'idle',phase:0,weight:smooth(t,2.25,2.5)};
      reaction=actor.facing===-1?(smooth(t,1.3,1.46)-smooth(t,1.75,2.25)):0;offsetX-=actor.facing*reaction*10;wingLift+=reaction*.35;legTuck=Math.min(1,bodyLift/18);
      if(actor.facing===-1&&t>=1.3&&t<2.8)for(let n=0;n<5;n++){
        const age=t-1.3,vx=(n-2)*14;props.push({id:`${actor.id}:feather:${n}`,type:'feather',actorId:actor.id,x:actor.x+actor.facing*8+vx*age,y:actor.groundY-60-(35+n*4)*age+35*age*age,rotation:n*17+age*(n%2?-120:90),opacity:1-smooth(t,2.4,2.8)});
      }
    }
    const legKick=scene.fightLegProfile==='fold-kick-v2'?(smooth(t,1.02,1.18)-smooth(t,1.32,1.52))*(actor.facing===1?1:.6):0;
    actors.push({...actor,clip,phase,blend,offsetX,bodyDrop,bodyLift,neckLift,beakOpen,wingLift,reaction,legTuck,...(scene.fightLegProfile?{fightLegProfile:scene.fightLegProfile,legKick}:{})});
  }
  return {schemaVersion:1,choreographyVersion:CHICKEN_SCENE_VERSION,scenario:scene.scenario,time:t,cycle,duration:spec.duration,loop:spec.loop,actors,props,requiredAssets:spec.requiredAssets,qa:{choreography:'sampled',sourceArt:'not-reviewed',rendering:'not-reviewed'}};
}

export function blendChickenPose(asset,a,b,weight){
  const w=Math.max(0,Math.min(1,weight)),out=structuredClone(a),angle=(u,v)=>u+Math.atan2(Math.sin(v-u),Math.cos(v-u))*w;
  for(const part of asset.parts){
    const p=a.nodes[part.id],q=b.nodes[part.id];if(!p||!q)continue;
    const parent=out.nodes[part.parent],pa=a.nodes[part.parent],pb=b.nodes[part.parent];let x=p.x+(q.x-p.x)*w,y=p.y+(q.y-p.y)*w;
    if(parent?.end){
      const va={x:p.x-pa.end.x,y:p.y-pa.end.y},vb={x:q.x-pb.end.x,y:q.y-pb.end.y},length=Math.hypot(va.x,va.y),theta=angle(Math.atan2(va.y,va.x),Math.atan2(vb.y,vb.x));
      x=parent.end.x+length*Math.cos(theta);y=parent.end.y+length*Math.sin(theta);
    }
    const n={...p,x,y,angle:angle((p.angle??0)*Math.PI/180,(q.angle??0)*Math.PI/180)*180/Math.PI};
    if(p.end&&q.end){const theta=angle(Math.atan2(p.end.y-p.y,p.end.x-p.x),Math.atan2(q.end.y-q.y,q.end.x-q.x)),length=part.dimensions[0];n.end={x:x+length*Math.cos(theta),y:y+length*Math.sin(theta)};}
    out.nodes[part.id]=n;
  }
  for(const leg of out.legs??[]){const up=out.nodes[`leg-${leg.id}-upper`],low=out.nodes[`leg-${leg.id}-lower`];leg.hip={x:up.x,y:up.y};leg.knee={...up.end};leg.foot={...low.end};}
  out.clip=w>=.5?b.clip:a.clip;return out;
}

// Derive travel in rig pixels, then apply exactly the renderer's common scale.
// Walking ends with the current stance foot pinned while the pose settles.
// This does not certify the source silhouette or the swing-to-support transition.
export function chickenSceneFrame(asset,scene,time){
  const sampled=sampleChickenScene(scene,time),scale=(scene.actorScale??1)*(asset.design.size??1)*(asset.rendering.frame?.scale??1.65);
  const start=pose(asset,.8,{clip:'walk'}),support=start.legs.find(l=>l.stance);
  const footId=`leg-${support.id}-foot`,rest=pose(asset,0,{clip:'peck'}).nodes[footId].x,velocity=start.rootX/.8;
  const walkZero=pose(asset,0,{clip:'walk'}),idleZero=pose(asset,0,{clip:'idle'}),firstSupport=walkZero.legs.find(l=>l.stance).id,firstFootId=`leg-${firstSupport}-foot`,startOffset=idleZero.nodes[firstFootId].x-walkZero.nodes[firstFootId].x;
  const travel=t=>{
    if(t<0)return 0;
    const local=Math.max(0,t),total=startOffset+.8*velocity+start.nodes[footId].x-rest;
    if(local<.2){const b=blendChickenPose(asset,pose(asset,local,{clip:'walk'}),idleZero,1-smooth(local,0,.2));return idleZero.nodes[firstFootId].x-b.nodes[firstFootId].x;}
    if(local<.8)return startOffset+velocity*local;
    if(local<1){const b=blendChickenPose(asset,start,pose(asset,0,{clip:'peck'}),smooth(local,.8,1));return startOffset+.8*velocity+start.nodes[footId].x-b.nodes[footId].x;}
    return total;
  };
  return {...sampled,actors:sampled.actors.map(actor=>{
    let state=pose(asset,actor.phase,{clip:actor.clip});
    if(actor.blend)state=blendChickenPose(asset,state,pose(asset,actor.blend.phase,{clip:actor.blend.clip}),actor.blend.weight);
    const offset=actor.phaseOffset??0;
    // Angle interpolation can arc a planted toe through the floor. During
    // takeoff, re-solve the first support at its measured sole height; keep
    // its interpolated x and the two original bone lengths.
    const elapsed=sampled.time-offset;
    if(scene.scenario==='flock'&&elapsed>=0&&elapsed<.2){
      const up=asset.parts.find(p=>p.id===`leg-${firstSupport}-upper`),low=asset.parts.find(p=>p.id===`leg-${firstSupport}-lower`),hip=state.nodes[up.id],foot=state.nodes[firstFootId],target={x:foot.x,y:idleZero.nodes[firstFootId].y},dx=target.x-hip.x,dy=target.y-hip.y,d=Math.hypot(dx,dy),l=up.dimensions[0],m=low.dimensions[0],theta=Math.atan2(dy,dx)-Math.acos(Math.max(-1,Math.min(1,(l*l+d*d-m*m)/(2*l*d)))),knee={x:hip.x+l*Math.cos(theta),y:hip.y+l*Math.sin(theta)};
      hip.end=knee;state.nodes[low.id]={...state.nodes[low.id],...knee,end:{...target}};Object.assign(foot,target);const leg=state.legs.find(l=>l.id===firstSupport);Object.assign(leg,{hip:{x:hip.x,y:hip.y},knee:{...knee},foot:{...target}});
    }
    const offsetX=scene.scenario==='flock'?actor.facing*scale*(travel(sampled.time-offset)):actor.offsetX;
    return {...actor,offsetX,state};
  })};
}
