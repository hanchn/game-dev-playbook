import {commands as productionCommands,frameFor as reviewFrameFor,maskedSource as reviewMaskedSource} from './skin-renderer.mjs';
import {warpSkinPoint,affine,clipPolygon,partitionSkinLayer,transform,rasterPolygon as reviewRasterPolygon} from './human-soft-skin.mjs';
// Every async preview operation belongs to one UI generation. Returning to the
// start, seeking, or changing settings must reject even already queued replies.
export function createEquineReviewEpoch(){
 let generation=0;
 return Object.freeze({capture:()=>generation,invalidate:()=>++generation,accepts:token=>token===generation});
}
// Experimental, source-locked equine neck mapping. Not enabled in production.
// Normal distances are preserved; only the centerline follows a curved path.
const projectionCaches=new Map(),geometryCaches=new Map(),layerCaches=new Map(),normalizedProjectionCaches=new Map();
function boundedCache(cache,key,create){if(cache.has(key))return cache.get(key);const value=create();cache.set(key,value);if(cache.size>8)cache.delete(cache.keys().next().value);return value;}
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,s)=>[a[0]*s,a[1]*s],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1)),normal=a=>[-a[1],a[0]],rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
function hermite(p0,p1,m0,m1,t){const t2=t*t,t3=t2*t;return add(add(mul(p0,2*t3-3*t2+1),mul(m0,t3-2*t2+t)),add(mul(p1,-2*t3+3*t2),mul(m1,t3-t2)));}
function quadratic(p0,p1,p2,t){return add(add(mul(p0,(1-t)*(1-t)),mul(p1,2*(1-t)*t)),mul(p2,t*t));}
function quadraticDerivative(p0,p1,p2,t){return add(mul(sub(p1,p0),2*(1-t)),mul(sub(p2,p1),2*t));}
function derivative(p0,p1,m0,m1,t){return add(add(mul(p0,6*t*t-6*t),mul(m0,3*t*t-4*t+1)),add(mul(p1,-6*t*t+6*t),mul(m1,3*t*t-2*t)));}
export function createEquineNeckPath({template,nodes,landmarks,rootTangentStrength=.6,endTangentStrength=.6,rootOrientation='body',faceGuard={start:.56,end:.69},samples=128}){
 if(!template||!nodes?.head||!nodes?.neck||!nodes?.body||!landmarks||!['root','middle','join'].every(k=>Array.isArray(landmarks[k])&&landmarks[k].length===2&&landmarks[k].every(Number.isFinite)))throw Error('Equine neck requires current source template, nodes, and measured root/middle/join landmarks');
 if(![template.x,template.y,template.w,template.h,nodes.head.x,nodes.head.y,nodes.neck.x,nodes.neck.y,nodes.head.angle??0,nodes.body.angle??0].every(Number.isFinite)||template.w<=0||template.h<=0)throw Error('Invalid neck source or node coordinates');
 if(!Number.isInteger(samples)||samples<16||samples>1024||!Number.isFinite(faceGuard.start)||!Number.isFinite(faceGuard.end)||faceGuard.end<=faceGuard.start)throw Error('Invalid path sampling or face guard');
 if(rootOrientation==='neck'&&(!nodes.neck.end||![nodes.neck.end.x,nodes.neck.end.y].every(Number.isFinite)))throw Error('Neck root orientation requires its actual endpoint');
 if(!['body','neck'].includes(rootOrientation))throw Error('Invalid root orientation');
 if(![rootTangentStrength,endTangentStrength].every(v=>Number.isFinite(v)&&v>=0&&v<=2))throw Error('Invalid neck tangent strength');
 const local=uv=>[template.x+uv[0]*template.w,template.y+uv[1]*template.h],src=['root','middle','join'].map(k=>local(landmarks[k])),segments=[sub(src[1],src[0]),sub(src[2],src[1])],sourceAt=t=>quadratic(...src,t),sourceDerivative=t=>quadraticDerivative(...src,t),sourceTangent=t=>unit(sourceDerivative(t)),sourceTable=[{t:0,length:0}];let sourceLength=0,previous=src[0];for(let i=1;i<=samples;i++){const t=i/samples,p=sourceAt(t);sourceLength+=len(sub(p,previous));sourceTable.push({t,length:sourceLength});previous=p;}
 if(segments.some(s=>len(s)<1e-6)||sourceLength<1e-6)throw Error('Degenerate neck centerline');
 const angle=(nodes.head.angle??0)*Math.PI/180,bodyAngle=(nodes.body.angle??0)*Math.PI/180,rigid=p=>add([nodes.head.x,nodes.head.y],rotate(p,angle)),root=[nodes.neck.x,nodes.neck.y],join=rigid(src[2]),distance=len(sub(join,root)),rootDirection=rootOrientation==='neck'?unit(sub([nodes.neck.end.x,nodes.neck.end.y],root)):rotate(unit(segments[0]),bodyAngle),rootRotation=Math.atan2(rootDirection[1],rootDirection[0])-Math.atan2(segments[0][1],segments[0][0]),m0=mul(rootDirection,distance*rootTangentStrength),m1=mul(rotate(unit(segments[1]),angle),distance*endTangentStrength);
 const table=[{t:0,length:0}],arcPoint=t=>hermite(root,join,m0,m1,t);let last=root,worldLength=0;for(let i=1;i<=samples;i++){const t=i/samples,p=arcPoint(t);worldLength+=len(sub(p,last));table.push({t,length:worldLength});last=p;}
 const arcParameter=s=>{const target=clamp(s)*worldLength;let low=1,high=table.length-1;while(low<high){const mid=(low+high)>>1;if(table[mid].length<target)low=mid+1;else high=mid;}const i=low,a=table[i-1],b=table[i];return a.t+(b.t-a.t)*(target-a.length)/(b.length-a.length||1);};
 const projectionCache=boundedCache(projectionCaches,JSON.stringify([template.x,template.y,template.w,template.h,landmarks,samples]),()=>new Map());
 const project=p=>{const cacheKey=p.join(',');if(projectionCache.has(cacheKey))return projectionCache.get(cacheKey);let bestT=0,bestError=Infinity;for(let i=0;i<=32;i++){const t=i/32,error=len(sub(p,sourceAt(t)));if(error<bestError){bestT=t;bestError=error;}}const dd=mul(add(sub(src[2],src[1]),sub(src[0],src[1])),2);for(let i=0;i<8;i++){const c=sourceAt(bestT),d=sourceDerivative(bestT),den=dot(d,d)+dot(sub(c,p),dd);if(Math.abs(den)<1e-10)break;const next=clamp(bestT-dot(sub(c,p),d)/den);if(Math.abs(next-bestT)<1e-12){bestT=next;break;}bestT=next;}const center=sourceAt(bestT),direction=sourceTangent(bestT),d=dot(sub(p,center),normal(direction)),index=Math.min(samples-1,Math.floor(bestT*samples)),q=(bestT-sourceTable[index].t)*samples,sourceDistance=sourceTable[index].length+(sourceTable[index+1].length-sourceTable[index].length)*q,along=dot(sub(p,center),direction);let s=sourceDistance/sourceLength;if(bestT<1e-8&&along<0)s=along/sourceLength;if(bestT>1-1e-8&&along>0)s=1+along/sourceLength;const result=Object.freeze({s,d,t:bestT,normal:Object.freeze(normal(direction))});if(projectionCache.size<20000)projectionCache.set(cacheKey,result);return result;};
 // Bone lengths are invariant, but endpoint hypot() roundoff changes the
 // local uniform source scale by ~1e-14 between arbitrary phases. Source UV
 // projection is mathematically independent of that uniform scale. Cache its
 // dimensionless result, without rounding any coordinate or pose.
 const uniform=template.rect&&Math.abs(template.w/template.h-template.rect[2]/template.rect[3])<1e-12,normalized=uniform?boundedCache(normalizedProjectionCaches,JSON.stringify([template.rect[2],template.rect[3],landmarks,samples]),()=>new Map()):null;
 const projectUv=uv=>{if(!normalized)return project(local(uv));const key=uv.join(',');let saved=normalized.get(key);if(!saved){const exact=project(local(uv));saved=Object.freeze({s:exact.s,t:exact.t,normal:exact.normal,dPerWidth:exact.d/template.w});if(normalized.size<20000)normalized.set(key,saved);}return{s:saved.s,t:saved.t,normal:saved.normal,d:saved.dPerWidth*template.w};};
 const map=uv=>{const p=local(uv),projection=projectUv(uv),s=projection.s;if(s>=1)return rigid(p);if(s<=0)return add(root,rotate(sub(p,src[0]),rootRotation));const t=arcParameter(s),center=arcPoint(t),n=normal(unit(derivative(root,join,m0,m1,t))),curved=add(center,mul(n,projection.d)),guard=smooth((uv[0]-faceGuard.start)/(faceGuard.end-faceGuard.start));return add(mul(curved,1-guard),mul(rigid(p),guard));};
 return {map,rigid,rigidUv:uv=>rigid(local(uv)),sourceLocalToUv:p=>[(p[0]-template.x)/template.w,(p[1]-template.y)/template.h],project,sourceAt,sourceTangent,sourceCenterline:src,worldRoot:root,worldJoin:join,sourceLength,worldLength,centerlineScale:worldLength/sourceLength,arcPoint,tangent:t=>unit(derivative(root,join,m0,m1,t)),limitations:['Experimental source centerline landmarks require visual review.','Face guard blends only the source front boundary; no source pixels, normal widths, or skull scale are changed.','Longitudinal centerline stretch is reported explicitly, not hidden.']};
}

// Build an isolated Canvas/SVG command candidate. Caller must explicitly pass
// it to drawCanvas; no production asset/skin/module is changed by this function.
export function buildEquineNeckCommandCandidate(commandList,nodes,{landmarks,layerSplit,columns=40,rows=40,...pathOptions}){
 const head=commandList.find(c=>c.id==='head'),neck=commandList.find(c=>c.id==='neck');
 if(!head?.bind?.template||!neck||!layerSplit)throw Error('Candidate requires existing continuous head/neck commands and source layer split');
 if(![columns,rows].every(x=>Number.isInteger(x)&&x>=2&&x<=96))throw Error('Invalid candidate mesh density');
 const template=head.bind.template,mapper=createEquineNeckPath({template,nodes,landmarks,...pathOptions}),[rx,ry,rw,rh]=template.rect,mesh=[];
 // Source tessellation, cap planes, and ownership are pose-independent.
 // Keep the original equations and coordinates; cache only these immutable
 // computations, then map and rasterize every actual pose afresh.
 const uniformGeometry=Math.abs(template.w/template.h-template.rect[2]/template.rect[3])<1e-12,geometryKey=JSON.stringify([template.rect,template.clip,...(uniformGeometry?[]:[template.x,template.y,template.w,template.h]),landmarks,columns,rows,pathOptions.samples??128]);
 const geometry=boundedCache(geometryCaches,geometryKey,()=>{const geometry=[];
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const points=[[i/columns,j/rows],[(i+1)/columns,j/rows],[(i+1)/columns,(j+1)/rows],[i/columns,(j+1)/rows]];
  for(const indices of[[0,1,2],[0,2,3]]){
   const uv=indices.map(k=>points[k]),original=uv.map(p=>[rx+p[0]*rw,ry+p[1]*rh]);let pieces=[original];
   // The source root/junction caps separate rigid material from curved
   // material. A triangle crossing this derivative boundary cannot represent
   // both maps accurately; split at the exact source plane instead of hiding
   // error by arbitrarily multiplying all rows.
   for(const [endpoint,tangent]of [[mapper.sourceCenterline[0],mapper.sourceTangent(0)],[mapper.sourceCenterline[2],mapper.sourceTangent(1)]]){
    const distance=p=>dot(sub([template.x+(p[0]-rx)/rw*template.w,template.y+(p[1]-ry)/rh*template.h],endpoint),tangent),next=[];
    for(const polygon of pieces)for(const sign of[-1,1]){const cut=[];for(let k=0;k<polygon.length;k++){const p=polygon[k],q=polygon[(k+1)%polygon.length],dp=distance(p)*sign,dq=distance(q)*sign;if(dp>=-1e-9)cut.push(p);if((dp<0)!==(dq<0)){const f=dp/(dp-dq);cut.push(add(p,mul(sub(q,p),f)));}}if(cut.length>=3)next.push(cut);}pieces=next;
   }
   for(const poly of pieces)for(let k=1;k<poly.length-1;k++){const src=[poly[0],poly[k],poly[k+1]];if(Math.abs((src[1][0]-src[0][0])*(src[2][1]-src[0][1])-(src[1][1]-src[0][1])*(src[2][0]-src[0][0]))<1e-9)continue;const clipped=clipPolygon(template.clip,src);if(clipped.length<3)continue;geometry.push({src,clipped});}
  }
 }
 return geometry;});
 // Cache source-layer clipping, but retain each original triangle's affine
 // map. Cutting in source space and re-warping cut vertices would change the
 // rendering equations; cut vertices must use the parent's existing affine.
 const layers=boundedCache(layerCaches,geometryKey+JSON.stringify(layerSplit),()=>{
  const result={head:[],neck:[]},[rx,ry,rw,rh]=template.rect;
  for(const side of ['head','neck']){const threshold=layerSplit.start+(side==='head'?(layerSplit.overlap??0):0),sign=side==='head'?-1:1,distance=([x,y])=>sign*((y-ry)/rh-threshold-(layerSplit.slopeU??0)*(x-rx)/rw);
   for(const [parent,t]of geometry.entries()){const poly=[];for(let i=0;i<3;i++){const p=t.src[i],q=t.src[(i+1)%3],dp=distance(p),dq=distance(q);if(dp>=-1e-9)poly.push(p);if((dp<0)!==(dq<0)){const f=dp/(dp-dq);poly.push([p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f]);}}
    for(let i=1;i<poly.length-1;i++){const src=[poly[0],poly[i],poly[i+1]],cross=(src[1][0]-src[0][0])*(src[2][1]-src[0][1])-(src[1][1]-src[0][1])*(src[2][0]-src[0][0]);if(Math.abs(cross)<1e-9)continue;const clipped=clipPolygon(template.clip,src);if(clipped.length>=3)result[side].push({parent,src,clipped});}
   }
  }return result;
 });
 const vertices=new Map(),point=p=>{const key=p.join(',');if(vertices.has(key))return vertices.get(key);const value=mapper.map([(p[0]-rx)/rw,(p[1]-ry)/rh]);vertices.set(key,value);return value;},matrices=geometry.map(t=>affine(t.src,t.src.map(point))),layerMesh=side=>layers[side].map(t=>{const matrix=matrices[t.parent];return{src:t.src.map(p=>[...p]),dst:t.src.map(p=>transform(matrix,p)),matrix,polygon:t.clipped.map(p=>transform(matrix,p))};});
 const full={...head,cx:0,cy:0,angle:0,bind:undefined},list=commandList.map(c=>c===neck?{...full,mesh:layerMesh('neck'),id:'neck',opacity:neck.opacity}:c===head?{...full,mesh:layerMesh('head')}:c);
 return {list,mapper,metrics:{sourceLength:mapper.sourceLength,worldLength:mapper.worldLength,centerlineScale:mapper.centerlineScale,triangles:list.filter(c=>['head','neck'].includes(c.id)).reduce((s,c)=>s+c.mesh.length,0)}};
}

// Diagnostic-only acceleration of the *existing* horse24 production equations.
// No production module or asset is changed. Adaptive .2px rows and all triangle
// coordinates are retained; source clipping and repeated identical warp points
// are cached. This is deliberately guarded to the calibration source version.
const reviewAssets=new WeakMap(),sourceClipCaches=new WeakMap(),reviewLayerCaches=new WeakMap();
export function buildEquineReviewBaseCommands(asset,state,skin){
 if(asset.id!=='horse-side-v24'||!asset.rendering.continuousNeck||!asset.rendering.neckUnderBody||!skin.tiles[1].neckMask?.layerSplit)throw Error('Review acceleration requires horse24 continuous-neck source');
 let rigidAsset=reviewAssets.get(asset);if(!rigidAsset){rigidAsset={...asset,rendering:{...asset.rendering,continuousNeck:false}};reviewAssets.set(asset,rigidAsset);}
 const cs=productionCommands(rigidAsset,state,skin),head=cs.find(c=>c.id==='head'),neck=cs.find(c=>c.id==='neck'),tile=skin.tiles[1],n=state.nodes.head,na=n.end?Math.atan2(n.end.y-n.y,n.end.x-n.x):(n.angle??0)*Math.PI/180,localAngle=head.angle*Math.PI/180-na,origin=[n.x,n.y],r=head.rect,context={rootAnchor:[head.x+tile.neckRoot[0]*head.w,head.y+tile.neckRoot[1]*head.h],neckMask:tile.neckMask},points=new Map(),mesh=[];
 let clipCache=sourceClipCaches.get(head.clip);if(!clipCache){clipCache=new Map();sourceClipCaches.set(head.clip,clipCache);}
 const sourceClip=src=>{const key=src.flat().join(',');if(clipCache.has(key))return clipCache.get(key);const value=clipPolygon(head.clip,src);if(clipCache.size<30000)clipCache.set(key,value);return value;};
 const point=s=>{const key=s.join(',');if(points.has(key))return points.get(key);const p=warpSkinPoint('head-neck','head',rotate([head.x+(s[0]-r[0])/r[2]*head.w,head.y+(s[1]-r[1])/r[3]*head.h],localAngle),(s[1]-r[1])/r[3],state.nodes,{...context,u:(s[0]-r[0])/r[2]}),value=[p[0]-origin[0],p[1]-origin[1]];points.set(key,value);return value;};
 const xs=[...new Set([...Array.from({length:33},(_,i)=>i/32),.25,tile.neckMask.maxU-tile.neckMask.fade,tile.neckMask.maxU,.75])].sort((a,b)=>a-b),ys=[...new Set([0,1,tile.neckMask.start,.58,.60,.65,.70,.75,.80,.85,.90,.95])].sort((a,b)=>a-b);
 const addRow=(sy,ey,depth=0)=>{const triangles=[];for(let i=0;i<xs.length-1;i++){const sx=r[0]+xs[i]*r[2],ex=r[0]+xs[i+1]*r[2];triangles.push([[sx,sy],[ex,sy],[ex,ey]],[[sx,sy],[ex,ey],[sx,ey]]);}
  if(depth<7&&triangles.some(src=>{const dst=src.map(point),matrix=affine(src,dst),samples=src.flatMap((p,i)=>{const q=src[(i+1)%3];return Math.abs(p[0]-q[0])<1e-8?[[(p[0]+q[0])/2,(p[1]+q[1])/2]]:[];});return samples.some(p=>{const exact=point(p),mapped=transform(matrix,p);return Math.hypot(exact[0]-mapped[0],exact[1]-mapped[1])>.2;});})){const mid=(sy+ey)/2;addRow(sy,mid,depth+1);addRow(mid,ey,depth+1);return;}
  for(const src of triangles){const clipped=sourceClip(src);if(clipped.length<3)continue;const dst=src.map(point),matrix=affine(src,dst);mesh.push({src,dst,matrix,polygon:clipped.map(p=>transform(matrix,p))});}
 };
 for(let j=0;j<ys.length-1;j++)addRow(r[1]+ys[j]*r[3],r[1]+ys[j+1]*r[3]);
 const options={start:0,end:1,columns:32,rows:1,cutsX:[.25,tile.neckMask.maxU-tile.neckMask.fade,tile.neckMask.maxU,.75],cutsY:[tile.neckMask.start,.58,.60,.65,.70,.75,.80,.85,.90,.95],...context,refineTolerance:.2},full={...head,cx:origin[0]+head.cx-n.x,cy:origin[1]+head.cy-n.y,angle:0,mesh,bind:{kind:'head-neck',id:'head',context,template:{rect:head.rect,clip:head.clip,x:head.x,y:head.y,w:head.w,h:head.h,angle:localAngle*180/Math.PI},options}};
 cs[cs.indexOf(neck)]={...cachedReviewLayer(full,tile.neckMask.layerSplit,'neck'),id:'neck',pickId:'neck',opacity:neck.opacity,selected:neck.selected};cs[cs.indexOf(head)]=cachedReviewLayer(full,tile.neckMask.layerSplit,'head');return cs;
}

function cachedReviewLayer(c,boundary,side){
 let cache=reviewLayerCaches.get(c.clip);if(!cache){cache=new Map();reviewLayerCaches.set(c.clip,cache);}const [rx,ry,rw,rh]=c.rect,threshold=boundary.start+(side==='head'?(boundary.overlap??0):0),sign=side==='head'?-1:1,distance=([x,y])=>sign*((y-ry)/rh-threshold-(boundary.slopeU??0)*(x-rx)/rw),mesh=[],prefix=JSON.stringify([boundary,side,c.rect]);
 for(const t of c.mesh){const key=prefix+t.src.flat().join(',');let pieces=cache.get(key);if(!pieces){pieces=[];const poly=[];for(let i=0;i<3;i++){const p=t.src[i],q=t.src[(i+1)%3],dp=distance(p),dq=distance(q);if(dp>=-1e-9)poly.push(p);if((dp<0)!==(dq<0)){const f=dp/(dp-dq);poly.push([p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f]);}}for(let i=1;i<poly.length-1;i++){const src=[poly[0],poly[i],poly[i+1]],cross=(src[1][0]-src[0][0])*(src[2][1]-src[0][1])-(src[1][1]-src[0][1])*(src[2][0]-src[0][0]);if(Math.abs(cross)<1e-9)continue;const clipped=clipPolygon(c.clip,src);if(clipped.length>=3)pieces.push({src,clipped});}if(cache.size<60000)cache.set(key,pieces);}for(const {src,clipped}of pieces)mesh.push({src:src.map(p=>[...p]),dst:src.map(p=>transform(t.matrix,p)),matrix:t.matrix,polygon:clipped.map(p=>transform(t.matrix,p))});}
 return{...c,mesh};
}

// Optional diagnostic WebGL batching. Uses the same immutable masked source
// bitmaps and every existing affine triangle; no lower-resolution mesh, frame
// skipping, landmark approximation, or asset substitution. Raster edge AA may
// differ from Canvas2D and must be audited before acceptance.
export function createEquineReviewWebGL(canvas,maskContext,{skin,image,maskCanvasFactory}){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!gl)throw Error('Diagnostic WebGL unavailable');
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;},program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;uniform vec2 size;varying vec2 textureUV;void main(){gl_Position=vec4(position.x/size.x*2.0-1.0,1.0-position.y/size.y*2.0,0.0,1.0);textureUV=uv;}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision highp float;varying vec2 textureUV;uniform sampler2D image;uniform float opacity;void main(){gl_FragColor=texture2D(image,textureUV)*opacity;}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv'),opacity=gl.getUniformLocation(program,'opacity'),textures=new WeakMap();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);gl.uniform2f(gl.getUniformLocation(program,'size'),canvas.width,canvas.height);gl.uniform1i(gl.getUniformLocation(program,'image'),0);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 let staging=new Float32Array(65536),allocated=0;const packedTextures=new Map();
 const texture=(bitmap)=>{if(textures.has(bitmap))return textures.get(bitmap);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);textures.set(bitmap,t);return t;};
 return{gl,canvas,prepareSources(list){for(const c of list){const original=c.source?image.sourceImages?.[c.source]:image;if(!original)throw Error('Missing diagnostic source '+c.source);const cached=reviewMaskedSource(maskContext,original,c,{maskCanvasFactory});packedTextures.set(JSON.stringify([c.source??'primary',c.rect,!!c.mask?.components]),texture(cached?.image??original));}},drawPacked(packed,{clear=true,background=[0,0,0,0],scissor=null}={}){if(gl.isContextLost())throw Error('Diagnostic WebGL context lost');gl.viewport(0,0,canvas.width,canvas.height);if(clear){gl.disable(gl.SCISSOR_TEST);gl.clearColor(...background);gl.clear(gl.COLOR_BUFFER_BIT);}if(scissor){gl.enable(gl.SCISSOR_TEST);gl.scissor(...scissor);}else gl.disable(gl.SCISSOR_TEST);gl.bufferData(gl.ARRAY_BUFFER,packed.vertices,gl.DYNAMIC_DRAW);for(const b of packed.batches){const tex=packedTextures.get(b.key);if(!tex)throw Error('Unregistered worker texture '+b.key);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(opacity,b.opacity);gl.drawArrays(gl.TRIANGLES,b.first,b.count);}return{drawCalls:packed.batches.length,triangles:packed.triangles,maxVertexRoundingRigPx:packed.maxVertexRoundingRigPx};},draw(asset,list,{offsetX=0,clear=true,background=[0,0,0,0],scissor=null}={}){if(gl.isContextLost())throw Error('Diagnostic WebGL context lost');const timings={sourceTexture:0,vertices:0,submit:0},frame=reviewFrameFor(asset),scale=asset.design.size*frame.scale;gl.viewport(0,0,canvas.width,canvas.height);if(clear){gl.disable(gl.SCISSOR_TEST);gl.clearColor(...background);gl.clear(gl.COLOR_BUFFER_BIT);}if(scissor){gl.enable(gl.SCISSOR_TEST);gl.scissor(...scissor);}else gl.disable(gl.SCISSOR_TEST);let drawCalls=0,triangles=0,cursor=0,maxVertexRoundingRigPx=0;const batches=[];const write=values=>{maxVertexRoundingRigPx=Math.max(maxVertexRoundingRigPx,Math.hypot(Math.fround(values[0])-values[0],Math.fround(values[1])-values[1])/scale);if(cursor+4>staging.length){const grown=new Float32Array(staging.length*2);grown.set(staging);staging=grown;}staging[cursor++]=values[0];staging[cursor++]=values[1];staging[cursor++]=values[2];staging[cursor++]=values[3];};
  for(const c of list){if(!c.opacity)continue;const t0=performance.now(),original=c.source?image.sourceImages?.[c.source]:image;if(!original)throw Error('Missing diagnostic source '+c.source);const cached=reviewMaskedSource(maskContext,original,c,{maskCanvasFactory}),bitmap=cached?.image??original,rect=cached?.rect??[0,0,c.sourceWidth??skin.width,c.sourceHeight??skin.height],tex=texture(bitmap),t1=performance.now(),first=cursor/4,angle=c.angle*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
   const emit=(poly,mapSource)=>{const vertices=poly.map(p=>{const source=mapSource(p),rot=[p[0]*cos-p[1]*sin,p[0]*sin+p[1]*cos];return[frame.anchor[0]+offsetX+(c.cx+rot[0])*scale,frame.anchor[1]+(c.cy+rot[1])*scale,(source[0]-rect[0])/rect[2],(source[1]-rect[1])/rect[3]];});for(let i=1;i<vertices.length-1;i++){write(vertices[0]);write(vertices[i]);write(vertices[i+1]);triangles++;}};
   if(c.mesh){for(const t of c.mesh){const m=t.matrix,det=m[0]*m[3]-m[1]*m[2];if(Math.abs(det)<1e-15)continue;emit(reviewRasterPolygon(t.polygon),([x,y])=>[(m[3]*(x-m[4])-m[2]*(y-m[5]))/det,(-m[1]*(x-m[4])+m[0]*(y-m[5]))/det]);}}
   else{const poly=(c.clip??[[c.rect[0],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]+c.rect[3]],[c.rect[0],c.rect[1]+c.rect[3]]]).map(([x,y])=>[c.x+(x-c.rect[0])/c.rect[2]*c.w,c.y+(y-c.rect[1])/c.rect[3]*c.h]);emit(poly,([x,y])=>[c.rect[0]+(x-c.x)/c.w*c.rect[2],c.rect[1]+(y-c.y)/c.h*c.rect[3]]);}
   const t2=performance.now();batches.push({texture:tex,opacity:c.opacity,first,count:cursor/4-first});timings.sourceTexture+=t1-t0;timings.vertices+=t2-t1;drawCalls++;
  }const ts=performance.now();if(allocated<staging.byteLength){gl.bufferData(gl.ARRAY_BUFFER,staging.byteLength,gl.DYNAMIC_DRAW);allocated=staging.byteLength;}gl.bufferSubData(gl.ARRAY_BUFFER,0,staging.subarray(0,cursor));for(const batch of batches){gl.bindTexture(gl.TEXTURE_2D,batch.texture);gl.uniform1f(opacity,batch.opacity);gl.drawArrays(gl.TRIANGLES,batch.first,batch.count);}timings.submit=performance.now()-ts;return{drawCalls,triangles,maxVertexRoundingRigPx,timings};}};
}

// Transferable, full-resolution vertex preparation for diagnostic workers.
// The geometry and source UV equations are identical to draw(), with no pose
// interpolation, angle quantization, reduced mesh, or image resampling.
export function packEquineReviewVertices(asset,list,skin,{offsetX=0}={}){
 const frame=reviewFrameFor(asset),scale=asset.design.size*frame.scale,values=[],batches=[];let maxVertexRoundingRigPx=0;
 for(const c of list){if(!c.opacity)continue;const rect=c.mask?.components?c.rect:[0,0,c.sourceWidth??skin.width,c.sourceHeight??skin.height],first=values.length/4,angle=c.angle*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  const emit=(poly,mapSource)=>{const vertices=poly.map(p=>{const source=mapSource(p),rot=[p[0]*cos-p[1]*sin,p[0]*sin+p[1]*cos],v=[frame.anchor[0]+offsetX+(c.cx+rot[0])*scale,frame.anchor[1]+(c.cy+rot[1])*scale,(source[0]-rect[0])/rect[2],(source[1]-rect[1])/rect[3]];maxVertexRoundingRigPx=Math.max(maxVertexRoundingRigPx,Math.hypot(Math.fround(v[0])-v[0],Math.fround(v[1])-v[1])/scale);return v;});for(let i=1;i<vertices.length-1;i++)values.push(...vertices[0],...vertices[i],...vertices[i+1]);};
  if(c.mesh)for(const t of c.mesh){const m=t.matrix,det=m[0]*m[3]-m[1]*m[2];if(Math.abs(det)<1e-15)continue;emit(reviewRasterPolygon(t.polygon),([x,y])=>[(m[3]*(x-m[4])-m[2]*(y-m[5]))/det,(-m[1]*(x-m[4])+m[0]*(y-m[5]))/det]);}
  else emit((c.clip??[[c.rect[0],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]],[c.rect[0]+c.rect[2],c.rect[1]+c.rect[3]],[c.rect[0],c.rect[1]+c.rect[3]]]).map(([x,y])=>[c.x+(x-c.rect[0])/c.rect[2]*c.w,c.y+(y-c.rect[1])/c.rect[3]*c.h]),([x,y])=>[c.rect[0]+(x-c.x)/c.w*c.rect[2],c.rect[1]+(y-c.y)/c.h*c.rect[3]]);
  batches.push({id:c.id,key:JSON.stringify([c.source??'primary',c.rect,!!c.mask?.components]),opacity:c.opacity,first,count:values.length/4-first});
 }return{vertices:new Float32Array(values),batches,maxVertexRoundingRigPx,triangles:values.length/12};
}
