/* Loopback-only original protocol smoke test, no replacement game logic. */
const path=require('node:path'),fs=require('node:fs');
const base=path.resolve(__dirname,'../../../output/local-original-games/empress-1.0.0');
const WebSocket=require(path.join(base,'runtime/node_modules/ws'));
const socket=new WebSocket('ws://127.0.0.1:4369/ws',{headers:{Origin:'http://127.0.0.1:4369'}});
const result={endpoint:'ws://127.0.0.1:4369/ws',mode:'original watchDemo CPUvsCPU',messageCounts:{},snapshotSamples:[],gameplayUIAccepted:false};
let timer;
socket.on('message',raw=>{const msg=JSON.parse(raw);result.messageCounts[msg.type]=(result.messageCounts[msg.type]||0)+1;
 if(msg.type==='hello'){result.localHostAdmitted=msg.local;socket.send(JSON.stringify({type:'watchDemo',arena:'stadium'}));}
 if(msg.type==='battleStart'){result.startKeys=Object.keys(msg);result.originalStart=msg;}
 if(msg.type==='state'&&result.snapshotSamples.length<4)result.snapshotSamples.push(msg);
 if(msg.type==='error')result.error=msg;
});
socket.on('open',()=>{timer=setTimeout(()=>{socket.send(JSON.stringify({type:'leave'}));socket.close();},2500);});
socket.on('error',error=>{result.error=error.message;});
socket.on('close',()=>{clearTimeout(timer);result.runtimeSmokePassed=Boolean(result.localHostAdmitted&&result.messageCounts.battleStart&&result.messageCounts.state>5&&!result.error);fs.writeFileSync(path.join(base,'protocol-smoke.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({runtimeSmokePassed:result.runtimeSmokePassed,counts:result.messageCounts,error:result.error,snapshotKeys:Object.keys(result.snapshotSamples[0]||{})}));process.exitCode=result.runtimeSmokePassed?0:1;});
