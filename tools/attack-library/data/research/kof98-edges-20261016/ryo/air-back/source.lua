if _G.KOF_EDGES_REGISTERED then return end
_G.KOF_EDGES_REGISTERED=true
-- Ordinary MAME input only. RAM, VRAM and palettes are read-only observations.
local out=assert(os.getenv('KOF_STUDY_OUT')); local m=manager.machine; local s=m.screens[':screen'];local ram=m.devices[':maincpu'].spaces['program'];local d=m.devices[':spritegen'];local fields={}
for _,p in pairs(m.ioport.ports) do for n,v in pairs(p.fields) do fields[n]=v end end
local function set(n,v) assert(fields[n],n):set_value(v) end
local route={};for n in (os.getenv('KOF_ROUTE') or ''):gmatch('[^,]+') do route[#route+1]=n end
local vr=emu.item(assert(d.items['0/m_videoram']));local auto=emu.item(assert(d.items['0/m_auto_animation_counter']));local pal=m.palettes[':palette']
local trace=assert(io.open(out..'/trace.csv','w'));trace:write('tick,phase,phaseTick,screenFrame,p1x,p1y,p1facing,p1life,p2x,p2y,p2life,auto,cameraX,refreshHz,gamePhase\n')
local input=assert(io.open(out..'/inputs.csv','w'));input:write('tick,field,value\n');local prev={}
local function press(n,v) set(n,v);if prev[n]~=v then input:write(tostring(tick)..','..n..','..v..'\n');prev[n]=v end end
local batches={['turn-super']={{'idle',90},{'p2-approach',80},{'opponent-cross-turn',120},{'settle',90},{'super-neutral',105},{'super-forward',105},{'super-back',105},{'hyper-forward',95},{'hyper-back',95}},['air-forward']={{'air-forward-A',125},{'air-forward-B',125},{'air-forward-C',125},{'air-forward-D',125},{'air-forward-CD',125}},['air-back']={{'air-back-A',125},{'air-back-B',125},{'air-back-C',125},{'air-back-D',125},{'air-back-CD',125}},['air-short']={{'air-short-A',125},{'air-short-B',125},{'air-short-C',125},{'air-short-D',125},{'air-short-CD',125}},['extra-reactions']={{'p2-approach',80},{'crouch-hurt-light',160},{'crouch-hurt-heavy',180},{'air-hurt-light',180},{'air-hurt-heavy',180},{'air-guard-attempt',180}}}
local acts=assert(batches[os.getenv("KOF_EDGE_BATCH")])
local total=0;for _,a in ipairs(acts) do total=total+a[2] end
local crossDirection=nil;local tick=0
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
 if rel>=total then trace:close();input:close();m:exit();return end
 local face=ram:read_u8(0x108131);local dx=ram:read_i16(0x108318)-ram:read_i16(0x108118);local forward=dx>=0 and 'Right' or 'Left';local back=dx>=0 and 'Left' or 'Right'
 local pressed={}
 local function key(player,name) set('P'..player..' '..name,1);pressed['P'..player..' '..name]=true end
 local function approach2()
  local delta=ram:read_i16(0x108318)-ram:read_i16(0x108118)
  if math.abs(delta)>28 then key(2,delta>=0 and 'Left' or 'Right') end
 end
 if phase=='p2-approach' then approach2() end
 if phase=='opponent-cross-turn' then
  if t==0 then crossDirection=dx>=0 and 'Left' or 'Right' end
  if t>=15 and t<27 then key(2,'Up') end
  if t>=15 and t<65 then key(2,crossDirection) end
 end
 if phase:find('super%-') or phase:find('hyper%-') then
  if t>=15 and t<18 then key(1,'Down') end
  local hold=phase:find('hyper') and 3 or 12
  if t>=18 and t<18+hold then key(1,'Up');if phase:find('forward') then key(1,forward) elseif phase:find('back') then key(1,back) end end
 end
 local direction,buttons=phase:match('^air%-(%a+)%-(%u+)$')
 if direction then
  local short=direction=='short'
  if t>=20 and t<20+(short and 3 or 12) then key(1,'Up');if direction=='forward' then key(1,forward) elseif direction=='back' then key(1,back) end end
  local attack=short and 31 or 36
  if t>=attack and t<attack+3 then for button in buttons:gmatch('.') do key(1,button) end end
 end
 if phase:find('crouch%-hurt') then
  if t<55 then approach2() end
  if t>=60 and t<135 then key(1,'Down') end
  if t>=82 and t<85 then key(2,'Down');key(2,phase:find('light') and 'A' or 'C') end
 end
 if phase=='air-hurt-light' or phase=='air-hurt-heavy' or phase=='air-guard-attempt' then
  if t<45 then approach2() end
  if t>=55 and t<67 then key(1,'Up');key(2,'Up') end
  if phase=='air-guard-attempt' and t>=68 and t<110 then key(1,back) end
  if t>=80 and t<83 then key(2,phase=='air-hurt-heavy' and 'C' or 'A') end
 end
 for player=1,2 do for _,name in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do
  local field='P'..player..' '..name;local value=pressed[field] and 1 or 0
  if prev[field]~=value then input:write(tick..','..field..','..value..'\n');prev[field]=value end
 end end

 if rel==0 then
  if os.getenv('KOF_DUMP_GFX')=='1' then local r=m.memory.regions[':cslot1:sprites'];local f=assert(io.open(out..'/sprites-region.bin','wb'));f:write(r:read(0,r.size));f:close();local z=m.memory.regions[':spritegen:zoomy'];f=assert(io.open(out..'/zoomy.bin','wb'));f:write(z:read(0,z.size));f:close() end
 end
 local sf=type(s.frame_number)=='function' and s:frame_number() or s.frame_number
 trace:write(table.concat({tick,phase,t,sf,ram:read_i16(0x108118),ram:read_i16(0x108126),face,ram:read_u8(0x108239),ram:read_i16(0x108318),ram:read_i16(0x108326),ram:read_u8(0x108439),auto:read(0),ram:read_i16(0x10b0cc),1e18/s.refresh_attoseconds,ram:read_u8(0x10b094)},',')..'\n')
 local data={};for i=0,0x85ff do data[#data+1]=string.pack('<I2',vr:read(i)) end;local f=assert(io.open(out..'/vram/'..tick..'.bin','wb'));f:write(table.concat(data));f:close()
 data={};for i=0,4095 do data[#data+1]=string.pack('<I4',pal:pen_color(i)) end;f=assert(io.open(out..'/palette/'..tick..'.bin','wb'));f:write(table.concat(data));f:close();s:snapshot(out..'/snap/'..tick..'.png')
end)
