import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createAsset,pose} from '../game-core.mjs';
import {drawCanvas} from '../skin-renderer.mjs';
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/retest.cjs'),{createCanvas,ImageData}=require('@napi-rs/canvas'),sharp=require('sharp'),out='examples/horse-side-v23/root-candidates';
const a=createAsset('horse'),base=JSON.parse(await fs.readFile('public/art/skins.json')).horse,unused=null;await fs.mkdir(out,{recursive:true});
async function load(atlas){const raw=await sharp(await fs.readFile(path.join('public',atlas))).ensureAlpha().raw().toBuffer({resolveWithObject:true}),c=createCanvas(raw.info.width,raw.info.height);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(raw.data),raw.info.width,raw.info.height),0,0);return c;}
const image=await load(base.atlas);image.sourceImages={};for(const [key,s]of Object.entries(base.sources??{}))image.sourceImages[key]=await load(s.atlas);
const cases=[{name:'baseline-v23',root:[.40,.80]},{name:'actual-lower-neck-root',root:[.40,.94]},{name:'back-lower-neck-root',root:[.35,.94]},{name:'middle-neck-root',root:[.43,.88]}],samples=[{clip:'idle',phase:0},{clip:'walk',phase:.25},{clip:'run',phase:.25},{clip:'graze',phase:.467}],c=createCanvas(2048,cases.length*512),ctx=c.getContext('2d');ctx.fillStyle='#edf2f4';ctx.fillRect(0,0,c.width,c.height);const entries=[];
for(const [row,item]of cases.entries()){const skin=structuredClone(base);skin.tiles[1].neckRoot=item.root;for(const [col,s]of samples.entries()){ctx.save();ctx.translate(col*512,row*512);ctx.beginPath();ctx.rect(0,0,512,512);ctx.clip();ctx.strokeStyle='#578981';ctx.beginPath();ctx.moveTo(0,350);ctx.lineTo(512,350);ctx.stroke();drawCanvas(ctx,a,pose(a,s.phase,{clip:s.clip}),skin,image,{maskCanvasFactory:createCanvas});ctx.fillStyle='#172e39';ctx.font='16px sans-serif';ctx.fillText(`${item.name} ${s.clip} ${s.phase}`,10,25);ctx.restore();}entries.push({...item,asset:a.id,skin});}
await fs.writeFile(out+'/comparison-light.png',c.toBuffer('image/png'));await fs.writeFile(out+'/candidate-bindings.json',JSON.stringify({entries,registered:false,visual:'not-reviewed'},null,2));console.log(out);
