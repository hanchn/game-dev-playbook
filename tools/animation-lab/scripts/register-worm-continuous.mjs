import fs from 'node:fs/promises';import crypto from 'node:crypto';import {createRequire} from 'node:module';import {scanPixels} from './scan-atlas.mjs';
const root=new URL('../',import.meta.url),require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/worm-register.cjs'),sharp=require('sharp');
const atlas='/art/worm-side-parts-v5.png',bytes=await fs.readFile(new URL('public'+atlas,root)),raw=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),scan=scanPixels({w:raw.info.width,h:raw.info.height,pixels:raw.data},{tileCount:1,rows:1,precision:true}),body=scan.tiles[0];
if(body.rect[2]<1000||body.rect[3]>250)throw Error('Expected native continuous worm');
body.pivot=[.98,.5];body.distal=[.02,.5];body.ownership='完整连续蚯蚓，前端/环带/躯干/尾端属于同一张源图';
const skinFile=new URL('public/art/skins.json',root),skins=JSON.parse(await fs.readFile(skinFile)),dir=new URL('examples/worm-side-v5/',root);
await fs.mkdir(new URL('baseline/',dir),{recursive:true});await fs.writeFile(new URL('baseline/skin.json',dir),JSON.stringify(skins.worm,null,2),{flag:'wx'});
for(const file of ['flex-rig.mjs','skin-renderer.mjs','strip-skin.mjs'])await fs.copyFile(new URL(file,root),new URL('baseline/'+file,dir));
skins.worm={atlas,width:raw.info.width,height:raw.info.height,transparent:true,tiles:Array.from({length:16},()=>structuredClone(body)),qa:{source:'continuous-native-alpha',visual:'pending'}};
await fs.writeFile(skinFile,JSON.stringify(skins,null,2));await fs.writeFile(new URL('source-registration.json',dir),JSON.stringify({atlas,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bodyRect:body.rect,scan,method:'native continuous alpha measurement; no source editing'},null,2));
let rig=await fs.readFile(new URL('flex-rig.mjs',root),'utf8');rig=rig.replace("a.actionDesign=flexDesign(a);return a;","if(id==='worm'){a.version=5;a.id='worm-side-v5';a.rendering.atlas='/art/worm-side-parts-v5.png';a.rendering.continuousWholeBody=true;delete a.rendering.tailMesh.sections;a.rendering.tailMesh.sourceRange=[1,0];}a.actionDesign=flexDesign(a);return a;");
rig=rig.replace("contraction*(i%2?.42:-.42)","contraction*Math.sin(i*.4)*.13");
rig=rig.replace("if(a.species==='snake'&&a.version>=5&&scope==='character')","if(['snake','worm'].includes(a.species)&&a.version>=5&&scope==='character'&&clip!=='burrow')");
await fs.writeFile(new URL('flex-rig.mjs',root),rig);
let renderer=await fs.readFile(new URL('skin-renderer.mjs',root),'utf8');renderer=renderer.replace("p.id!=='root'&&state.nodes[p.id]","p.id!=='root'&&state.nodes[p.id]&&!(a.rendering.continuousWholeBody&&explosion<.01&&p.id==='head')");
await fs.writeFile(new URL('skin-renderer.mjs',root),renderer);console.log({body:body.rect});

