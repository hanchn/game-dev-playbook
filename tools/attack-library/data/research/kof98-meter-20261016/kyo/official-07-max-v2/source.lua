if _G.KOF98_METER_CAPTURE_REGISTERED then return end
_G.KOF98_METER_CAPTURE_REGISTERED=true
local out=assert(os.getenv('KOF_METER_OUT'));local cfg=dofile(out..'/move.lua');local m=manager.machine;local screen=m.screens[':screen'];local ram=m.devices[':maincpu'].spaces['program'];local fields={}
for _,port in pairs(m.ioport.ports) do for n,v in pairs(port.fields) do fields[n]=v end end
local vr=emu.item(assert(m.devices[':spritegen'].items['0/m_videoram']));local pal=m.palettes[':palette'];local tick=0;local state='menu';local t=0;local phaseTicks={};local keys={};local face=true
local tr=assert(io.open(out..'/trace.csv','w'));tr:setvbuf('no');tr:write('tick,screenFrame,phase,phaseTick,p1x,p1y,p2x,p2y,hp1,hp2,meterRaw,timerRaw,fields\n')
local function press(n) assert(fields[n],n):set_value(1);keys[#keys+1]=n end
local function phase(p) state=p;t=0 end
local function finish(reason) local f=assert(io.open(out..'/condition-result.txt','w'));f:write(reason);f:close();tr:close();m:exit() end
emu.register_frame_done(function()
 tick=tick+1;keys={}
 for p=1,2 do for _,n in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do fields['P'..p..' '..n]:set_value(0) end end
 fields['Coin 1']:set_value(tick==600 and 1 or 0);fields['Coin 2']:set_value(tick==600 and 1 or 0);fields['1 Player Start']:set_value(tick>=660 and tick<665 and 1 or 0);fields['2 Players Start']:set_value(tick>=680 and tick<685 and 1 or 0)
 if tick<900 then for p=1,2 do if tick>=800 and tick%90<3 then press('P'..p..' A') end end end
 if tick>=900 and tick<903 then press('P2 A') end
 if tick>=960 and tick<965 then press('P1 Down') end
 if tick>=1020 and tick<1023 then press('P1 A') end
 if tick>=1080 and tick<1080+#cfg.route*12 then local i=math.floor((tick-1080)/12)+1;if (tick-1080)%12<4 then press('P1 '..cfg.route[i]) end end
 if tick>=930 and tick<1500 and tick%90<3 then press('P2 A') end
 if tick>=1230 and tick<1413 and (tick-1230)%90<3 then press('P1 A') end
 if tick>=1500 and tick<2150 and tick%90<3 then press('P1 A');press('P2 A') end
 local x=ram:read_i16(0x108118);local y=ram:read_i16(0x108126);local x2=ram:read_i16(0x108318);local hp=ram:read_u8(0x108239);local dx=x2-x
 if tick%120==0 and tick<=2700 then screen:snapshot(out..'/selection/'..tick..'.png') end
 if tick==2700 then phase(cfg.max and 'natural-low-health' or 'natural-extra-charge') end
 if tick>=2700 then
  if hp==0 then finish('natural KO before valid completion; not verified');return end
  if state=='natural-low-health' then
   if hp<=22 then phase('separate-after-damage')
   elseif t>=1500 then finish('natural low-health not attained within1500frames');return
   elseif math.abs(dx)>33 then press(dx>0 and 'P2 Left' or 'P2 Right')
   elseif t%32<2 then press('P2 A') end
  elseif state=='separate-after-damage' then
   if math.abs(dx)>=160 or t>120 then phase('natural-extra-charge') else press(dx>0 and 'P2 Right' or 'P2 Left') end
  elseif state=='natural-extra-charge' then
   press('P1 A');press('P1 B');press('P1 C');if t>=240 then phase('prepare-spacing') end
  elseif state=='prepare-spacing' then
   if cfg.close and math.abs(dx)>33 and t<100 then press(dx>0 and 'P1 Right' or 'P1 Left')
   else face=dx>=0;phase(cfg.air and 'jump' or 'neutral-before-command') end
  elseif state=='jump' then
   if t<3 then press('P1 Up') end
   if t>=36 then phase('motion') end
  elseif state=='neutral-before-command' then if t>=36 then phase('motion') end
  elseif state=='motion' then
   local i=math.floor(t/3)+1;local d=cfg.directions[i]
   if not d then phase('observe') else
    local v=face and 'Right' or 'Left';local z=face and 'Left' or 'Right'
    if d=='1' or d=='2' or d=='3' then press('P1 Down') end
    if d=='7' or d=='8' or d=='9' then press('P1 Up') end
    if d=='1' or d=='4' or d=='7' then press('P1 '..z) end
    if d=='3' or d=='6' or d=='9' then press('P1 '..v) end
    if i==#cfg.directions then press('P1 '..cfg.button) end
   end
  elseif state=='observe' and t>=160 then finish('ordinary conditions and command attempted; actual visual trigger QA required');return end
  local sf=type(screen.frame_number)=='function' and screen:frame_number() or screen.frame_number
  tr:write(table.concat({tick,sf,state,t,x,y,x2,ram:read_i16(0x108326),hp,ram:read_u8(0x108439),ram:read_u8(0x1081e8),ram:read_u16(0x1081ec),table.concat(keys,'+')},',')..'\n')
  if state=='natural-low-health' or state=='natural-extra-charge' or state=='separate-after-damage' then
   if tick%10==0 then screen:snapshot(out..'/snap/'..tick..'.png') end
  else
   screen:snapshot(out..'/snap/'..tick..'.png');local a={};for i=0,0x85ff do a[#a+1]=string.pack('<I2',vr:read(i)) end;local f=assert(io.open(out..'/vram/'..tick..'.bin','wb'));f:write(table.concat(a));f:close();a={};for i=0,4095 do a[#a+1]=string.pack('<I4',pal:pen_color(i)) end;f=assert(io.open(out..'/palette/'..tick..'.bin','wb'));f:write(table.concat(a));f:close()
  end
  t=t+1
 end
 if tick>7500 then finish('safety timeout; not verified') end
end)
