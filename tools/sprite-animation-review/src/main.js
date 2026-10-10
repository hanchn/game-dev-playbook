import Phaser from 'phaser';
import './style.css';
import {normalizeManifest,validateBounds,frameAt,advance,placement,wrap,exportConfig} from './model.js';
const $ = id => document.getElementById(id);
const state = {paused:false,manual:null,speed:1,direction:1,mode:'time',light:false};
let manifest, game, configFile = null, imageURLs = new Map(), reloadNumber = 0;
const exportURLs = [];
const status = message => { $('status').textContent = message; };
const download = (url,name) => {
  const kind=name.endsWith('.png')?'png':'json', old=$('exports').querySelector(`[data-kind="${kind}"]`);old?.remove();
  const a=document.createElement('a');a.href=url;a.download=name;a.dataset.kind=kind;a.textContent=`保存 ${name}`;a.style.marginRight='16px';a.style.color='#ffdc74';$('exports').append(a);
  if(kind==='png'){const oldImage=$('exports').querySelector('img');oldImage?.remove();const img=document.createElement('img');img.src=url;img.alt='导出的完整图集';img.style.maxWidth='320px';img.style.display='block';$('exports').append(img);}
};
const downloadJSON = (data,name) => { const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));exportURLs.push(url);download(url,name); };
function pathFor(cfg) {
  const filename=cfg.path.split('/').pop();
  return imageURLs.get(filename) ?? cfg.path;
}
function selectEntries() { return manifest.characters.filter(c => !$('character').value || c.id === $('character').value); }
function setButtons(enabled) { for (const id of ['pause','prev','next','direction','speed','mode','export-png','export-json']) $(id).disabled=!enabled; }
function restart(preserve = false) {
  if (!manifest) return;
  $('exports').replaceChildren();exportURLs.splice(0).forEach(URL.revokeObjectURL);
  const generation = ++reloadNumber;
  const previousPhases = preserve ? new Map((game?.scene.getScenes(true)[0]?.tiles ?? []).map(t => [t.cfg.id,t.phase])) : new Map();
  game?.destroy(true); game=null; setButtons(false);
  if (!preserve) state.manual=null;
  const entries = selectEntries(), focus=Boolean($('character').value), width=960;
  const gridRows=focus ? Math.ceil(entries[0].frames.length/4) : 0;
  const height=focus ? 330+gridRows*190 : Math.ceil(entries.length/4)*210;
  $('review').style.aspectRatio=`${width} / ${height}`;
  status('正在解码图集…');
  class Review extends Phaser.Scene {
    preload() {
      this.failed=false;
      this.load.on('loaderror',file=>{if(generation!==reloadNumber)return;this.failed=true;status(`图片加载失败：${file.key}。本机图片请与配置一起选择后载入。`);});
      for (const cfg of entries) this.load.image(cfg.id,pathFor(cfg));
    }
    create() {
      if (this.failed) return;
      try {
        for(const cfg of entries) {
          const t=this.textures.get(cfg.id), source=t.getSourceImage();
          validateBounds(cfg,source.width,source.height);
          cfg.frames.forEach((f,i)=>t.add(String(i),0,f.x,f.y,f.width,f.height));
        }
      } catch(e) {status(e.message);return;}
      const ink=state.light?'#203d34':'#eff8f4', muted=state.light?'#425e53':'#b7d1c5';
      this.cameras.main.setBackgroundColor(state.light?'#e6eee6':'#132b27');
      this.tiles=entries.map((cfg,i)=> {
        const x=focus?width/2:i%4*240+120, ground=focus?290:Math.floor(i/4)*210+175;
        const scale=Math.min((focus?420:195)/cfg.bodyWidth,(focus?230:130)/cfg.frames[0].height, (focus?720:220)/cfg.frames[0].width);
        this.add.text(x-(focus?420:108),ground-(focus?265:164),cfg.name,{fontSize:focus?'20px':'15px',color:ink,wordWrap:{width:focus?830:216}});
        this.add.rectangle(x,ground+1,focus?820:222,2,state.light?0x769384:0x698478);
        const sprite=this.add.sprite(x,ground,cfg.id,'0').setOrigin(cfg.originX,cfg.originY).setScale(scale);
        const label=this.add.text(x-(focus?420:108),ground+10,'',{fontSize:'13px',color:muted});
        const grid=[];
        if(focus) cfg.frames.forEach((f,n)=>{
          const gx=n%4*240+120, gy=350+Math.floor(n/4)*190;
          const frameScale=Math.min(200/f.width,140/f.height);
          const box=this.add.rectangle(gx,gy+60,228,175).setStrokeStyle(1,0x668279);
          this.add.text(gx-108,gy-22,`源帧 ${n+1}${cfg.playFrames.includes(n)?'':' · 未播放'}`,{fontSize:'14px',color:ink});
          this.add.sprite(gx,gy+65,cfg.id,String(n)).setOrigin(.5,.5).setScale(frameScale);
          grid.push(box);
        });
        return {cfg,sprite,label,x,ground,scale,phase:previousPhases.get(cfg.id) ?? 0,grid};
      });
      setButtons(true);
      $('export-png').disabled=!focus; $('export-json').disabled=!focus;
      status(`${entries.length} 个角色 · ${focus?'下方网格按源帧顺序，逐帧按钮按播放序列':'选择单个角色可看完整帧网格并导出'} · 待视觉验收`);
    }
    update(_,delta) {
      if (!this.tiles) return;
      for (const tile of this.tiles) {
        const {cfg,sprite,label}=tile;
        if(!state.paused) tile.phase=advance(tile.phase,delta/1000,cfg,state.mode,state.speed);
        const index=state.manual===null ? frameAt(tile.phase,cfg) : cfg.playFrames[wrap(state.manual,cfg.playFrames.length)];
        const flip=(cfg.direction==='left'?-1:1)!==state.direction, offset=placement(cfg.frames[index],tile.scale,flip);
        sprite.setFrame(String(index)).setFlipX(flip).setPosition(tile.x+offset.x,tile.ground+offset.y);
        label.setText(`源帧 ${index+1}/${cfg.frames.length} · 播放 ${cfg.playFrames.length} 帧 · ${state.mode==='distance'?'路程模拟':'时间驱动'}`);
        tile.grid.forEach((box,n)=>box.setStrokeStyle(n===index?3:1,n===index?0xffdc74:0x668279));
      }
    }
    step(direction) {
      if(!this.tiles) return;
      if(state.manual===null) {
        const first=this.tiles[0];state.manual=Math.floor(wrap(first.phase,1)*first.cfg.playFrames.length);
      }
      state.manual+=direction;state.paused=true;$('pause').textContent='继续';
    }
    resume() {
      if(state.manual!==null) for(const t of this.tiles) t.phase=wrap(state.manual,t.cfg.playFrames.length)/t.cfg.playFrames.length;
      state.manual=null;state.paused=false;$('pause').textContent='暂停';
    }
    exportPNG() {
      if(!focus || !this.tiles) return;
      const cfg=entries[0], exported=exportConfig(cfg), {width:w,height:h}=cfg.frames[0], cols=Math.min(4,cfg.frames.length);
      const gl=this.game.renderer.gl,limit=gl?gl.getParameter(gl.MAX_TEXTURE_SIZE):16384;
      if(cols*w>limit || Math.ceil(cfg.frames.length/cols)*h>limit){status('重排后的图集超出当前设备纹理上限，请先在项目中分组打包。');return;}
      const texture=this.textures.addDynamicTexture('export-'+Date.now(),cols*w,Math.ceil(cfg.frames.length/cols)*h);
      const images=cfg.frames.map((f,i)=>this.make.image({key:cfg.id,frame:String(i),add:false}).setOrigin(0).setPosition(exported.frames[i].x,exported.frames[i].y));
      texture.draw(images);images.forEach(image=>image.destroy());
      texture.snapshot(image=>{
        download(image.src,exported.path);
        const old=$('exports').querySelector('button');old?.remove();
        const button=document.createElement('button');button.textContent='重新预览导出';
        button.onclick=()=>{imageURLs.set(exported.path,image.src);loadConfig({characters:[exported]});};
        $('exports').append(button);this.textures.remove(texture.key);
      });
    }
  }
  game=new Phaser.Game({type:Phaser.AUTO,parent:'review',width,height,scene:Review,backgroundColor:'#132b27',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_HORIZONTALLY}});
}
$('pause').onclick=()=> {
  const scene=game?.scene.getScenes(true)[0];
  if(state.paused)scene?.resume();else{state.paused=true;$('pause').textContent='继续';}
};
$('prev').onclick=()=>game?.scene.getScenes(true)[0]?.step(-1);
$('next').onclick=()=>game?.scene.getScenes(true)[0]?.step(1);
$('direction').onclick=()=>{state.direction*=-1;$('direction').textContent=state.direction>0?'向右':'向左';};
$('speed').oninput=e=>{state.speed=Number(e.target.value);$('speed-value').value=`${state.speed.toFixed(2)}×`;};
$('mode').onchange=e=>state.mode=e.target.value;
$('background').onchange=e=>{state.light=e.target.value==='light';restart(true);};
$('character').onchange=()=>restart();
$('config').onchange=e=>configFile=e.target.files[0]??null;
$('images').onchange=e=>{
  const files=[...e.target.files], names=files.map(f=>f.name);
  if(new Set(names).size!==names.length){status('图片文件名重复，请改名后重选');return;}
  for(const url of imageURLs.values())URL.revokeObjectURL(url);
  imageURLs=new Map(files.map(f=>[f.name,URL.createObjectURL(f)]));
};
async function loadConfig(raw) {
  const next=normalizeManifest(raw);manifest=next;
  const selector=$('character');selector.replaceChildren(new Option('全部角色',''),...manifest.characters.map(c=>new Option(c.name,c.id)));
  restart();
}
$('reload').onclick=async()=>{
  try{if(configFile)await loadConfig(JSON.parse(await configFile.text()));else restart();}catch(e){status(e.message);}
};
$('export-png').onclick=()=>game?.scene.getScenes(true)[0]?.exportPNG();
$('export-json').onclick=()=>{
  const cfg=manifest?.characters.find(c=>c.id===$('character').value);
  if(cfg)downloadJSON({characters:[exportConfig(cfg)]},`${cfg.id}-review.json`);
};
window.addEventListener('beforeunload',()=>{game?.destroy(true);for(const url of [...imageURLs.values(),...exportURLs])URL.revokeObjectURL(url);});
setButtons(false);
async function loadDemo() {
  try {const response=await fetch('/demo.json');if(!response.ok)throw Error('示例配置加载失败');await loadConfig(await response.json());}catch(e){status(e.message);}
}
loadDemo();
