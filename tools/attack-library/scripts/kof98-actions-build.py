#!/usr/bin/env python3
from pathlib import Path
import re,json
R=Path(__file__).resolve().parents[1];B=R/'data/research/kof98-actions-20261016';B.mkdir(parents=True,exist_ok=True)
batches={
'locomotion': [('idle',90),('turn-cross-attempt',100),('settle',90),('crouch-rise',70),('walk-forward',24),('walk-back',40),('run-forward',24),('backdash',45),('settle2',90)]+[(f'{d}-{h}-jump',85) for d in ['neutral','forward','back'] for h in ['short','long']]+[('roll-forward',80),('roll-back',80),('taunt',100)],
'normals':[(f'far-{b}',110)for b in ['A','B','C','D','CD']]+[(f'near-{b}',110)for b in ['A','B','C','D','CD']]+[(f'crouch-{b}',110)for b in ['A','B','C','D']],
'air':[(f'air-{b}',110)for b in ['A','B','C','D','CD']],
'reactions':[('approach-p2',100),('guard-high',130),('guard-low',130),('receive-light',140),('receive-heavy',160),('receive-sweep-knockdown-rise',230),('stun-ko-attempt',1100)],
'victory':[('approach-p1',100),('p1-round-win-attempt',2000)],
'sweep-recovery':[('approach-p2',100),('receive-sweep-preconditioned',240)],
'stun-probe':[('approach-p2',100),('receive-stun-light-chain',1200)],
'stun-heavy-probe':[('approach-p2',100),('receive-stun-heavy-chain',1200)],
'guard-cancel-cd':[('approach-p2',100),('guard-cancel-CD',180)],
'guard-cancel-ab-forward':[('approach-p2',100),('guard-cancel-AB-forward',180)],
'guard-cancel-ab-back':[('approach-p2',100),('guard-cancel-AB-back',180)],
'ground-recovery-ab':[('approach-p2',100),('receive-sweep-recovery-AB',240)],
'guard-cancel-cd-v2':[('approach-p2',100),('guard-cancel-CD',180)],
'guard-cancel-ab-forward-v2':[('approach-p2',100),('guard-cancel-AB-forward',180)],
'guard-cancel-ab-back-v2':[('approach-p2',100),('guard-cancel-AB-back',180)],
'ground-recovery-ab-v2':[('approach-p2',100),('receive-sweep-recovery-AB',240)],
'stun-heavy-probe-v2':[('approach-p2',100),('receive-stun-heavy-chain',1200)],
'guard-cancel-cd-charged-v3':[('natural-block-charge',1200),('guard-cancel-CD',180)],
'guard-cancel-ab-forward-charged-v3':[('natural-block-charge',1200),('guard-cancel-AB-forward',180)],
'guard-cancel-ab-back-charged-v3':[('natural-block-charge',1200),('guard-cancel-AB-back',180)],
'guard-cancel-cd-charged-v4':[('natural-attack-charge',1600),('guard-cancel-CD',180)],
'guard-cancel-ab-forward-charged-v4':[('natural-attack-charge',1600),('guard-cancel-AB-forward',180)],
'guard-cancel-ab-back-charged-v4':[('natural-attack-charge',1600),('guard-cancel-AB-back',180)],
'stun-uppercut-probe':[('approach-p2',100),('receive-stun-uppercut-chain',1300)],
'guard-cancel-cd-charged-v5':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-CD',180)],
'guard-cancel-ab-forward-charged-v5':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-AB-forward',180)],
'guard-cancel-ab-back-charged-v5':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-AB-back',180)],
'guard-cancel-ab-forward-charged-v6':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-AB-forward',180)],
'stun-uppercut-long-v2':[('approach-p2',100),('receive-stun-uppercut-chain',2100)],
'guard-cancel-ab-forward-charged-v7':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-AB-neutral',180)],
'guard-cancel-cd-charged-daimon-a-v6':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-CD',180)],
'guard-cancel-ab-back-charged-daimon-a-v6':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-AB-back',180)],
'guard-cancel-ab-forward-charged-daimon-a-v8':[('natural-special-charge',1800),('approach-p2',200),('guard-cancel-AB-neutral',180)]}
(B/'batch-plan.json').write_text(json.dumps({'batches':batches,'scope':'ordinary I/O input attempts; no automatic full-move or visual acceptance','independentGames':True},indent=2)+'\n')
s=(R/'scripts/kof98-multichar-capture.lua').read_text();s=s.replace('KOF_MULTI_REGISTERED','KOF_ACTIONS_REGISTERED');a=s.index('local acts=');e=s.index('\nlocal total',a)
charge=json.loads((B/'natural-charge-plan.json').read_text())['characters']
charge_lua='local chargeMoves={'+','.join("['"+n+"']={motion='"+v['motion']+"',button='"+v['button']+"',charge="+str(v['charge']).lower()+",period="+str(v['period'])+'}'for n,v in charge.items())+'}\nlocal naturalStock=nil\n'
lua=charge_lua+'local batches={\n'+''.join("['"+k+"']={"+','.join("{'"+n+"',"+str(t)+'}'for n,t in acts)+'},\n'for k,acts in batches.items())+'}\nlocal acts=assert(batches[os.getenv("KOF_ACTION_BATCH")])'
s=s[:a]+lua+s[e:];a=s.index(' local pressed={}') ;e=s.index('\n if rel==0 then',a)
s=s[:a]+''' local pressed={};local function p(player,n,v) set('P'..player..' '..n,v);if v==1 then pressed['P'..player..' '..n]=true end end
 local function key(player,n) p(player,n,1) end
 local function distance(player,want,close)
  local delta=ram:read_i16(0x108318)-ram:read_i16(0x108118);local dir=delta>=0 and 'Right' or 'Left';if player==2 then dir=delta>=0 and 'Left' or 'Right' end
  if close and math.abs(delta)>want then key(player,dir) end
  if not close and math.abs(delta)<want then key(player,dir=='Right' and 'Left' or 'Right') end
 end
 if phase=='walk-forward' then key(1,forward) end;if phase=='walk-back' then key(1,back) end
 if phase=='run-forward' then p(1,forward,(t<2 or t>=5) and 1 or 0) end
 if phase=='backdash' then p(1,back,(t<2 or t>=5 and t<8) and 1 or 0) end
 if phase=='turn-cross-attempt' then key(1,forward) end
 if phase=='crouch-rise' and t<35 then key(1,'Down') end
 if phase:find('%-jump') then
  if t<15 then -- grounded neutral settling interval before every separate jump
  elseif t<15+(phase:find('short') and 3 or 12) then key(1,'Up');if phase:find('forward')then key(1,forward)elseif phase:find('back')then key(1,back)end end
 end
 if phase:find('roll%-') and t>=15 and t<18 then key(1,'A');key(1,'B');key(1,phase=='roll-forward' and forward or back) end
 if phase=='taunt' then set('1 Player Start',t>=15 and t<18 and 1 or 0);if t>=15 and t<18 then pressed['1 Player Start']=true end end
 local mode,buttons=phase:match('^(%a+)%-(%u+)$')
 if mode=='far' or mode=='near' or mode=='crouch' then
  if t<40 then distance(1,mode=='near' and 28 or 135,mode=='near') end
  if mode=='crouch' and t>=40 then key(1,'Down') end
  if t>=55 and t<58 then for b in buttons:gmatch('.')do key(1,b)end end
 end
 if mode=='air' then
  if t>=20 and t<32 then key(1,'Up') end
  if t>=36 and t<39 then for b in buttons:gmatch('.')do key(1,b)end end
 end
 if phase=='approach-p2' then distance(2,28,true) end
 if phase=='approach-p1' then distance(1,28,true) end
 if phase=='guard-high' or phase=='guard-low' then
  if t<35 then distance(2,28,true) end
  if t>=40 then key(1,back);if phase=='guard-low'then key(1,'Down')end end
  if t>=45 and t<48 then key(2,phase=='guard-low'and'D'or'C');if phase=='guard-low'then key(2,'Down')end end
 end
 if phase=='receive-light' or phase=='receive-heavy' or phase=='receive-sweep-knockdown-rise' then
  if t<55 then distance(2,28,true) end
  if t>=60 and t<63 then key(2,phase=='receive-light'and'A'or phase=='receive-heavy'and'C'or'D');if phase=='receive-sweep-knockdown-rise'then key(2,'Down')end end
 end
 if phase=='receive-sweep-preconditioned' or phase=='receive-sweep-recovery-AB' then
  if t<40 then distance(2,28,true) end
  if t>=45 and t<110 then key(2,'Down') end
  if t>=60 and t<63 then key(2,'D') end
  if phase=='receive-sweep-recovery-AB' and t>=110 and t<136 and t%6<3 then key(1,'A');key(1,'B') end
 end
 if phase=='natural-special-charge' then
  key(2,forward);if os.getenv('KOF_CHARACTER')=='daimon' then key(2,'Up') end
  local stock=ram:read_u8(0x1082e3)
  if stock>=1 then
   if not naturalStock then naturalStock=tick;local f=assert(io.open(out..'/natural-stock-anchor.json','w'));f:write('{\"tick\":'..tick..',\"stockRaw\":'..stock..',\"meterRaw\":'..ram:read_u8(0x1081e8)..'}');f:close() end
  else
   local move=assert(chargeMoves[os.getenv('KOF_CHARACTER') or 'joe']);local c=t%move.period
   local function direction(d)
    if d=='1'or d=='2'or d=='3'then key(1,'Down')end
    if d=='7'or d=='8'or d=='9'then key(1,'Up')end
    if d=='1'or d=='4'or d=='7'then key(1,back)end
    if d=='3'or d=='6'or d=='9'then key(1,forward)end
   end
   if move.charge then
    if c<70 then direction(move.motion:sub(1,1))elseif c<73 then direction(move.motion:sub(2,2));key(1,move.button)end
   elseif c<#move.motion*3 then
    local step=math.floor(c/3)+1;direction(move.motion:sub(step,step));if step==#move.motion then key(1,move.button)end
   end
  end
 end
 if phase=='natural-attack-charge' then
  key(2,forward)
  if t%50<25 then distance(1,35,true) end
  if t%50>=40 and t%50<43 then key(1,'C') end
 end
 if phase=='natural-block-charge' then
  key(1,back);key(1,'Down')
  if t%50<25 then distance(2,35,true) else key(2,'Down') end
  if t%50>=40 and t%50<43 then key(2,'C') end
 end
 if phase:find('guard%-cancel') then
  if t>=40 and t<100 then key(1,back) end
  if t>=45 and t<48 then key(2,'C') end
  if t>=((phase=='guard-cancel-AB-forward' or phase=='guard-cancel-AB-neutral') and 66 or 60) and t<96 and t%6<3 then
   if phase=='guard-cancel-CD' then key(1,'C');key(1,'D')
   else key(1,'A');key(1,'B');if phase=='guard-cancel-AB-neutral' then pressed['P1 '..back]=nil;set('P1 '..back,0) end;if phase=='guard-cancel-AB-forward' then pressed['P1 '..back]=nil;set('P1 '..back,0);key(1,forward) end end
  end
 end
 if phase=='receive-stun-uppercut-chain' then
  local c=t%100
  if c<20 then distance(2,40,true) end
  if c>=20 and c<23 then key(2,back) end
  if c>=23 and c<26 then key(2,'Down') end
  if c>=26 and c<32 then key(2,'Down');key(2,back) end
  if c>=29 and c<32 then key(2,'C') end
 end
 if phase=='receive-stun-heavy-chain' then
  distance(2,40,true);if t%38>=8 and t%38<11 then pressed['P2 Left']=nil;pressed['P2 Right']=nil;set('P2 Left',0);set('P2 Right',0);key(2,'C') end
 end
 if phase=='receive-stun-light-chain' then
  distance(2,40,true);if t%20>=8 and t%20<11 then key(2,'A') end
 end
 if phase=='stun-ko-attempt' then distance(2,26,true);if t%45>=20 and t%45<23 then key(2,'C')end end
 if phase=='p1-round-win-attempt' then distance(1,26,true);if t%45>=20 and t%45<23 then key(1,'C')end end
 for player=1,2 do for _,n in ipairs({'Up','Down','Left','Right','A','B','C','D'})do local f='P'..player..' '..n;local v=pressed[f]and 1 or 0;if prev[f]~=v then input:write(tick..','..f..','..v..'\\n');prev[f]=v end end end
 local f='1 Player Start';local v=pressed[f]and 1 or 0;if prev[f]~=v then input:write(tick..','..f..','..v..'\\n');prev[f]=v end
''' +s[e:]
s=s.replace('local tick=0', 'local koTick=nil;local tick=0')
s=s.replace(' if rel>=total then', " if not koTick and (((os.getenv('KOF_ACTION_BATCH')=='reactions' and phase=='stun-ko-attempt' or os.getenv('KOF_ACTION_BATCH')=='stun-probe' and phase=='receive-stun-light-chain' or (os.getenv('KOF_ACTION_BATCH')=='stun-uppercut-probe' or os.getenv('KOF_ACTION_BATCH')=='stun-uppercut-long-v2') and phase=='receive-stun-uppercut-chain' or (os.getenv('KOF_ACTION_BATCH')=='stun-heavy-probe' or os.getenv('KOF_ACTION_BATCH')=='stun-heavy-probe-v2') and phase=='receive-stun-heavy-chain') and (ram:read_u8(0x108239)==0 or ram:read_u8(0x108239)>=128)) or (os.getenv('KOF_ACTION_BATCH')=='victory' and phase=='p1-round-win-attempt' and (ram:read_u8(0x108439)==0 or ram:read_u8(0x108439)>=128))) then koTick=tick;local f=assert(io.open(out..'/ko-anchor.json','w'));f:write('{\"tick\":'..tick..',\"ordinaryIO\":true}');f:close() end\n if koTick and tick-koTick>=(os.getenv('KOF_ACTION_BATCH')=='victory' and (tonumber(os.getenv('KOF_WIN_HOLD')) or 300) or 120) then trace:close();input:close();m:exit();return end\n if rel>=total then")
s=s.replace('refreshHz,gamePhase','refreshHz,gamePhase,meterRaw,stockRaw,modeRaw')
s=s.replace('ram:read_u8(0x10b094)},', 'ram:read_u8(0x10b094),ram:read_u8(0x1081e8),ram:read_u8(0x1082e3),ram:read_u8(0x1081f0)},')
(R/'scripts/kof98-actions-capture.lua').write_text(s)
