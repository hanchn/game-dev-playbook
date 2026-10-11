// Continuous source skin, driven by neighbouring bones. Source pixels are never edited.
const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const smooth=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function warpSkinPoint(kind,id,p,v,nodes,context={}){
 const n=nodes[id],a=n.end?Math.atan2(n.end.y-n.y,n.end.x-n.x):(n.angle??0)*Math.PI/180,r=rotate(p,a);let x=n.x+r[0],y=n.y+r[1];
 if(['shirt','pelvis'].includes(kind)&&nodes.body.spine){
  const {hip,lean,curvature,bodyS}=nodes.body.spine,radius=1/curvature,s=bodyS-p[1],turn=s*curvature,normal=Math.min(p[0],radius*.8),point=rotate([radius*(1-Math.cos(turn))+normal*Math.cos(turn),-radius*Math.sin(turn)+normal*Math.sin(turn)],lean);x=hip.x+point[0];y=hip.y+point[1];
 }else if(kind==='head-neck'){
  const root=rotate(context.rootAnchor??[-6,19],a),weight=smooth((v-(context.neckMask?.start??.70))/(context.neckMask?.span??.18))*(context.neckMask?smooth((context.neckMask.maxU-context.u)/context.neckMask.fade):1);
  x+=(nodes.neck.x-n.x-root[0])*weight;y+=(nodes.neck.y-n.y-root[1])*weight;
 }else if(kind==='pelvis'){
  const hip=nodes['leg-0-upper'],la=Math.atan2(hip.end.y-hip.y,hip.end.x-hip.x)-Math.PI/2,target=rotate([p[0],p[1]-40],la),weight=smooth((p[1]-25)/26)*.65;
  x+=(hip.x+target[0]-x)*weight;y+=(hip.y+target[1]-y)*weight;
 }else if(kind==='hip-thigh'){
  // Narrow only the pelvic bulge; the lower thigh keeps its approved width.
  p=[p[0],p[1]*(1-.12*(1-smooth((p[0]+10)/20)))];
  // Polar skinning preserves radius through the hip instead of collapsing a
  // wide cloth cross-section. The angular map remains monotone below 114deg.
  const base=(nodes.body.spineBaseAngle??nodes.body.angle??0)*Math.PI/180+Math.PI/2,delta=Math.atan2(Math.sin(a-base),Math.cos(a-base)),theta=Math.atan2(p[1],p[0]),radius=Math.hypot(...p),angle=base+theta+delta*(1+Math.cos(theta))/2;
  x=n.x+radius*Math.cos(angle);y=n.y+radius*Math.sin(angle);
 }else if(kind==='thigh'){
  const ba=(nodes.body.angle??0)*Math.PI/180,target=rotate([-p[1],p[0]],ba),weight=(1-smooth(p[0]/15))*.65;
  x+=(n.x+target[0]-x)*weight;y+=(n.y+target[1]-y)*weight;
 }
 return [x,y];
}
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
export function clipPolygon(poly,triangle){
 let result=poly;const sign=Math.sign(cross(triangle[0],triangle[1],triangle[2]));
 for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3],input=result;result=[];for(let j=0;j<input.length;j++){const p=input[j],q=input[(j+1)%input.length],dp=cross(a,b,p)*sign,dq=cross(a,b,q)*sign;if(dp>=-1e-7)result.push(p);if((dp<0)!==(dq<0)){const t=dp/(dp-dq);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}}
 return result;
}
export function affine(src,dst){
 const [[x0,y0],[x1,y1],[x2,y2]]=src,[[u0,v0],[u1,v1],[u2,v2]]=dst,d=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
 const a=((u1-u0)*(y2-y0)-(u2-u0)*(y1-y0))/d,c=((u2-u0)*(x1-x0)-(u1-u0)*(x2-x0))/d,b=((v1-v0)*(y2-y0)-(v2-v0)*(y1-y0))/d,e=((v2-v0)*(x1-x0)-(v1-v0)*(x2-x0))/d;
 return [a,b,c,e,u0-a*x0-c*y0,v0-b*x0-e*y0];
}
export function transform(m,p){return[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
export function bindSoftSkin(c,kind,id,nodes,{start=0,end=1,columns=1,rows=12,cutsX=[],cutsY=[],rootAnchor,neckMask}={}){
 if(!c.clip)c={...c,clip:[[c.rect[0],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]+c.rect[3]],[c.rect[0],c.rect[1]+c.rect[3]]]};
 const n=nodes[id],na=n.end?Math.atan2(n.end.y-n.y,n.end.x-n.x):(n.angle??0)*Math.PI/180,localAngle=c.angle*Math.PI/180-na,origin=[n.x,n.y],r=c.rect;
 const local=(s)=>rotate([c.x+(s[0]-r[0])/r[2]*c.w,c.y+(s[1]-r[1])/r[3]*c.h],localAngle);
 const mesh=[],context={rootAnchor,neckMask},xs=[...new Set([...Array.from({length:columns+1},(_,i)=>i/columns),...cutsX])].sort((a,b)=>a-b),ys=[...new Set([...Array.from({length:rows+1},(_,j)=>start+(end-start)*j/rows),...cutsY.filter(v=>v>=start&&v<=end)])].sort((a,b)=>a-b);
 const point=s=>{const p=warpSkinPoint(kind,id,local(s),(s[1]-r[1])/r[3],nodes,{...context,u:(s[0]-r[0])/r[2]});return[p[0]-origin[0],p[1]-origin[1]];};
 const addRow=(sy,ey,depth=0)=>{
  const triangles=[];for(let i=0;i<xs.length-1;i++){const sx=r[0]+xs[i]*r[2],ex=r[0]+xs[i+1]*r[2];triangles.push([[sx,sy],[ex,sy],[ex,ey]],[[sx,sy],[ex,ey],[sx,ey]]);}
  // Refine the entire horizontal row, preserving shared edges. Refining isolated
  // triangles makes T junctions and visible gaps under a nonlinear bend.
  if(depth<7&&triangles.some(src=>{const dst=src.map(point);return cross(dst[0],dst[1],dst[2])*cross(src[0],src[1],src[2])<=0;})){const mid=(sy+ey)/2;addRow(sy,mid,depth+1);addRow(mid,ey,depth+1);return;}
  // Exact ownership is applied to source pixels once by the renderer. Do not
  // multiply the mesh by every pixel-run rectangle in the precision mask.
  for(const src of triangles){const clipped=clipPolygon(c.clip,src);if(clipped.length<3)continue;const dst=src.map(point),matrix=affine(src,dst),polygon=clipped.map(s=>transform(matrix,s));mesh.push({src,dst,matrix,polygon});}
 };
 for(let j=0;j<ys.length-1;j++)addRow(r[1]+ys[j]*r[3],r[1]+ys[j+1]*r[3]);

 return {...c,cx:origin[0]+c.cx-n.x,cy:origin[1]+c.cy-n.y,angle:0,mesh,bind:{kind,id,context,template:{rect:c.rect,clip:c.clip,x:c.x,y:c.y,w:c.w,h:c.h,angle:localAngle*180/Math.PI},options:{start,end,columns,rows,cutsX,cutsY,rootAnchor,neckMask}}};
}
export function commandContour(c){
 if(c.mesh)return c.mesh.flatMap(t=>t.polygon.map(p=>[c.cx+p[0],c.cy+p[1]]));
 const a=c.angle*Math.PI/180;return (c.clip??[[c.rect[0],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]+c.rect[3]],[c.rect[0],c.rect[1]+c.rect[3]]]).map(([sx,sy])=>{const p=rotate([c.x+(sx-c.rect[0])/c.rect[2]*c.w,c.y+(sy-c.rect[1])/c.rect[3]*c.h],a);return[c.cx+p[0],c.cy+p[1]];});
}
function sourceMaskContains(c,p){return !c.mask?.components||c.mask.components.some(([x,y,w,h])=>p[0]>=x&&p[0]<x+w&&p[1]>=y&&p[1]<y+h);}
export function sourcePointAt(c,x,y){
 if(c.mesh){const p=[x-c.cx,y-c.cy];for(const t of c.mesh){const signs=t.dst.map((a,i)=>cross(a,t.dst[(i+1)%3],p));if(signs.every(v=>v>=-1e-6)||signs.every(v=>v<=1e-6)){const source=transform(affine(t.dst,t.src),p);return sourceMaskContains(c,source)?source:null;}}return null;}
 const p=rotate([x-c.cx,y-c.cy],-c.angle*Math.PI/180),u=(p[0]-c.x)/c.w,v=(p[1]-c.y)/c.h;if(u<0||v<0||u>=1||v>=1)return null;const source=[c.rect[0]+u*c.rect[2],c.rect[1]+v*c.rect[3]];return sourceMaskContains(c,source)?source:null;
}

export function barycentric(triangle,p){const [a,b,c]=triangle,d=cross(a,b,c),w1=cross(a,p,c)/d,w2=cross(a,b,p)/d;return[1-w1-w2,w1,w2];}
export function sourcePointWorld(c,p){if(!sourceMaskContains(c,p))return null;if(c.mesh){for(const t of c.mesh){const w=barycentric(t.src,p);if(w.every(x=>x>=-1e-6))return transform(t.matrix,p).map((v,i)=>v+(i?c.cy:c.cx));}return null;}const r=c.angle*Math.PI/180,pt=rotate([c.x+(p[0]-c.rect[0])/c.rect[2]*c.w,c.y+(p[1]-c.rect[1])/c.rect[3]*c.h],r);return[c.cx+pt[0],c.cy+pt[1]];}
export function rasterPolygon(poly){const center=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);return poly.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],d=Math.hypot(dx,dy)||1;return[p[0]+dx/d*.075,p[1]+dy/d*.075];});}
