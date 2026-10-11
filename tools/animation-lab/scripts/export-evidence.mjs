import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createAsset,runTests,generateAnimation} from '../game-core.mjs';import {skinnedSheet} from '../skin-renderer.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),species=process.argv[2]??'human';
const variant=process.argv[3]??'classic';
const a=createAsset(species,species==='human'?{skin:variant}:{}),skins=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'))),s=skins[a.rendering.skinKey??species],out=path.join(root,'examples',a.id);
await fs.mkdir(out,{recursive:true});s.href='data:image/png;base64,'+(await fs.readFile(path.join(root,'public',s.atlas))).toString('base64');
if(s.grips)s.grips.href='data:image/png;base64,'+(await fs.readFile(path.join(root,'public',s.grips.atlas))).toString('base64');
const sharpModule=process.env.ANIMATION_LAB_SHARP_MODULE;const sharp=sharpModule?(await import(sharpModule)).default:null;
const reports=[];for(const clip of a.clips.filter(c=>c!=='extend')){
 const report=runTests(a,{clip}),sheet=skinnedSheet(a,s,{clip});if(!report.passed)throw Error(`${species}/${clip}: ${JSON.stringify(report.checks.filter(c=>!c.passed))}`);
 await fs.writeFile(path.join(out,clip+'.svg'),sheet.svg);const hasPNG=await fs.stat(path.join(out,clip+'.png')).then(()=>true,()=>false);await fs.writeFile(path.join(out,clip+'-frames.json'),JSON.stringify({...sheet.manifest,...(hasPNG?{format:'png',image:clip+'.png'}:{image:clip+'.svg'})},null,2));await fs.writeFile(path.join(out,clip+'-svg-frames.json'),JSON.stringify({...sheet.manifest,image:clip+'.svg'},null,2));await fs.writeFile(path.join(out,clip+'-animation.json'),JSON.stringify(generateAnimation(a,{clip}),null,2));
 if(sharp)await sharp(Buffer.from(sheet.svg)).png().toFile(path.join(out,clip+'.png'));reports.push(report);
}
await fs.writeFile(path.join(out,'asset.json'),JSON.stringify({...a,skin:{...s,href:undefined}},null,2));await fs.writeFile(path.join(out,'qa.json'),JSON.stringify({species,actions:reports,components:a.parts.filter(p=>p.role||p.id==='head').map(p=>({id:p.id,report:runTests(a,{clip:'extend',scope:'component',partId:p.id})})),visualStatus:'pending-see-review-log'},null,2));
console.log(JSON.stringify({species,out,actions:reports.length,png:!!sharp}));
