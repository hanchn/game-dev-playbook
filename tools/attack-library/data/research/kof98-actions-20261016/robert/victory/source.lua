if _G.KOF_ACTIONS_REGISTERED then return end
_G.KOF_ACTIONS_REGISTERED=true
-- Ordinary MAME input only. RAM, VRAM and palettes are read-only observations.
local out=assert(os.getenv('KOF_STUDY_OUT')); local m=manager.machine; local s=m.screens[':screen'];local ram=m.devices[':maincpu'].spaces['program'];local d=m.devices[':spritegen'];local fields={}
for _,p in pairs(m.ioport.ports) do for n,v in pairs(p.fields) do fields[n]=v end end
local function set(n,v) assert(fields[n],n):set_value(v) end
local route={};for n in (os.getenv('KOF_ROUTE') or ''):gmatch('[^,]+') do route[#route+1]=n end
local vr=emu.item(assert(d.items['0/m_videoram']));local auto=emu.item(assert(d.items['0/m_auto_animation_counter']));local pal=m.palettes[':palette']
local trace=assert(io.open(out..'/trace.csv','w'));trace:write('tick,phase,phaseTick,screenFrame,p1x,p1y,p1facing,p1life,p2x,p2y,p2life,auto,cameraX,refreshHz,gamePhase,meterRaw,stockRaw,modeRaw\n')
local input=assert(io.open(out..'/inputs.csv','w'));input:write('tick,field,value\n');local prev={}
local function press(n,v) set(n,v);if prev[n]~=v then input:write(tostring(tick)..','..n..','..v..'\n');prev[n]=v end end
local batches={
['locomotion']={{'idle',90},{'turn-cross-attempt',100},{'settle',90},{'crouch-rise',70},{'walk-forward',24},{'walk-back',40},{'run-forward',24},{'backdash',45},{'settle2',90},{'neutral-short-jump',85},{'neutral-long-jump',85},{'forward-short-jump',85},{'forward-long-jump',85},{'back-short-jump',85},{'back-long-jump',85},{'roll-forward',80},{'roll-back',80},{'taunt',100}},
['normals']={{'far-A',110},{'far-B',110},{'far-C',110},{'far-D',110},{'far-CD',110},{'near-A',110},{'near-B',110},{'near-C',110},{'near-D',110},{'near-CD',110},{'crouch-A',110},{'crouch-B',110},{'crouch-C',110},{'crouch-D',110}},
['air']={{'air-A',110},{'air-B',110},{'air-C',110},{'air-D',110},{'air-CD',110}},
['reactions']={{'approach-p2',100},{'guard-high',130},{'guard-low',130},{'receive-light',140},{'receive-heavy',160},{'receive-sweep-knockdown-rise',230},{'stun-ko-attempt',1100}},
['victory']={{'approach-p1',100},{'p1-round-win-attempt',2000}},
['sweep-recovery']={{'approach-p2',100},{'receive-sweep-preconditioned',240}},
['stun-probe']={{'approach-p2',100},{'receive-stun-light-chain',1200}},
['stun-heavy-probe']={{'approach-p2',100},{'receive-stun-heavy-chain',1200}},
['guard-cancel-cd']={{'approach-p2',100},{'guard-cancel-CD',180}},
['guard-cancel-ab-forward']={{'approach-p2',100},{'guard-cancel-AB-forward',180}},
['guard-cancel-ab-back']={{'approach-p2',100},{'guard-cancel-AB-back',180}},
['ground-recovery-ab']={{'approach-p2',100},{'receive-sweep-recovery-AB',240}},
['guard-cancel-cd-v2']={{'approach-p2',100},{'guard-cancel-CD',180}},
['guard-cancel-ab-forward-v2']={{'approach-p2',100},{'guard-cancel-AB-forward',180}},
['guard-cancel-ab-back-v2']={{'approach-p2',100},{'guard-cancel-AB-back',180}},
['ground-recovery-ab-v2']={{'approach-p2',100},{'receive-sweep-recovery-AB',240}},
['stun-heavy-probe-v2']={{'approach-p2',100},{'receive-stun-heavy-chain',1200}},
}
local acts=assert(batches[os.getenv("KOF_ACTION_BATCH")])
local total=0;for _,a in ipairs(acts) do total=total+a[2] end
local koTick=nil;local tick=0
emu.register_frame_done(function()
 tick=tick+1;_G.tick=tick
 for p=1,2 do for _,n in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do set('P'..p..' '..n,0) end end
 set('Coin 1',tick==600 and 1 or 0);set('Coin 2',tick==600 and 1 or 0)
 set('1 Player Start',tick>=660 and tick<665 and 1 or 0);set('2 Players Start',tick>=680 and tick<685 and 1 or 0)
 -- Both players choose ADVANCED. P2 filler team follows original validated input cadence.
 if tick<900 then for p=1,2 do set('P'..p..' A',tick>=800 and tick%90<3 and 1 or 0) end end
 if tick>=900 and tick<903 then set('P1 A',1);set('P2 A',1) end
 if tick>=960 and tick<960+#route*12 then local i=math.floor((tick-960)/12)+1;if (tick-960)%12<4 then set('P1 '..route[i],1) end end
 if tick>=930 and tick<1500 and tick%90<3 then set('P2 A',1) end
 if tick>=1170 and tick<1353 and tick%90<3 then set('P1 A',1) end
 if tick>=1500 and tick<2150 and tick%90<3 then set('P1 A',1);set('P2 A',1) end
 if tick>=600 and tick<=2670 and tick%30==0 then s:snapshot(out..'/selection/'..tick..'.png') end
 if tick<2700 then return end
 local rel=tick-2700;local phase='end';local t=rel;for _,a in ipairs(acts) do if t<a[2] then phase=a[1];break end;t=t-a[2] end
 if not koTick and (((os.getenv('KOF_ACTION_BATCH')=='reactions' and phase=='stun-ko-attempt' or os.getenv('KOF_ACTION_BATCH')=='stun-probe' and phase=='receive-stun-light-chain' or (os.getenv('KOF_ACTION_BATCH')=='stun-heavy-probe' or os.getenv('KOF_ACTION_BATCH')=='stun-heavy-probe-v2') and phase=='receive-stun-heavy-chain') and (ram:read_u8(0x108239)==0 or ram:read_u8(0x108239)>=128)) or (os.getenv('KOF_ACTION_BATCH')=='victory' and phase=='p1-round-win-attempt' and (ram:read_u8(0x108439)==0 or ram:read_u8(0x108439)>=128))) then koTick=tick;local f=assert(io.open(out..'/ko-anchor.json','w'));f:write('{"tick":'..tick..',"ordinaryIO":true}');f:close() end
 if koTick and tick-koTick>=(os.getenv('KOF_ACTION_BATCH')=='victory' and (tonumber(os.getenv('KOF_WIN_HOLD')) or 300) or 120) then trace:close();input:close();m:exit();return end
 if rel>=total then trace:close();input:close();m:exit();return end
 local face=ram:read_u8(0x108131);local dx=ram:read_i16(0x108318)-ram:read_i16(0x108118);local forward=dx>=0 and 'Right' or 'Left';local back=dx>=0 and 'Left' or 'Right'
 local pressed={};local function p(player,n,v) set('P'..player..' '..n,v);if v==1 then pressed['P'..player..' '..n]=true end end
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
 if phase:find('guard%-cancel') then
  if t>=40 and t<100 then key(1,back) end
  if t>=45 and t<48 then key(2,'C') end
  if t>=60 and t<96 and t%6<3 then
   if phase=='guard-cancel-CD' then key(1,'C');key(1,'D')
   else key(1,'A');key(1,'B');if phase=='guard-cancel-AB-forward' then pressed['P1 '..back]=nil;set('P1 '..back,0);key(1,forward) end end
  end
 end
 if phase=='receive-stun-heavy-chain' then
  distance(2,40,true);if t%38>=8 and t%38<11 then pressed['P2 Left']=nil;pressed['P2 Right']=nil;set('P2 Left',0);set('P2 Right',0);key(2,'C') end
 end
 if phase=='receive-stun-light-chain' then
  distance(2,40,true);if t%20>=8 and t%20<11 then key(2,'A') end
 end
 if phase=='stun-ko-attempt' then distance(2,26,true);if t%45>=20 and t%45<23 then key(2,'C')end end
 if phase=='p1-round-win-attempt' then distance(1,26,true);if t%45>=20 and t%45<23 then key(1,'C')end end
 for player=1,2 do for _,n in ipairs({'Up','Down','Left','Right','A','B','C','D'})do local f='P'..player..' '..n;local v=pressed[f]and 1 or 0;if prev[f]~=v then input:write(tick..','..f..','..v..'\n');prev[f]=v end end end
 local f='1 Player Start';local v=pressed[f]and 1 or 0;if prev[f]~=v then input:write(tick..','..f..','..v..'\n');prev[f]=v end

 if rel==0 then
  if os.getenv('KOF_DUMP_GFX')=='1' then local r=m.memory.regions[':cslot1:sprites'];local f=assert(io.open(out..'/sprites-region.bin','wb'));f:write(r:read(0,r.size));f:close();local z=m.memory.regions[':spritegen:zoomy'];f=assert(io.open(out..'/zoomy.bin','wb'));f:write(z:read(0,z.size));f:close() end
 end
 local sf=type(s.frame_number)=='function' and s:frame_number() or s.frame_number
 trace:write(table.concat({tick,phase,t,sf,ram:read_i16(0x108118),ram:read_i16(0x108126),face,ram:read_u8(0x108239),ram:read_i16(0x108318),ram:read_i16(0x108326),ram:read_u8(0x108439),auto:read(0),ram:read_i16(0x10b0cc),1e18/s.refresh_attoseconds,ram:read_u8(0x10b094),ram:read_u8(0x1081e8),ram:read_u8(0x1082e3),ram:read_u8(0x1081f0)},',')..'\n')
 local data={};for i=0,0x85ff do data[#data+1]=string.pack('<I2',vr:read(i)) end;local f=assert(io.open(out..'/vram/'..tick..'.bin','wb'));f:write(table.concat(data));f:close()
 data={};for i=0,4095 do data[#data+1]=string.pack('<I4',pal:pen_color(i)) end;f=assert(io.open(out..'/palette/'..tick..'.bin','wb'));f:write(table.concat(data));f:close();s:snapshot(out..'/snap/'..tick..'.png')
end)
