import fs from 'node:fs/promises';import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';
const file=new URL('../public/art/skins.json',import.meta.url),skins=JSON.parse(await fs.readFile(file)),s=skins.human,im=png(new URL('../public'+s.atlas,import.meta.url)),t=s.tiles[0],[x,y,w,h]=t.rect;
const hem=[];for(let u=0;u<=1.001;u+=.025){const px=Math.min(im.w-1,Math.round(x+w*u));let bottom=null;for(let py=Math.floor(y+.54*h);py<y+.8*h;py++){const k=(py*im.w+px)*4,[r,g,b,a]=im.pixels.slice(k,k+4);if(a>128&&r>g*1.14&&g>b*1.12&&r>140){bottom=py-1;break;}}hem.push([px,bottom]);}
for(let i=0;i<hem.length;i++)if(hem[i][1]===null){const nearest=hem.filter(p=>p[1]!==null).sort((a,b)=>Math.abs(a[0]-hem[i][0])-Math.abs(b[0]-hem[i][0]))[0];hem[i][1]=nearest[1];}
t.shirtClip=[[x,y],[x+w,y],...hem.toReversed()];t.shirtEnd=(Math.max(...hem.map(p=>p[1]))-y)/h;
const props=png(new URL('../public/art/human-grips-v1.png',import.meta.url));
s.grips={atlas:'/art/human-grips-v1.png',width:props.w,height:props.h,tiles:{
 bottle:{rect:[190,15,390,600],wrist:[210,443],scale:.047,ownership:'完整瓶颈抓握，手指在瓶子前，掌在后'},
 knife:{rect:[850,295,630,300],wrist:[875,443],scale:.047,ownership:'完整刀柄抓握，含拇指和弯曲四指'},
 gun:{rect:[1690,210,455,380],wrist:[1715,449],scale:.047,ownership:'枪柄抓握，食指沿枪身、其余手指环绕握柄'}
}};
await fs.writeFile(file,JSON.stringify(skins,null,2)+'\n');console.log({shirtEnd:t.shirtEnd,grips:[props.w,props.h]});
