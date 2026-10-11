import {frameFor} from '/skin-renderer.mjs';
import {chickenSceneFrame,CHICKEN_SCENE_VERSION,createChickenFlock} from '/chicken-scene-core.mjs';
import {captureCanvasSequence} from '/canvas-sequence-capture.mjs';
import {storedZip} from '/frame-animation-core.mjs';
import {chickenAssets,createChickenPerformance,drawChickenScene,CHICKEN_RENDERER_VERSION} from '/chicken-scene-renderer.mjs';
import {CHICKEN_SCENARIOS} from '/chicken-scene-core.mjs';
import {ChickenAudio} from '/chicken-audio.mjs';
const audio=new ChickenAudio();
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d');let flockCount=3,bundle,sourceRecords,scene,time=0,playing=true,previous=0,dirty=true,lastActorUpdate=-1,recording=false,cancelled=false,lastCapture=null,movieURL=null;
const duration=()=>CHICKEN_SCENARIOS[scene.scenario].duration;
const title=()=>({flock:'鸡群',lay:'母鸡下蛋',crow:'公鸡打鸣',fight:'双鸡格斗与掉毛'})[scene.scenario];
function setup(){scene=$('scenario').value==='flock'?createChickenFlock(flockCount,{sex:$('flock-sex').value}):createChickenPerformance($('scenario').value);$('count').disabled=scene.scenario!=='flock';$('flock-sex-label').hidden=scene.scenario!=='flock';$('flock-sex').disabled=scene.scenario!=='flock';$('count').value=String(scene.actors.length);$('time').max=duration()*1000;$('record').textContent=`拍摄一轮 · ${duration()} 秒`;time=0;lastActorUpdate=-1;dirty=true;}
function drawScene(context,frozen,t){return drawChickenScene(context,frozen,t,bundle);}
function draw(){if(!bundle||recording)return;const sampled=drawScene(ctx,scene,time);audio.sync({scenario:scene.scenario,time,playing,speed:Number($('speed').value),recording});
  $('clock').textContent=time.toFixed(2)+` / ${duration().toFixed(2)} s`;$('time').value=String(Math.round(time*1000));
  const tick=Math.floor(time*5);if(lastActorUpdate!==tick){lastActorUpdate=tick;$('actors').replaceChildren(...sampled.actors.map(a=>{const e=document.createElement('div');e.className='actor';e.textContent=`${a.id} · ${title()} · ${a.sex==='hen'?'母鸡':'公鸡'} · ${((scene.scenario==='flock'?a.phase:sampled.time/duration())*100).toFixed(0)}%`;return e;}));}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('scenario').onchange=setup;$('flock-sex').onchange=setup;$('count').onchange=()=>{flockCount=Number($('count').value);setup();};$('speed').onchange=()=>previous=0;$('play').onclick=()=>{if(time>=duration())time=0;playing=!playing;previous=0;dirty=true;if(!playing)audio.stopPreview();$('play').textContent=playing?'暂停':'播放';};$('restart').onclick=()=>{time=0;previous=0;playing=true;$('play').textContent='暂停';dirty=true;};$('time').oninput=()=>{time=Number($('time').value)/1000;playing=false;$('play').textContent='播放';dirty=true;};$('png').onclick=()=>{if(bundle)canvas.toBlob(blob=>download(blob,`chicken-${scene.scenario}-${time.toFixed(2)}.png`),'image/png');};$('json').onclick=()=>download(new Blob([JSON.stringify({scene,current:drawScene(ctx,scene,time),assets:bundle.assets,canvas:[1280,720],camera:'fixed',qa:{visual:'not-approved'}},null,2)],{type:'application/json'}),`chicken-${scene.scenario}.json`);
$('sound').onclick=async()=>{try{if(!audio.enabled)await audio.unlock();audio.enabled=!audio.enabled;$('sound').textContent=audio.enabled?'预览声音：开':'预览声音：关';$('sound').setAttribute('aria-pressed',String(audio.enabled));audio.stopPreview();dirty=true;}catch(e){$('status').textContent=e.message;}};
function tick(now){requestAnimationFrame(tick);if(playing&&bundle){if(previous)time=Math.min(duration(),time+Math.min(.1,(now-previous)/1000)*Number($('speed').value));if(time>=duration()){playing=false;$('play').textContent='重播';}dirty=true;}previous=now;if(dirty){draw();dirty=false;}}
try{
 const response=await fetch('/art/skins.json');if(!response.ok)throw Error('角色材质加载失败');const catalog=await response.json(),assets=chickenAssets(),skins={rooster:catalog.chicken,hen:catalog['chicken-hen']};
 const extraResponse=await fetch('/art/chicken-performance-extras-v1.json');if(!extraResponse.ok)throw Error('表演配件加载失败');const extras=await extraResponse.json();extras.atlas='/art/chicken-performance-extras-v1.png';
 const intermediateResponse=await fetch('/art/chicken-crow-intermediates-v1.json');if(!intermediateResponse.ok)throw Error('中间嘴型加载失败');const intermediates=await intermediateResponse.json();intermediates.atlas='/art/chicken-crow-intermediates-v1.png';const images={},records=[];
 for(const [key,skin]of Object.entries({...skins,extras,intermediates})){
  if(!['extras','intermediates'].includes(key)&&(skin.atlas!==assets[key].rendering.atlas||skin.integration?.reuseRig&&skin.integration.reuseRig!==assets[key].id))throw Error('素材与骨架版本不匹配，请重新加载');
  const response=await fetch(skin.atlas);if(!response.ok)throw Error(`源图加载失败 ${skin.atlas}`);const bytes=await response.arrayBuffer(),url=URL.createObjectURL(new Blob([bytes],{type:'image/png'})),image=new Image();try{image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}images[key]=image;records.push({key,atlas:skin.atlas,bytes,skin:structuredClone(skin)});
 }
 for(const [key,skin]of Object.entries(skins)){images[key].sourceImages={};for(const [sourceKey,source]of Object.entries(skin.sources??{})){
  const response=await fetch(source.atlas);if(!response.ok)throw Error(`配件源图加载失败 ${source.atlas}`);const bytes=await response.arrayBuffer(),url=URL.createObjectURL(new Blob([bytes],{type:'image/png'})),image=new Image();try{image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}if(image.naturalWidth!==source.width||image.naturalHeight!==source.height)throw Error(`配件原生尺寸不符 ${source.atlas}`);images[key].sourceImages[sourceKey]=image;records.push({key:`${key}:${sourceKey}`,atlas:source.atlas,bytes,skin:structuredClone(source)});
 }}
 bundle={assets,skins,images,extras,intermediates};sourceRecords=records;setup();$('source').textContent=`公鸡 ${assets.rooster.id} · 母鸡 ${assets.hen.id} · 编排 v${CHICKEN_SCENE_VERSION} / 渲染 v${CHICKEN_RENDERER_VERSION} · 固定相机 · 新场景待美术验收`;$('status').textContent='真实公母鸡和配件已加载';requestAnimationFrame(tick);
}catch(e){$('status').textContent=e.message;}

const sha256=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG 编码失败')),'image/png'));
$('cancel').onclick=()=>{cancelled=true;$('status').textContent='正在保留已完成帧…';};
$('record').onclick=async()=>{
  if(recording||!bundle)return;
  const frozen=structuredClone(scene),prior={playing,time};recording=true;cancelled=false;playing=false;previous=0;audio.stopPreview();
  const controls=[...document.querySelectorAll('button,input,select')].filter(e=>e.id!=='cancel').map(e=>[e,e.disabled]);controls.forEach(([e])=>e.disabled=true);$('cancel').hidden=false;
  let audioCapture=null;
  try{
    if(frozen.scenario==='crow')audioCapture=await audio.prepareCapture();
    const sources=[];for(const record of sourceRecords)sources.push({key:record.key,atlas:record.atlas,sha256:await sha256(record.bytes),skinSha256:await sha256(new TextEncoder().encode(JSON.stringify(record.skin))),skin:record.skin});const capture=document.createElement('canvas');capture.width=1280;capture.height=720;
    const result=await captureCanvasSequence({canvas:capture,duration:CHICKEN_SCENARIOS[frozen.scenario].duration,fps:12,audioStream:audioCapture?.stream,onStart:audioCapture?.start,shouldCancel:()=>cancelled,drawFrame:({context,timeSeconds,index})=>{
      const sampled=drawScene(context,frozen,timeSeconds);return {name:`frames/${String(index+1).padStart(3,'0')}.png`,actors:sampled.actors.map(a=>({id:a.id,sex:a.sex,facing:a.facing,clip:a.clip,phase:a.phase,blend:a.blend,offsetX:a.offsetX,bodyDrop:a.bodyDrop,bodyLift:a.bodyLift,neckLift:a.neckLift,beakOpen:a.beakOpen,reaction:a.reaction,legTuck:a.legTuck,fightLegProfile:a.fightLegProfile,legKick:a.legKick,assetId:a.assetId,egg:a.egg,nest:a.nest,crow:a.crow,state:a.state})),props:sampled.props};
    },onFrame:(frame,index,total)=>{$('status').textContent=`拍摄 ${index+1}/${total} 帧`;time=frame.sourceTime;dirty=false;ctx.drawImage(frame.image,0,0);$('clock').textContent=time.toFixed(2)+` / ${duration().toFixed(2)} s`;$('time').value=String(Math.round(time*1000));const tick=Math.floor(time*5);if(lastActorUpdate!==tick){lastActorUpdate=tick;$('actors').replaceChildren(...frame.actors.map(a=>{const e=document.createElement('div');e.className='actor';e.textContent=`${a.id} · ${title()} · ${a.sex==='hen'?'母鸡':'公鸡'} · ${((frozen.scenario==='flock'?a.phase:time/duration())*100).toFixed(0)}%`;return e;}));}}});
    $('cancel').disabled=true;const files=[],frameRecords=[];for(const [i,frame]of result.frames.entries()){
      const blob=await png(frame.image),bytes=await blob.arrayBuffer();files.push({name:frame.name,data:bytes});const {image,...meta}=frame;frameRecords.push({...meta,sha256:await sha256(bytes)});$('status').textContent=`整理逐帧 PNG ${i+1}/${result.frames.length}`;
    }
    const contact=document.createElement('canvas');contact.width=8*320;contact.height=Math.ceil(result.frames.length/8)*180;const g=contact.getContext('2d');for(const [i,frame]of result.frames.entries())g.drawImage(frame.image,(i%8)*320,Math.floor(i/8)*180,320,180);files.push({name:'contact-sheet.png',data:await(await png(contact)).arrayBuffer()});
    const movieName=`chicken-${frozen.scenario}.${result.extension}`,movieBytes=await result.movie.arrayBuffer();files.push({name:movieName,data:movieBytes});
    const audioRecord=audioCapture?{...audioCapture.metadata,file:'audio/rooster-crow-v1.wav',sha256:await sha256(audioCapture.bytes)}:null;if(audioCapture)files.push({name:audioRecord.file,data:audioCapture.bytes});
    const manifest={schemaVersion:1,type:'skeletal-scene-capture',capturePreviewVersion:2,choreographyVersion:CHICKEN_SCENE_VERSION,rendererVersion:CHICKEN_RENDERER_VERSION,scene:frozen,assets:structuredClone(bundle.assets),sources,canvas:[1280,720],fixedTransform:{actorScale:frozen.actorScale,camera:'fixed',anchors:Object.fromEntries(Object.entries(bundle.assets).map(([key,a])=>[key,frameFor(a).anchor]))},receipt:result.receipt,movie:{file:movieName,sha256:await sha256(movieBytes),mimeType:result.mimeType},frames:frameRecords,qa:{visual:'failed',timing:'requires-decoded-video-verification',notes:'公母鸡与开合头部为独立真实素材。新场景的源图比例、衔接、蹲姿、嘴型过渡和产蛋遮挡仍在美术复测，本片尚未通过。'}};
    manifest.audio=audioRecord;files.push({name:'capture.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});lastCapture={movie:result.movie,movieName,zip:new Blob([storedZip(files)],{type:'application/zip'}),manifest};
    if(movieURL)URL.revokeObjectURL(movieURL);movieURL=URL.createObjectURL(result.movie);$('movie').src=movieURL;$('film').hidden=false;$('capture-summary').textContent=`${result.receipt.cancelled?'已停止的片段':({flock:'鸡群动作',lay:'母鸡下蛋',crow:'公鸡打鸣',fight:'双鸡格斗与掉毛'})[frozen.scenario]} · ${frozen.actors.length} 只鸡 · ${result.frames.length} 张 PNG · 固定比例 ${frozen.actorScale} · 1280 × 720 · 12 FPS${audioRecord?(result.receipt.cancelled&&result.receipt.actualElapsedSeconds<=audioRecord.start?" · 含录音素材；停止前未到打鸣段":" · 含真实打鸣录音，声音以实际成片为准"):""}。视频与 PNG 取自同一画面；美术仍在复测。`;$('status').textContent='成片可播放并下载；逐帧包包含源图哈希、动作与拍摄时序。';
  }catch(e){$('status').textContent=`拍摄失败：${e.message}`;}
  finally{audioCapture?.stop();recording=false;$('cancel').hidden=true;$('cancel').disabled=false;controls.forEach(([e,disabled])=>e.disabled=disabled);playing=prior.playing;time=prior.time;previous=0;dirty=true;}
};
$('movie-save').onclick=()=>lastCapture&&download(lastCapture.movie,lastCapture.movieName);
$('sequence-save').onclick=()=>lastCapture&&download(lastCapture.zip,`chicken-${lastCapture.manifest.scene.scenario}-capture.zip`);
