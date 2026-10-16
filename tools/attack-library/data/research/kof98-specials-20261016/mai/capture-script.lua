if _G.KOF_SPECIAL_REGISTERED then return end
_G.KOF_SPECIAL_REGISTERED=true
-- Independent ordinary-input specials capture. No RAM writes or forced states.
local out=assert(os.getenv('KOF_SPECIAL_OUT'));local m=manager.machine;local s=m.screens[':screen'];local ram=m.devices[':maincpu'].spaces['program'];local fields={}
for _,port in pairs(m.ioport.ports) do for n,v in pairs(port.fields) do fields[n]=v end end
local function set(n,v) assert(fields[n],n):set_value(v) end
local route={};for n in (os.getenv('KOF_ROUTE') or ''):gmatch('[^,]+') do route[#route+1]=n end
local moves=dofile(out..'/moves.lua');dofile(assert(os.getenv('KOF_RECORDER')))
local tr=assert(io.open(out..'/trace.csv','w'));tr:write('tick,screenFrame,move,phase,phaseTick,p1x,p1y,p2x,p2y,face,life1,life2,gamePhase,fields\n')
local results=assert(io.open(out..'/attempts.tsv','w'));results:write('id\tstatus\treason\n')
local tick=0;local idx=1;local t=0;local reason=nil;local facing=nil
emu.register_frame_done(function()
 tick=tick+1
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
 local move=moves[idx];if not move then tr:close();results:close();m:exit();return end
 local x=ram:read_i16(0x108118);local y=ram:read_i16(0x108126);local dx=ram:read_i16(0x108318)-x
 if t==0 then reason=move.super and 'natural super meter not established; no injection' or nil;facing=dx>=0 end
 local pressed={};local function p(n) set('P1 '..n,1);pressed[#pressed+1]=n end
 local forward=facing and 'Right' or 'Left';local back=facing and 'Left' or 'Right'
 local phase='neutral';local pre=12;local prep=move.close and 110 or (move.air and 18 or 0)
 local steps=move.steps;local motion=0;for k,v in ipairs(steps) do motion=motion+((move.charge and k==1) and 70 or v.frames) end
 if not reason then
  if t<prep then
   phase='prepare'
   if move.close and math.abs(dx)>30 then p(forward) end
   if move.air and t<3 then p('Up') end
  elseif t<prep+pre then phase='neutral'
  elseif t<prep+pre+motion then
   phase='motion';local q=t-prep-pre
   if t==prep+pre and move.close and math.abs(dx)>42 then reason='close range not attained by ordinary walk' end
   if t==prep+pre and move.air and math.abs(y-ram:read_i16(0x108326))<8 then reason='airborne condition not observed after ordinary jump' end
   for k,v in ipairs(steps) do
    local n=(move.charge and k==1) and 70 or v.frames
    if q<n then
     for _,f in ipairs(v.fields) do if f=='Right' then p(forward) elseif f=='Left' then p(back) else p(f) end end
     for _,b in ipairs(v.buttons or {}) do p(b) end;break
    end;q=q-n
   end
  else phase='observe' end
 else phase='blocked' end
 if t%1==0 and not reason then s:snapshot(out..'/snap/'..string.format('%02d-%04d',idx,t)..'.png') end
 local sf=type(s.frame_number)=='function' and s:frame_number() or s.frame_number
 tr:write(table.concat({tick,sf,idx,phase,t,x,y,ram:read_i16(0x108318),ram:read_i16(0x108326),ram:read_u8(0x108131),ram:read_u8(0x108239),ram:read_u8(0x108439),ram:read_u8(0x10b094),table.concat(pressed,'+')},',')..'\n')
 t=t+1
 if (reason and t>=1) or t>=prep+pre+motion+90 then
  results:write(idx..'\t'..(reason and 'blocked' or 'attempted')..'\t'..(reason or 'ordinary sequence delivered; visual move validation pending')..'\n');results:flush();tr:flush();idx=idx+1;t=0
 end
end)
