#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {mapOperation,analyzeRegion} from '../infinite-map.mjs';
import {studioMapOperation} from './studio-map-adapter.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const help=`Codex 地图工具（无浏览器依赖）
node scripts/infinite-map-cli.mjs <tile|chunk|region|validate|studio-chunk|tiled|test> [options]
  --args '<JSON>'     结构化 mapOperation 参数；CLI 参数优先
  --seed <text>      浏览器 simplex 配置种子（studio-chunk/tiled 必须为安全整数）
  --x <integer> --y <integer>  tile 世界坐标 / chunk 区块坐标 / region 左上角
  --width 64 --height 64      region/validate 尺寸，最多 65,536 格
  --scale 192 --sea-level .38 --roughness .45 --vegetation .65
  --spawn-x <integer> --spawn-y <integer>  validate 指定出生点
  --input <region.json>       validate 已导出的区域
  --world-id <slug> --chunk-size 64 --environment mortal-temperate
  --out <path>                写入 JSON；否则标准输出
退出码：0 成功；2 参数/schema 错误；3 可玩性检查失败；1 运行/IO/测试错误。
studio-chunk/tiled 原样复用 game-asset-studio Python 算法，与浏览器 simplex 数值不同。
Tiled 输出为数据交换，外部 tileset/美术资源未在该命令中制作或验收。`;
function parse(argv){const result={};for(let i=0;i<argv.length;i++){const key=argv[i];if(key==='--help'||key==='-h'){result.help=true;continue;}if(!/^--[a-z-]+$/.test(key))throw new TypeError(`未知参数 ${key}`);if(i+1===argv.length||argv[i+1].startsWith('--'))throw new TypeError(`${key} 缺少值`);if(Object.hasOwn(result,key.slice(2)))throw new TypeError(`重复参数 ${key}`);result[key.slice(2)]=argv[++i];}const allowed=['args','seed','x','y','width','height','scale','sea-level','roughness','vegetation','spawn-x','spawn-y','input','world-id','chunk-size','environment','out','help'];for(const key of Object.keys(result))if(!allowed.includes(key))throw new TypeError(`未知参数 --${key}`);return result;}
try{
 const command=process.argv[2]??'help',p=parse(process.argv.slice(3));if(p.help||command==='help'||command==='--help'){console.log(help);process.exit(0);}
 if(command==='test'){const test=spawnSync(process.execPath,['--test',path.join(root,'test/infinite-map.test.mjs')],{stdio:'inherit'});process.exit(test.status??1);}
 let args=p.args?JSON.parse(p.args):{};if(!args||typeof args!=='object'||Array.isArray(args))throw new TypeError('--args 必须为对象');
 const n=(key,fallback)=>{const value=Number(p[key]??fallback);if(!Number.isFinite(value))throw new TypeError(`${key} 不是数值`);return value;};
 let output;
 if(command==='studio-chunk'||command==='tiled'){
   const payload={world_id:p['world-id']??'codex-world',seed:n('seed',2048),chunk_x:n('x',0),chunk_y:n('y',0),chunk_size:n('chunk-size',64),environment_id:p.environment??'mortal-temperate'};
   output=studioMapOperation({operation:command==='tiled'?'tiled':'chunk',...payload});
 }else if(command==='validate'&&p.input){const stat=await fs.stat(p.input);if(stat.size>16*1024*1024)throw new TypeError('输入超过 16 MiB');output=analyzeRegion(JSON.parse(await fs.readFile(p.input,'utf8')),{preferredSpawn:p['spawn-x']!==undefined?{x:n('spawn-x'),y:n('spawn-y')}:args.spawn});}
 else{
   args={...args,operation:command,config:{...args.config}};
   for(const[key,field]of[['seed','seed'],['scale','scale'],['sea-level','seaLevel'],['roughness','roughness'],['vegetation','vegetation']])if(p[key]!==undefined)args.config[field]=key==='seed'?p[key]:n(key);
   if(command==='chunk')args.chunk={x:n('x',args.chunk?.x??0),y:n('y',args.chunk?.y??0)};
   if(command==='tile')args.point={x:n('x',args.point?.x??0),y:n('y',args.point?.y??0)};
   if(command==='region'||command==='validate')args.region={x:n('x',args.region?.x??-32),y:n('y',args.region?.y??-32),width:n('width',args.region?.width??64),height:n('height',args.region?.height??64)};
   if(p['spawn-x']!==undefined||p['spawn-y']!==undefined)args.spawn={x:n('spawn-x'),y:n('spawn-y')};
   output=mapOperation(args);
 }
 const text=JSON.stringify(output,null,2)+'\n';if(p.out){await fs.mkdir(path.dirname(path.resolve(p.out)),{recursive:true});await fs.writeFile(p.out,text);console.error(`Saved ${path.resolve(p.out)}`);}else process.stdout.write(text);if(command==='validate'&&!output.ok)process.exitCode=3;
}catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=e instanceof RangeError||e instanceof TypeError||e instanceof SyntaxError?2:1;}
