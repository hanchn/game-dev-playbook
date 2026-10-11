// Four independently drawable controls, never used as final sprite frames.
import fs from'node:fs';import crypto from'node:crypto';import{createRequire}from'node:module';
const require=createRequire('/Users/lemon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');const{createCanvas}=require('@napi-rs/canvas');
const old=JSON.parse(fs.readFileSync(new URL('../alien-run-controlled-v3/pose-control.json',import.meta.url))),indices=Array.from({length:12},(_,i)=>i);
const line=(ctx,pts,color,w)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();};
const advance=(p,d,l)=>({x:p.x-Math.sin(d*Math.PI/180)*l,y:p.y+Math.cos(d*Math.PI/180)*l});
const samples=[];
for(const index of indices){const p=structuredClone(old.frames[index]),c=createCanvas(360,480),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,360,480);const farShoulder={x:p.shoulder.x-12,y:p.shoulder.y+5};
 const arm=(shoulder,d,b)=>{const elbow=advance(shoulder,d,62),wrist=advance(elbow,d-b,54);return{shoulder,elbow,wrist};};
 if(index===3){p.nearArm=arm(p.shoulder,-10,70);p.farArm=arm(farShoulder,20,130);}
 else if(index===9){p.nearArm=arm(p.shoulder,20,130);p.farArm=arm(farShoulder,-10,70);}
 else {p.farArm=Object.fromEntries(Object.entries(p.farArm).map(([k,v])=>[k,{x:v.x-12,y:v.y+5}]));}
 const limbs=(leg,a,color)=>{line(g,[leg.hip,leg.knee,leg.ankle],color,25);line(g,[a.shoulder,a.elbow,a.wrist],color,18);line(g,[{x:leg.ankle.x-8,y:leg.ankle.y+5},{x:leg.ankle.x+30,y:leg.ankle.y+9}],color,15);g.fillStyle=color;g.beginPath();g.arc(a.wrist.x,a.wrist.y,11,0,2*Math.PI);g.fill();};
 g.setLineDash([4,6]);line(g,[{x:15,y:430},{x:345,y:430}],'#afbaca',1);line(g,[{x:170,y:50},{x:170,y:430}],'#ced3d9',1);g.setLineDash([]);
 line(g,[p.hip,p.shoulder],'#a8b1b9',49);limbs(p.farLeg,p.farArm,'#2769c9');limbs(p.nearLeg,p.nearArm,'#d43537');line(g,[p.shoulder,{x:p.shoulder.x+7,y:p.shoulder.y-24}],'#6b7280',16);g.fillStyle='#cbd0d5';g.beginPath();g.ellipse(p.shoulder.x+12,p.shoulder.y-71,43,53,-.1,0,2*Math.PI);g.fill();g.fillStyle='#293441';g.beginPath();g.arc(p.shoulder.x+43,p.shoulder.y-61,5,0,2*Math.PI);g.fill();
 g.font='bold 13px sans-serif';g.fillText('PHASE '+index+'/12  FACE RIGHT',12,17);g.font='12px sans-serif';g.fillStyle='#d43537';g.fillText('RED foreground NEAR',12,464);g.fillStyle='#2769c9';g.fillText('BLUE background FAR',187,464);
 const data=c.toBuffer('image/png'),file='control-'+String(index).padStart(2,'0')+'.png';fs.writeFileSync(new URL(file,import.meta.url),data);samples.push({...p,file,sha256:crypto.createHash('sha256').update(data).digest('hex'),nearWristRelativeHip:p.nearArm.wrist.x-p.hip.x,farWristRelativeHip:p.farArm.wrist.x-p.hip.x});
}
fs.writeFileSync(new URL('controls.json',import.meta.url),JSON.stringify({type:'code-native-guides-not-final-frames',original12FrameGuideSHA:old.sha256,reason:'quarter-cycle passing arm chains separated by depth offset so both remain observable',samples},null,2)+'\n');
