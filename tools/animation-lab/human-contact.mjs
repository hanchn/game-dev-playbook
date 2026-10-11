import {bindSoftSkin,commandContour} from './human-soft-skin.mjs';
export function humanContactBounds(nodes,profiles){
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const [id,profile] of Object.entries(profiles)){const n=nodes[profile.bind?.id??profile.nodeId??id];if(!n)continue;const angle=profile.nodeId?0:n.end?Math.atan2(n.end.y-n.y,n.end.x-n.x):(n.angle??0)*Math.PI/180;
  const points=profile.bind?commandContour(bindSoftSkin({...profile.bind.template,cx:n.x,cy:n.y,angle:profile.bind.template.angle+angle*180/Math.PI},profile.bind.kind,profile.bind.id,nodes,profile.bind.options)):(profile.points??profile).map(([x,y])=>[n.x+x*Math.cos(angle)-y*Math.sin(angle),n.y+x*Math.sin(angle)+y*Math.cos(angle)]);
  for(const [px,py] of points){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}

 }
 return {minX,maxX,minY,maxY};
}
