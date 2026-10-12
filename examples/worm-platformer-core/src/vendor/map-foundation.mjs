// Extracted without behavioral edits from game-dev-playbook infinite-map.mjs. See docs/design/reuse-provenance.json.
const CHUNK_SIZE=32;
function chunkAddress(x,y){const cx=Math.floor(x/CHUNK_SIZE),cy=Math.floor(y/CHUNK_SIZE);return {cx,cy,lx:x-cx*CHUNK_SIZE,ly:y-cy*CHUNK_SIZE}}
function mix(n){n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;}
export function seedHash(seed){let n=2166136261;for(const c of String(seed)){n=Math.imul(n^c.codePointAt(0),16777619);}return mix(n);}
export class ChunkCache {
  constructor(world,{maxChunks=192}={}){if(!Number.isInteger(maxChunks)||maxChunks<1||maxChunks>4096)throw new RangeError('maxChunks 须为 1–4096');this.world=world;this.maxChunks=maxChunks;this.chunks=new Map();this.generated=0;this.evicted=0;}
  get(cx,cy){const key=`${cx},${cy}`;let chunk=this.chunks.get(key);if(chunk){this.chunks.delete(key);this.chunks.set(key,chunk);return chunk;}chunk=this.world.chunk(cx,cy);this.chunks.set(key,chunk);this.generated++;while(this.chunks.size>this.maxChunks){this.chunks.delete(this.chunks.keys().next().value);this.evicted++;}return chunk;}
  tile(x,y){const a=chunkAddress(x,y);return this.get(a.cx,a.cy).tiles[a.ly*CHUNK_SIZE+a.lx];}
  /** Evict far chunks even when the LRU budget has not filled. */
  retain(bounds,padding=1){for(const[key,c]of this.chunks){if(c.cx<bounds.minX-padding||c.cx>bounds.maxX+padding||c.cy<bounds.minY-padding||c.cy>bounds.maxY+padding){this.chunks.delete(key);this.evicted++;}}return this.chunks.size;}
}
