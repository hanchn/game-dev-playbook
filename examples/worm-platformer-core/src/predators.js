import {G,tunnelAt,random} from './world.js';
import {pursuitRoute,clearTunnelLine} from './navigation.js';
import {environmentAt} from './environment.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const SENSE={notice:170,release:240,searchSeconds:5,cooldown:20};
const active=new Set(['chase','windup','attack','recover','dive','grab']);
export function warningVisible(e){return active.has(e.state)&&!(e.senseCooldown>0)&&e.state!=='recover'}
function change(e,state){e.state=state;e.timer=0;e.attackHit=false}
function abandon(e){e.senseCooldown=SENSE.cooldown;e.route=[];e.homeRoute=null;change(e,e.species==='bird'?'return':'retreat')}
function approach(e,target,speed,dt,offset=18){const dx=target.x-e.x,dy=target.y-(e.y-offset),d=Math.hypot(dx,dy);if(d<3)return true;const n=Math.min(d,speed*dt);e.x+=dx/d*n;e.y+=dy/d*n;e.heading=Math.atan2(dy,dx);if(Math.abs(dx)>1)e.dir=Math.sign(dx);return n===d}
function trail(e){if(e.species==='chicken'||e.species==='bird')return;const p={x:e.x,y:e.y-18};e.trail??=Array.from({length:40},(_,i)=>({x:p.x-i*6*e.dir,y:p.y}));if(Math.hypot(e.trail[0].x-p.x,e.trail[0].y-p.y)>.8)e.trail.unshift(p);let len=0;for(let i=1;i<e.trail.length;i++){len+=Math.hypot(e.trail[i].x-e.trail[i-1].x,e.trail[i].y-e.trail[i-1].y);if(len>250){e.trail.length=i+1;break}}e.trail.length=Math.min(e.trail.length,320)}
export function updatePredator(m,e,dt){
 const p=m.player,cs=[...m.chunks.values()];e.phase+=dt;e.timer+=dt;e.senseCooldown=Math.max(0,(e.senseCooldown??0)-dt);e.homeY??=e.y;e.homeX??=e.x;
 const head={x:e.x,y:e.y-18},distance=Math.hypot(p.x-head.x,p.y-head.y),near=distance<SENSE.notice&&!(p.cover>0);e.palette=environmentAt(e.x,m.time).palette;
 if(active.has(e.state)){e.chaseAge=(e.chaseAge??0)+dt;if(distance>SENSE.release||Math.abs(e.x-e.homeX)>350||e.chaseAge>=5){abandon(e)}}
 const firstTier=cs.flatMap(c=>c.platforms).filter(f=>f.tier.startsWith('low')&&Math.abs(f.x+f.w/2-e.x)<180).sort((a,b)=>Math.abs(a.x+a.w/2-p.x)-Math.abs(b.x+b.w/2-p.x))[0];
 const largeMouth=cs.flatMap(c=>c.mouths).find(o=>o.large&&Math.abs(p.x-o.x)<o.radius&&p.y<G+63&&p.zone==='underground');
 const chickenReach=p.zone!=='underground'&&p.y>G-180||largeMouth&&e.peckMouth;
 if(e.state==='patrol'){
  e.chaseAge=0;
  if(e.species==='chicken'||Math.abs(e.y-e.homeY)<12){const nx=e.x+e.dir*35*dt;if(e.species==='chicken'||tunnelAt(cs,nx,e.y-18,12))e.x=clamp(nx,e.from,e.to);else e.dir*=-1;if(e.x<=e.from||e.x>=e.to)e.dir*=-1}
  else{e.homeRoute??=pursuitRoute(cs,head,{x:e.homeX,y:e.homeY-18});if(e.homeRoute.length&&approach(e,e.homeRoute[0],55,dt))e.homeRoute.shift()}
  if(near&&!e.senseCooldown){if(e.species==='chicken'){e.peckMouth=random(m.seed+Math.floor(e.homeX)+Math.floor(m.time/20))()<.5;if(!(p.zone!=='underground'&&p.y>G-180||largeMouth&&e.peckMouth))return}change(e,'chase');m.emit('enemy-noticed',{species:e.species})}
 }else if(e.state==='chase'){
  if(e.species==='chicken'){
   if(!chickenReach){abandon(e)}else{
    e.dir=Math.sign(p.x-e.x)||e.dir;e.x=clamp(e.x+e.dir*130*dt,e.from-100,e.to+100);
    if(p.y<G-70&&firstTier&&!e.vy&&e.y>=G-1){e.vy=-550;e.landing=firstTier;m.emit('chicken-jump',{x:e.x,y:e.y})}
    if(distance<77&&Math.abs(p.y-(e.y-25))<55||largeMouth&&e.peckMouth&&Math.abs(e.x-largeMouth.x)<60)change(e,'windup');
   }
  }else if(distance<55&&(p.zone==='underground'||head.y<=G+3)&&clearTunnelLine(cs,head,{x:p.x,y:p.y})){change(e,'windup')}
  else{e.routeAge=(e.routeAge??1)+dt;if(e.routeAge>.35){e.route=pursuitRoute(cs,head,{x:p.x,y:p.y});e.routeAge=0}if(e.route?.length&&approach(e,e.route[0],e.species==='centipede'?160:140,dt))e.route.shift()}
 }else if(e.state==='windup'){e.dir=Math.sign(p.x-e.x)||e.dir;if(e.timer>.38)change(e,'attack')}
 else if(e.state==='attack'){
  if(!e.attackHit&&e.timer>.08){e.attackHit=true;const target={x:e.x+e.dir*(e.species==='chicken'?35:12),y:e.y-18};const biteRange=e.species==='chicken'?58:44;const contact=m.body.some(b=>Math.hypot(b.x-target.x,b.y-target.y)<biteRange&&clearTunnelLine(cs,target,b));if(contact&&m.bite(e)){e.ate=true;abandon(e)}}
  if(e.state==='attack'&&e.timer>.35)change(e,'recover');
 }else if(e.state==='recover'&&e.timer>.65){change(e,'chase')}
 else if(e.state==='retreat'){
  if(e.species==='chicken'){e.dir=-Math.sign(p.x-e.x)||e.dir;e.x=clamp(e.x+e.dir*110*dt,e.from,e.to)}
  else{e.homeRoute??=pursuitRoute(cs,head,{x:e.homeX,y:e.homeY-18});if(e.homeRoute.length&&approach(e,e.homeRoute[0],110,dt))e.homeRoute.shift()}
  if(e.timer>2.5){e.ate=false;e.homeRoute=null;change(e,'patrol')}
 }
 if(e.species==='chicken'&&(e.vy||e.y<G-1)){
  const before=e.y;e.vy=(e.vy??0)+1000*dt;e.y+=e.vy*dt;const floors=e.state==='chase'||e.state==='windup'||e.state==='attack'?[...(e.landing?[e.landing]:[]),{y:G,x:-Infinity,w:Infinity}]:[{y:G,x:-Infinity,w:Infinity}];
  for(const f of floors)if(e.vy>=0&&before<=f.y+1&&e.y>=f.y&&(f.y===G||e.x>=f.x&&e.x<=f.x+f.w)){e.y=f.y;e.vy=0;break}
 }
 trail(e);
}
export function updateBird(m,dt){
 const p=m.player,cs=[...m.chunks.values()],cam=Math.max(m.retiredBefore*1024,p.x-(m.viewWidth??1536)*.3),width=m.viewWidth??1536;
 const perches=cs.flatMap(c=>c.platforms).filter(f=>f.tier==='high'&&f.x+f.w/2>cam+50&&f.x+f.w/2<cam+width-50);
 if(!perches.length){m.bird=null;return}
 if(!m.bird||m.bird.x<cam-180||m.bird.x>cam+width+180){const f=perches.reduce((a,b)=>Math.abs(b.x-p.x)<Math.abs(a.x-p.x)?b:a);m.bird={id:'screen-bird',species:'bird',x:f.x+f.w*.65,y:f.y,perch:f,dir:-1,state:'perch',timer:0,phase:0,chaseAge:0,senseCooldown:0,visit:0,wait:16+random(m.seed+Math.floor(f.x))()*8}}
 const e=m.bird;e.phase+=dt;e.timer+=dt;e.senseCooldown=Math.max(0,e.senseCooldown-dt);e.kind=environmentAt(e.x,m.time).bird;
 const dist=Math.hypot(p.x-e.x,p.y-(e.y-25));const noticed=dist<150&&p.zone!=='underground'&&!(p.cover>0);
 if(['dive','grab'].includes(e.state)){e.chaseAge+=dt;if(dist>240||e.chaseAge>=5||p.zone==='underground'||p.cover>0)abandon(e)}
 if(e.state==='perch'){
  if(noticed&&!e.senseCooldown){e.chaseAge=0;change(e,'dive')}
  else if(e.timer>e.wait){e.visit++;const current=perches.findIndex(f=>f.id===e.perch.id);e.perch=perches[(current+1+perches.length)%perches.length];change(e,'fly')}
  else if(e.timer>4&&Math.floor(e.timer)%7===0)change(e,'peck');
 }else if(e.state==='peck'){if(e.timer>.65){change(e,'perch');e.wait=Math.max(5,e.wait-4)}}
 else if(e.state==='fly'||e.state==='return'){
  if(approach(e,{x:e.perch.x+e.perch.w*.65,y:e.perch.y},e.state==='return'?220:120,dt,0)){change(e,'perch');e.wait=16+e.visit%7}
 }else if(e.state==='dive'){
  approach(e,{x:p.x,y:p.y+20},215,dt,0);if(dist<42)change(e,'grab');
 }else if(e.state==='grab'){
  if(!e.attackHit&&e.timer>.12){e.attackHit=true;if(Math.hypot(p.x-e.x,p.y-(e.y-20))<55&&m.bite(e)){e.ate=true;abandon(e)}}
  if(e.state==='grab'&&e.timer>.4){change(e,'dive')}
 }
}
