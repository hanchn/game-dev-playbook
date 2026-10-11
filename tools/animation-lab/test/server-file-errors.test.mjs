import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('missing source files return404 without crashing the server or preventing later actual PNG reads',async()=>{
 const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',b=>errors+=b);
 try{
  await new Promise((resolve,reject)=>{const deadline=setTimeout(()=>reject(Error('server startup timeout '+errors)),5000);child.stdout.on('data',b=>{if(b.toString().includes('角色资产工作台')){clearTimeout(deadline);resolve();}});child.once('exit',code=>{clearTimeout(deadline);reject(Error('server exited '+code+' '+errors));});});
  for(const path of ['/art/dinosaur-side-parts-v99999.png','/frame-animation-assets/qa-missing-source.png','/ui-suite/dinosaur-ui-kit-v2/qa-missing-source.png','/map-resources/qa-missing-source.png']){
   const r=await fetch(`http://127.0.0.1:${port}${path}`);assert.equal(r.status,404,path);assert.match((await r.json()).error,/不存在/);assert.equal(child.exitCode,null,'missing file crashed the server');
   assert.equal((await fetch(`http://127.0.0.1:${port}/lab`)).status,200,'later page request failed');
  }
  const png=await fetch(`http://127.0.0.1:${port}/art/dinosaur-leg-parts-v1.png`);assert.equal(png.status,200);assert.match(png.headers.get('content-type'),/image\/png/);const bytes=Buffer.from(await png.arrayBuffer()),source=await fs.readFile(new URL('../public/art/dinosaur-leg-parts-v1.png',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(source).digest('hex'));assert.doesNotMatch(errors,/ERR_HTTP_HEADERS_SENT|uncaught/i);
 }finally{child.kill();await once(child,'exit').catch(()=>{});}
});
