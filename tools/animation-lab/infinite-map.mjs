/** Deterministic streaming terrain. Data generation is independent of rendering. */
import {createNoise2D} from './map-vendor/simplex-noise.mjs';
import alea from './map-vendor/alea.mjs';
export const ALGORITHM = 'studio-simplex-biomes-v1';
export const CHUNK_SIZE = 32;
export const MAX_COORDINATE = 1_000_000_000;
export const BIOMES = Object.freeze([
  {id:'ocean',name:'深海',color:'#376c83',walkable:false},
  {id:'water',name:'浅水',color:'#65a5ac',walkable:false},
  {id:'beach',name:'海岸',color:'#dfce92',walkable:true},
  {id:'grass',name:'草原',color:'#93ab6b',walkable:true},
  {id:'forest',name:'森林',color:'#638e60',walkable:true},
  {id:'desert',name:'沙漠',color:'#cdb381',walkable:true},
  {id:'mountain',name:'岩山',color:'#959587',walkable:false},
  {id:'snow',name:'雪原',color:'#d7e1db',walkable:true},
  {id:'marsh',name:'湿地',color:'#7a9b86',walkable:true},
]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function mix(n){n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;}
export function seedHash(seed){let n=2166136261;for(const c of String(seed)){n=Math.imul(n^c.codePointAt(0),16777619);}return mix(n);}
/** Include the high word so world coordinates do not wrap every 2^32 tiles. */
function coordHash(seed,x,y){const highX=Math.floor(x/4294967296),highY=Math.floor(y/4294967296);return mix(seed^mix(x>>>0)^Math.imul(mix(y>>>0),0x9e3779b1)^mix(highX>>>0)^Math.imul(mix(highY>>>0),0x85ebca6b));}
function fbm(noise,x,y,scale){let sum=0,weight=0,a=1;for(let i=0;i<5;i++){sum+=(.5+.5*noise(x/scale+i*17.31,y/scale-i*31.79))*a;weight+=a;a*=.48;scale/=2;}return sum/weight;}
export function normalizeConfig(config={}){
  const seed=String(config.seed??'漫游-2026');if(!seed.length||seed.length>160)throw new RangeError('种子长度须为 1–160 字符');
  const number=(key,fallback,min,max)=>{const value=Number(config[key]??fallback);if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${key} 须在 ${min}–${max} 之间`);return value;};
  return Object.freeze({seed,scale:number('scale',192,48,768),seaLevel:number('seaLevel',.38,.2,.62),roughness:number('roughness',.45,0,1),vegetation:number('vegetation',.65,0,1)});
}
function coordinate(value){if(!Number.isSafeInteger(value)||Math.abs(value)>MAX_COORDINATE)throw new RangeError(`坐标须为 ±${MAX_COORDINATE} 内的整数`);return value;}
export function chunkAddress(x,y){coordinate(x);coordinate(y);const cx=Math.floor(x/CHUNK_SIZE),cy=Math.floor(y/CHUNK_SIZE);return{cx,cy,lx:x-cx*CHUNK_SIZE,ly:y-cy*CHUNK_SIZE};}
export class InfiniteWorld {
  constructor(config){this.config=normalizeConfig(config);this.seed=seedHash(this.config.seed);this.fields=Object.fromEntries(['elevation','detail','moisture','temperature'].map(channel=>[channel,createNoise2D(alea(`${this.config.seed}:${channel}`))]));}
  elevationAt(x,y){if(![x,y].every(Number.isFinite)||Math.abs(x)>MAX_COORDINATE||Math.abs(y)>MAX_COORDINATE)throw new RangeError('finite world coordinates required');const c=this.config,broad=fbm(this.fields.elevation,x+631,y-937,c.scale),detail=fbm(this.fields.detail,x-313,y+811,c.scale*.3);return clamp(broad+(detail-.5)*c.roughness*.32,0,1);}
  tile(x,y){coordinate(x);coordinate(y);const c=this.config;
    const elevation=this.elevationAt(x,y);
    const moisture=fbm(this.fields.moisture,x+11417,y-7141,c.scale*.8);
    const temperature=fbm(this.fields.temperature,x-8731,y+5359,c.scale*1.7)-Math.max(0,elevation-.6)*.45;
    let biome;
    if(elevation<c.seaLevel-.07)biome=0;
    else if(elevation<c.seaLevel)biome=1;
    else if(elevation<c.seaLevel+.025)biome=2;
    else if(elevation>.73)biome=temperature<.45?7:6;
    else if(temperature<.29)biome=7;
    else if(moisture<.34&&temperature>.48)biome=5;
    else if(moisture>.64&&elevation<c.seaLevel+.13)biome=8;
    else if(moisture>.53)biome=4;
    else biome=3;
    // Jittered one-per-3x3-cell scatter: minimum cell spacing without order-dependent RNG.
    const gx=Math.floor(x/3),gy=Math.floor(y/3),r=coordHash(mix(this.seed^0x91af1),gx,gy);
    const candidate=x===gx*3+(r%3)&&y===gy*3+((r>>>4)%3);
    const chance=coordHash(mix(this.seed^0xf871),gx,gy)/4294967295;
    let decoration=null;if(candidate){if((biome===4||biome===3||biome===8)&&chance<c.vegetation*(biome===4?.9:.24))decoration='tree';else if((biome===6||biome===7)&&chance<.3)decoration='rock';else if(biome===5&&chance<c.vegetation*.16)decoration='cactus';}
    const resource=decoration==='tree'?'wood':decoration==='rock'?'stone':decoration==='cactus'?'fiber':null;
    return{x,y,elevation,moisture,temperature,biome,walkable:BIOMES[biome].walkable,decoration,resource};
  }
  chunk(cx,cy){coordinate(cx);coordinate(cy);coordinate(cx*CHUNK_SIZE);coordinate(cy*CHUNK_SIZE);coordinate(cx*CHUNK_SIZE+CHUNK_SIZE-1);coordinate(cy*CHUNK_SIZE+CHUNK_SIZE-1);const tiles=[];for(let y=0;y<CHUNK_SIZE;y++)for(let x=0;x<CHUNK_SIZE;x++)tiles.push(this.tile(cx*CHUNK_SIZE+x,cy*CHUNK_SIZE+y));return{cx,cy,size:CHUNK_SIZE,tiles};}
  exportRegion({x,y,width,height}){coordinate(x);coordinate(y);if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>65536)throw new RangeError('导出区域须为 1–65,536 格');coordinate(x+width-1);coordinate(y+height-1);const tiles=[];for(let j=0;j<height;j++)for(let i=0;i<width;i++){const t=this.tile(x+i,y+j);tiles.push([t.biome,...[t.elevation,t.moisture,t.temperature].map(n=>Math.round(n*10000)/10000),t.decoration,t.walkable,t.resource]);}return{schema:'infinite-world-region/v1',algorithm:ALGORITHM,config:this.config,region:{x,y,width,height},layout:'row-major',columns:['biome','elevation','moisture','temperature','decoration','walkable','resource'],biomes:BIOMES,tiles};}
}
/** Analyze four-neighbour connectivity within the exported region, not the entire world. */
export function analyzeRegion(data,{preferredSpawn}={}){
  if(data?.schema!=='infinite-world-region/v1'||data.layout!=='row-major')throw new TypeError('不支持的地图 schema');
  if(!data.region||!Array.isArray(data.tiles)||!Array.isArray(data.columns)||!Array.isArray(data.biomes))throw new TypeError('地图缺少结构字段');
  const {x,y,width,height}=data.region;coordinate(x);coordinate(y);if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>65536||data.tiles.length!==width*height)throw new TypeError('地图尺寸和 tiles 不匹配');coordinate(x+width-1);coordinate(y+height-1);
  const wi=data.columns.indexOf('walkable'),ri=data.columns.indexOf('resource'),bi=data.columns.indexOf('biome');if(wi<0||ri<0||bi<0)throw new TypeError('地图缺少通行或资源列');
  const visited=new Uint8Array(data.tiles.length),components=[],biomeCounts={},resources={};let walkableCount=0;
  for(const t of data.tiles){if(!Array.isArray(t)||!Number.isInteger(t[bi])||!BIOMES[t[bi]]||data.biomes[t[bi]]?.id!==BIOMES[t[bi]].id)throw new TypeError('无效的 biome 索引');const id=BIOMES[t[bi]].id;biomeCounts[id]=(biomeCounts[id]??0)+1;if(typeof t[wi]!=='boolean')throw new TypeError('walkable 必须为布尔值');if(![null,'wood','stone','fiber'].includes(t[ri]))throw new TypeError('无效的 resource');if(t[wi])walkableCount++;if(t[ri])resources[t[ri]]=(resources[t[ri]]??0)+1;}
  for(let i=0;i<data.tiles.length;i++){if(visited[i]||!data.tiles[i][wi])continue;const queue=[i],component={size:0,indices:queue,resources:{}};visited[i]=1;for(let head=0;head<queue.length;head++){const k=queue[head],lx=k%width,ly=Math.floor(k/width);component.size++;const resource=data.tiles[k][ri];if(resource)component.resources[resource]=(component.resources[resource]??0)+1;const neighbours=[];if(lx>0)neighbours.push(k-1);if(lx+1<width)neighbours.push(k+1);if(ly>0)neighbours.push(k-width);if(ly+1<height)neighbours.push(k+width);for(const n of neighbours)if(!visited[n]&&data.tiles[n][wi]){visited[n]=1;queue.push(n);}}components.push(component);}
  components.sort((a,b)=>b.size-a.size);let component=components[0],spawnIndex;
  if(preferredSpawn){coordinate(preferredSpawn.x);coordinate(preferredSpawn.y);component=undefined;const lx=preferredSpawn.x-x,ly=preferredSpawn.y-y;if(lx>=0&&lx<width&&ly>=0&&ly<height){const index=ly*width+lx;component=components.find(c=>c.indices.includes(index));if(component)spawnIndex=index;}if(!component)return{schema:'infinite-world-analysis/v1',ok:false,reason:'指定出生点在区域外或不可通行',region:data.region,walkableCount,componentCount:components.length,biomeCounts,resources};}
  if(!component)return{schema:'infinite-world-analysis/v1',ok:false,reason:'区域内没有可通行地块',region:data.region,walkableCount,componentCount:0,biomeCounts,resources};
  if(spawnIndex===undefined){const centerX=(width-1)/2,centerY=(height-1)/2;spawnIndex=component.indices.reduce((best,i)=>Math.hypot(i%width-centerX,Math.floor(i/width)-centerY)<Math.hypot(best%width-centerX,Math.floor(best/width)-centerY)?i:best,component.indices[0]);}
  return{schema:'infinite-world-analysis/v1',ok:true,scope:'region-only-four-neighbour',region:data.region,spawn:{x:x+spawnIndex%width,y:y+Math.floor(spawnIndex/width)},walkableCount,componentCount:components.length,reachableCount:component.size,reachableFraction:component.size/data.tiles.length,reachableResources:component.resources,biomeCounts,resources};
}
/** Structured, side-effect-free entry point for agent tools. */
export function mapOperation(args={}){const world=new InfiniteWorld(args.config);switch(args.operation){case'chunk':return{schema:'infinite-world-chunk/v1',algorithm:ALGORITHM,config:world.config,...world.chunk(args.chunk?.x??0,args.chunk?.y??0)};case'tile':return{schema:'infinite-world-tile/v1',algorithm:ALGORITHM,config:world.config,tile:world.tile(args.point?.x??0,args.point?.y??0)};case'region':return world.exportRegion(args.region??{x:-32,y:-32,width:64,height:64});case'validate':return analyzeRegion(world.exportRegion(args.region??{x:-32,y:-32,width:64,height:64}),{preferredSpawn:args.spawn});default:throw new RangeError('operation 须为 chunk、tile、region 或 validate');}}
export class ChunkCache {
  constructor(world,{maxChunks=192}={}){if(!Number.isInteger(maxChunks)||maxChunks<1||maxChunks>4096)throw new RangeError('maxChunks 须为 1–4096');this.world=world;this.maxChunks=maxChunks;this.chunks=new Map();this.generated=0;this.evicted=0;}
  get(cx,cy){const key=`${cx},${cy}`;let chunk=this.chunks.get(key);if(chunk){this.chunks.delete(key);this.chunks.set(key,chunk);return chunk;}chunk=this.world.chunk(cx,cy);this.chunks.set(key,chunk);this.generated++;while(this.chunks.size>this.maxChunks){this.chunks.delete(this.chunks.keys().next().value);this.evicted++;}return chunk;}
  tile(x,y){const a=chunkAddress(x,y);return this.get(a.cx,a.cy).tiles[a.ly*CHUNK_SIZE+a.lx];}
  /** Evict far chunks even when the LRU budget has not filled. */
  retain(bounds,padding=1){for(const[key,c]of this.chunks){if(c.cx<bounds.minX-padding||c.cx>bounds.maxX+padding||c.cy<bounds.minY-padding||c.cy>bounds.maxY+padding){this.chunks.delete(key);this.evicted++;}}return this.chunks.size;}
}
