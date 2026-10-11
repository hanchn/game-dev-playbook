import fs from 'node:fs/promises';
import {createHuman} from '../human-rig.mjs';import {commands} from '../skin-renderer.mjs';
const variant=process.argv[2]??'classic',a=createHuman({skin:variant}),skin=JSON.parse(await fs.readFile(new URL('../public/art/skins.json',import.meta.url)))[a.rendering.skinKey],nodes={};
for(const p of a.parts)nodes[p.id]={x:0,y:0,...(p.shape==='bone'?{end:{x:p.dimensions[0],y:0}}:{angle:0})};
const profiles={};for(const c of commands(a,{nodes,clip:'roll'},skin)){const [rx,ry,rw,rh]=c.rect,r=c.angle*Math.PI/180;profiles[c.id]=c.bind?{bind:c.bind}:c.clip.map(([sx,sy])=>{const x=c.x+(sx-rx)/rw*c.w,y=c.y+(sy-ry)/rh*c.h;return [x*Math.cos(r)-y*Math.sin(r),x*Math.sin(r)+y*Math.cos(r)].map(v=>+v.toFixed(5));});}
for(const c of commands(a,{nodes,clip:'roll'},skin))if(c.jointBall)profiles[c.id]={nodeId:c.nodeId,points:profiles[c.id]};
await fs.writeFile(new URL(variant==='alien'?'../human-alien-contact-profiles.mjs':'../human-contact-profiles.mjs',import.meta.url),'// Generated from '+skin.atlas+' alpha contours; run scripts/build-human-contact.mjs after changing source or pivots.\nexport default '+JSON.stringify(profiles)+';\n');
console.log('Contact contours: '+Object.keys(profiles).length);
