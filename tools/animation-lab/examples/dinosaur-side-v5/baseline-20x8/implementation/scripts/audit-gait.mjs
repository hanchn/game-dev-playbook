import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createAsset,pose,runTests} from '../game-core.mjs';
import {commands} from '../skin-renderer.mjs';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';

// An independent screen of observed endpoints. It deliberately does not read
// legs[].phase, legs[].stance, or the phase template in the asset.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const n=128,mod=v=>(v%1+1)%1,round=v=>Math.round(v*10000)/10000;
const range=vs=>Math.max(...vs)-Math.min(...vs);
const delta=(a,b)=>Math.min(mod(a-b),mod(b-a));
const legParts=(a,id)=>a.parts.filter(p=>p.leg===id);
const endpoint=(a,s,id)=>{const ps=legParts(a,id),last=ps.at(-1),node=s.nodes[last.id];return node.end??node;};
const hip=(a,s,id)=>s.nodes[legParts(a,id)[0].id];
const coords=(a,s,id)=>{const f=endpoint(a,s,id),h=hip(a,s,id);return {x:f.x,y:f.y,relativeX:f.x-h.x,worldX:f.x+s.rootX};};

export function auditTrajectories(a,samples,clip){
 const count=a.parts.filter(p=>p.leg!==undefined).reduce((m,p)=>Math.max(m,p.leg+1),0),checks=[];
 const add=(id,passed,detail)=>checks.push({id,passed,detail});
 const legs=Array.from({length:count},(_,id)=>{
  const points=samples.map(s=>coords(a,s,id)),ys=points.map(p=>p.y),floor=Math.max(...ys),height=range(ys),xTravel=range(points.map(p=>p.relativeX));
  // Flat ground contact is inferred from the geometric foot track, then tested
  // against world motion. This is a gait screen, not proof of sole contact.
  const contact=points.map(p=>floor-p.y<.15);
  const arrivals=contact.flatMap((c,i)=>c&&!contact[(i+n-1)%n]?[i/n]:[]);
  let drift=0;for(let i=1;i<n;i++)if(contact[i]&&contact[i-1])drift=Math.max(drift,Math.abs(points[i].worldX-points[i-1].worldX));
  const duty=contact.filter(Boolean).length/n,total=legParts(a,id).filter(p=>p.shape==='bone').reduce((sum,p)=>sum+p.dimensions[0],0);
  add(`leg-${id}-participates`,xTravel>3&&height>Math.max(.8,total*.015),{xTravel:round(xTravel),footLift:round(height),minimumLift:round(Math.max(.8,total*.015))});
  add(`leg-${id}-contact-cycle`,arrivals.length===1&&duty>.15&&duty<.9,{arrivals,duty:round(duty)});
  add(`leg-${id}-ground-lock`,drift<.15,{maximumObservedContactDrift:round(drift),unit:'character-local pixels per 1/128 cycle'});
  return {id,side:legParts(a,id)[0].side,points,contact,arrivals,duty,xTravel,height};
 });
 const lag=(i,j)=>{
  const a=legs[i].points,b=legs[j].points,mean=ps=>({x:ps.reduce((v,p)=>v+p.relativeX,0)/n,y:ps.reduce((v,p)=>v+p.y,0)/n}),ma=mean(a),mb=mean(b);
  const errors=Array.from({length:n},(_,shift)=>a.reduce((sum,p,k)=>{const q=b[(k+shift)%n];return sum+(p.relativeX-ma.x-q.relativeX+mb.x)**2+(p.y-ma.y-q.y+mb.y)**2;},0)/n);
  const best=errors.indexOf(Math.min(...errors));return {lag:best/n,samePhaseRms:Math.sqrt(errors[0]),halfCycleRms:Math.sqrt(errors[n/2])};
 };
 const opposite=[];for(let i=0;i<count;i+=2){const result=lag(i,i+1);opposite.push({near:i,far:i+1,...Object.fromEntries(Object.entries(result).map(([k,v])=>[k,round(v)]))});add(`pair-${i/2}-exchange`,delta(result.lag,.5)<.08&&result.samePhaseRms>1,opposite.at(-1));}
 if(a.species==='horse'&&clip==='walk'){
  const origin=legs[0].arrivals[0],events=legs.map(l=>({leg:l.id,touchdown:l.arrivals.length===1?round(mod(l.arrivals[0]-origin)):null}));
  // Ordinary lateral-sequence walk: near hind -> near fore -> far hind -> far fore.
  const expectation=[0,.5,.25,.75];
  add('horse-lateral-four-beat',events.every(e=>e.touchdown!==null&&delta(e.touchdown,expectation[e.leg])<.06),{events,expectedTouchdownByLeg:expectation});
  add('horse-walk-overlap',legs.every(l=>l.duty>.52),{observedDuty:legs.map(l=>round(l.duty)),criterion:'A slow ordinary walk must include opposite-foot contact overlap; 0.50 is a boundary template.'});
 }
 if(a.species==='horse'&&clip==='run'){
  const pairA=lag(0,3),pairB=lag(1,2);add('horse-diagonal-trot',delta(pairA.lag,0)<.08&&delta(pairB.lag,0)<.08,{nearHindFarFore:round(pairA.lag),farHindNearFore:round(pairB.lag),label:'This validates a trot pattern, not canter or gallop.'});
 }
 const contactCounts=samples.map((_,i)=>legs.filter(l=>l.contact[i]).length),geometryWarnings=[];
 if(a.rendering.rig==='arthropod-side-v2')for(let id=0;id<count;id++)for(let joint=0;joint<2;joint++){
  const measures=samples.map((s,index)=>{const p=s.nodes[`leg-${id}-${joint}`],q=s.nodes[`leg-${id}-${joint+1}`],d=Math.atan2(q.end.y-q.y,q.end.x-q.x)-Math.atan2(p.end.y-p.y,p.end.x-p.x);return {index,t:s.t,turnDegrees:Math.abs(Math.atan2(Math.sin(d),Math.cos(d))*180/Math.PI)};});
  const max=measures.reduce((a,b)=>a.turnDegrees>b.turnDegrees?a:b);if(max.turnDegrees>150)geometryWarnings.push({leg:id,joint,turnDegrees:round(max.turnDegrees),t:max.t,kind:'proximal bone vectors almost reverse',status:'requires-visual-and-anatomical-review',criterion:'Screening threshold, not a sourced species joint limit.'});
 }
 return {technicalPassed:checks.every(c=>c.passed),visual:'not-reviewed',checks,legs:legs.map(({points,contact,...l})=>({...l,duty:round(l.duty),xTravel:round(l.xTravel),height:round(l.height)})),opposite,geometryWarnings,minimumContacts:Math.min(...contactCounts),zeroContactFraction:round(contactCounts.filter(c=>!c).length/n)};
}

function inject(a,samples,fault){
 const out=structuredClone(samples),farIds=[...new Set(a.parts.filter(p=>p.side==='far'&&p.leg!==undefined).map(p=>p.leg))];
 for(const s of out)for(const id of farIds){
  const ps=legParts(a,id),source=fault==='freeze-inner'?samples[0]:s,sourceId=fault==='same-phase-inner'?id-1:id;
  const from=legParts(a,sourceId),h1=hip(a,s,id),h0=hip(a,source,sourceId),dx=h1.x-h0.x,dy=h1.y-h0.y;
  ps.forEach((p,k)=>{const v=source.nodes[from[k].id];s.nodes[p.id]={...v,x:v.x+dx,y:v.y+dy,...v.end?{end:{x:v.end.x+dx,y:v.end.y+dy}}:{}};});
 }
 // phase/stance labels intentionally remain correct: checks must inspect the
 // actual node geometry rather than trust those metadata values.
 return out;
}

function inside(poly,x,y){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
function sourceAlpha(im,x,y){x=Math.floor(x);y=Math.floor(y);return x>=0&&y>=0&&x<im.w&&y<im.h?im.pixels[(y*im.w+x)*4+3]/255:0;}
function alphaAt(im,c,x,y){
 if(!c.opacity)return 0;const r=c.angle*Math.PI/180,dx=x-c.cx,dy=y-c.cy,lx=dx*Math.cos(r)+dy*Math.sin(r),ly=-dx*Math.sin(r)+dy*Math.cos(r);
 if(c.mesh){for(const t of c.mesh){if(!inside(t.polygon,lx,ly))continue;const [a,b,cc,d,e,f]=t.matrix,det=a*d-b*cc;if(Math.abs(det)<1e-10)continue;return sourceAlpha(im,(d*(lx-e)-cc*(ly-f))/det,(-b*(lx-e)+a*(ly-f))/det)*c.opacity;}return 0;}
 if(lx<c.x||lx>c.x+c.w||ly<c.y||ly>c.y+c.h)return 0;
 const sx=c.rect[0]+(lx-c.x)/c.w*c.rect[2],sy=c.rect[1]+(ly-c.y)/c.h*c.rect[3];if(c.clip&&!inside(c.clip,sx,sy))return 0;return sourceAlpha(im,sx,sy)*c.opacity;
}
function bound(c){const r=c.angle*Math.PI/180,points=[[c.x,c.y],[c.x+c.w,c.y],[c.x+c.w,c.y+c.h],[c.x,c.y+c.h]].map(([x,y])=>[c.cx+x*Math.cos(r)-y*Math.sin(r),c.cy+x*Math.sin(r)+y*Math.cos(r)]);return [Math.floor(Math.min(...points.map(p=>p[0]))),Math.floor(Math.min(...points.map(p=>p[1]))),Math.ceil(Math.max(...points.map(p=>p[0]))),Math.ceil(Math.max(...points.map(p=>p[1])))];}
function visibility(a,samples,skin,im){
 const ids=[...new Set(a.parts.filter(p=>p.leg!==undefined).map(p=>p.leg))],frames=[];
 for(let frame=0;frame<16;frame++){
  const s=samples[frame*n/16],cs=commands(a,s,skin),owners=new Map(a.parts.map(p=>[p.id,p.leg]));
  const measures=ids.map(id=>{
   const indexes=cs.flatMap((c,i)=>owners.get(c.id)===id?[i]:[]),own=indexes.map(i=>cs[i]),boxes=own.map(bound),box=[Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];let total=0,visible=0;
   for(let y=box[1]+.5;y<box[3];y++)for(let x=box[0]+.5;x<box[2];x++){
    const ownIndex=indexes.findLast(i=>alphaAt(im,cs[i],x,y)>.15);if(ownIndex===undefined)continue;total++;let transmittance=1;
    for(let j=ownIndex+1;j<cs.length&&transmittance>.2;j++)if(owners.get(cs[j].id)!==id)transmittance*=1-alphaAt(im,cs[j],x,y);
    if(transmittance>.2)visible++;
   }
   return {leg:id,total,visible,fraction:total?round(visible/total):0};
  });frames.push({frame:frame+1,t:s.t,measures});
 }
 return {kind:'source-alpha occlusion risk screen',sampling:'16 poses; 1 local-pixel grid; opaque ordinary assembly',visual:'not-reviewed',limitations:['This evaluates draw commands and source alpha, not actual browser screenshots, antialiasing, texture continuity or perceptual identity.','Continuous strip tails are omitted from occluders. Compare suspect poses in actual UI.','A partly hidden far limb can be correct. No per-frame minimum visibility is imposed.'],legs:ids.map(id=>{const m=frames.map(f=>f.measures.find(m=>m.leg===id)),max=Math.max(...m.map(v=>v.fraction)),min=Math.min(...m.map(v=>v.fraction));return {leg:id,side:legParts(a,id)[0].side,minimumVisibleFraction:min,maximumVisibleFraction:max,framesAlmostHidden:m.filter(v=>v.fraction<.08).length,neverClearlyExposed:max<.08};}),frames};
}

export function auditAsset(a,{pixelCheck=true}={}){
 const skins=JSON.parse(fs.readFileSync(path.join(root,'public/art/skins.json'))),skin=skins[a.rendering.skinKey??a.species],atlas=path.join(root,'public',skin.atlas),im=pixelCheck?png(atlas):null;
 const motions=['walk','run'].filter(clip=>a.clips.includes(clip)).map(clip=>{
  const samples=Array.from({length:n},(_,i)=>pose(a,i/n,{clip})),baseline=auditTrajectories(a,samples,clip),faults=['freeze-inner','same-phase-inner'].map(fault=>{const report=auditTrajectories(a,inject(a,samples,fault),clip);return {fault,rejected:!report.technicalPassed,failedChecks:report.checks.filter(c=>!c.passed)};});
  return {clip,oldTechnical:runTests(a,{clip}).passed,baseline,faults,...pixelCheck?{visibility:visibility(a,samples,skin,im)}:{}};
 });
 return {species:a.species,assetId:a.id,atlas:skin.atlas,atlasSha256:crypto.createHash('sha256').update(fs.readFileSync(atlas)).digest('hex'),implementationSha256:Object.fromEntries(['animal-rig.mjs','arthropod-rig.mjs','skin-renderer.mjs','scripts/audit-gait.mjs'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),sampleCount:n,motions,visual:'not-reviewed',status:'audit-findings-not-art-approval'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),species=args.find(a=>!a.startsWith('--')),ids=species?[species]:['chicken','dinosaur','horse','crocodile','spider','scorpion'];
 const reports=ids.map(id=>auditAsset(createAsset(id),{pixelCheck:!args.includes('--no-pixels')}));
 console.log(JSON.stringify({createdAt:new Date().toISOString(),reports},null,2));
 if(args.includes('--strict')&&reports.some(r=>r.motions.some(m=>!m.baseline.technicalPassed||m.faults.some(f=>!f.rejected))))process.exitCode=1;
}
