// Experimental, source-locked equine neck mapping. Not enabled in production.
// Normal distances are preserved; only the centerline follows a curved path.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,s)=>[a[0]*s,a[1]*s],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1)),normal=a=>[-a[1],a[0]],rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
function hermite(p0,p1,m0,m1,t){const t2=t*t,t3=t2*t;return add(add(mul(p0,2*t3-3*t2+1),mul(m0,t3-2*t2+t)),add(mul(p1,-2*t3+3*t2),mul(m1,t3-t2)));}
function quadratic(p0,p1,p2,t){return add(add(mul(p0,(1-t)*(1-t)),mul(p1,2*(1-t)*t)),mul(p2,t*t));}
function quadraticDerivative(p0,p1,p2,t){return add(mul(sub(p1,p0),2*(1-t)),mul(sub(p2,p1),2*t));}
function derivative(p0,p1,m0,m1,t){return add(add(mul(p0,6*t*t-6*t),mul(m0,3*t*t-4*t+1)),add(mul(p1,-6*t*t+6*t),mul(m1,3*t*t-2*t)));}
export function createEquineNeckPath({template,nodes,landmarks,rootTangentStrength=.6,endTangentStrength=.6,faceGuard={start:.56,end:.69},samples=128}){
 if(!template||!nodes?.head||!nodes?.neck||!nodes?.body||!landmarks||!['root','middle','join'].every(k=>Array.isArray(landmarks[k])&&landmarks[k].length===2&&landmarks[k].every(Number.isFinite)))throw Error('Equine neck requires current source template, nodes, and measured root/middle/join landmarks');
 if(![rootTangentStrength,endTangentStrength].every(v=>Number.isFinite(v)&&v>=0&&v<=2))throw Error('Invalid neck tangent strength');
 const local=uv=>[template.x+uv[0]*template.w,template.y+uv[1]*template.h],src=['root','middle','join'].map(k=>local(landmarks[k])),segments=[sub(src[1],src[0]),sub(src[2],src[1])],lengths=segments.map(len),sourceLength=lengths[0]+lengths[1];
 if(sourceLength<1e-6)throw Error('Degenerate neck centerline');
 const angle=(nodes.head.angle??0)*Math.PI/180,bodyAngle=(nodes.body.angle??0)*Math.PI/180,rigid=p=>add([nodes.head.x,nodes.head.y],rotate(p,angle)),root=[nodes.neck.x,nodes.neck.y],join=rigid(src[2]),distance=len(sub(join,root)),m0=mul(rotate(unit(segments[0]),bodyAngle),distance*rootTangentStrength),m1=mul(rotate(unit(segments[1]),angle),distance*endTangentStrength);
 const table=[{t:0,length:0}],arcPoint=t=>hermite(root,join,m0,m1,t);let last=root,worldLength=0;for(let i=1;i<=samples;i++){const t=i/samples,p=arcPoint(t);worldLength+=len(sub(p,last));table.push({t,length:worldLength});last=p;}
 const arcParameter=s=>{const target=clamp(s)*worldLength;let i=1;while(i<table.length-1&&table[i].length<target)i++;const a=table[i-1],b=table[i];return a.t+(b.t-a.t)*(target-a.length)/(b.length-a.length||1);};
 const project=p=>{let best;for(let i=0;i<2;i++){const direction=unit(segments[i]),raw=dot(sub(p,src[i]),direction)/lengths[i],q=clamp(raw),center=add(src[i],mul(segments[i],q)),error=len(sub(p,center));if(!best||error<best.error){const sourceDistance=(i?lengths[0]:0)+raw*lengths[i];best={error,s:sourceDistance/sourceLength,d:dot(sub(p,add(src[i],mul(segments[i],raw))),normal(direction)),normal:normal(direction)};}}return best;};
 const map=uv=>{const p=local(uv),projection=project(p),s=projection.s;if(s>=1)return rigid(p);if(s<=0)return add(root,rotate(sub(p,src[0]),bodyAngle));const t=arcParameter(s),center=arcPoint(t),n=normal(unit(derivative(root,join,m0,m1,t))),curved=add(center,mul(n,projection.d)),guard=smooth((uv[0]-faceGuard.start)/(faceGuard.end-faceGuard.start));return add(mul(curved,1-guard),mul(rigid(p),guard));};
 return {map,rigid,rigidUv:uv=>rigid(local(uv)),sourceLocalToUv:p=>[(p[0]-template.x)/template.w,(p[1]-template.y)/template.h],project,sourceCenterline:src,worldRoot:root,worldJoin:join,sourceLength,worldLength,centerlineScale:worldLength/sourceLength,arcPoint,tangent:t=>unit(derivative(root,join,m0,m1,t)),limitations:['Experimental source centerline landmarks require visual review.','Face guard blends only the source front boundary; no source pixels, normal widths, or skull scale are changed.','Longitudinal centerline stretch is reported explicitly, not hidden.']};
}
