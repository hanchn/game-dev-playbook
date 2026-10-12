import {biomeAt} from './environment.js';
import {ChunkCache,seedHash} from './vendor/map-foundation.mjs';
export const W=1024,G=420,WORLD_VERSION='worm-routes-v3';
export function random(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function chunk(seed,index){
 const r=random(seedHash(`${seed}:${WORLD_VERSION}:routes:${index}`)),d=random(seedHash(`${seed}:decor:${index}`)),env=random(seedHash(`${seed}:environment:${index}`)),x=index*W;
 const upper=530,mid=640+Math.floor(r()*24),lower=754,join=250+Math.floor(r()*30),end=730+Math.floor(r()*35);
 const nodes=[{x,y:upper},{x:x+join,y:upper},{x:x+join,y:mid},{x:x+join,y:lower},{x:x+end,y:upper},{x:x+end,y:mid},{x:x+end,y:lower},{x:x+W,y:upper}];
 const paths=[[0,1],[1,4],[4,7],[1,2],[2,3],[2,5],[3,6],[4,5],[5,6],[6,7]].map(([a,b])=>({a:nodes[a],b:nodes[b],radius:43}));
 const mouths=[{x:x+170,radius:index===0?26:24+Math.floor(r()*23),large:false},{x:x+850,radius:index===0?45:24+Math.floor(r()*28),large:true}];
 for(const m of mouths){m.large=m.radius>=39;paths.push({a:{x:m.x,y:G-24},b:{x:m.x,y:upper},radius:Math.max(37,m.radius)})}
 const biome=biomeAt(index);const trees=[0,1].map(i=>{const h=index===0?[405,425][i]:310+Math.floor(env()*120),w=index===0?370:330+Math.floor(env()*100);return{x:x+(i?820:355)+(index?Math.floor(env()*45)-22:0),y:G,w,h,kind:index===0?'oak':(env()>.22?biome.tree:['oak','birch','maple'][Math.floor(env()*3)]),branchScale:index===0?1:.84+env()*.16}});
 const tiers=[['low-left',.07,.43,.65],['low-right',.57,.93,.65],['middle',.08,.43,.48],['high',.57,.93,.31]];
 const platforms=trees.flatMap((t,ti)=>tiers.map(([tier,a,b,y])=>({id:`${index}:branch:${ti}:${tier}`,treeIndex:ti,tier,x:t.x+(a-.5)*t.w,w:(b-a)*t.w*t.branchScale,y:t.y-t.h+y*t.h})));
 const rocks=index%3===1?[{x:x+505,y:upper+18,rx:27+Math.floor(env()*5),ry:22,kind:['moss','round','slate'][Math.floor(env()*3)]}]:[];
 const surfaceRocks=index===0?[]:[{id:`${index}:small-rock`,x:x+95,rx:24+env()*12,ry:12+env()*9,kind:['moss','round','slate'][Math.floor(env()*3)],small:true},{id:`${index}:big-rock`,x:x+565,rx:48+env()*24,ry:34+env()*18,kind:['moss','round','slate'][Math.floor(env()*3)],small:false}].map(o=>({...o,y:G-o.ry}));
 const props=[];if(index>0){const kinds=['boot','bottle','can','newspaper'],kind=kinds[(index-1)%4],sizes={boot:[205,170],bottle:[140,43],can:[108,55],newspaper:[150,36]},[w,h]=sizes[kind];props.push({id:`${index}:prop`,kind,x:x+370+env()*65,y:G,w,h,flutter:0});if(env()>.55){const k=kinds[Math.floor(env()*4)],[w,h]=sizes[k];props.push({id:`${index}:prop-extra`,kind:k,x:x+690,y:G,w,h,flutter:0})}}
 const diamonds=[...nodes.slice(1,7).map((n,i)=>({id:`${index}:junction:${i}`,x:n.x,y:n.y})),...[0,1,2].map(i=>({id:`${index}:upper:${i}`,x:x+370+i*105,y:upper})),...platforms.filter(p=>p.tier==='high'||p.tier==='low-right').map((p,i)=>({id:`${index}:air:${i}`,x:p.x+p.w/2,y:p.y-28}))];
 for(const gem of diamonds)if(rockAt([{rocks}],gem.x,gem.y,13))gem.x=x+620;
 const enemies=[{id:`${index}:chicken`,species:'chicken',x:x+620,y:G,from:x+425,to:x+930}];
 if(index>0)enemies.push({id:`${index}:centipede`,species:'centipede',x:x+530,y:mid+18,from:x+335,to:x+670});
 if(index>1)enemies.push({id:`${index}:snake`,species:'snake',x:x+650,y:lower+18,from:x+410,to:x+795});
 return{index,biome:biome.id,cx:index,cy:0,paths,entries:mouths.map(m=>m.x),mouths,trees,platforms,rocks,surfaceRocks,props,diamonds,enemies,difficulty:Math.min(4,Math.floor(index/3)),decor:Array.from({length:22},()=>({x:x+d()*W,y:G+35+d()*398,r:2+d()*6}))};
}
export class RouteWorld{constructor(seed){this.seed=seed;this.cache=new ChunkCache({chunk:cx=>chunk(seed,cx)},{maxChunks:5})}get(i){return this.cache.get(i,0)}retain(min,max){this.cache.retain({minX:min,maxX:max,minY:0,maxY:0},0)}}
export function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):0;return Math.hypot(x-a.x-dx*t,y-a.y-dy*t)}
export function tunnelAt(chunks,x,y,radius=12){return chunks.some(c=>c.paths.some(p=>segmentDistance(x,y,p.a,p.b)<=p.radius-radius))}
export function rockAt(chunks,x,y,radius=12){return chunks.some(c=>c.rocks.some(r=>Math.hypot((x-r.x)/(r.rx+radius),(y-r.y)/(r.ry+radius))<1))}
export function groundAt(chunks,x){let y=G;for(const c of chunks)for(const r of c.surfaceRocks??[])if(Math.abs(x-r.x)<r.rx){const top=r.y-r.ry*Math.sqrt(1-((x-r.x)/r.rx)**2);y=Math.min(y,top)}return y}
export function propPlatforms(chunks){return chunks.flatMap(c=>(c.props??[]).flatMap(p=>p.kind==='can'?[{id:p.id,x:p.x-p.w*.4,w:p.w*.8,y:G-p.h*.78}]:p.kind==='boot'?[{id:p.id+':toe',x:p.x-20,w:p.w*.56,y:G-p.h*.32},{id:p.id+':shaft',x:p.x-p.w*.34,w:p.w*.34,y:G-p.h*.9}]:[]))}
