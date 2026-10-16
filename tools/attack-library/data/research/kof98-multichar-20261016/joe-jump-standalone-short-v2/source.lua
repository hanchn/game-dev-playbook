if _G.KOF_MULTI_REGISTERED then return end
_G.KOF_MULTI_REGISTERED=true
-- Ordinary MAME input only. RAM, VRAM and palettes are read-only observations.
local out=assert(os.getenv('KOF_STUDY_OUT')); local m=manager.machine; local s=m.screens[':screen'];local ram=m.devices[':maincpu'].spaces['program'];local d=m.devices[':spritegen'];local fields={}
for _,p in pairs(m.ioport.ports) do for n,v in pairs(p.fields) do fields[n]=v end end
local function set(n,v) assert(fields[n],n):set_value(v) end
local route={};for n in (os.getenv('KOF_ROUTE') or ''):gmatch('[^,]+') do route[#route+1]=n end
local vr=emu.item(assert(d.items['0/m_videoram']));local auto=emu.item(assert(d.items['0/m_auto_animation_counter']));local pal=m.palettes[':palette']
local trace=assert(io.open(out..'/trace.csv','w'));trace:write('tick,phase,phaseTick,screenFrame,p1x,p1y,p1facing,p1life,p2x,p2y,p2life,auto,cameraX,refreshHz,gamePhase\n')
local input=assert(io.open(out..'/inputs.csv','w'));input:write('tick,field,value\n');local prev={}
local function press(n,v) set(n,v);if prev[n]~=v then input:write(tostring(tick)..','..n..','..v..'\n');prev[n]=v end end
local acts={{'stationary-before-jump',180},{'jump-neutral',120},{'stationary-after-jump',120}}
local total=0;for _,a in ipairs(acts) do total=total+a[2] end
local tick=0
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
 local pressed={};local function p(n,v) set('P1 '..n,v);if v==1 then pressed[n]=true end end
 if phase=='walk-forward' then p(forward,1) end;if phase=='walk-back' then p(back,1) end
 if phase=='run-forward-attempt' then p(forward,(t<2 or t>=5) and 1 or 0) end
 if phase=='jump-neutral' then p('Up',t<tonumber(os.getenv('KOF_JUMP_HOLD') or '12') and 1 or 0) end
 if phase=='crouch' or phase:find('crouch%-') then p('Down',1) end
 local b=phase:match('far%-(%u)') or phase:match('close%-(%u)') or phase:match('crouch%-(%u)');if b then p(b,t>=8 and t<11 and 1 or 0) end
 if phase=='approach' and math.abs(dx)>28 then p(forward,1) end
 if phase:find('qcf') or phase:find('qcb') then local dir=phase:find('qcb') and back or forward;if t>=8 and t<14 then p('Down',1) end;if t>=11 and t<18 then p(dir,1) end;if t>=16 and t<19 then p(phase:find('%-B') and 'B' or 'A',1) end end
 if phase=='dp-A-attempt' then if t>=8 and t<11 then p(forward,1) end;if t>=11 and t<17 then p('Down',1) end;if t>=14 and t<20 then p(forward,1) end;if t>=16 and t<19 then p('A',1) end end
 for _,n in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do local v=pressed[n] and 1 or 0;if prev[n]~=v then input:write(tick..',P1 '..n..','..v..'\n');prev[n]=v end end
 if rel==0 then
  if os.getenv('KOF_DUMP_GFX')=='1' then local r=m.memory.regions[':cslot1:sprites'];local f=assert(io.open(out..'/sprites-region.bin','wb'));f:write(r:read(0,r.size));f:close();local z=m.memory.regions[':spritegen:zoomy'];f=assert(io.open(out..'/zoomy.bin','wb'));f:write(z:read(0,z.size));f:close() end
 end
 local sf=type(s.frame_number)=='function' and s:frame_number() or s.frame_number
 trace:write(table.concat({tick,phase,t,sf,ram:read_i16(0x108118),ram:read_i16(0x108126),face,ram:read_u8(0x108239),ram:read_i16(0x108318),ram:read_i16(0x108326),ram:read_u8(0x108439),auto:read(0),ram:read_i16(0x10b0cc),1e18/s.refresh_attoseconds,ram:read_u8(0x10b094)},',')..'\n')
 local data={};for i=0,0x85ff do data[#data+1]=string.pack('<I2',vr:read(i)) end;local f=assert(io.open(out..'/vram/'..tick..'.bin','wb'));f:write(table.concat(data));f:close()
 data={};for i=0,4095 do data[#data+1]=string.pack('<I4',pal:pen_color(i)) end;f=assert(io.open(out..'/palette/'..tick..'.bin','wb'));f:write(table.concat(data));f:close();s:snapshot(out..'/snap/'..tick..'.png')
end)
