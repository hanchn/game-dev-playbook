if _G.KOF98_METER_REGISTERED then return end
_G.KOF98_METER_REGISTERED=true
local out=assert(os.getenv('KOF_METER_OUT'));local m=manager.machine;local s=m.screens[':screen'];local ram=m.devices[':maincpu'].spaces['program'];local fields={}
for _,port in pairs(m.ioport.ports) do for n,v in pairs(port.fields) do fields[n]=v end end
local function set(n,v) assert(fields[n],n):set_value(v) end
local vr=emu.item(assert(m.devices[':spritegen'].items['0/m_videoram']));local pal=m.palettes[':palette']
local tr=assert(io.open(out..'/trace.csv','w'));tr:setvbuf('no');tr:write('tick,screenFrame,phase,p1x,p1y,p2x,p2y,hp1,hp2,meter1,stockRaw,timerRaw,modeRaw,fields\n')
local tick=0;local motion={'Down','Down+Left','Left','Down+Left','Down','Down+Right','Right'}
emu.register_frame_done(function()
 tick=tick+1;local keys={};local function press(n) set(n,1);keys[#keys+1]=n end
 for p=1,2 do for _,n in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do set('P'..p..' '..n,0) end end
 set('Coin 1',tick==600 and 1 or 0);set('Coin 2',tick==600 and 1 or 0);set('1 Player Start',tick>=660 and tick<665 and 1 or 0);set('2 Players Start',tick>=680 and tick<685 and 1 or 0)
 -- P1 EXTRA: ordinary menu cursor right before first A; P2 unchanged ADVANCED.
 if tick>=850 and tick<855 then press('P1 Down') end
 if tick<900 then for p=1,2 do if tick>=800 and tick%90<3 then press('P'..p..' A') end end end
 if tick>=900 and tick<903 then press('P1 A');press('P2 A') end
 if tick>=930 and tick<1500 and tick%90<3 then press('P2 A') end
 if tick>=1170 and tick<1353 and tick%90<3 then press('P1 A') end
 if tick>=1500 and tick<2150 and tick%90<3 then press('P1 A');press('P2 A') end
 local phase='menu'
 if tick>=2700 and tick<3100 then phase='natural-extra-charge';press('P1 A');press('P1 B');press('P1 C')
 elseif tick>=3100 and tick<3130 then phase='neutral-before-super'
 elseif tick>=3130 and tick<3151 then
  phase='orochinagi-motion';local i=math.floor((tick-3130)/3)+1
  for k in motion[i]:gmatch('[^+]+') do press('P1 '..k) end
  if i==7 then press('P1 A') end
 elseif tick>=3151 then phase='observe-super' end
 if tick%60==0 and tick<=2700 then s:snapshot(out..'/selection/'..tick..'.png') end
 if tick>=2680 then
  local sf=type(s.frame_number)=='function' and s:frame_number() or s.frame_number
  tr:write(table.concat({tick,sf,phase,ram:read_i16(0x108118),ram:read_i16(0x108126),ram:read_i16(0x108318),ram:read_i16(0x108326),ram:read_u8(0x108239),ram:read_u8(0x108439),ram:read_u8(0x1081e8),ram:read_u8(0x1082e3),ram:read_u16(0x1081ec),ram:read_u8(0x1081f0),table.concat(keys,'+')},',')..'\n')
  if tick%10==0 or tick>=3100 then s:snapshot(out..'/snap/'..tick..'.png') end
  if tick>=3100 then
   local a={};for i=0,0x85ff do a[#a+1]=string.pack('<I2',vr:read(i)) end;local f=assert(io.open(out..'/vram/'..tick..'.bin','wb'));f:write(table.concat(a));f:close()
   a={};for i=0,4095 do a[#a+1]=string.pack('<I4',pal:pen_color(i)) end;f=assert(io.open(out..'/palette/'..tick..'.bin','wb'));f:write(table.concat(a));f:close()
  end
 end
 if tick>=3400 then tr:close();m:exit() end
end)
