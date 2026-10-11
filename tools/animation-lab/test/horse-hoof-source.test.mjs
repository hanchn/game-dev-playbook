import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createAsset,pose} from '../game-core.mjs';
import {commands} from '../skin-renderer.mjs';
import {sourcePointWorld} from '../human-soft-skin.mjs';
import {scanAtlas} from '../scripts/scan-atlas.mjs';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';
const root=path.resolve(import.meta.dirname,'..');
test('horse hoof candidate consumes new two-piece real source without replacing the other14 current tiles',async()=>{
 const skin=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'))).horse,baseline=JSON.parse(await fs.readFile(path.join(root,'examples/horse-side-v23/retest/manifest.json'))),a=createAsset('horse'),source=skin.sources['horse-hoof-material'],file=path.join(root,'public',source.atlas),bytes=await fs.readFile(file),scan=scanAtlas(file,{precision:true,tileCount:2,rows:1}),bitmap=png(file);
 assert.equal(a.id,'horse-side-v24');assert.equal(skin.integration.reuseRig,a.id);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sourceSha256);assert.deepEqual([source.width,source.height],[scan.width,scan.height]);
 assert.deepEqual(a.parts,baseline.asset.parts);assert.deepEqual(a.clips,baseline.asset.clips);
 for(let slot=0;slot<16;slot++)if(![5,10].includes(slot))assert.deepEqual(skin.tiles[slot],baseline.skin.tiles[slot]);
 for(const [i,slot]of [5,10].entries()){const tile=skin.tiles[slot];assert.equal(tile.source,'horse-hoof-material');assert.deepEqual(tile.mask.components,scan.tiles[i].mask.components);assert.deepEqual(tile.rect,scan.tiles[i].rect);assert.equal(tile.mask.qa.foreignCorePixels,0);const [rx,ry,rw,rh]=tile.rect,x=Math.floor(rx+tile.pivot[0]*rw),y=Math.floor(ry+tile.pivot[1]*rh);assert.ok(bitmap.pixels[(y*bitmap.w+x)*4+3]>=24,'foot anchor belongs to actual hair source');}
});
test('horse true source sole remains on the floor during all stance phases after shorter pastern replacement',async()=>{
 const skin=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'))).horse,a=createAsset('horse'),bitmap=png(path.join(root,'public',skin.sources['horse-hoof-material'].atlas)),bottoms={};
 for(const slot of[5,10]){const [rx,ry,rw,rh]=skin.tiles[slot].rect;let bottom=-1,px;for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++)if(bitmap.pixels[(y*bitmap.w+x)*4+3]>=24&&y>bottom){bottom=y;px=x;}assert.ok(bottom>=0);bottoms[slot]=[px+.5,bottom+.5];}
 let count=0;for(const clip of ['idle','walk','run','graze'])for(let i=0;i<96;i++){const state=pose(a,i/95,{clip}),cs=commands(a,state,skin);for(const leg of state.legs)if(leg.stance){const c=cs.find(c=>c.id===`leg-${leg.id}-foot`),p=sourcePointWorld(c,bottoms[c.slot]);assert.equal(c.href,skin.sources['horse-hoof-material'].atlas);assert.ok(p&&Math.abs(p[1])<.05,`${clip} phase${i/95} leg${leg.id} actual opaque sole worldy=${p?.[1]}`);count++;}}
 assert.ok(count>700);
});
