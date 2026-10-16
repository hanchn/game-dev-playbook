import {frameForTick,nativeClipsFromTrace,specialClipsFromTrace,captureCanPlay} from './kof-timeline.mjs';
import {CAPTURE_COLLECTIONS,normalizeCollection,collectionCharacter} from './kof-collections.mjs';
const $=id=>document.getElementById(id),ctx=$('view').getContext('2d');
let coverage,original,joeOriginal,jumpProbe,checklist,authorGuide,sourceCorrections,identity={characters:{}},specials={characters:{}},clip,windows=[],frames=[],playing=false,tick=0,last=performance.now(),selectionEpoch=0,clipEpoch=0,capture={characters:{}};
let expandedCollections=[],collectionWarnings=[];
const collectionNames={actions:'通用动作',author:'角色招式',meter:'超必杀/MAX',edges:'补充动作'};
const images=new Map();
const names={'idle':'待机','walk-forward':'向前走','walk-back':'后退','run-forward':'前跑','run-forward-attempt':'前跑尝试','run-back-attempt':'后撤尝试','jump':'跳跃','jump-neutral':'原地跳','crouch':'下蹲','approach':'接近对手','light-punch':'轻拳','heavy-punch':'重拳','light-kick':'轻脚','heavy-kick':'重脚','receive-light':'轻受击','receive-heavy':'重受击','guard':'防御'};
function phaseName(id){return names[id]||id.replace(/^far-/,'站立远身 ').replace(/^close-/,'近身 ').replace(/^crouch-/,'下蹲 ').replace(/^qcf-/,'↓↘→ ').replace(/^qcb-/,'↓↙← ').replace(/^dp-/,'→↓↘ ').replace(/-attempt$/,' 尝试');}
async function read(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(path+' · HTTP '+r.status);return r.json();}
function text(parent,tag,value){const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;}
function stop(){playing=false;$('play').textContent='播放';}
function fail(e){stop();$('error').textContent=e.message;$('play').disabled=true;$('step').disabled=true;}
async function loadImages(items,current){const loaded=new Map(),paths=[...new Set(items.map(f=>f.image))];let next=0;
 await Promise.all(Array.from({length:Math.min(4,paths.length)},async()=>{while(next<paths.length&&current()){const path=paths[next++];try{await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{loaded.set(path,im);resolve();};im.onerror=()=>reject(Error('原版图加载失败：'+path+'；原始采样仅本机保留时，请先按采集记录复现。'));im.src=path;});}catch(error){if(current())throw error;}}}));return loaded;
}
async function loadCapture(){
 try{capture=await read('data/research/kof98-multichar-20261016/progress.json');}catch{$('capture-progress').textContent='多人采集进度尚未发布；已取得的精灵可单独查看。';return;}
 try{identity=await read('data/research/kof98-multichar-20261016/identity-review.json');}catch{identity={characters:{}};}
 try{specials=await read('data/research/kof98-specials-20261016/summary.json');}catch{specials={characters:{}};}
 const result=await Promise.allSettled(CAPTURE_COLLECTIONS.map(async source=>{const path=`data/research/kof98-${source}-20261016/playback-index.json`,r=await fetch(path,{cache:'no-store'});if(r.status===404)return null;if(!r.ok)throw Error(path+' HTTP '+r.status);return normalizeCollection(await r.json(),source);}));
 expandedCollections=result.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value);collectionWarnings=result.filter(r=>r.status==='rejected').map(r=>String(r.reason));
 const characters=coverage.characters.map(c=>collectionCharacter(expandedCollections,c.id));
 $('expanded-progress').textContent=`本轮新增：${characters.filter(c=>c.clips.length).length}/16 人有采样 · ${characters.reduce((n,c)=>n+c.clips.length,0)} 段原画 · ${characters.reduce((n,c)=>n+c.blocked.length,0)} 项条件待补。${collectionWarnings.length?' 索引错误：'+collectionWarnings.join('；'):''}`;
 const count=Object.values(capture.characters||{}).filter(captureCanPlay).length;
 $('capture-progress').textContent=`原画场景已采 ${count}/16 人（未等于精灵/全招验收）${capture.active?' · 当前 '+capture.active:''}`;
 for(const c of coverage.characters){const cell=$('source-'+c.id),source=capture.characters?.[c.id];if(cell)cell.textContent=(collectionCharacter(expandedCollections,c.id).clips.length?'本轮 '+collectionCharacter(expandedCollections,c.id).clips.length+' 段；':'')+(captureCanPlay(source)?`原场景采样 ${source.frames} 刷新；${identity.characters?.[c.id]?.identityVisualVerified?'身份已核对；':''}精灵/全招未验收${c.original.observedWindows?'；另有'+c.original.observedWindows+'段精灵采样':''}`:c.original.observedWindows?c.original.observedWindows+' 段原版精灵采样 · 未全招验收':'尚未取得可用原版采样 · 未完成');}
}
function renderChecklist(row){
 const moves=checklist.characters.find(c=>c.character.toLowerCase()===row.id);$('move-checklist').replaceChildren();
 if(!moves){$('move-summary').textContent=row.name+'：招式清单尚未整理。';return;}
 $('move-summary').textContent=`${row.name} · 官方部分招式按钮变体 ${moves.specialVariants.length} 条 · 基础/受击输入候选 ${moves.basicAndReactionCandidates.length} 条 · 全招式未验收`;
 for(const m of moves.specialVariants){const tr=document.createElement('tr');text(tr,'td',m.name);text(tr,'td',`${m.directionNotation} + ${m.adaptedNeoGeoButton} ${m.conditions.join('；')}`);text(tr,'td',m.runtimeExecutionVerified?'已记录触发核对，仍须精灵/判定验收':'待原版触发核对');$('move-checklist').append(tr);}
 for(const m of moves.basicAndReactionCandidates){const tr=document.createElement('tr');text(tr,'td',m.id);text(tr,'td',m.button||'依测试条件');text(tr,'td','基础输入覆盖候选，未验收');$('move-checklist').append(tr);}
 $('move-missing').textContent='仍缺：'+moves.missing.join('；');
 const guide=authorGuide.characters.find(c=>c.character.toLowerCase()===row.id);$('author-checklist').replaceChildren();
 if(guide){$('author-summary').textContent=`${row.name} · 作者研究表 ${guide.sourceMoves.length} 行；与官方简表有重合，不相加计招式完成。`;
  for(const m of guide.sourceMoves){const tr=document.createElement('tr');text(tr,'td',m.name);text(tr,'td',[m.conditionRaw,m.commandTokens.join(' ')].filter(Boolean).join(' · '));const cell=text(tr,'td',m.sourceVisuallyCorrected?'原表图像已校正；待原版动作/条件验证':m.segmentCandidates.length?'待原版动作/条件验证':'命令分段待核对');const link=text(cell,'a',` · 原表第${m.sourcePage}页`);link.href='data/research/kof98-move-research-20261016/neo-encyclopedia-kof98-moves.pdf#page='+m.sourcePage;link.target='_blank';link.rel='noopener';$('author-checklist').append(tr);}
 }
}
async function choose(){
 const epoch=++selectionEpoch;++clipEpoch;stop();tick=0;frames=[];windows=[];draw();$('play').disabled=true;$('step').disabled=true;$('tick').disabled=true;$('tick').value='0';$('tick').max=0;$('error').textContent='';
 const row=coverage.characters.find(c=>c.id===$('character').value);
 renderChecklist(row);
 const expanded=collectionCharacter(expandedCollections,row.id);$('expanded-character').textContent=`${row.name} · 新采样 ${expanded.clips.length} 段 · 预期状态证据 ${expanded.observed} 段 · 待逐招核对 ${expanded.unverified} 段 · 未观察触发 ${expanded.notObserved} 段 · 条件待补 ${expanded.blocked.length} 项`;
 $('expanded-blocked').replaceChildren(...expanded.blocked.map(b=>{const li=document.createElement('li');li.textContent=`${collectionNames[b.sourceCollection]} / ${b.label||b.id}：${b.reason||'条件尚未满足'}`;return li;}));
 const ss=specials.characters?.[row.id];$('special-availability').textContent=ss?.captureReady?`专项采集：${ss.attempted} 条输入已采，${ss.blocked} 条条件不足；招式触发验收 ${ss.moveVariantsVerified||0} 条。`:'专项采集尚未就绪；不会以基础窗口替代。';
 if($('view-mode').value==='expanded')windows=expanded.clips;
 else if($('view-mode').value==='special'&&specials.characters?.[row.id]?.captureReady&&specials.characters[row.id].traceValid){
  const base=`data/research/kof98-specials-20261016/${row.id}/`;const [response,moves,attempts]=await Promise.all([fetch(base+'trace.csv',{cache:'no-store'}),read(base+'moves.json'),read(base+'attempt-status.json')]);if(!response.ok)throw Error('专项原版轨迹加载失败');const text=await response.text();if(epoch!==selectionEpoch)return;windows=specialClipsFromTrace(text,moves,row.id,ss.refreshHz||original.refreshHz,attempts);
 }else if($('view-mode').value==='native'&&captureCanPlay(capture.characters?.[row.id])){
  $('status').textContent='载入原版输入/刷新轨迹…';const response=await fetch(`data/research/kof98-multichar-20261016/${row.id}/trace.csv`,{cache:'no-store'});if(!response.ok)throw Error('原版轨迹加载失败');const text=await response.text();if(epoch!==selectionEpoch)return;windows=nativeClipsFromTrace(text,row.id);
 }else if($('view-mode').value==='sprite'&&row.id==='kyo')windows=original.clips;
 else if($('view-mode').value==='sprite'&&row.id==='joe')windows=joeOriginal.clips;
 if($('view-mode').value==='native'&&row.id==='joe'){for(const c of windows)if(c.id==='jump-neutral')c.triggerReview=joeOriginal.clips.find(c=>c.id==='jump-neutral')?.triggerReview;windows.unshift(jumpProbe.clip);}
 if(epoch!==selectionEpoch)return;
 $('clip').replaceChildren(...windows.map(c=>Object.assign(document.createElement('option'),{value:c.id,textContent:(c.expandedCapture?collectionNames[c.sourceCollection]+' / ':'')+(c.label||phaseName(c.id))+(c.sourceCollection==='actions'?' ['+c.batch+']':'')+(c.parentChain?.length>1?' ← '+c.parentChain.slice(0,-1).map(p=>p.name).join(' → '):'')+(c.expandedCapture?c.triggerStatus==='observed'?' · 有状态证据':c.triggerStatus==='not_observed'?' · 未观察触发':' · 待核对':c.triggerReview?.status==='not-observed'?' · 未观察到动作触发':c.nativeScene?' · 原场景/输入尝试':c.allFrameSamplesPassed?' · 限定像素检查通过':' · 有差异候选')})));
 if(!windows.length){clip=null;$('status').textContent=row.name+'：当前内容尚未取得，不代播其他角色。';$('limitations').textContent='原场景采样、重建精灵、全招式验收分别记录。';draw();return;}
 await selectClip();
}
async function selectClip(){
 const epoch=++clipEpoch;stop();tick=0;clip=windows.find(c=>c.id===$('clip').value);frames=[];$('play').disabled=true;$('step').disabled=true;draw();
 $('tick').disabled=true;$('error').textContent='';$('status').textContent='载入当前动作的原生连续画面…';
 const chosen=clip,loaded=await loadImages(chosen?.frames||[],()=>epoch===clipEpoch);if(epoch!==clipEpoch)return;images.clear();for(const [path,im] of loaded)images.set(path,im);
 frames=chosen.frames;$('play').disabled=!frames.length;$('step').disabled=!frames.length;$('tick').disabled=!frames.length;$('tick').max=Math.max(0,frames.reduce((n,f)=>n+f.ticks,0)-1);$('tick').value='0';$('mirror').disabled=!!(chosen.nativeScene||chosen.nativeSprite);
 if(chosen.nativeScene){const source=chosen.specialCapture?specials:identity;$('status').textContent=`原画场景采样：${source.characters?.[$('character').value]?.identityVisualVerified?'已核对选角身份；':'身份尚待核对；'}输入尝试不自动证明招式触发。`;$('limitations').textContent='这是完整模拟器画面（含HUD/对手），不是已切分透明精灵。逐刷新保留，不做整图淡化。特殊/近身输入尚须逐人视觉和状态核对。'+(chosen.specialCapture?'专项窗口包括准备和前招收势；条件不足的招式列为blocked，不伪造播放。':'');}
 else{$('status').textContent=chosen.allFrameSamplesPassed?'限定可见区域像素检查通过；仍非完整招式/判定验收。':'候选：存在原画面像素差异，尚未验收通过。';$('limitations').textContent=chosen.nativeSprite?'按逐刷新实体坐标还原固定原生镜头，保留跳高、位移与同图位置变化。207个遮挡刷新另以原绘制顺序合成核对；HUD区排除，影子/反射不作本体。原版输入窗口仍未等于全招式或动作触发验收。':'采样窗口包含出招前后待机，不代表招式本身长度。底部HUD遮挡区被排除；走跑、踢击、受击候选仍有差异。画布与pivot是重建导出坐标，并非原作者画布。';}
 if(chosen.triggerReview?.status==='not-observed')$('status').textContent='未观察到起跳：这是失败的原始输入窗口，像素匹配不代表动作成功，不计入跳跃完成。';
 if(chosen.triggerObserved)$('status').textContent='独立补采已观察到起跳→腾空→落地；原前跑接跳跃的失败窗口保留，未计作全动作通过。';
 if(chosen.expandedCapture){$('status').textContent=`本轮原画采样：${chosen.triggerStatus==='observed'?'已记录预期状态证据，仍需逐招视觉/帧表验收':chosen.triggerStatus==='not_observed'?'未观察预期动作触发，不计通过':'输入已采，实际招式与条件待核对'}。`;$('limitations').textContent='保持原始画面、源刷新和输入记录；这是整幅原场景，透明拆帧与判定恢复另验。'+(chosen.evidenceNote||'')+(chosen.parentChain?.length?' 指令链：'+chosen.parentChain.map(p=>[p.name,p.motion,p.button,p.condition].filter(Boolean).join(' ')).join(' → '):'');}
 draw();
}
function draw(){
 ctx.clearRect(0,0,640,560);
 if(!frames.length){ctx.fillStyle='#d9b77b';ctx.textAlign='center';ctx.fillText('没有当前角色的可播放素材，不借用其他角色',320,280);$('timing').textContent='';return;}
 const found=frameForTick(frames,tick),f=found.frame,image=images.get(f.image);if(!image)return;
 ctx.imageSmoothingEnabled=false;
 if(clip.nativeScene)ctx.drawImage(image,0,56,640,448);
 else if(clip.nativeSprite){ctx.save();ctx.beginPath();ctx.rect(0,56,640,448);ctx.clip();ctx.strokeStyle='#7eaaa4';ctx.beginPath();ctx.moveTo(0,456);ctx.lineTo(640,456);ctx.stroke();ctx.drawImage(image,(f.entityNativeScreen[0]-f.pivot[0])*2,56+(f.entityNativeScreen[1]-f.pivot[1])*2,image.width*2,image.height*2);ctx.restore();}
 else{ctx.strokeStyle='#7eaaa4';ctx.beginPath();ctx.moveTo(0,480);ctx.lineTo(640,480);ctx.stroke();ctx.save();ctx.translate(320,480);ctx.scale($('mirror').checked?-2.7:2.7,2.7);ctx.drawImage(image,-f.pivot[0],-f.pivot[1]);ctx.restore();}
 const hz=clip.refreshHz||original.refreshHz;$('timing').textContent=`原版刷新 ${Math.floor(tick)}/${found.total-1} · 当前图持 ${f.ticks} 刷新 · 来源tick ${f.sourceTick} · ${hz.toFixed(6)}Hz`;$('tick').value=String(Math.floor(tick));
}
async function init(){
 [coverage,original,checklist,authorGuide,joeOriginal,jumpProbe,sourceCorrections]=await Promise.all([read('data/kof16-coverage.json'),read('data/research/kof16-coverage-20261016/kyo-original-study.json'),read('data/research/kof98-move-research-20261016/executable-move-checklist.json'),read('data/research/kof98-move-research-20261016/author-guide-extended-checklist.json'),read('data/research/kof16-coverage-20261016/joe-original-study.json'),read('data/research/kof16-coverage-20261016/joe-jump-probe.json'),read('data/research/kof98-source-row-fixes-20261016/corrections.json')]);
 for(const entry of authorGuide.characters){const id=entry.character.toLowerCase();entry.sourceMoves=entry.sourceMoves.filter(m=>!sourceCorrections.nonMoveFragments.some(f=>f.character===id&&f.page===m.sourcePage&&Math.abs(f.sourceY-m.sourceRowY)<.02)).map(m=>{const fix=sourceCorrections.corrections.find(f=>f.character===id&&f.name===m.name&&f.page===m.sourcePage);return fix?{...m,commandTokens:fix.commandTokens,conditionRaw:fix.conditionRaw,sourceVisuallyCorrected:true}:m;});}
 $('summary').textContent=`目标 ${coverage.targetCharacters} 人 · 原版全招式完成 ${coverage.completeOriginalCharacters} 人 · 原版部分精灵采样 ${coverage.originalPartialCharacterCount} 人 · 改编预览 ${coverage.adaptedCharacterCount} 人 / ${coverage.adaptedSelectableActions} 组（不计完成）`;
 for(const c of coverage.characters){
  $('character').append(Object.assign(document.createElement('option'),{value:c.id,textContent:c.name}));const tr=document.createElement('tr');text(tr,'td',c.name);text(tr,'td',c.original.observedWindows?c.original.observedWindows+' 段原版精灵采样 · 未全招验收':'尚未提取精灵 · 未完成').id='source-'+c.id;
  const adapted=text(tr,'td',c.adapted.present?c.adapted.selectableActionCount+' 组可预览 / '+c.adapted.parsedAIRGroupCount+' 个已解析AIR组':'未导入改编');
  if(c.adapted.present){const a=text(adapted,'a','查看改编预览');a.href='/?tab=characters&character='+encodeURIComponent(c.adapted.characterId);text(adapted,'small','；AIR组数不等于招式数，CNS战斗逻辑未完整执行。');}
  const details=text(text(tr,'td',''),'details','');text(details,'summary','查看缺项与官方部分招式');text(details,'p',c.missingCategories.join('；'));if(c.official){const a=text(details,'a','SNK官方部分出招参考');a.href=c.official.sourceURL;a.target='_blank';a.rel='noopener';text(details,'p',c.official.listedSpecialNames.join(' / '));} $('coverage').append(tr);
 }
 $('character').onchange=()=>{if($('view-mode').value!=='expanded')$('view-mode').value=$('character').value==='kyo'?'sprite':'native';choose().catch(fail);};$('view-mode').onchange=()=>choose().catch(fail);$('clip').onchange=()=>selectClip().catch(fail);
 $('refresh-capture').onclick=()=>loadCapture().then(choose).catch(fail);
 $('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'暂停':'播放';};$('step').onclick=()=>{stop();tick=(Math.floor(tick)+1)%frames.reduce((n,f)=>n+f.ticks,0);draw();};$('tick').oninput=()=>{stop();tick=Number($('tick').value);draw();};$('mirror').onchange=draw;
 await loadCapture();if(expandedCollections.some(c=>Object.values(c.characters).some(v=>v.clips.length)))$('view-mode').value='expanded';await choose();
 function loop(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(playing&&frames.length){tick=(tick+dt*(clip.refreshHz||original.refreshHz)*Number($('speed').value))%frames.reduce((n,f)=>n+f.ticks,0);draw();}requestAnimationFrame(loop);}requestAnimationFrame(loop);
}
init().catch(fail);
