# coding: utf-8
from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'index.html';s=p.read_text()
s=s.replace('<canvas id="stage"','<div class="key-help">WASD: A / Arrow keys: B / J: Attack / K: Heavy / 1-4 or QERF: Skills / Space: Dodge / Shift: Sprint. Click the arena to enable keyboard controls.</div><canvas id="stage"')
s=s.replace('<button id="cast">施放当前招式</button>','<button id="cast">施放当前招式</button>')
s=s.replace('<button id="cast">施放招式 / 空格</button>','<button id="cast">施放当前招式</button><button id="normalAttack">J 普攻</button><button id="heavyAttack">K 重击</button><button id="dodge">空格 闪避</button>')
s=s.replace('<div class="selectors">','<div id="skillSlots" class="skill-slots"></div><div class="controls"><label><input id="useCooldown" type="checkbox"> 使用原作技能冷却</label><label><input id="autoHeal" type="checkbox" checked> 打空血后自动恢复</label></div><div class="selectors">')
p.write_text(s)
p=r/'app.mjs';s=p.read_text()
s=s.replace("aPos={x:260,y:340},keys=new Set()", "aPos={x:260,y:340},bPos={x:750,y:340},keys=new Set(),dodgeRemaining=0,dodgeCount=0,slotCooldowns=[0,0,0,0]")
s=s.replace("function cast(){attack=0;playing=true;$('#play').textContent='暂停';$('#stage').focus()}","function cast(slot=-1){if(slot>=0){if($('#useCooldown').checked&&slotCooldowns[slot]>0)return;move=dex.moves.find(m=>m.id===skillIds[slot]);slotCooldowns[slot]=move.arena?.cooldown||1;}if(hp<=0&&$('#autoHeal').checked)hp=100;attack=0;playing=true;$('#play').textContent='暂停';update();$('#stage').focus()}")
s=s.replace("$('#cast').onclick=cast;", "$('#cast').onclick=()=>cast();$('#normalAttack').onclick=()=>basic('tackle');$('#heavyAttack').onclick=()=>basic('bodyslam');$('#dodge').onclick=dodge;")
s=s.replace("aPos={x:260,y:340}}", "aPos={x:260,y:340};bPos={x:750,y:340};slotCooldowns=[0,0,0,0];dodgeRemaining=0}")
a=s.index("$('#stage').onkeydown=");b=s.index('\nfunction sprite',a)
s=s[:a]+'''const skillIds=['flamethrower','hydropump','thunderbolt','earthquake'].map(id=>dex.moves.some(m=>m.id===id)?id:dex.moves[0].id);
const slotButtons=[];
for(let n=0;n<4;n++){const d=document.createElement('div'),button=document.createElement('button'),sel=document.createElement('select');button.onclick=()=>cast(n);button.textContent=`${n+1} / ${['Q','E','R','F'][n]}  ${dex.moves.find(m=>m.id===skillIds[n]).name}`;slotButtons.push(button);sel.setAttribute('aria-label',`技能槽${n+1}`);options(sel,dex.moves.map(m=>[m.id,`${m.name} / ${m.type}`]));sel.value=skillIds[n];sel.onchange=()=>{skillIds[n]=sel.value;slotCooldowns[n]=0};d.append(button,sel);$('#skillSlots').append(d)}
function basic(id){move=dex.moves.find(m=>m.id===id)||move;cast()}
function dodge(){if(dodgeRemaining>0)return;dodgeRemaining=.25;dodgeCount++;$('#stage').focus()}
$('#stage').onpointerdown=()=>$('#stage').focus();
$('#stage').onkeydown=e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' ','j','k','1','2','3','4','q','e','r','f'].includes(k)){e.preventDefault();keys.add(k);if(e.repeat)return;const idx={'1':0,'q':0,'2':1,'e':1,'3':2,'r':2,'4':3,'f':3}[k];if(idx!==undefined)cast(idx);else if(k==='j')basic('tackle');else if(k==='k')basic('bodyslam');else if(k===' ')dodge()}};
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
''' +s[b:]
a=s.index("if(keys.size){const dirs=");b=s.index("ctx.clearRect",a)
s=s[:a]+'''const speed=keys.has('shift')?240:150;dodgeRemaining=Math.max(0,dodgeRemaining-dt);
for(let i=0;i<4;i++){slotCooldowns[i]=Math.max(0,slotCooldowns[i]-dt);slotButtons[i].textContent=`${i+1} / ${['Q','E','R','F'][i]} ${dex.moves.find(m=>m.id===skillIds[i]).name}${$('#useCooldown').checked&&slotCooldowns[i]>0?' / '+slotCooldowns[i].toFixed(1)+'s':''}`;slotButtons[i].disabled=$('#useCooldown').checked&&slotCooldowns[i]>0}
const dirs={w:['up',0,-1],s:['down',0,1],a:['left',-1,0],d:['right',1,0],arrowup:['up',0,-1],arrowdown:['down',0,1],arrowleft:['left',-1,0],arrowright:['right',1,0]};
for(const [key,[d,x,y]]of Object.entries(dirs))if(keys.has(key)){const pos=key.startsWith('arrow')?bPos:aPos;if(pos===aPos&&[...$('#direction').options].some(o=>o.value===d))$('#direction').value=d;pos.x=Math.max(60,Math.min(940,pos.x+x*speed*dt));pos.y=Math.max(180,Math.min(460,pos.y+y*speed*dt))}
if(dodgeRemaining>0){const d=$('#direction').value,dx=d.includes('left')?-1:d.includes('right')?1:0,dy=d.includes('up')?-1:d.includes('down')?1:0;aPos.x=Math.max(60,Math.min(940,aPos.x+dx*450*dt));aPos.y=Math.max(180,Math.min(460,aPos.y+dy*450*dt))}
}''' +s[b:]
s=s.replace("const moving=[...keys].some(k=>k.startsWith('Arrow'))", "const moving=['w','a','s','d'].some(k=>keys.has(k))")
s=s.replace('bx=750,by=340','bx=bPos.x,by=bPos.y')
s=s.replace("ctx.fillText('A  方向键移动 · 空格施招',35,38)","ctx.fillText('A  WASD / J,K / 1-4 Skills / Space Dodge',35,38)")
s=s.replace("ctx.fillText('B  受击演示',715,38)","ctx.fillText('B  Arrow keys / target',715,38)")
s=s.replace('方向键走动 · 动作组支持逐帧预览','WASD / Arrows / J,K / 1-4 / Dodge ${dodgeCount}')
p.write_text(s)
