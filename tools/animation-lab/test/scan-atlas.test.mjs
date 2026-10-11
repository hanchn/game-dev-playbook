import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {scanPixels,scanAtlas} from '../scripts/scan-atlas.mjs';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';

const contains=(mask,x,y)=>mask.components.some(([rx,ry,w,h])=>x>=rx&&x<rx+w&&y>=ry&&y<ry+h);
const inPoly=(poly,x,y)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
function image(w,h){return {w,h,pixels:new Uint8Array(w*h*4)};}
function fill(im,x,y,w,h,alpha=255){for(let sy=y;sy<y+h;sy++)for(let sx=x;sx<x+w;sx++)im.pixels[(sy*im.w+sx)*4+3]=alpha;}
const bare=t=>Object.fromEntries(Object.entries(t).filter(([key])=>key!=='mask'));

test('precision mask rejects a foreign component inside a concave part hull without changing source pixels',()=>{
 const im=image(120,90);fill(im,10,10,80,10);fill(im,10,20,10,60);fill(im,80,20,10,60);fill(im,35,35,30,30);
 fill(im,7,20,3,50,10); // Antialiased fringe outside the measured core.
 const original=im.pixels.slice(),legacy=scanPixels(im,{tileCount:2,rows:1}),precise=scanPixels(im,{tileCount:2,rows:1,precision:true});
 assert.deepEqual(precise.tiles.map(bare),legacy.tiles);assert.deepEqual(im.pixels,original);
 const shell=precise.tiles.find(t=>t.alphaArea===2000),inner=precise.tiles.find(t=>t.alphaArea===900);assert.ok(shell);assert.ok(inner);
 assert.ok(inPoly(shell.clip,45.5,45.5),'The legacy hull contains the foreign part');
 assert.equal(contains(shell.mask,45.5,45.5),false);assert.equal(contains(inner.mask,45.5,45.5),true);
 assert.equal(contains(shell.mask,7.5,30.5),true,'The 3px low-alpha fringe is retained');assert.equal(shell.mask.qa.foreignCorePixelsInLegacyClip,900);
 for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++)assert.ok(!(contains(shell.mask,x+.5,y+.5)&&contains(inner.mask,x+.5,y+.5)),'Ownership masks cannot overlap');
});

test('pixel-edge contour loops exactly match rectangle union, including a transparent hole',()=>{
 const im=image(100,90);fill(im,10,10,70,70);fill(im,25,25,40,40,0);fill(im,35,35,20,20);
 const precise=scanPixels(im,{tileCount:2,rows:1,precision:true,padding:0}),ring=precise.tiles.find(t=>t.alphaArea===3300);
 assert.equal(ring.mask.contours.length,2,'Outer boundary and hole remain separate loops');
 for(const t of precise.tiles)for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++){
  const loopFill=t.mask.contours.reduce((odd,p)=>odd!==inPoly(p,x+.5,y+.5),false);assert.equal(loopFill,contains(t.mask,x+.5,y+.5));
 }
});

test('precision scans current dinosaur v5 overlap without admitting another part core',()=>{
 const file=new URL('../public/art/dinosaur-side-parts-v5.png',import.meta.url);if(!fs.existsSync(file))return;
 const before=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),im=png(file),precise=scanAtlas(file,{precision:true}),legacy=scanAtlas(file),owners=new Int16Array(im.w*im.h);
 assert.deepEqual(precise.tiles.map(bare),legacy.tiles);
 for(let id=0;id<precise.tiles.length;id++)for(const [x,y,w,h] of precise.tiles[id].mask.components)for(let sy=y;sy<y+h;sy++)for(let sx=x;sx<x+w;sx++){
  const p=sy*im.w+sx;assert.ok(!owners[p],'Masks have no shared pixels');owners[p]=id+1;
 }
 assert.ok(precise.tiles.some(t=>t.mask.qa.foreignCorePixelsInLegacyClip>0),'Source fixture actually reproduces hull contamination');
 // Independently flood source alpha, then inspect actual output rectangle
 // coverage. Do not just trust the scanner's preserved/foreign counters.
 const labels=new Int32Array(im.w*im.h),areas=[0];let label=0;
 for(let p=0;p<labels.length;p++)if(!labels[p]&&im.pixels[p*4+3]>=24){label++;const work=[p];labels[p]=label;let count=0;
  for(let k=0;k<work.length;k++){const q=work[k],x=q%im.w,y=Math.floor(q/im.w);count++;for(const next of [x?q-1:-1,x+1<im.w?q+1:-1,y?q-im.w:-1,y+1<im.h?q+im.w:-1])if(next>=0&&!labels[next]&&im.pixels[next*4+3]>=24){labels[next]=label;work.push(next);}}
  areas.push(count);
 }
 const used=new Map();for(let i=0;i<precise.tiles.length;i++){
  const coverage=new Map();for(let p=0;p<owners.length;p++)if(owners[p]===i+1&&labels[p])coverage.set(labels[p],(coverage.get(labels[p])??0)+1);
  const major=[...coverage].filter(([id])=>areas[id]>100);assert.equal(major.length,1,'A mask cannot include a second source part core');const [id,count]=major[0];assert.equal(count,areas[id],'Every core pixel is retained');assert.equal(count,precise.tiles[i].alphaArea);used.set(id,i+1);
 }
 for(let p=0;p<labels.length;p++)if(used.has(labels[p]))assert.equal(owners[p],used.get(labels[p]));
 const after=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');assert.equal(after,before);
});
