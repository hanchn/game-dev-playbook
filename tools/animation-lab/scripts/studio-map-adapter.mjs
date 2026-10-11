import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const vendor=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../map-vendor');
/** Reuse the extracted upstream Python generator; no upstream process/service is started. */
export function studioMapOperation(args={}){
  const operation=args.operation??'chunk';if(!['chunk','tiled'].includes(operation))throw new RangeError('operation 须为 chunk 或 tiled');
  const payload={world_id:args.world_id??'codex-world',seed:args.seed??2048,chunk_x:args.chunk_x??0,chunk_y:args.chunk_y??0,chunk_size:args.chunk_size??64,environment_id:args.environment_id??'mortal-temperate'};
  for(const key of['seed','chunk_x','chunk_y','chunk_size'])if(!Number.isSafeInteger(payload[key]))throw new TypeError(`${key} 必须为安全整数`);
  const code=`import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom studio_world import generate_world_chunk,world_chunk_to_tiled\ntry:\n chunk=generate_world_chunk(**json.load(sys.stdin))\n print(json.dumps(world_chunk_to_tiled(chunk) if sys.argv[2]=='tiled' else chunk,ensure_ascii=False))\nexcept (ValueError,TypeError) as e:\n print(json.dumps({'error':str(e)}),file=sys.stderr)\n sys.exit(2)\n`;
  const result=spawnSync('python3',['-c',code,vendor,operation],{input:JSON.stringify(payload),encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000});
  if(result.error)throw result.error;if(result.status!==0){let message=result.stderr;try{message=JSON.parse(result.stderr).error;}catch{}if(result.status===2)throw new RangeError(message);throw new Error(message||'上游地图生成失败');}return JSON.parse(result.stdout);
}
