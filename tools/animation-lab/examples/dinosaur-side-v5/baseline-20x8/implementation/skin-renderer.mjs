import {bindSoftSkin,rasterPolygon} from './human-soft-skin.mjs';
import {renderStrip,drawStrip} from './strip-skin.mjs';
import {pose} from './game-core.mjs';
export function frameFor(a){return a.rendering?.frame??{anchor:[256,a.rendering?.rig==='human-side-v2'?350:a.species==='spider'?225:260],scale:a.rendering?.rig==='human-side-v2'?1:a.species==='spider'?1.2:1.65};}
export function tileFor(part,a){if(Number.isInteger(part.tile))return part.tile;return part.id==='head'?1:part.role==='body-chain'?14:part.role==='upper'?2:part.role==='lower'?3:part.role==='foot'?4:part.role==='neck'?5:part.role==='tail'?6:part.role==='arm'||part.role==='claw'?7:part.role==='pincer'?9:0;}
export function commands(a,state,skin,{explosion=0,selected=null,scope='character',fadeUnrelated=false}={}){
 const ordered=a.parts.filter(p=>p.id!=='root'&&state.nodes[p.id]).sort((x,y)=>x.layer-y.layer),cols=Math.ceil(Math.sqrt(ordered.length)),rows=Math.ceil(ordered.length/cols),active=new Set([selected]);
 if(scope==='subassembly'&&a.species==='human'){const p=a.parts.find(p=>p.id===selected);if(p?.arm!==undefined)active.add(`arm-${p.arm}-upper`);if(p?.leg!==undefined)active.add(`leg-${p.leg}-upper`);}
 if(scope==='subassembly')for(let i=0;i<ordered.length;i++)for(const p of ordered)if(active.has(p.parent))active.add(p.id);
 if(scope!=='character'){let p=a.parts.find(p=>p.id===selected);while(p?.parent){active.add(p.parent);p=a.parts.find(x=>x.id===p.parent);}if(scope==='component')for(const child of ordered)if(child.parent===selected)active.add(child.id);}
 const cs=ordered.map((p,i)=>{const n=state.nodes[p.id],slot=p.role==='hand'&&a.rendering.handTiles?a.rendering.handTiles[a.rendering.handPose==='auto'?(a.rendering.actionHands[state.clip]??'relaxed'):a.rendering.handPose]:state.clip==='flap'&&p.role==='wing'?8:tileFor(p,a),tile=skin.tiles[slot],r=tile.rect,dx=explosion*(((i%cols)-(cols-1)/2)*Math.min(90,400/cols)-n.x),dy=explosion*((Math.floor(i/cols)-(rows-1)/2)*Math.min(100,350/rows)-n.y);let w=p.dimensions[0],h=p.dimensions[1],angle=n.angle??0,x=-w/2,y=-h/2;
  if(!n.end&&p.skinAspect){h=w*r[3]/r[2];y=-h/2;}
  if(n.end){const distance=Math.hypot(n.end.x-n.x,n.end.y-n.y),vx=(tile.distal[0]-tile.pivot[0])*r[2],vy=(tile.distal[1]-tile.pivot[1])*r[3],factor=distance/(Math.hypot(vx,vy)||1);w=r[2]*factor;h=r[3]*factor;angle=(Math.atan2(n.end.y-n.y,n.end.x-n.x)-Math.atan2(vy,vx))*180/Math.PI;x=-w*tile.pivot[0];y=-h*tile.pivot[1];}
  if(n.end&&tile.visualWidth){const distance=Math.hypot(n.end.x-n.x,n.end.y-n.y);w=tile.visualWidth;const vx=w*(tile.distal[0]-tile.pivot[0]);h=Math.sqrt(Math.max(.0001,distance*distance-vx*vx))/Math.abs(tile.distal[1]-tile.pivot[1]);const vy=h*(tile.distal[1]-tile.pivot[1]);angle=(Math.atan2(n.end.y-n.y,n.end.x-n.x)-Math.atan2(vy,vx))*180/Math.PI;x=-w*tile.pivot[0];y=-h*tile.pivot[1];}
  if(n.end&&p.skinHeight){const distance=Math.hypot(n.end.x-n.x,n.end.y-n.y);h=p.skinHeight;const vy=h*(tile.distal[1]-tile.pivot[1]);w=Math.sqrt(Math.max(.0001,distance*distance-vy*vy))/Math.abs(tile.distal[0]-tile.pivot[0]);const vx=w*(tile.distal[0]-tile.pivot[0]);angle=(Math.atan2(n.end.y-n.y,n.end.x-n.x)-Math.atan2(vy,vx))*180/Math.PI;x=-w*tile.pivot[0];y=-h*tile.pivot[1];}
  if(p.shape==='foot'){w=p.dimensions[0];h=w*r[3]/r[2];x=-w*tile.pivot[0];y=-h*tile.pivot[1];}
  if(p.role==='body-chain'){w=(n.length??14)*1.3;x=-w*.5;h=p.dimensions[1];}
  if(p.skinOffset){x+=p.skinOffset[0];y+=p.skinOffset[1];}
  return {id:p.id,slot,rect:r,clip:p.shape==='foot'?(tile.ankleCap??tile.clip):tile.clip,mask:tile.mask,cx:n.x+dx,cy:n.y+dy,x,y,w,h,angle,end:n.end,opacity:n.visible===false?0:fadeUnrelated&&scope!=='character'&&!active.has(p.id)?.1:fadeUnrelated&&scope!=='character'&&p.id==='body'&&a.parts.find(x=>x.id===selected)?.side==='far'?.35:1,selected:p.id===selected};
 });
 if(a.rendering.softSkin){
  const head=cs.find(c=>c.id==='head'),nearThigh=cs.find(c=>c.id==='leg-0-upper'),body=cs.find(c=>c.id==='body'),pants=skin.tiles[2],shirtIndex=cs.indexOf(body);
  const sharedPants=a.rendering.continuousPants,chosen=a.parts.find(p=>p.id===selected),pelvisDriver=scope!=='character'&&chosen?.leg===1?'leg-1-upper':'leg-0-upper',driver=cs.find(c=>c.id===pelvisDriver);
  const collar=skin.tiles[0].collarUnderlay;
  let collarSkin;
  if(collar){const [rx,ry,rw,rh]=body.rect,[x,y,w,h]=collar.bounds,rect=skin.tiles[1].jointPatch;collarSkin={id:'collar-skin-underlay',nodeId:'body',pickId:'neck',slot:1,rect,clip:collar.clip.map(([u,v])=>[rect[0]+(u-x)/w*rect[2],rect[1]+(v-y)/h*rect[3]]),cx:body.cx,cy:body.cy,x:body.x+(x-rx)/rw*body.w,y:body.y+(y-ry)/rh*body.h,w:w/rw*body.w,h:h/rh*body.h,angle:body.angle,opacity:body.opacity,selected:false};}
  for(let i=0;i<cs.length;i++){
   const c=cs[i];if(c.id==='head'||c.id==='neck'){
    const base={...head,id:c.id,opacity:c.opacity,selected:c.selected,cx:head.cx+(c.cx-state.nodes[c.id].x),cy:head.cy+(c.cy-state.nodes[c.id].y)};
    cs[i]=bindSoftSkin(base,'head-neck','head',state.nodes,{start:c.id==='neck'?.70:0,end:c.id==='neck'?1:.74,rows:c.id==='neck'?6:1,cutsY:[.70,.74],rootAnchor:[head.x+skin.tiles[1].neckRoot[0]*head.w,head.y+skin.tiles[1].neckRoot[1]*head.h]});
   }else if(c.id==='body')cs[i]=bindSoftSkin({...c,clip:sharedPants?(skin.tiles[0].shirtClip??c.clip):c.clip},a.rendering.skin==='alien'?'shirt':'pelvis',c.id,state.nodes,{end:sharedPants?skin.tiles[0].shirtEnd:1,rows:state.clip==='roll'?24:sharedPants?1:16,columns:state.clip==='roll'?4:sharedPants?1:2});
   else if(/^leg-[01]-upper$/.test(c.id))cs[i]=bindSoftSkin(c,sharedPants?'hip-thigh':'thigh',c.id,state.nodes,{start:sharedPants?pants.pivot[1]+.07:0,rows:sharedPants?1:12,cutsX:[pants.pivot[0],pants.distal[0]],cutsY:[pants.pivot[1],pants.pivot[1]+.07,pants.pivot[1]+.09,pants.pivot[1]+.14,pants.pivot[1]+.21,pants.pivot[1]+.28,pants.pivot[1]+.38,pants.pivot[1]+.48,pants.pivot[1]+.58,...Array.from({length:21},(_,i)=>pants.pivot[1]+(pants.distal[1]-pants.pivot[1])*i/20),pants.distal[1]]});
  }
  if(sharedPants){
   const base={...driver,id:'body-pelvis',pickId:'body',opacity:body.opacity,selected:body.selected};
   const pelvis=bindSoftSkin(base,'hip-thigh',pelvisDriver,state.nodes,{end:pants.pivot[1]+.09,rows:1,cutsX:[pants.pivot[0],pants.distal[0]],cutsY:[pants.pivot[1],pants.pivot[1]+.07]});
   cs.splice(shirtIndex,0,pelvis);
  }
  if(collarSkin)cs.splice(cs.findIndex(c=>c.id==='body'),0,bindSoftSkin(collarSkin,'shirt','body',state.nodes,{rows:12,columns:4}));
 }

 if(a.rendering.continuousNeck){const head=cs.find(c=>c.id==='head'),neck=cs.find(c=>c.id==='neck'),tile=skin.tiles[1],options={rows:20,columns:8,rootAnchor:[head.x+tile.neckRoot[0]*head.w,head.y+tile.neckRoot[1]*head.h],neckMask:tile.neckMask};
  if(a.rendering.neckUnderBody){
   // Two overlapping regions of one source share exactly the same deformation.
   // The neck root belongs behind the torso, while the skull stays in front.
   cs[cs.indexOf(neck)]=bindSoftSkin({...head,id:'neck',pickId:'neck',opacity:neck.opacity,selected:neck.selected},'head-neck','head',state.nodes,{...options,start:.58,cutsY:[.58,.70]});
   cs[cs.indexOf(head)]=bindSoftSkin(head,'head-neck','head',state.nodes,{...options,end:.70,cutsY:[.58,.70]});
  }else{cs[cs.indexOf(head)]=bindSoftSkin(head,'head-neck','head',state.nodes,options);neck.opacity=0;}
 }
 if(a.rendering.sphericalJoints){
  // A textured circular core sits under both adjoining pieces. No rectangular
  // connector or visible mechanical joint is added to the surface silhouette.
  for(const p of a.parts.filter(p=>p.arm!==undefined||p.leg!==undefined||['head','neck'].includes(p.id))){
   const child=cs.find(c=>c.id===p.id),parent=cs.find(c=>c.id===p.parent),n=state.nodes[p.id];if(!child||!parent)continue;
   const radius=p.id==='head'?4:p.id==='neck'?4:p.role==='upper'?9:p.role==='lower'?7:p.role==='foot'?4:p.role==='upper-arm'?(skin.tiles[0].armhole?9:8):p.role==='forearm'?6:2.5;
   const slot=p.id==='head'||p.id==='neck'?1:p.role==='foot'?8:p.role==='hand'?8:p.tile,rect=skin.tiles[slot].jointPatch;if(!rect)continue;
   const clip=Array.from({length:32},(_,i)=>[rect[0]+rect[2]/2+rect[2]/2*Math.cos(i*Math.PI/16),rect[1]+rect[3]/2+rect[3]/2*Math.sin(i*Math.PI/16)]);
   cs.splice(Math.min(cs.indexOf(child),cs.indexOf(parent)),0,{id:'joint-ball-'+p.id,nodeId:p.id,pickId:p.id,jointBall:true,slot,rect,clip,cx:n.x,cy:n.y,x:-radius,y:-radius,w:radius*2,h:radius*2,angle:0,opacity:child.opacity,selected:false});
  }
 }
 if(a.rendering.skin==='alien'&&skin.tiles[0].shoulderRim){const body=cs.find(c=>c.id==='body');cs.push(bindSoftSkin({...body,angle:state.nodes.body.angle??0,id:'shoulder-rim',pickId:'body',clip:skin.tiles[0].shoulderRim},'shirt','body',state.nodes,body.bind?.options??{rows:1,columns:1}));}
 if(a.rendering.grip&&a.rendering.grip!=='none'&&skin.grips){
  const tile=skin.grips.tiles[a.rendering.grip],c=cs.find(x=>x.id==='arm-0-hand'),n=state.nodes['arm-0-hand'];
  if(!tile)throw Error('Unknown grip material');
  const [rx,ry,rw,rh]=tile.rect,scale=tile.scale;
  Object.assign(c,{source:'grips',href:skin.grips.href??skin.grips.atlas,sourceWidth:skin.grips.width,sourceHeight:skin.grips.height,rect:tile.rect,clip:null,x:(rx-tile.wrist[0])*scale,y:(ry-tile.wrist[1])*scale,w:rw*scale,h:rh*scale,angle:Math.atan2(n.end.y-n.y,n.end.x-n.x)*180/Math.PI,grip:a.rendering.grip});
 }
 return cs;
}
export function renderSkinned(a,state,skin,options={}){
 const href=skin.href,width=skin.width,height=skin.height,sourceMasks=new Map(),sourceDefs=[];
 const sourceMask=c=>{
  if(!c.mask?.components)return null;if(sourceMasks.has(c.mask))return sourceMasks.get(c.mask);
  const id=`source-mask-${options.instance??state.clip+'-'+state.t}-${sourceMasks.size}`;
  const d=c.mask.components.map(([x,y,w,h])=>`M${x} ${y}h${w}v${h}h${-w}Z`).join('');
  sourceDefs.push(`<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${d}"/></clipPath>`);sourceMasks.set(c.mask,id);return id;
 };
 const mesh=a.rendering.tailMesh&&(options.explosion??0)<.01;const shapes=commands(a,state,skin,options).filter(c=>!mesh||!a.parts.find(p=>p.id===c.id&&p.role===(a.rendering.tailMesh.role??'tail-chain'))).map(c=>{const [rx,ry,rw,rh]=c.rect;
 const mask=sourceMask(c);
 if(c.mesh){const tag=(options.instance??state.clip+'-'+state.t)+'-'+c.id;return `<g data-part="${c.pickId??c.id}" opacity="${c.opacity}" transform="translate(${c.cx} ${c.cy})">${c.mesh.map((t,i)=>`<defs><clipPath id="mesh-${tag}-${i}"><polygon points="${rasterPolygon(t.polygon).map(p=>p.join(' ')).join(',')}"/></clipPath></defs><g clip-path="url(#mesh-${tag}-${i})"><g transform="matrix(${t.matrix.join(' ')})">${mask?`<g clip-path="url(#${mask})">`:''}${skin.imageId&&!c.source?`<use href="#${skin.imageId}"/>`:`<image href="${c.href??href}" width="${c.sourceWidth??width}" height="${c.sourceHeight??height}"/>`}${mask?'</g>':''}</g></g>`).join('')}</g>`;}
 return `<g data-part="${c.pickId??c.id}" opacity="${c.opacity}" transform="translate(${c.cx} ${c.cy}) rotate(${c.angle})"><svg x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" viewBox="${rx} ${ry} ${rw} ${rh}" preserveAspectRatio="none">${c.clip?`<defs><clipPath id="part-${options.instance??state.clip+'-'+state.t}-${c.id}"><polygon points="${c.clip.map(p=>p.join(' ')).join(',')}"/></clipPath></defs><g clip-path="url(#part-${options.instance??state.clip+'-'+state.t}-${c.id})">`:''}${mask?`<g clip-path="url(#${mask})">`:''}${skin.imageId&&!c.source?`<use href="#${skin.imageId}"/>`:`<image href="${c.href??href}" width="${c.sourceWidth??width}" height="${c.sourceHeight??height}"/>`}${mask?'</g>':''}${c.clip?'</g>':''}</svg>${options.bones&&c.end?`<line x1="0" y1="0" x2="${c.w*(skin.tiles[c.slot].distal[0]-skin.tiles[c.slot].pivot[0])}" y2="${c.h*(skin.tiles[c.slot].distal[1]-skin.tiles[c.slot].pivot[1])}" stroke="#6af5c6" stroke-width=".7"/>`:''}${options.bones?'<circle r="2" fill="#6af5c6" stroke="#102833" stroke-width=".7"/>':''}</g>`;}).join('');
 const frame=frameFor(a),anchor=[frame.anchor[0],frame.anchor[1]+(256-frame.anchor[1])*(options.explosion??0)];return `${sourceDefs.length?`<defs>${sourceDefs.join('')}</defs>`:''}<g transform="translate(${anchor.join(' ')}) scale(${a.design.size*frame.scale})">${mesh?renderStrip(a,state,skin,options):''}${shapes}</g>`;
}
const maskedImages=new WeakMap();
// Cache a native-size, read-only derived texture. Original PNG pixels and asset
// metadata remain unchanged; crop coordinates still refer to the source atlas.
export function maskedSource(ctx,image,c,{maskCanvasFactory}={}){
 if(!c.mask?.components)return null;let byMask=maskedImages.get(image);if(!byMask){byMask=new WeakMap();maskedImages.set(image,byMask);}let byRect=byMask.get(c.mask);if(!byRect){byRect=new Map();byMask.set(c.mask,byRect);}const key=c.rect.join(',');if(byRect.has(key))return byRect.get(key);
 const [rx,ry,rw,rh]=c.rect;
 const factory=maskCanvasFactory??(typeof OffscreenCanvas==='function'?((w,h)=>new OffscreenCanvas(w,h)):ctx.canvas?.ownerDocument?((w,h)=>{const canvas=ctx.canvas.ownerDocument.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;}):null);
 if(!factory)return null;const canvas=factory(rw,rh),target=canvas?.getContext('2d');if(!target)return null;target.imageSmoothingEnabled=false;
 for(const [x,y,w,h] of c.mask.components){const sx=Math.max(rx,x),sy=Math.max(ry,y),ex=Math.min(rx+rw,x+w),ey=Math.min(ry+rh,y+h);if(ex>sx&&ey>sy)target.drawImage(image,sx,sy,ex-sx,ey-sy,sx-rx,sy-ry,ex-sx,ey-sy);}
 const cached={image:canvas,rect:[rx,ry,rw,rh]};byRect.set(key,cached);return cached;
}
export function drawCanvas(ctx,a,state,skin,image,options={}){
 ctx.save();const frame=frameFor(a);ctx.translate(frame.anchor[0],frame.anchor[1]+(256-frame.anchor[1])*(options.explosion??0));ctx.scale(a.design.size*frame.scale,a.design.size*frame.scale);const mesh=a.rendering.tailMesh&&(options.explosion??0)<.01;if(mesh)drawStrip(ctx,a,state,skin,image,options);
 for(const c of (options.commandList??commands(a,state,skin,options)).filter(c=>!mesh||!a.parts.find(p=>p.id===c.id&&p.role===(a.rendering.tailMesh.role??'tail-chain')))){
  const original=c.source==='grips'?(options.gripImage??image.gripImage):image,cached=maskedSource(ctx,original,c,options);
  ctx.save();ctx.globalAlpha=c.opacity;ctx.translate(c.cx,c.cy);ctx.rotate(c.angle*Math.PI/180);
  if(c.mesh){for(const t of c.mesh){
   ctx.save();ctx.beginPath();rasterPolygon(t.polygon).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.transform(...t.matrix);
   if(c.mask?.components&&!cached){ctx.beginPath();for(const [x,y,w,h] of c.mask.components)ctx.rect(x,y,w,h);ctx.clip();}
   const [rx,ry,rw,rh]=cached?.rect??[0,0,skin.width,skin.height],sx=Math.max(rx,Math.floor(Math.min(...t.src.map(p=>p[0])))-2),sy=Math.max(ry,Math.floor(Math.min(...t.src.map(p=>p[1])))-2),ex=Math.min(rx+rw,Math.ceil(Math.max(...t.src.map(p=>p[0])))+2),ey=Math.min(ry+rh,Math.ceil(Math.max(...t.src.map(p=>p[1])))+2);
   if(ex>sx&&ey>sy)ctx.drawImage(cached?.image??original,sx-rx,sy-ry,ex-sx,ey-sy,sx,sy,ex-sx,ey-sy);ctx.restore();
  }ctx.restore();continue;}
  if(c.mask?.components&&!cached){ctx.beginPath();for(const [x,y,w,h] of c.mask.components)ctx.rect(c.x+(x-c.rect[0])/c.rect[2]*c.w,c.y+(y-c.rect[1])/c.rect[3]*c.h,w/c.rect[2]*c.w,h/c.rect[3]*c.h);ctx.clip();}
  if(c.clip){ctx.beginPath();c.clip.forEach(([x,y],i)=>{const px=c.x+(x-c.rect[0])/c.rect[2]*c.w,py=c.y+(y-c.rect[1])/c.rect[3]*c.h;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();ctx.clip();}
  ctx.drawImage(cached?.image??original,...(cached?[0,0,c.rect[2],c.rect[3]]:c.rect),c.x,c.y,c.w,c.h);ctx.restore();
 }ctx.restore();
}
export function skinnedSheet(a,skin,{frames=16,columns=4,clip='walk',scope='character',partId=null}={}){const motion=a.actionDesign.actions.find(c=>c.id===clip),loop=motion?.loop!==false,duration=motion?.duration??1;const metadata=[],rows=Math.ceil(frames/columns);let content='';for(let i=0;i<frames;i++){const state=pose(a,i/(loop?frames:frames-1),{clip,scope,partId});content+=`<defs><clipPath id="frame-${i}"><rect width="512" height="512"/></clipPath></defs><g transform="translate(${i%columns*512} ${Math.floor(i/columns)*512})" clip-path="url(#frame-${i})">${renderSkinned(a,state,{...skin,imageId:'atlas'})}</g>`;metadata.push({index:i,x:i%columns*512,y:Math.floor(i/columns)*512,width:512,height:512,anchor:frameFor(a).anchor});}return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*512}" height="${rows*512}" viewBox="0 0 ${columns*512} ${rows*512}"><defs><image id="atlas" href="${skin.href}" width="${skin.width}" height="${skin.height}"/></defs>${content}</svg>`,manifest:{assetId:a.id,clip,scope,partId,duration,fps:(loop?frames:frames-1)/duration,loop,format:'svg',frames:metadata,view:a.rendering.view,projection:a.rendering.projection,facing:a.rendering.facing,source:{atlas:a.rendering.atlas,skin:a.rendering.skin,skinKey:a.rendering.skinKey,skinVersion:a.rendering.skinVersion,tiles:skin.tiles,grip:a.rendering.grip,grips:skin.grips?{atlas:skin.grips.atlas,tiles:skin.grips.tiles}:undefined,handPose:a.rendering.handPose,handTiles:a.rendering.handTiles,actionHands:a.rendering.actionHands},qa:{technical:'composited',visual:'pending'}}};}
