import readline from 'node:readline';
import {definitions,callTool} from './services.mjs';
let initialized=false,ready=false;
const versions=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
async function handle(msg){
 if(msg.jsonrpc!=='2.0'||typeof msg.method!=='string')throw Object.assign(Error('Invalid Request'),{code:-32600});
 if(msg.method==='notifications/initialized'){if(initialized)ready=true;return;}
 if(!Object.hasOwn(msg,'id'))return;
 if(msg.method==='initialize'){initialized=true;return {protocolVersion:versions.includes(msg.params?.protocolVersion)?msg.params.protocolVersion:versions[0],capabilities:{tools:{listChanged:false}},serverInfo:{name:'game-development-lab',version:'0.2.0'},instructions:'游戏计划、UI套图、无限分块地图、角色与关键帧开发辅助。计划不代表实现，技术通过不能替代实际游戏或美术验收。'};}
 if(msg.method==='ping')return {};
 if(!ready)throw Object.assign(Error('尚未完成 MCP 初始化'),{code:-32000});
 if(msg.method==='tools/list')return {tools:definitions};
 if(msg.method==='tools/call'){
 if(!definitions.some(x=>x.name===msg.params?.name))throw Object.assign(Error('未知工具'),{code:-32602});
 try{const result=await callTool(msg.params.name,msg.params.arguments);return {content:[{type:'text',text:JSON.stringify(result)}]};}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}
 }
 throw Object.assign(Error('Method not found'),{code:-32601});
}
for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
 let msg;try{msg=JSON.parse(line);const result=await handle(msg);if(Object.hasOwn(msg,'id'))process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result})+'\n');}catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg?.id??null,error:{code:e.code??(msg?-32603:-32700),message:e.message}})+'\n');}
}
