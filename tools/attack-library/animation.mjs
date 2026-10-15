export const LABELS={idle:'待机',stance:'待机',walk:'行走',run:'跑动',attack:'攻击',special:'特殊攻击',shoot:'射击',charge:'蓄力',sleep:'睡眠',faint:'倒地',dead:'死亡',hurt:'受击',jump:'跳跃',fly:'飞行',swim:'游动',block:'格挡',evade:'闪避',rest:'休息',critical:'濒危',woozy:'眩晕',behavior:'行为','attack-2':'攻击二','attack-3':'攻击三','attack-heavy':'重攻击','jump-attack':'跳跃攻击','idle-ground':'地面待机','fly-up':'起飞',glide:'滑翔',fall:'下落',catch:'捕捉',heal:'治疗',bubble:'吐泡',win:'胜利',throw:'投掷','swim-down':'下潜',stomp:'踩踏'};
Object.assign(LABELS,{'state-5002':'重受击','state-5030':'后仰受击','state-5050':'空中倒落','state-5051':'失衡上抛','state-5150':'KO倒地停留','state-5170':'弹落触地'});
export function facings(c,action){const clip=c.clips[action];return c.layout==='clips'?Object.keys(c.directions):Object.keys(clip||{});}
export function directionFor(c,action,dx,dy){const dirs=facings(c,action);if(!dirs.length)return null;const angles={right:0,'down-right':Math.PI/4,down:Math.PI/2,'down-left':Math.PI*.75,left:Math.PI,'up-left':-Math.PI*.75,up:-Math.PI/2,'up-right':-Math.PI/4};const angle=Math.atan2(dy,dx);return [...dirs].sort((a,b)=>Math.abs(Math.atan2(Math.sin(angle-angles[a]),Math.cos(angle-angles[a])))-Math.abs(Math.atan2(Math.sin(angle-angles[b]),Math.cos(angle-angles[b]))))[0];}
export function framesFor(c,action,direction){const clip=c.clips[action];if(!clip)return [];
 if(c.layout==='clips')return clip;
 const v=clip[direction]||clip.down||Object.values(clip)[0];if(!v)return [];
 if(c.layout==='rect-clips')return v;
 return Array.from({length:v.count},(_,i)=>{const cell=(v.start??0)+i;return {image:v.image,x:v.gridColumns?(cell%v.gridColumns)*v.w:i*v.w,y:v.gridColumns?Math.floor(cell/v.gridColumns)*v.h:v.row*v.h,w:v.w,h:v.h,duration:v.durations[i],anchor:v.anchors[i]}});
}
export function frameAt(c,action,direction,time,loop=true){const frames=framesFor(c,action,direction);if(!frames.length)return null;const durations=frames.map(f=>f.duration||.125),total=durations.reduce((a,b)=>a+b,0);let t=loop?Math.max(0,time)%total:Math.min(Math.max(0,time),total-1e-8),index=0;while(index<frames.length-1&&t>=durations[index])t-=durations[index++];return {...frames[index],index,total,count:frames.length};}
export function nativeSkills(c){return Object.keys(c.actions).filter(a=>/attack|melee|shoot|special|cast|stomp|throw|ability|punch|kick|block|charge/.test(a)).map(a=>({id:a,name:LABELS[a]||a,action:a,kind:'native'}));}
export function locomotion(c,sprint=false){return (sprint?['run','walk','swim','fly']:['walk','run','swim','fly']).find(a=>c.actions[a])||'idle';}
export const sideView=c=>c.layout==='clips';
