const base = 'assets/research/ssf2t-ken-native/';
const $ = id => document.getElementById(id);
const labels = { idle:'待机', 'qcf-lp':'下↘前＋轻拳（输入意图）', 'dp-lp':'前下↘＋轻拳（输入意图）', 'qcb-lk':'下↙后＋轻脚（输入意图）' };
function label(phase) { const m = /^(stand|crouch|air)-(\d)$/.exec(phase); return labels[phase] || (m ? `${({stand:'站立',crouch:'蹲下',air:'空中'})[m[1]]} ${['轻拳','中拳','重拳','轻脚','中脚','重脚'][Number(m[2])-1]}` : phase); }
let playing = false, tick = 0, phaseIndex = 0, accumulator = 0, previousTime;
try {
  const [data, report] = await Promise.all(['ken-native-motions.json','study-summary.json'].map(async file => { const r = await fetch(base+file); if (!r.ok) throw Error(`${file}: ${r.status}`); return r.json(); }));
  const atlas = new Image(); atlas.src = base+data.atlas; await atlas.decode();
  const fps = Number(report.nativeScreen.refresh), accepted = new Map(data.frames.map(f => [f.frame,f])), rejected = new Map(data.rejected.map(f => [f.frame,f]));
  const phases = report.phases.map(p => { const rows = data.frames.filter(f => f.phase === p.intendedAction); const starts = new Set(rows.map(f => f.frame-f.phaseTick)); if (starts.size !== 1) throw Error(`阶段起点不一致：${p.intendedAction}`); return {...p,start:[...starts][0]}; });
  const context = $('screen').getContext('2d'); context.imageSmoothingEnabled = false;
  for (const [i,p] of phases.entries()) { const option = document.createElement('option'); option.value=i; option.textContent=`${label(p.intendedAction)} · ${p.acceptedSnapshots}/96 通过`; $('phase').append(option); }
  const setPlaying = value => { playing=value; accumulator=0; $('play').textContent=value?'暂停':'播放'; };
  function render() {
    const phase=phases[phaseIndex], frame=phase.start+tick, f=accepted.get(frame), failure=rejected.get(frame);
    context.clearRect(0,0,384,224);
    if (f) {
      const [sx,sy,w,h]=f.atlasRect, [x,y]=f.screenBounds; context.drawImage(atlas,sx,sy,w,h,x,y,w,h);
      if ($('anchor').checked) { const [ax,ay]=f.projectedRAMAnchorInCanvas; context.strokeStyle='#ffdf60'; context.beginPath(); context.moveTo(x+ax-4,y+ay);context.lineTo(x+ax+4,y+ay);context.moveTo(x+ax,y+ay-4);context.lineTo(x+ax,y+ay+4);context.stroke(); }
    }
    $('timeline').value=tick; $('tick').value=tick;
    $('status').textContent=f?`通过 · ${phase.intendedAction} · tick ${tick}/95 · 原版视频帧 ${frame}`:`${failure?'拒收':'缺失'} · tick ${tick}/95 · 原版视频帧 ${frame} · 当前画面刻意留空`;
    $('details').textContent=f?`渲染块画布：${f.rendererBlockCanvas.join(' × ')}\n视口矩形：${f.screenBounds.join(', ')}\n可见边界（画布内）：${f.visibleBoundsInCanvas.join(', ')}\nRAM 投影锚点（画布内）：${f.projectedRAMAnchorInCanvas.join(', ')}\n逐像素匹配：${f.matchFraction*100}% · 比较 ${f.visiblePixelsCompared} 个可见不透明像素\n被视口裁切：${f.clippedByViewport?'是':'否'}\n${f.anchorVerification}`:`未展示任何未经核验图像。\n原因：${failure?.reason || '没有通过帧记录'}\n候选匹配比例：${failure?.matchFraction ?? '无'}\n严禁用上一帧、插值或重建姿势填充此时刻。`;
    for (const [i,button] of [...$('slots').children].entries()) button.classList.toggle('current',i===tick);
  }
  function changePhase(value) { phaseIndex=Number(value);tick=0;accumulator=0;$('phase').value=phaseIndex;$('slots').replaceChildren();const p=phases[phaseIndex]; for(let i=0;i<p.nativeVideoTicks;i++){const button=document.createElement('button');button.className='slot'+(accepted.has(p.start+i)?'':' rejected');button.title=`tick ${i}: ${accepted.has(p.start+i)?'通过':'拒收／空白'}`;button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>{setPlaying(false);tick=i;render();});$('slots').append(button);} $('timeline').max=p.nativeVideoTicks-1;$('tick').max=p.nativeVideoTicks-1;render(); }
  function seek(value) {setPlaying(false);tick=Math.min(phases[phaseIndex].nativeVideoTicks-1,Math.max(0,Math.floor(Number(value)||0)));render();}
  $('phase').addEventListener('change',e=>changePhase(e.target.value));$('play').addEventListener('click',()=>setPlaying(!playing));$('prev').addEventListener('click',()=>seek(tick-1));$('next').addEventListener('click',()=>seek(tick+1));$('timeline').addEventListener('input',e=>seek(e.target.value));$('tick').addEventListener('change',e=>seek(e.target.value));$('anchor').addEventListener('change',render);
  document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}if(e.code==='ArrowLeft'){e.preventDefault();seek(tick-1);}if(e.code==='ArrowRight'){e.preventDefault();seek(tick+1);}});
  const unique=new Map();for(const f of data.frames)if(!unique.has(f.rgbaSHA256))unique.set(f.rgbaSHA256,f);
  for(const f of unique.values()){const button=document.createElement('button');button.className='pose';const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;const [sx,sy,w,h]=f.atlasRect;const scale=Math.min(148/w,148/h,2);ctx.drawImage(atlas,sx,sy,w,h,(160-w*scale)/2,(160-h*scale)/2,w*scale,h*scale);const text=document.createElement('small');text.textContent=`帧 ${f.frame} · ${w}×${h}\n${f.phase} / tick ${f.phaseTick}`;button.append(canvas,text);button.addEventListener('click',()=>{setPlaying(false);changePhase(phases.findIndex(p=>p.intendedAction===f.phase));seek(f.phaseTick);$('screen').scrollIntoView({behavior:'smooth',block:'center'});});$('gallery').append(button);}
  $('source').textContent=`${report.version}；${report.mameBuild}；P${report.targetPlayer}，角色 ID ${report.targetCharacterID}。ROM 核验：${report.romVerification.trim()} ROM 包 SHA256：${report.sourceROMPackageSHA256}。RAM 写入：${report.RAMWrites?'是':'否'}。${report.gameInputs}。方法：${data.method}。独立重跑 ${Object.keys(report.independentRepeat.comparisons).length} 份 CSV 的 SHA256 一致。`;
  for(const url of data.sources){const p=document.createElement('p'),a=document.createElement('a');a.href=url;a.textContent=url;p.append(a);$('source').append(p);}
  const limits=document.createElement('ul');for(const text of report.limitations){const li=document.createElement('li');li.textContent=text;limits.append(li);}$('source').append(limits);
  changePhase(0);
  function loop(now){if(previousTime!==undefined&&playing){accumulator+=Math.min(now-previousTime,250)*Number($('speed').value);const step=1000/fps;let changed=false;while(accumulator>=step){tick=(tick+1)%phases[phaseIndex].nativeVideoTicks;accumulator-=step;changed=true;}if(changed)render();}previousTime=now;requestAnimationFrame(loop);}requestAnimationFrame(loop);
} catch(error){$('error').textContent=`载入失败：${error.message}`;}
