import {createAsset} from './game-core.mjs';
import {commands,drawCanvas,frameFor,maskedSource} from './skin-renderer.mjs';
import {bindSoftSkin,partitionSkinLayer} from './human-soft-skin.mjs';
import {chickenSceneFrame} from './chicken-scene-core.mjs';

export const CHICKEN_RENDERER_VERSION=7;
const rotate=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
export function createChickenPerformance(scenario){
  if(!['lay','crow','fight'].includes(scenario))throw Error('尚未接入的表演场景');
  if(scenario==='fight')return {scenario,fightLegProfile:'fold-kick-v2',actorScale:1.6,actors:[{id:'rooster-left',sex:'rooster',x:470,groundY:560,facing:1,phaseOffset:0},{id:'rooster-right',sex:'rooster',x:810,groundY:560,facing:-1,phaseOffset:0}]};
  return {scenario,actorScale:2.5,actors:[{id:scenario==='lay'?'hen-1':'rooster-1',sex:scenario==='lay'?'hen':'rooster',x:640,groundY:560,facing:1,phaseOffset:0}]};
}
export function chickenAssets(){return {rooster:createAsset('chicken'),hen:createAsset('chicken',{sex:'hen'})};}

// Re-solve both legs when the body squats. The original source lengths and
// source-specific contact offsets stay fixed; translating the feet would slide.
export function performancePose(asset,state,actor){
  const out=structuredClone(state),drop=actor.bodyDrop??0;
  for(const [id,n] of Object.entries(out.nodes))if(id!=='root'&&!id.startsWith('leg-')){n.y+=drop;if(n.end)n.end.y+=drop;}
  for(const up of asset.parts.filter(p=>drop&&p.role==='upper')){
    const old=state.nodes[up.id],hip={x:old.x,y:old.y+drop},low=asset.parts.find(p=>p.id===`leg-${up.leg}-lower`),foot=state.nodes[`leg-${up.leg}-foot`],dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.hypot(dx,dy),l=up.dimensions[0],m=low.dimensions[0];
    const angle=Math.atan2(dy,dx)-Math.acos(Math.max(-1,Math.min(1,(l*l+d*d-m*m)/(2*l*d)))),knee={x:hip.x+l*Math.cos(angle),y:hip.y+l*Math.sin(angle)};
    out.nodes[up.id]={...old,...hip,end:knee};out.nodes[low.id]={...out.nodes[low.id],...knee,end:{x:foot.x,y:foot.y}};const leg=out.legs?.find(l=>l.id===up.leg);if(leg){leg.hip=hip;leg.knee=knee;leg.foot={x:foot.x,y:foot.y};}
  }
  const lift=Math.max(0,Math.min(1,(actor.neckLift??0)/10)),theta=-20*Math.PI/180*lift,neck=out.nodes.neck,head=out.nodes.head;
  if(lift){const [x,y]=rotate(neck.end.x-neck.x,neck.end.y-neck.y,theta),[hx,hy]=rotate(head.x-neck.end.x,head.y-neck.end.y,theta);neck.end={x:neck.x+x,y:neck.y+y};head.x=neck.end.x+hx;head.y=neck.end.y+hy;head.angle=(head.angle??0)+theta*180/Math.PI;}
  for(const p of asset.parts.filter(p=>p.role==='wing')){const n=out.nodes[p.id],a=Math.atan2(n.end.y-n.y,n.end.x-n.x)-(actor.wingLift??0);n.end={x:n.x+p.dimensions[0]*Math.cos(a),y:n.y+p.dimensions[0]*Math.sin(a)};}
  // A flying bird folds its legs beneath the body rather than carrying the
  // standing pose upwards. Re-solve from fixed hip and bone lengths; the tuck
  // envelope goes to zero at both contacts, so landing has no foot snap.
  if(actor.legTuck){for(const up of asset.parts.filter(p=>p.role==='upper')){
    const hip=out.nodes[up.id],low=asset.parts.find(p=>p.id===`leg-${up.leg}-lower`),foot=out.nodes[`leg-${up.leg}-foot`],q=actor.legTuck;
    const changed=actor.fightLegProfile==='fold-kick-v2',kick=(actor.legKick??0)*q,near=up.leg===0;
    const target={x:foot.x+(changed?-(near?5:9)*q+(near?40:23)*kick:8*q),y:foot.y-(changed?(near?22:25)*q+(near?10:5)*kick:11*q)},dx=target.x-hip.x,dy=target.y-hip.y,d=Math.hypot(dx,dy),l=up.dimensions[0],m=low.dimensions[0],angle=Math.atan2(dy,dx)-Math.acos(Math.max(-1,Math.min(1,(l*l+d*d-m*m)/(2*l*d)))),knee={x:hip.x+l*Math.cos(angle),y:hip.y+l*Math.sin(angle)};
    hip.end=knee;out.nodes[low.id]={...out.nodes[low.id],...knee,end:target};Object.assign(foot,target,{angle:(foot.angle??0)-(changed?45:28)*q+20*kick});
    const leg=out.legs?.find(l=>l.id===up.leg);if(leg)Object.assign(leg,{hip:{x:hip.x,y:hip.y},knee:{...knee},foot:{...target},stance:false});
  }}
  // The struck bird draws its head back independently of the attacking bird.
  // Keep the skull rigid and rotate the neck around its actual proximal joint.
  if(actor.reaction){const n=out.nodes.neck,h=out.nodes.head,a=-18*Math.PI/180*actor.reaction,[x,y]=rotate(n.end.x-n.x,n.end.y-n.y,a),[hx,hy]=rotate(h.x-n.x,h.y-n.y,a);n.end={x:n.x+x,y:n.y+y};h.x=n.x+hx;h.y=n.y+hy;h.angle=(h.angle??0)+a*180/Math.PI;}
  if(actor.bodyLift){for(const node of Object.values(out.nodes)){node.y-=actor.bodyLift;if(node.end)node.end.y-=actor.bodyLift;}for(const leg of out.legs??[]){const up=out.nodes[`leg-${leg.id}-upper`],low=out.nodes[`leg-${leg.id}-lower`];leg.hip={x:up.x,y:up.y};leg.knee={...up.end};leg.foot={...low.end};leg.stance=false;}}
  return out;
}

// Closed and open heads use one source-pixel scale and one registered eye.
// Their independently measured rects must not change the face's world position.
export function crowHeadCommands(asset,state,extras,beakOpen,intermediates,layerSplit=null){
  const reference=extras.tiles[0],step=intermediates?Math.round(Math.max(0,Math.min(1,beakOpen))*3):(beakOpen>=.5?3:0),middle=step===1||step===2,source=middle?intermediates:extras,tile=source.tiles[middle?step-1:step===3?1:0],pixelScale=35/(middle?intermediates.tiles[0].rect[2]:reference.rect[2]),w=tile.rect[2]*pixelScale,h=tile.rect[3]*pixelScale,eye=[(reference.landmarks.eye[0]-.5)*35,(reference.landmarks.eye[1]-.5)*reference.rect[3]*35/reference.rect[2]];
  const head=state.nodes.head,c={id:'head',slot:middle?step-1:step===3?1:0,rect:tile.rect,clip:tile.clip,mask:tile.mask,cx:head.x,cy:head.y,x:eye[0]-tile.landmarks.eye[0]*w,y:eye[1]-tile.landmarks.eye[1]*h,w,h,angle:head.angle??0,opacity:1};
  const full=bindSoftSkin(c,'head-neck','head',state.nodes,{rows:20,columns:8,cutsY:[.65,.74],rootAnchor:[c.x+tile.neckRoot[0]*w,c.y+tile.neckRoot[1]*h]});
  const v=point=>(point[1]-tile.rect[1])/tile.rect[3];
  return {eye,pixelScale,sourceKey:middle?'intermediates':'extras',step,tile:middle?step-1:step===3?1:0,neck:layerSplit?{...partitionSkinLayer(full,layerSplit,'neck'),id:'neck'}:{...full,id:'neck',mesh:full.mesh.filter(t=>Math.min(...t.src.map(v))>=.65-1e-8)},head:layerSplit?partitionSkinLayer(full,layerSplit,'head'):{...full,mesh:full.mesh.filter(t=>Math.max(...t.src.map(v))<=.74+1e-8)}};
}
function sprite(ctx,image,tile,{x,y,width,rotation=0,opacity=1,front=false},options){
  const source=maskedSource(ctx,image,{rect:tile.rect,mask:tile.mask},options),h=width*tile.rect[3]/tile.rect[2];
  if(!source)throw Error('精确源mask未解码');
  ctx.save();ctx.globalAlpha=opacity;ctx.translate(x,y);ctx.rotate(rotation*Math.PI/180);
  if(front){ctx.beginPath();ctx.rect(-width, -h*.32,width*2,h*.40);ctx.clip();}
  ctx.drawImage(source.image,0,0,tile.rect[2],tile.rect[3],-width*tile.pivot[0],-h*tile.pivot[1],width,h);ctx.restore();
}

export function drawChickenScene(ctx,scene,time,bundle,options={}){
  if(!['flock','lay','crow','fight'].includes(scene.scenario))throw Error('未知场景');
  const defaultAsset=bundle.assets.rooster,sampled=chickenSceneFrame(defaultAsset,scene,time);
  ctx.fillStyle='#17352d';ctx.fillRect(0,0,1280,720);ctx.strokeStyle='#24463b';ctx.lineWidth=1;
  for(let x=0;x<1280;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke();}for(let y=0;y<720;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1280,y);ctx.stroke();}
  ctx.save();ctx.strokeStyle='#739d8d';ctx.setLineDash([10,8]);for(const y of new Set(scene.actors.map(a=>a.groundY))){ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(1256,y);ctx.stroke();}ctx.restore();
  const actors=[],feathers=[];
  for(const actor of [...sampled.actors].sort((a,b)=>a.groundY-b.groundY)){
    const asset=bundle.assets[actor.sex],skin=bundle.skins[actor.sex],image=bundle.images[actor.sex];
    if(!asset||!skin||!image||actor.sex==='hen'&&asset.rendering.sex!=='hen')throw Error('真实公母素材未匹配');
    const own=actor.sex==='hen'?chickenSceneFrame(asset,{...scene,actors:[actor]},time).actors[0]:actor,state=performancePose(asset,own.state,actor),scale=scene.actorScale*asset.design.size*frameFor(asset).scale,x=actor.x+(scene.scenario==='fight'?own.offsetX*scale:own.offsetX),frame=frameFor(asset);
    ctx.fillStyle='#0b261c55';ctx.beginPath();ctx.ellipse(x,actor.groundY,50,6,0,0,Math.PI*2);ctx.fill();
    let nest=null,egg=null;
    if(scene.scenario==='lay'&&actor.sex==='hen'){
      const pelvisX=x-actor.facing*asset.parts.find(p=>p.id==='body').dimensions[0]*.23*scale;
      nest={x:pelvisX,y:actor.groundY+3,width:55*scale};sprite(ctx,bundle.images.extras,bundle.extras.tiles[7],nest,options);
      const prop=sampled.props.find(p=>p.type==='egg'&&p.actorId===actor.id);
      if(prop){const q=Math.min(1,Math.max(0,(sampled.time-2.8)/.45)),origin=actor.groundY+(state.nodes.body.y+asset.parts.find(p=>p.id==='body').dimensions[1]*.25)*scale;egg={id:prop.id,x:pelvisX,y:origin+(actor.groundY-8*scale-origin)*q*q,width:8*scale,rotation:65*q};sprite(ctx,bundle.images.extras,bundle.extras.tiles[6],egg,options);}
    }
    ctx.save();ctx.translate(x,actor.groundY);ctx.scale(actor.facing*scene.actorScale,scene.actorScale);ctx.translate(-frame.anchor[0],-frame.anchor[1]);
    let crow=null;
    if(scene.scenario==='crow'||scene.scenario==='fight'){
      crow=crowHeadCommands(asset,state,bundle.extras,actor.beakOpen,bundle.intermediates,scene.crowLayerSplit??null);const headSkin=crow.sourceKey==='intermediates'?bundle.intermediates:bundle.extras,headImage=bundle.images[crow.sourceKey];drawCanvas(ctx,asset,state,headSkin,headImage,{...options,commandList:[crow.neck]});
      drawCanvas(ctx,asset,state,skin,image,{...options,commandList:commands(asset,state,skin).filter(c=>!['head','neck'].includes(c.id))});
      drawCanvas(ctx,asset,state,headSkin,headImage,{...options,commandList:[crow.head]});
    }else drawCanvas(ctx,asset,state,skin,image,options);
    ctx.restore();
    if(scene.scenario==='fight')for(const p of sampled.props.filter(p=>p.actorId===actor.id&&p.type==='feather')){const n=Number(p.id.split(':').at(-1)),age=sampled.time-1.3,spawn=chickenSceneFrame(asset,scene,1.3).actors.find(a=>a.id===actor.id),neck=performancePose(asset,spawn.state,spawn).nodes.neck.end,origin={x:actor.x+spawn.offsetX*scale+actor.facing*neck.x*scale,y:actor.groundY+neck.y*scale};const feather={...p,x:origin.x+(n-2)*14*age,y:Math.min(actor.groundY,origin.y-(35+n*4)*age+80*age*age),width:(5+n*.45)*scale};sprite(ctx,bundle.images.extras,bundle.extras.tiles[5],feather,options);feathers.push({...feather,origin});}
    if(nest)sprite(ctx,bundle.images.extras,bundle.extras.tiles[7],{...nest,front:true},options);
    ctx.fillStyle='#b8d6c5';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText(actor.id,x,actor.groundY+26);
    actors.push({...actor,assetId:asset.id,state,egg,nest,crow:crow?{tile:crow.tile,sourceKey:crow.sourceKey,step:crow.step,pixelScale:crow.pixelScale,eye:crow.eye}:null});
  }
  return {...sampled,rendererVersion:CHICKEN_RENDERER_VERSION,actors,props:(scene.scenario==='fight'?feathers:sampled.props.map(p=>p.type==='egg'?{...p,...actors.find(a=>a.id===p.actorId)?.egg}:p)).map(p=>({...p,coordinateSpace:'canvas-pixels'}))};
}
