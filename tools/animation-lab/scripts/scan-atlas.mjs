import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';
function hull(points){points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of points.toReversed()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return [...lower.slice(0,-1),...upper.slice(0,-1)];}
// Exact ownership masks are a union of convex rectangles. The optional contour
// loops are for union/even-odd canvas clips; do not pass a concave/disconnected
// loop to a mesh routine that only returns one polygon after triangle clipping.
function rectangleRuns(owner,id,w,h,rect){
 const result=[],active=new Map(),[rx,ry,rw,rh]=rect;
 for(let y=ry;y<ry+rh;y++){
  const runs=new Set();for(let x=rx;x<rx+rw;){if(owner[y*w+x]!==id){x++;continue;}const start=x;while(x<rx+rw&&owner[y*w+x]===id)x++;const key=start+':'+x;runs.add(key);if(active.has(key))active.get(key)[3]++;else active.set(key,[start,y,x-start,1]);}
  for(const [key,box] of active)if(!runs.has(key)){result.push(box);active.delete(key);}
 }return [...result,...active.values()];
}
function contourLoops(owner,id,w,rect){
 const [rx,ry,rw,rh]=rect,stride=w+1,edges=new Map(),key=(x,y)=>y*stride+x;
 const add=(x,y,ex,ey)=>{const k=key(x,y),v=edges.get(k)??[];v.push(key(ex,ey));edges.set(k,v);};
 const same=(x,y)=>x>=0&&x<w&&y>=0&&owner[y*w+x]===id;
 for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++)if(same(x,y)){
  if(!same(x,y-1))add(x,y,x+1,y);if(!same(x+1,y))add(x+1,y,x+1,y+1);
  if(!same(x,y+1))add(x+1,y+1,x,y+1);if(!same(x-1,y))add(x,y+1,x,y);
 }
 const point=k=>[k%stride,Math.floor(k/stride)],direction=(a,b)=>{const [x,y]=point(a),[ex,ey]=point(b);return ex>x?0:ey>y?1:ex<x?2:3;},loops=[];
 while(edges.size){const start=edges.keys().next().value,loop=[];let k=start,incoming=null;
  do{loop.push(point(k));const choices=edges.get(k);if(!choices?.length)throw Error('Source mask contour is open');let pick=0;
   if(incoming!==null&&choices.length>1){const rank=turn=>turn===1?0:turn===0?1:turn===3?2:3;pick=choices.reduce((best,c,i)=>rank((direction(k,c)-incoming+4)%4)<rank((direction(k,choices[best])-incoming+4)%4)?i:best,0);}
   const next=choices.splice(pick,1)[0];if(!choices.length)edges.delete(k);incoming=direction(k,next);k=next;
  }while(k!==start);
  // Remove only collinear points. Approximate simplification can accidentally
  // admit an adjacent component or trim antialiased source pixels.
  const simple=loop.filter((p,i)=>{const a=loop[(i+loop.length-1)%loop.length],b=loop[(i+1)%loop.length];return(a[0]-p[0])*(b[1]-p[1])!==(a[1]-p[1])*(b[0]-p[0]);});if(simple.length>=3)loops.push(simple);
 }return loops;
}
function exactMasks(tiles,w,h,padding){
 const owner=new Int16Array(w*h),distance=new Uint8Array(w*h).fill(255),queue=new Int32Array(w*h);let head=0,tail=0;
 tiles.forEach((t,index)=>{for(const p of t.members){owner[p]=index+1;distance[p]=0;}});
 const sourceOwner=owner.slice();
 // All component cores are reserved before expanding borders. A multi-source
 // Chebyshev-distance flood admits the existing 3px feather/padding envelope,
 // but never steals a pixel from another measured component.
 for(let p=0;p<owner.length;p++)if(owner[p]){const x=p%w,y=Math.floor(p/w);if(x===0||y===0||x===w-1||y===h-1||owner[p-1]!==owner[p]||owner[p+1]!==owner[p]||owner[p-w]!==owner[p]||owner[p+w]!==owner[p])queue[tail++]=p;}
 while(head<tail){const p=queue[head++],d=distance[p];if(d>=padding)continue;const x=p%w,y=Math.floor(p/w);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy||x+dx<0||x+dx>=w||y+dy<0||y+dy>=h)continue;const q=(y+dy)*w+x+dx;if(distance[q]!==255)continue;owner[q]=owner[p];distance[q]=d+1;queue[tail++]=q;}
 }
 const inside=(poly,x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;};
 return tiles.map((t,index)=>{
  const id=index+1,components=rectangleRuns(owner,id,w,h,t.rect),contours=contourLoops(owner,id,w,t.rect),[x,y,rw,rh]=t.rect;let legacyForeign=0,foreignCore=0,preserved=0;
  for(const p of t.members)if(owner[p]===id)preserved++;
  for(let sy=y;sy<y+rh;sy++)for(let sx=x;sx<x+rw;sx++){const p=sy*w+sx,foreign=sourceOwner[p];if(foreign&&foreign!==id){if(inside(t.clip,sx+.5,sy+.5))legacyForeign++;if(owner[p]===id)foreignCore++;}}
  return {schemaVersion:1,kind:'component-pixel-union',coordinateSpace:'atlas-pixels',components,contours,fillRule:'evenodd',edgePadding:padding,sourceAlphaPreserved:true,coreAlphaThreshold:24,qa:{preservedCorePixels:preserved,foreignCorePixels:foreignCore,foreignCorePixelsInLegacyClip:legacyForeign},limitations:['Pixel ownership is determined from alpha connectivity, not anatomical identity.','Low-alpha pixels within the padding envelope use nearest component ownership; ties are assigned deterministically.','Detached details beyond the padding envelope require explicit source registration.']};
 });
}
// Measure source alpha regions. Never change source pixels or slice anatomy.
// Default output preserves the old convex clip contract; precision is opt-in.
export function scanPixels({w,h,pixels},{precision=false,tileCount=16,rows=4,padding=3}={}){
 if(!Number.isInteger(tileCount)||tileCount<1||tileCount>32767||!Number.isInteger(rows)||rows<1||tileCount%rows||!Number.isInteger(padding)||padding<0||padding>10)throw Error('Invalid atlas scan options');
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),regions=[];
 for(let p=0;p<w*h;p++){
  if(seen[p]||pixels[p*4+3]<24)continue;
  let a=0,b=1,minX=w,minY=h,maxX=0,maxY=0,sx=0,sy=0;queue[0]=p;seen[p]=1;
  while(a<b){const i=queue[a++],x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);sx+=x;sy+=y;
   for(const n of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(n>=0&&!seen[n]&&pixels[n*4+3]>=24){seen[n]=1;queue[b++]=n;}
  }
  if(b>100){const scanRows=new Map();for(let k=0;k<b;k++){const x=queue[k]%w,y=Math.floor(queue[k]/w),r=scanRows.get(y)??[x,x];r[0]=Math.min(r[0],x);r[1]=Math.max(r[1],x);scanRows.set(y,r);}const clip=hull([...scanRows].flatMap(([y,[l,r]])=>[[l-padding,y-padding],[r+padding,y-padding],[l-padding,y+padding],[r+padding,y+padding]]));regions.push({area:b,clip,cx:sx/b,cy:sy/b,rect:[Math.max(0,minX-padding),Math.max(0,minY-padding),Math.min(w-1,maxX+padding)-Math.max(0,minX-padding)+1,Math.min(h-1,maxY+padding)-Math.max(0,minY-padding)+1],...precision?{members:queue.slice(0,b)}:{}});}
 }
 // Generated parts occupy uneven gutters: identify whole connected regions,
 // then register four rows, rather than cutting at equal cell boundaries.
 const largest=regions.sort((a,b)=>b.area-a.area).slice(0,tileCount).sort((a,b)=>a.cy-b.cy),cols=tileCount/rows;
 const tiles=[];for(let row=0;row<rows;row++)tiles.push(...largest.slice(row*cols,row*cols+cols).sort((a,b)=>a.cx-b.cx));
 if(tiles.length!==tileCount||tiles.some(x=>!x))throw Error('Missing independent source part');
 const masks=precision?exactMasks(tiles,w,h,padding):null;
 return {width:w,height:h,transparent:pixels.some((v,i)=>i%4===3&&v===0),tiles:tiles.map((t,i)=>({rect:t.rect,clip:t.clip,pivot:[.08,.5],distal:[.92,.5],alphaArea:t.area,...precision?{mask:masks[i]}:{}})),qa:{sourceRegions:'measured-alpha',anatomy:'pending',pivots:'editable-estimates',visual:'pending',...precision?{mask:'component-pixel-union',legacyClip:'retained-convex-broad-phase-not-precise',consumerRequirement:'Use mask.components as a union of convex rectangles; concave contours require a multi-polygon aware clipper.'}:{}}};
}
export function scanAtlas(file,options={}){return scanPixels(png(file),options);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href&&process.argv[2])console.log(JSON.stringify(scanAtlas(process.argv[2],{precision:process.argv.includes('--precision')}),null,2));
