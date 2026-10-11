// Global feature planning uses only the unmodified terrain sampler. Rendering and
// collision consumers must distinguish validated placement from visual acceptance.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hash(text) { let n=2166136261; for (const c of text) n=Math.imul(n^c.charCodeAt(0),16777619); return n>>>0; }
function random(seed) { let n=hash(seed); return () => { n+=0x6D2B79F5; let t=Math.imul(n^n>>>15,1|n); t^=t+Math.imul(t^t>>>7,61|t); return ((t^t>>>14)>>>0)/4294967296; }; }
function distanceToSegment(x,z,a,b) { const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1); return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),t}; }
export class WorldFeaturePlanner {
  constructor({seed='world', sample, regionSize=128, heightScale=24, cacheLimit=64}={}) {
    if(typeof sample!=='function') throw new TypeError('A base terrain sample callback is required');
    if(!(regionSize>=32 && Number.isFinite(regionSize)) || !(heightScale>0 && Number.isFinite(heightScale))) throw new RangeError('Invalid world scale');
    this.seed=String(seed); this.sample=sample; this.regionSize=regionSize; this.heightScale=heightScale; this.cacheLimit=Math.max(1,Math.floor(cacheLimit)); this.cache=new Map(); this.placementCache=new Map();
  }
  base(x,z,detail='full') {
    const p=this.sample({x,z,detail});
    if(!p || !Number.isFinite(p.height) || !Number.isFinite(p.waterHeight)) throw new TypeError('Sampler must return finite height and waterHeight');
    return {...p,normalY:p.normalY??1,walkable:p.walkable??p.height>p.waterHeight};
  }
  footprint(position,width,depth) {
    // Rejected candidates need no remaining normal/noise samples. Accepted
    // foundations still use all 25 points in the exact original order.
    const heights=[];let low=Infinity,high=-Infinity;
    for(let ix=-2;ix<=2;ix++)for(let iz=-2;iz<=2;iz++){
      const p=this.base(position.x+ix*width/4,position.z+iz*depth/4);
      heights.push(p.height);low=Math.min(low,p.height);high=Math.max(high,p.height);
      if(!p.walkable||p.height<=p.waterHeight+this.heightScale*.025||p.normalY<=.88||high-low>=this.heightScale*.06)return{valid:false,range:high-low,height:null};
    }
    return {valid:true,range:high-low,height:heights.reduce((a,b)=>a+b,0)/heights.length};
  }
  placements(rx,rz) {
    const key=`${rx},${rz}`; if(this.placementCache.has(key))return this.placementCache.get(key);
    const rng=random(`${this.seed}/${key}`),s=this.regionSize,features=[];
    for(const [index,type] of ['castle','village','cave','hill'].entries()) {
      const width=s*({castle:.09,village:.12,cave:.035,hill:.08}[type]),depth=width;
      let accepted;
      for(let attempt=0;attempt<12;attempt++) {
        const position={x:(rx+.15+rng()*.7)*s,z:(rz+.15+rng()*.7)*s},base=this.base(position.x,position.z),fit=type==='castle'||type==='village'?this.footprint(position,width,depth):null;
        const separated=features.every(f=>Math.hypot(f.position.x-position.x,f.position.z-position.z)>(width+f.footprint.width)*.8);
        // Hills are terrain markers; caves require a source cliff. Buildings
        // have independently checked complete foundations rather than center-only placement.
        const suitable=type==='hill'?base.height>base.waterHeight+this.heightScale*.22:type==='cave'?base.height>base.waterHeight+this.heightScale*.05 && base.normalY<.85:fit.valid;
        if(!suitable || !separated)continue;
        accepted={id:`${this.seed}:${key}:${index}`,type,position,footprint:{width,depth},surfaceHeight:type==='castle'||type==='village'?fit.height:base.height,status:'validated',validation:{placement:'terrain-sampled',visual:'not-reviewed',samples:type==='castle'||type==='village'?25:1},collider:type==='castle'||type==='village'?{type:'footprint',width,depth}:null}; break;
      }
      if(accepted)features.push(accepted);
    }
    this.placementCache.set(key,features);while(this.placementCache.size>this.cacheLimit)this.placementCache.delete(this.placementCache.keys().next().value);return features;
  }
  region(rx,rz) {
    const key=`${rx},${rz}`;if(this.cache.has(key))return this.cache.get(key);
    const s=this.regionSize,rng=random(`${this.seed}/${key}/stream-v2`),features=[...this.placements(rx,rz)],foundations=[];
    // Placement planning cannot depend on river planning: a neighboring query
    // must not recurse, mutate a random generator, or alter these world IDs.
    for(let x=rx-1;x<=rx+1;x++)for(let z=rz-1;z<=rz+1;z++)foundations.push(...this.placements(x,z).filter(f=>['castle','village','cave'].includes(f.type)));
    const blocked=(a,b)=>foundations.some(f=>segmentIntersectsBounds(a,b,{x:f.position.x-f.footprint.width/2-s*.008,z:f.position.z-f.footprint.depth/2-s*.008,width:f.footprint.width+s*.016,depth:f.footprint.depth+s*.016}));
    // A river source belongs to one global region. Its maximum travel distance
    // is bounded, allowing identical halo queries from adjacent render chunks.
    let source;
    for(let i=0;i<12;i++) { const p={x:(rx+.1+rng()*.8)*s,z:(rz+.1+rng()*.8)*s},b=this.base(p.x,p.z,'height'); if(!blocked(p,p) && b.height>b.waterHeight+this.heightScale*.12 && (!source||b.height>source.height))source={...p,height:b.height}; }
    if(source) {
      const step=s/32,sourcePath=[],seen=new Set();let p=source,heading=null,termination='travel-budget';
      for(let i=0;i<32;i++){
        const base=this.base(p.x,p.z,'height');sourcePath.push({x:p.x,z:p.z,width:s*.012,surfaceHeight:base.height,bedHeight:base.height-this.heightScale*.012});
        if(base.height<=base.waterHeight){termination='water-body';break;}
        let next;const angles=heading===null?Array.from({length:32},(_,d)=>d*Math.PI/16):Array.from({length:11},(_,d)=>heading+(d-5)*Math.PI/30);
        for(const angle of angles){const q={x:p.x+Math.cos(angle)*step,z:p.z+Math.sin(angle)*step},b=this.base(q.x,q.z,'height'),turn=heading===null?0:1-Math.cos(angle-heading),score=base.height-b.height-turn*this.heightScale*.04;if(!blocked(p,q)&&b.height<base.height-.00001&&(!next||score>next.score))next={...q,height:b.height,angle,score};}
        if(!next){termination='local-basin';break;}const cell=`${Math.round(next.x/(step*.3))},${Math.round(next.z/(step*.3))}`;if(seen.has(cell)){termination='visited-basin';break;}seen.add(cell);heading=next.angle;p=next;
      }
      if(sourcePath.length>=5){const path=[sourcePath[0]],point=(x,z,width)=>{const b=this.base(x,z,'height');return{x,z,width,surfaceHeight:b.height,bedHeight:b.height-this.heightScale*.012};};let smoothedCorners=0;
        for(let i=1;i<sourcePath.length-1;i++){const a=sourcePath[i-1],p=sourcePath[i],b=sourcePath[i+1],cut=.32,pre={x:p.x+(a.x-p.x)*cut,z:p.z+(a.z-p.z)*cut},post={x:p.x+(b.x-p.x)*cut,z:p.z+(b.z-p.z)*cut},arc=[point(pre.x,pre.z,p.width)];for(let j=1;j<=6;j++){const t=j/6;arc.push(point((1-t)**2*pre.x+2*t*(1-t)*p.x+t*t*post.x,(1-t)**2*pre.z+2*t*(1-t)*p.z+t*t*post.z,p.width));}let previous=path.at(-1),valid=arc.at(-1).surfaceHeight>b.surfaceHeight+.00001;for(const q of arc){if(q.surfaceHeight>=previous.surfaceHeight-.00001||blocked(previous,q))valid=false;previous=q;}if(valid){path.push(...arc);smoothedCorners++;}else path.push(p);
        }path.push(sourcePath.at(-1));let terminalBasin=null;
        if(termination==='local-basin'||termination==='visited-basin'){
          const end=path.at(-1),radius=end.width*1.3,boundsFor=(f,margin)=>({x:f.position.x-f.footprint.width/2-margin,z:f.position.z-f.footprint.depth/2-margin,width:f.footprint.width+margin*2,depth:f.footprint.depth+margin*2}),candidate=path.map(p=>({...p,width:p.width*(1+1.6*Math.max(0,1-Math.hypot(p.x-end.x,p.z-end.z)/radius)**2)}));
          const clear=candidate.every((p,i)=>foundations.every(f=>!segmentIntersectsBounds(candidate[Math.max(0,i-1)],p,boundsFor(f,Math.max(p.width,candidate[Math.max(0,i-1)].width)/2+s*.002))));
          if(clear){for(let i=0;i<path.length;i++)path[i]=candidate[i];terminalBasin={position:{x:end.x,z:end.z},radius,waterHeight:end.bedHeight+this.heightScale*.008,status:'planned-generated-depression',hydrologicallyValidated:false,validation:{completeFootprintAvoidance:['castle','village','cave'],visual:'not-reviewed'}};}
        }
        features.push({id:`${this.seed}:${key}:stream`,type:'stream',position:{x:source.x,z:source.z},footprint:{width:0,depth:0},sourcePath,path,termination,terminalBasin,status:'validated',validation:{placement:'strictly-downhill-base-terrain',visual:'not-reviewed',pathVersion:4,maxSourceTurnDegrees:30,smoothedCorners,completeBankAvoidance:['castle','village','cave']}});
      }
    }
    this.cache.set(key,features); while(this.cache.size>this.cacheLimit)this.cache.delete(this.cache.keys().next().value); return features;
  }
  featuresInBounds({x,z,width,depth}) {
    if(![x,z,width,depth].every(Number.isFinite)||width<=0||depth<=0)throw new RangeError('Invalid bounds');
    const s=this.regionSize,result=[];
    for(let rz=Math.floor(z/s)-1;rz<=Math.floor((z+depth)/s)+1;rz++)for(let rx=Math.floor(x/s)-1;rx<=Math.floor((x+width)/s)+1;rx++)for(const f of this.region(rx,rz)) {
      const intersects=f.path?f.path.some((p,i)=>i && segmentIntersectsBounds(f.path[i-1],p,{x:x-p.width,z:z-p.width,width:width+p.width*2,depth:depth+p.width*2})):f.position.x+f.footprint.width/2>=x && f.position.x-f.footprint.width/2<=x+width && f.position.z+f.footprint.depth/2>=z && f.position.z-f.footprint.depth/2<=z+depth;
      if(intersects)result.push(f);
    }
    return result.sort((a,b)=>a.id.localeCompare(b.id));
  }
  heightDelta(x,z) {
    return this.heightDeltaFrom(x,z,this.featuresInBounds({x:x-.001,z:z-.001,width:.002,depth:.002}));
  }
  prepareHeightModifier(bounds) {
    const features=this.featuresInBounds(bounds);
    // Pre-plan once per chunk/physics region; never discover all POIs per vertex.
    return {features,delta:(x,z)=>this.heightDeltaFrom(x,z,features)};
  }
  heightDeltaFrom(x,z,features) {
    const b=this.base(x,z);let foundation=null;
    for(const f of features.filter(f=>f.type==='castle'||f.type==='village').sort((a,b)=>a.id?.localeCompare(b.id??'')??0)){
      const dx=Math.abs(x-f.position.x)/(f.footprint.width/2),dz=Math.abs(z-f.position.z)/(f.footprint.depth/2),weight=clamp((1-Math.max(dx,dz))/.2,0,1);
      if(weight>0)foundation=(f.surfaceHeight-b.height)*weight;
    }
    // Foundations take priority. Rivers are also planned around their complete
    // footprints, so the renderer and collision receive the same dry land.
    if(foundation!==null)return foundation;
    let delta=0;
    for(const f of features)if(f.type==='stream')for(let i=1;i<f.path.length;i++){
      const a=f.path[i-1],p=f.path[i],near=distanceToSegment(x,z,a,p),w=(a.width+(p.width-a.width)*near.t)/2;
      if(near.distance<w){const bed=a.bedHeight+(p.bedHeight-a.bedHeight)*near.t,blend=(1-near.distance/w)**2;delta=Math.min(delta,Math.min(0,bed-b.height)*blend);}
    }
    return delta;
  }
  plan(bounds,projection='topdown') {return {schema:1,plannerVersion:4,seed:this.seed,projection,bounds,features:this.featuresInBounds(bounds),acceptance:'placement validation only; renderer, collisions and visual QA remain separate'};}
}
function segmentIntersectsBounds(a,b,r) {
  // Slab clipping also detects a segment crossing a chunk without vertices inside.
  let lo=0,hi=1; for(const [axis,min,max] of [['x',r.x,r.x+r.width],['z',r.z,r.z+r.depth]]) {const delta=b[axis]-a[axis]; if(Math.abs(delta)<1e-12) {if(a[axis]<min||a[axis]>max)return false;}else{let u=(min-a[axis])/delta,v=(max-a[axis])/delta;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}} return true;
}
