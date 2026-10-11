// Real recording at its native speed. The preview transport and capture clock
// each own their source; scrubbing must never produce another overlapping crow.
export const CROW_AUDIO={version:1,url:'/audio/rooster-crow-v1.wav',start:.8,duration:1.9,gainDb:-6,sourcePage:'https://commons.wikimedia.org/wiki/File:Rooster_crowing.ogg',trim:[.94,2.84]};
export class ChickenAudio{
 constructor(){this.context=null;this.buffer=null;this.bytes=null;this.preview=null;this.enabled=false;}
 async unlock(){
  if(!this.context){const Context=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Context)throw Error('浏览器不支持声音拍摄');this.context=new Context();}
  await this.context.resume();if(this.context.state!=='running')throw Error('请点击声音按钮解锁播放');
  if(!this.loading)this.loading=(async()=>{const response=await fetch(CROW_AUDIO.url);if(!response.ok)throw Error('真实打鸣录音加载失败');const bytes=await response.arrayBuffer(),buffer=await this.context.decodeAudioData(bytes.slice(0));if(Math.abs(buffer.duration-CROW_AUDIO.duration)>.005)throw Error('录音版本时长不符');this.bytes=bytes;this.buffer=buffer;})().catch(e=>{this.loading=null;throw e;});
  await this.loading;
 }
 stopPreview(){if(this.preview){try{this.preview.source.stop();}catch{}this.preview.source.disconnect();this.preview.gain.disconnect();this.preview=null;}}
 sync({scenario,time,playing,speed=1,recording=false}){
  const local=time-CROW_AUDIO.start;
  if(!this.enabled||!this.buffer||this.context.state!=='running'||!playing||recording||scenario!=='crow'||local<0||local>=this.buffer.duration){this.stopPreview();return;}
  const expected=this.preview?this.preview.offset+(this.context.currentTime-this.preview.started)*this.preview.speed:Infinity;
  if(this.preview&&this.preview.speed===speed&&Math.abs(expected-local)<.12)return;
  this.stopPreview();const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffer;source.playbackRate.value=speed;gain.gain.value=10**(CROW_AUDIO.gainDb/20);source.connect(gain);gain.connect(this.context.destination);
  this.preview={source,gain,offset:local,started:this.context.currentTime,speed};source.start(0,local);
 }
 async prepareCapture(){
  await this.unlock();this.stopPreview();const destination=this.context.createMediaStreamDestination(),gain=this.context.createGain(),source=this.context.createBufferSource();source.buffer=this.buffer;gain.gain.value=10**(CROW_AUDIO.gainDb/20);source.connect(gain);gain.connect(destination);
  let scheduled=false,closed=false;const metadata={...CROW_AUDIO,sampleRate:this.buffer.sampleRate,channels:this.buffer.numberOfChannels,captureClock:'scheduled from MediaRecorder start; actual encoded onset must be measured'};
  return {stream:destination.stream,bytes:this.bytes,metadata,start:({startedAt})=>{const elapsed=(performance.now()-startedAt)/1000,delay=Math.max(0,CROW_AUDIO.start-elapsed),offset=Math.max(0,elapsed-CROW_AUDIO.start);if(offset>=this.buffer.duration)throw Error('声音拍摄启动延迟超过动作时长');source.start(this.context.currentTime+delay,offset);scheduled=true;metadata.scheduledDelaySeconds=delay;metadata.sourceOffsetSeconds=offset;},stop:()=>{if(closed)return;closed=true;if(scheduled)try{source.stop();}catch{}source.disconnect();gain.disconnect();destination.disconnect();destination.stream.getTracks().forEach(t=>t.stop());}};
 }
}
