import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {createAsset,pose} from '../game-core.mjs';
import {scanAtlas} from '../scripts/scan-atlas.mjs';
import {commands} from '../skin-renderer.mjs';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFile(path.join(root,p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('horse leg sources preserve the calibrated primary source, eight original tiles and skeleton',async()=>{
 const skin=JSON.parse(await read('public/art/skins.json')).horse,baseline=JSON.parse(await read('examples/horse-side-v21/retest/manifest.json')),asset=createAsset('horse');
 assert.equal(asset.id,'horse-side-v24');assert.equal(skin.integration.reuseRig,asset.id);assert.equal(skin.atlas,baseline.skin.atlas);assert.equal(sha(await read('public'+skin.atlas)),baseline.sourceSha256);
 assert.deepEqual(asset.parts,baseline.asset.parts);assert.deepEqual(asset.clips,baseline.asset.clips);
 for(let i=0;i<16;i++)if(![2,3,4,5,7,8,9,10].includes(i))assert.deepEqual(skin.tiles[i],baseline.skin.tiles[i],`tile ${i} must keep its actual source identity and mapping`);
 const previous=JSON.parse(await read('examples/horse-side-v22/retest/manifest.json'));for(const slot of [4,9])assert.deepEqual(skin.tiles[slot],previous.skin.tiles[slot]);
});
test('horse upper parts have independent measured source ownership and opaque anatomical source landmarks',async()=>{
 const skin=JSON.parse(await read('public/art/skins.json')).horse,source=skin.sources['horse-upper-material'],scan=scanAtlas(path.join(root,'public',source.atlas),{precision:true,tileCount:4,rows:1}),bitmap=png(path.join(root,'public',source.atlas));
 assert.equal(sha(await read('public'+source.atlas)),source.sourceSha256);assert.deepEqual([source.width,source.height],[scan.width,scan.height]);
 for(const[index,slot]of [2,3,7,8].entries()){const tile=skin.tiles[slot];assert.equal(tile.source,'horse-upper-material');assert.deepEqual(tile.rect,scan.tiles[index].rect);assert.deepEqual(tile.mask.components,scan.tiles[index].mask.components);assert.equal(tile.mask.qa.foreignCorePixels,0);for(const p of [tile.pivot,tile.distal]){const x=Math.floor(tile.rect[0]+p[0]*tile.rect[2]),y=Math.floor(tile.rect[1]+p[1]*tile.rect[3]);assert.ok(bitmap.pixels[(y*bitmap.w+x)*4+3]>=24,`tile ${slot} anatomical source point must be opaque material`);}}
});
test('horse lower legs consume the fresh two-part source ownership rather than old atlas masks',async()=>{
 const skin=JSON.parse(await read('public/art/skins.json')).horse,source=skin.sources['horse-cannon-material'],scan=scanAtlas(path.join(root,'public',source.atlas),{precision:true,tileCount:2,rows:1}),bitmap=png(path.join(root,'public',source.atlas));
 assert.equal(sha(await read('public'+source.atlas)),source.sourceSha256);assert.deepEqual([source.width,source.height],[scan.width,scan.height]);
 for(const [index,slot]of [4,9].entries()){
  const tile=skin.tiles[slot];assert.equal(tile.source,'horse-cannon-material');assert.deepEqual(tile.rect,scan.tiles[index].rect);assert.deepEqual(tile.mask.components,scan.tiles[index].mask.components);assert.equal(tile.mask.qa.foreignCorePixels,0);
  for(const p of [tile.pivot,tile.distal]){const x=Math.floor(tile.rect[0]+p[0]*tile.rect[2]),y=Math.floor(tile.rect[1]+p[1]*tile.rect[3]);assert.ok(bitmap.pixels[(y*bitmap.w+x)*4+3]>=24,'anatomical pivot must belong to actual source core, not transparent padding');}
 }
 const asset=createAsset('horse');for(const t of [0,.25,.5,.75]){const cs=commands(asset,pose(asset,t,{clip:'run'}),skin);for(const c of cs.filter(c=>/^leg-[0-3]-lower$/.test(c.id))){assert.equal(c.href,source.atlas);assert.equal(c.sourceWidth,source.width);assert.equal(c.sourceHeight,source.height);}}
});
