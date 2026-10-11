#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {createGamePlan} from '../game-plan.mjs';
const help=`Codex 完整游戏规划（不宣称已实现）
node scripts/game-plan-cli.mjs plan --brief brief.json --output game-plan.json
node scripts/game-plan-cli.mjs plan --brief-json '{"genre":"puzzle"}' --output game-plan.json
--brief 支持文件路径，或以 { 开头的 inline JSON；--brief-json 仅接受 inline JSON。
未指定 --output 时输出标准 JSON 到 stdout。
退出码：0 计划结构合法；2 输入/schema/场景图错误；1 IO或运行错误。
结构合法不代表游戏已运行、美术已验收或条件连接实际可达。`;
try{
 const argv=process.argv.slice(2),command=argv.shift()??'help';if(['help','--help','-h'].includes(command)){console.log(help);process.exit(0);}if(command!=='plan')throw new TypeError('命令须为 plan');
 const options={};for(let i=0;i<argv.length;i++){if(!['--brief','--brief-json','--output'].includes(argv[i]))throw new TypeError(`未知参数 ${argv[i]}`);const key=argv[i].slice(2);if(options[key]!==undefined||i+1>=argv.length)throw new TypeError(`重复参数或缺少值: ${argv[i]}`);options[key]=argv[++i];}
 if((options.brief!==undefined)===(options['brief-json']!==undefined))throw new TypeError('--brief 与 --brief-json 须二选一');
 let raw=options['brief-json']??options.brief;if(options['brief-json']===undefined&&!raw.trimStart().startsWith('{')){const stat=await fs.stat(raw);if(stat.size>2*1024*1024)throw new TypeError('brief 文件超过2 MiB');raw=await fs.readFile(raw,'utf8');}
 const plan=createGamePlan(JSON.parse(raw)),text=JSON.stringify(plan,null,2)+'\n';if(options.output){const output=path.resolve(options.output);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,text);console.error(JSON.stringify({saved:output,schema:plan.schema,status:plan.status,assumptions:plan.assumptions.length}));}else process.stdout.write(text);
}catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=e instanceof TypeError||e instanceof RangeError||e instanceof SyntaxError?2:1;}
