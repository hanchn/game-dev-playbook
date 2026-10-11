import {sourcePointAt,warpSkinPoint,sourcePointWorld} from './human-soft-skin.mjs';
import {humanPose} from './human-rig.mjs';
import {commands} from './skin-renderer.mjs';

// Test source alpha at real transformed joint positions, independently of bone coincidence.
export function auditHumanTextures(asset,skin,source){
 const alpha=(c,x,y)=>{const p=sourcePointAt(c,x,y);if(!p)return 0;const px=Math.floor(p[0]),py=Math.floor(p[1]);return source.pixels[(py*source.w+px)*4+3]??0;};
 const joints=[];
 for(const part of asset.parts.filter(p=>p.arm!==undefined||p.leg!==undefined||['neck','head'].includes(p.id))){
  let minimum=Infinity,centerCovered=true;
  for(const handPose of part.role==='hand'?['relaxed','fist','open']:['auto'])for(let i=0;i<=64;i++){
   const a={...asset,rendering:{...asset.rendering,handPose,grip:'none'}},state=humanPose(a,i/64,{clip:'extend',scope:'component',partId:part.id}),cs=commands(a,state,skin,{scope:'component',selected:part.id}),c=cs.find(x=>x.id===part.id),parent=cs.find(x=>x.id===(asset.rendering.continuousPants&&part.leg!==undefined&&part.role==='upper'?'body-pelvis':part.parent)),n=state.nodes[part.id],joint={...(part.id==='head'?state.nodes.neck.end:n)};
   // The trouser cuff overlaps the top of the ankle, above its rotation center.
   // Requiring fabric at the anatomical joint would hide the exposed ankle again.
   if(asset.rendering.continuousPants&&part.role==='upper'&&part.leg!==undefined){const tile=skin.tiles[2],point=sourcePointWorld(c,[tile.rect[0]+tile.pivot[0]*tile.rect[2],tile.rect[1]+(tile.pivot[1]+.08)*tile.rect[3]]);joint.x=point[0];joint.y=point[1];}
   if(part.id==='head'&&c.bind){const t=skin.tiles[1],sy=t.rect[1]+.72*t.rect[3],row=Math.round(sy);let lo=Infinity,hi=-Infinity;for(let x=t.rect[0];x<t.rect[0]+t.rect[2];x++)if(source.pixels[(row*source.w+x)*4+3]>=128){lo=Math.min(lo,x);hi=Math.max(hi,x);}const head=asset.parts.find(p=>p.id==='head'),h=head.dimensions[0]*t.rect[3]/t.rect[2],u=((lo+hi)/2-t.rect[0])/t.rect[2],point=warpSkinPoint('head-neck','head',[-head.dimensions[0]/2+head.skinOffset[0]+u*head.dimensions[0],-h/2+head.skinOffset[1]+.72*h],.72,state.nodes,c.bind.context);joint.x=point[0];joint.y=point[1];}
   if(part.role==='foot'){const lower=state.nodes[part.parent],length=Math.hypot(lower.end.x-lower.x,lower.end.y-lower.y);joint.x-=4*(lower.end.x-lower.x)/length;joint.y-=4*(lower.end.y-lower.y)/length;}
   if(!parent)throw Error('Missing adjacent texture: '+part.id);let overlap=0;
   const garmentHole=part.role==='upper-arm'&&skin.tiles[0].armhole||part.id==='neck'&&skin.tiles[0].neckOpening,ball=garmentHole?cs.find(x=>x.id==='joint-ball-'+part.id):null,childAlpha=(x,y)=>Math.max(alpha(c,x,y),ball?alpha(ball,x,y):0),radius=garmentHole?10:2;
   centerCovered&&=childAlpha(joint.x,joint.y)>=128&&(garmentHole||alpha(parent,joint.x,joint.y)>=128);
   for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++)if(childAlpha(joint.x+dx,joint.y+dy)>=128&&alpha(parent,joint.x+dx,joint.y+dy)>=128)overlap++;
   minimum=Math.min(minimum,overlap);
  }
  joints.push({partId:part.id,parent:part.parent,samples:65,minimumOverlapPixels:minimum,centerCovered,method:part.role==='upper-arm'&&skin.tiles[0].armhole?'skin-fills-transparent-armhole-and-overlaps-cloth-rim':part.id==='neck'&&skin.tiles[0].neckOpening?'skin-inside-collar-overlaps-cloth-rim':'opaque-adjacent-overlap',passed:centerCovered&&minimum>=3});
 }
 const materials=asset.clips.filter(c=>c!=='extend').map(clip=>{const hand=asset.rendering.actionHands[clip],slot=asset.rendering.handTiles[hand],slots=[...new Set(asset.parts.filter(p=>p.id!=='root').map(p=>p.role==='hand'?slot:p.tile))];return{clip,hand,slot,slots,passed:slots.every(i=>skin.tiles[i]?.alphaArea>100)};});
 const byId=id=>asset.parts.find(p=>p.id===id),occlusion=[{id:'collar-over-neck',passed:byId('neck').layer<byId('body').layer},...asset.parts.filter(p=>p.role==='foot').map(p=>({id:p.id+'-under-cuff',passed:p.layer<byId(p.parent).layer})),...asset.parts.filter(p=>p.leg!==undefined&&p.role==='upper').map(p=>({id:p.id+'-under-pelvis',passed:p.layer<byId('body').layer}))];
 return {assetId:asset.id,joints,materials,occlusion,passed:joints.every(j=>j.passed)&&materials.every(m=>m.passed)&&occlusion.every(c=>c.passed),limitations:'Opaque overlap detects gaps, not contour bumps or color seams; bending screenshots still require visual review. Ankle overlap is sampled inside the cuff, 4px above the rotation center.'};
}
