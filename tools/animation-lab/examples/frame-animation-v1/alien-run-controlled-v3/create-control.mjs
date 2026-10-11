// CODE-native pose guide only. This is not the requested rendered sprite asset.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {createCanvas}=require('@napi-rs/canvas');
const canvas=createCanvas(1440,1440),ctx=canvas.getContext('2d');
const thigh=[-25,-10,10,25,40,30,25,5,-25,-50,-50,-35];
const flex=[20,15,15,20,70,110,130,135,100,75,50,30];
const arm=[55,40,20,0,-20,-40,-55,-40,-20,0,20,40];
const bend=[25,40,55,70,80,80,80,80,80,70,55,40];
const phase=['NEAR contact / FAR recovery','NEAR load / FAR passing','NEAR toe off / FAR knee lift','Flight: NEAR folds / FAR high knee','Flight: NEAR recovery / FAR extends','FAR landing approach','FAR contact / NEAR recovery','FAR load / NEAR passing','FAR toe off / NEAR knee lift','Flight: FAR folds / NEAR high knee','Flight: FAR recovery / NEAR extends','NEAR landing approach'];
const advance=(p,deg,l)=>({x:p.x-Math.sin(deg*Math.PI/180)*l,y:p.y+Math.cos(deg*Math.PI/180)*l});
const line=(points,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();};
const circle=(p,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,2*Math.PI);ctx.fill();};
ctx.fillStyle='#fff';ctx.fillRect(0,0,1440,1440);
const frames=[];
for(let i=0;i<12;i++){
 const ox=i%4*360,oy=Math.floor(i/4)*480;ctx.save();ctx.translate(ox,oy);
 const j=(i+6)%12;
 const leg=(k,hip)=>{const knee=advance(hip,thigh[k],90),ankle=advance(knee,thigh[k]+flex[k],94);return{hip,knee,ankle};};
 const a=leg(i,{x:170,y:0}),b=leg(j,{x:170,y:0});
 const flight=[3,4,5,9,10,11].includes(i),hip={x:170,y:flight?245:430-12-Math.max(a.ankle.y,b.ankle.y)};
 const near=leg(i,hip),far=leg(j,hip),shoulder={x:hip.x+16,y:hip.y-96};
 const hands=k=>{const elbow=advance(shoulder,arm[k],62),wrist=advance(elbow,arm[k]-bend[k],54);return{shoulder,elbow,wrist};};
 const nearArm=hands(i),farArm=hands(j);
 ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1;ctx.strokeRect(0,0,360,480);ctx.setLineDash([5,5]);line([{x:25,y:430},{x:335,y:430}],'#94a3b8',1);line([{x:170,y:55},{x:170,y:430}],'#d1d5db',1);ctx.setLineDash([]);
 const drawLimbs=(l,h,color)=>{line([l.hip,l.knee,l.ankle],color,25);line([h.shoulder,h.elbow,h.wrist],color,18);circle(h.wrist,11,color);line([{x:l.ankle.x-8,y:l.ankle.y+5},{x:l.ankle.x+30,y:l.ankle.y+9}],color,15);};
 drawLimbs(far,farArm,'#2769c9');
 line([hip,shoulder],'#a8b1b9',49);circle(hip,25,'#a8b1b9');
 drawLimbs(near,nearArm,'#d43537');
 line([shoulder,{x:shoulder.x+7,y:shoulder.y-24}],'#6b7280',16);
 ctx.fillStyle='#cbd0d5';ctx.beginPath();ctx.ellipse(shoulder.x+12,shoulder.y-71,43,53,-.1,0,2*Math.PI);ctx.fill();circle({x:shoulder.x+43,y:shoulder.y-61},5,'#374151');
 ctx.fillStyle='#152334';ctx.font='bold 16px sans-serif';ctx.fillText(String(i+1).padStart(2,'0')+'  '+(i/12).toFixed(3)+' cycle',14,23);ctx.font='11px sans-serif';ctx.fillText(phase[i],14,43);
 ctx.font='12px sans-serif';ctx.fillStyle='#d43537';ctx.fillText('RED = near side',14,462);ctx.fillStyle='#2769c9';ctx.fillText('BLUE = far side',191,462);
 frames.push({index:i,phase:phase[i],hip,shoulder,nearLeg:near,farLeg:far,nearArm,farArm,nearWristRelativeHip:nearArm.wrist.x-hip.x,nearKneeRelativeHip:near.knee.x-hip.x,flight});ctx.restore();
}
const png=canvas.toBuffer('image/png');writeFileSync(new URL('./pose-control.png',import.meta.url),png);writeFileSync(new URL('./pose-control.json',import.meta.url),JSON.stringify({type:'code-native-pose-guide-not-sprite',grid:{columns:4,rows:3,count:12},fps:9,duration:12/9,sha256:createHash('sha256').update(png).digest('hex'),frames},null,2)+'\n');
console.log(JSON.stringify({nearWristMin:Math.min(...frames.map(f=>f.nearWristRelativeHip)),nearWristMax:Math.max(...frames.map(f=>f.nearWristRelativeHip)),guide:'pose-control.png'}));
