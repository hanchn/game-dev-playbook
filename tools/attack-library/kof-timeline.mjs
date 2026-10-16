export function frameForTick(frames,tick){
 const total=frames.reduce((n,f)=>n+f.ticks,0);if(!total)return null;
 let t=((Math.floor(tick)%total)+total)%total;
 for(let i=0;i<frames.length;i++){if(t<frames[i].ticks)return {frame:frames[i],index:i,total};t-=frames[i].ticks;}
 return null;
}
export function captureCanPlay(c){return c?.rawCaptureReady===true&&c.identityRejected!==true;}
export function nativeClipsFromTrace(text,id){
 if(!/^[a-z0-9]+$/.test(id))throw Error('Invalid source character');
 const lines=text.trim().split(/\r?\n/),header=lines.shift().split(','),at=name=>{const i=header.indexOf(name);if(i<0)throw Error('Missing source column '+name);return i;};
 const ti=at('tick'),si=at('screenFrame'),pi=at('phase'),hi=at('refreshHz');let last,screenLast;const clips=[];
 for(const line of lines){const values=line.split(',');if(values.length!==header.length)throw Error('Truncated native trace');const tick=Number(values[ti]),screen=Number(values[si]),hz=Number(values[hi]);if(!Number.isInteger(tick)||!Number.isInteger(screen)||!(hz>0)||(last!==undefined&&(tick!==last+1||screen!==screenLast+1)))throw Error('Discontinuous or duplicate native refresh');last=tick;screenLast=screen;const phase=values[pi];let c=clips.at(-1);if(c?.id!==phase){c={id:phase,nativeScene:true,refreshHz:hz,allFrameSamplesPassed:false,frames:[]};clips.push(c);}c.frames.push({image:`data/research/kof98-multichar-20261016/${id}/snap/${tick}.png`,ticks:1,sourceTick:tick,pivot:[0,0]});}
 return clips;
}
export function specialClipsFromTrace(text,moves,id,refreshHz,attempts=null){
 if(!/^[a-z0-9]+$/.test(id)||!(refreshHz>0))throw Error('Invalid special source');
 const lines=text.trim().split(/\r?\n/),head=lines.shift().split(','),at=n=>{const i=head.indexOf(n);if(i<0)throw Error('Missing special column '+n);return i;};
 const ti=at('tick'),si=at('screenFrame'),mi=at('move'),pi=at('phase'),ai=at('phaseTick');let previous,screenPrevious;const clips=new Map(),blocked=new Set();
 for(const line of lines){const values=line.split(',');if(values.length!==head.length)throw Error('Truncated special trace');const tick=Number(values[ti]),screen=Number(values[si]),move=Number(values[mi]),age=Number(values[ai]);
  if(![tick,screen,move,age].every(Number.isInteger)||age<0||(previous!==undefined&&(tick!==previous+1||screen!==screenPrevious+1)))throw Error('Discontinuous special trace');previous=tick;screenPrevious=screen;
  const source=moves.find(m=>m.id===move);if(!source)throw Error('Unknown special move');if(values[pi]==='blocked'){blocked.add(move);continue;}
  if(!clips.has(move)){const buttons=source.steps.flatMap(s=>s.buttons||[]);clips.set(move,{id:'special-'+move,label:source.name+' · '+[...new Set(buttons)].join('+'),nativeScene:true,specialCapture:true,refreshHz,allFrameSamplesPassed:false,frames:[]});}
  clips.get(move).frames.push({image:`data/research/kof98-specials-20261016/${id}/snap/${String(move).padStart(2,'0')}-${String(age).padStart(4,'0')}.png`,ticks:1,sourceTick:tick,pivot:[0,0]});
 }
 return [...clips.entries()].filter(([id])=>!blocked.has(id)&&(!attempts||attempts.find(a=>a.id===id)?.status==='attempted')).map(([,clip])=>clip);
}
