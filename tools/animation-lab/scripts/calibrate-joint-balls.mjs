import fs from 'node:fs/promises';
import {png} from '../../../skills/sprite-animation-production/scripts/read-png.mjs';
const file=new URL('../public/art/skins.json',import.meta.url),skins=JSON.parse(await fs.readFile(file)),skin=skins.human,im=png(new URL('../public'+skin.atlas,import.meta.url));
for(const tile of skin.tiles){const [x,y,w,h]=tile.rect;let best=null;
 for(let v=.2;v<=.8;v+=.04)for(let u=.25;u<=.75;u+=.05){const cx=Math.round(x+w*u),cy=Math.round(y+h*v),r=12;let count=0;for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)if(dx*dx+dy*dy<=r*r&&im.pixels[((cy+dy)*im.w+cx+dx)*4+3]>=240)count++;if(!best||count>best.count)best={cx,cy,count};}
 tile.jointPatch=[best.cx-12,best.cy-12,24,24];
}
await fs.writeFile(file,JSON.stringify(skins,null,2)+'\n');
