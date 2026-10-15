import fs from 'node:fs/promises';
import path from 'node:path';
export const modelFrameRoot='/Users/lemon/Desktop/street-fighter-naifrog-2d/art/modeling/hunyuan31-20261015';
export async function resolveModelAsset(relative,base=modelFrameRoot){
 if(relative.split(/[\\/]/).some(p=>p==='..')||relative.includes('\0'))throw new Error('路径不允许');
 const file=await fs.realpath(path.resolve(base,relative)),realBase=await fs.realpath(base);
 if(!file.startsWith(realBase+path.sep)||!['.png','.jpg','.glb','.json','.mp4','.webm','.zip'].includes(path.extname(file)))throw new Error('路径不允许');
 return file;
}
