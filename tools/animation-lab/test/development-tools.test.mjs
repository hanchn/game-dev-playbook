import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {callTool} from '../services.mjs';

test('MCP 经 stdio 完成地图、外星人关键帧编辑、UI 导出和错误拒收',async()=>{
 const child=spawn(process.execPath,['mcp.mjs'],{cwd:new URL('..',import.meta.url),stdio:['pipe','pipe','pipe']});
 const waiting=new Map();let id=0,stderr='';child.stderr.on('data',d=>stderr+=d);
 const rl=readline.createInterface({input:child.stdout});rl.on('line',line=>{const r=JSON.parse(line),p=waiting.get(r.id);if(p){waiting.delete(r.id);p.resolve(r);}});
 const request=(method,params)=>new Promise((resolve,reject)=>{const current=++id;waiting.set(current,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:current,method,params})+'\n');});
 const call=async(name,args)=>{const reply=await request('tools/call',{name,arguments:args});assert.equal(reply.error,undefined);assert.notEqual(reply.result.isError,true,reply.result.content[0].text);return JSON.parse(reply.result.content[0].text);};
 const timer=setTimeout(()=>child.kill(),15000);
 child.on('exit',()=>{for(const p of waiting.values())p.reject(Error('MCP unexpectedly exited: '+stderr));});
 try{
  await request('initialize',{protocolVersion:'2025-11-25'});child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const listing=await request('tools/list');assert.ok(listing.result.tools.some(x=>x.name==='studio_world_generate'));
  const plan=await call('game_plan',{brief:{title:'回合测试',genre:'card',engine:'godot',platform:['desktop'],coreLoop:'抽牌、打牌、结算当前回合',objective:'赢得三回合',failure:'生命归零'}});assert.equal(plan.selection.profile,'card');assert.equal(plan.selection.engine,'godot');assert.equal(plan.status,'planned');assert.equal(plan.qa.gameIntegrated,false);
  const objective={description:'收集12个蓝子',event:'puzzle.completed',condition:{blueCollected:{gte:12}}},failure={description:'20步耗尽而蓝子不足12个',event:'puzzle.failed',condition:{movesLeft:{eq:0}}},hud=[{id:'blue',label:'蓝子',path:'puzzle.blueCollected',event:'blue_changed',format:'current / 12'},{id:'moves',label:'剩余步数',path:'puzzle.movesLeft',event:'moves_changed',format:'integer'}];
  const puzzlePlan=await call('game_plan',{brief:{title:'三色棋盘',genre:'puzzle',engine:'Godot 2D',platform:['mobile'],coreLoop:['交换棋子','消除蓝子'],objective,failure,hud}}),linkedUi=await call('ui_suite_from_game',{plan:puzzlePlan});assert.deepEqual(linkedUi.brief.objective,objective);assert.deepEqual(linkedUi.brief.failure,failure);assert.deepEqual(linkedUi.hudBindings.map(h=>h.id),['blue','moves']);assert.equal(linkedUi.brief.engine,'godot');assert.equal(linkedUi.brief.input,'touch');
  const invalidPlan=await request('tools/call',{name:'game_plan',arguments:{brief:{scenes:[{id:'home',connections:['missing']}],entryScene:'home'}}});assert.equal(invalidPlan.result.isError,true);
  const worldArgs={operation:'region',config:{seed:'mcp-roundtrip'},region:{x:-3,y:-4,width:9,height:7}},world=await call('world_generate',worldArgs);
  assert.deepEqual(world,await callTool('world_generate',worldArgs));
  const source=await call('keyframes_create',{species:'human',skin:'alien',clip:'run',count:5});
  const edited=await call('keyframes_edit',{timeline:source,edits:[{op:'rotate',keyIndex:2,partId:'arm-0-upper',degrees:12},{op:'close-loop'}]});
  assert.notEqual(edited.frames[2].transforms['arm-0-upper'].angle,source.frames[2].transforms['arm-0-upper'].angle);
  assert.equal((await call('keyframes_validate',{timeline:edited})).passed,true);
  const frames=await call('keyframes_sample',{timeline:edited,count:16});assert.equal(frames.frames.length,16);assert.equal(frames.qa.visual,'pending');
  const stale=structuredClone(edited);stale.asset.id='human-alien-v0';const rejected=await request('tools/call',{name:'keyframes_sample',arguments:{timeline:stale}});assert.equal(rejected.result.isError,true);
  const ui=await call('ui_suite_plan',{brief:{name:'回合测试',coreLoop:'抽牌、选择一张牌，完成当前回合',genre:'card',theme:'paper',orientation:'portrait'}});
  assert.ok(ui.screens.length>1);assert.equal((await call('ui_suite_validate',{plan:ui})).passed,true);
  const component=ui.components[0],svg=await call('ui_suite_component',{plan:ui,id:component.id});assert.match(svg.svg,/<svg/);assert.equal(svg.visual,'not-reviewed');
  const bad=await request('tools/call',{name:'world_generate',arguments:{operation:'region',region:{x:0,y:0,width:1000,height:1000}}});assert.equal(bad.result.isError,true);
 }finally{clearTimeout(timer);child.stdin.end();await new Promise(resolve=>child.once('close',resolve));rl.close();}
});
