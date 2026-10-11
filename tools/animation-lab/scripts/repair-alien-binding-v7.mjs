import fs from 'node:fs/promises';const root=new URL('../',import.meta.url),file=new URL('public/art/skins.json',root),skins=JSON.parse(await fs.readFile(file)),s=skins['human-alien'],b=s.tiles[0];
b.shoulderRim=[[63,83],[138,87],[167,117],[154,139],[139,117],[118,105],[93,114],[81,144],[90,180],[77,195],[63,169]];
s.tiles[8].pivot=[.14,.36];s.tiles[8].distal=[.915,.69];
s.tiles[9].pivot=[.058,.424];s.tiles[9].distal=[.91,.58];
s.tiles[4]={...structuredClone(s.tiles[13]),pivot:[.28,1-11/(33*s.tiles[13].rect[3]/s.tiles[13].rect[2])],distal:[.90,.80],ownership:'低口完整靴，靴口由裤脚覆盖；禁用旧直立皮肤靴筒'};
s.tiles[3].distal=[.5,.99];s.qa={...s.qa,visual:'pending',bindingVersion:7};
await fs.writeFile(file,JSON.stringify(skins,null,2));let rig=await fs.readFile(new URL('human-rig.mjs',root),'utf8');rig=rig.replace("a.id='human-alien-v6';a.version=6;a.rendering.skinBindingVersion=6","a.id='human-alien-v7';a.version=7;a.rendering.skinBindingVersion=7");await fs.writeFile(new URL('human-rig.mjs',root),rig);
let render=await fs.readFile(new URL('skin-renderer.mjs',root),'utf8');render=render.replace("p.role==='upper-arm'?(skin.tiles[0].armhole?9:8)","p.role==='upper-arm'?(a.rendering.skin==='alien'?6:skin.tiles[0].armhole?9:8)");
await fs.writeFile(new URL('skin-renderer.mjs',root),render);
await fs.writeFile(new URL('examples/human-alien-v7/binding-repair.json',root),JSON.stringify({source:s.atlas,version:7,changes:['袖窿衣边只覆盖上沿/后沿，不再整片覆盖肱二头肌','前臂肘腕采用源图斜向地标而非单格横中线','放松手腕改为源图腕根','从同源图低口完整靴注册tile4，裤脚覆盖靴口','肩内核缩小至衣边内部'],visual:'pending'},null,2));

