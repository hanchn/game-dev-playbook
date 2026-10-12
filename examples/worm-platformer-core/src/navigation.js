import {G,tunnelAt,rockAt,segmentDistance} from './world.js';
const pointOn=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return{x:a.x+dx*t,y:a.y+dy*t}};
export function clearTunnelLine(chunks,a,b,radius=12){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);for(let i=0;i<=n;i++){const t=n?i/n:0,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(y>G&&!tunnelAt(chunks,x,y,radius)||rockAt(chunks,x,y,radius))return false}return true}
export function tunnelRoute(chunks,start,target){
 const paths=chunks.flatMap(c=>c.paths),nodes=[],links=[],ids=new Map;
 const node=p=>{const key=`${p.x}:${p.y}`;if(!ids.has(key)){ids.set(key,nodes.length);nodes.push({...p});links.push([])}return ids.get(key)};
 const connect=(a,b)=>{if(!clearTunnelLine(chunks,nodes[a],nodes[b]))return;const w=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].y-nodes[b].y);links[a].push([b,w]);links[b].push([a,w])};
 for(const p of paths)connect(node(p.a),node(p.b));
 const attach=point=>{const candidates=paths.map(p=>({p,q:pointOn(point,p.a,p.b)})).sort((a,b)=>Math.hypot(point.x-a.q.x,point.y-a.q.y)-Math.hypot(point.x-b.q.x,point.y-b.q.y));const first=candidates.find(c=>clearTunnelLine(chunks,point,c.q));if(!first)return null;const id=node(first.q);connect(id,node(first.p.a));connect(id,node(first.p.b));return id};
 const a=attach(start),b=attach(target);if(a===null||b===null)return [];
 if(clearTunnelLine(chunks,nodes[a],nodes[b]))connect(a,b);
 const distances=nodes.map(()=>Infinity),previous=new Map,seen=new Set;distances[a]=0;
 for(let n=0;n<nodes.length;n++){let current=-1;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&(current<0||distances[i]<distances[current]))current=i;if(current<0||distances[current]===Infinity)break;if(current===b)break;seen.add(current);for(const [next,w]of links[current])if(distances[current]+w<distances[next]){distances[next]=distances[current]+w;previous.set(next,current)}}
 if(!Number.isFinite(distances[b]))return [];const result=[nodes[b]];let id=b;while(id!==a){id=previous.get(id);if(id===undefined)return [];result.unshift(nodes[id])}return result;
}
export function pursuitRoute(chunks,start,target){
 if(start.y<=G&&target.y<=G)return [{x:target.x,y:G-14}];
 const exits=chunks.flatMap(c=>c.entries.map(x=>({x,y:G-14}))).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y));
 if(target.y<=G){for(const exit of exits){const route=tunnelRoute(chunks,start,exit);if(route.length)return [...route,exit,{x:target.x,y:G-14}]}return []}
 if(start.y<=G){exits.sort((a,b)=>Math.hypot(a.x-start.x,a.y-start.y)-Math.hypot(b.x-start.x,b.y-start.y));for(const exit of exits){const route=tunnelRoute(chunks,exit,target);if(route.length)return [exit,...route]}return []}
 return tunnelRoute(chunks,start,target);
}
