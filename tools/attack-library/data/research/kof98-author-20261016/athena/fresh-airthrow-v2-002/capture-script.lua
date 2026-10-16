if _G.KOF_AUTHOR_REGISTERED then return end
_G.KOF_AUTHOR_REGISTERED=true
local out=assert(os.getenv('KOF_AUTHOR_OUT'));local m=manager.machine;local s=m.screens[':screen'];local ram=m.devices[':maincpu'].spaces['program'];local fields={}
for _,port in pairs(m.ioport.ports) do for n,v in pairs(port.fields) do fields[n]=v end end
local function set(n,v) assert(fields[n],n):set_value(v) end
local route={};for n in (os.getenv('KOF_ROUTE') or ''):gmatch('[^,]+') do route[#route+1]=n end
local moves=dofile(out..'/moves.lua');dofile(assert(os.getenv('KOF_RECORDER')))
local trace=assert(io.open(out..'/trace.csv','w'));trace:write('tick,screenFrame,id,phase,phaseTick,p1x,p1y,p2x,p2y,face,life1,life2,gamePhase,input1,input2\n')
local input=assert(io.open(out..'/inputs.csv','w'));input:write('tick,player,field,value\n');local previous={}
local result=assert(io.open(out..'/attempts.tsv','w'));result:write('id\tstatus\treason\n')
local vr=emu.item(assert(m.devices[':spritegen'].items['0/m_videoram']));local pal=m.palettes[':palette']
local observeFrames=tonumber(os.getenv('KOF_OBSERVE_FRAMES') or '120')
local tick=0;local idx=1;local t=0;local elapsed=0;local phase='settle';local stable=0;local face=true;local priorY=nil;local reason=nil
local function finish(status,why)
 result:write(moves[idx].id..'\t'..status..'\t'..why..'\n');result:flush();trace:flush();input:flush();idx=idx+1;t=-1;phase='settle';stable=0;priorY=nil;reason=nil
end
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
 local v=moves[idx];if not v then trace:close();input:close();result:close();m:exit();return end
 elapsed=elapsed+1
 local x=ram:read_i16(0x108118);local y=ram:read_i16(0x108126);local xx=ram:read_i16(0x108318);local yy=ram:read_i16(0x108326);local dx=xx-x;local hp=ram:read_u8(0x108239);local hp2=ram:read_u8(0x108439);local gp=ram:read_u8(0x10b094)
 local p1={};local p2={};local function p(n) set('P1 '..n,1);p1[#p1+1]=n end;local function q(n) set('P2 '..n,1);p2[#p2+1]=n end
 local forward=dx>=0 and 'Right' or 'Left';local back=dx>=0 and 'Left' or 'Right'
 local motion=0;for _,z in ipairs(v.steps) do motion=motion+z.frames end
 if gp~=2 or hp<24 or hp2<24 or elapsed>1900 then reason='battle phase/health/time budget requires fresh legal match' end
 if not reason and phase=='settle' then
  if y==216 and yy==216 and priorY==y then stable=stable+1 else stable=0 end;priorY=y
  if t>=90 and stable>=12 then phase='spacing';t=-1 elseif t>240 then reason='grounded neutral not attained without state forcing' end
 elseif not reason and phase=='spacing' then
  if v.close then if math.abs(dx)>32 then p(forward) end
  elseif v.conditionRaw=='not too close' then if math.abs(dx)<55 then p(back) elseif math.abs(dx)>70 then p(forward) end
  elseif math.abs(dx)<125 then p(back) elseif math.abs(dx)>175 then p(forward) end
  if t>=110 then
   if v.close and math.abs(dx)>45 then reason='ordinary approach failed close prerequisite'
   else phase=v.air and 'jump' or 'neutral';t=-1 end
  end
 elseif not reason and phase=='jump' then
  if t<3 then p('Up');if v.airThrow then q('Up') end end
  if v.airThrow and math.abs(dx)>14 then p(forward) end
  if t>=10 then if y>=212 then reason='real jump airborne prerequisite not observed' else phase='motion';t=-1;face=dx>=0 end end
 elseif not reason and phase=='neutral' then
  if v.opponentJump and t>=7 and t<10 then q('Up') end
  if t>=12 then phase='motion';t=-1;face=dx>=0 end
 elseif not reason and phase=='motion' then
  local zt=t
  for _,z in ipairs(v.steps) do
   if zt<z.frames then
    -- A parent-chain handoff re-samples actual side before the next motion.
    if #z.fields==0 and not z.buttons and z.frames==10 then face=dx>=0 end
    for _,f in ipairs(z.fields) do if f=='Right' then p(face and 'Right' or 'Left') elseif f=='Left' then p(face and 'Left' or 'Right') else p(f) end end
    for _,b in ipairs(z.buttons or {}) do p(b) end;break
   end;zt=zt-z.frames
  end
  if t>=motion then phase='observe';t=-1 end
 elseif not reason and phase=='observe' then
  if v.opponentLowAttack and t>=4 and t<7 then q('Down');q('B') end
  if v.counter and t>=4 and t<7 then q(v.sourceRow==16 and 'B' or 'C');if v.sourceRow==16 then q('Down') end end
 end
 local sf=type(s.frame_number)=='function' and s:frame_number() or s.frame_number
 trace:write(table.concat({tick,sf,v.id,phase,t,x,y,xx,yy,ram:read_u8(0x108131),hp,hp2,gp,table.concat(p1,'+'),table.concat(p2,'+')},',')..'\n')
 for pl,keys in ipairs({p1,p2}) do local active={};for _,k in ipairs(keys) do active[k]=true end;for _,k in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do local value=active[k] and 1 or 0;local key=pl..k;if previous[key]~=value then input:write(tick..','..pl..','..k..','..value..'\n');previous[key]=value end end end
 if phase=='motion' or phase=='observe' or phase=='jump' then
  local prefix=string.format('%06d',tick);s:snapshot(out..'/snap/'..prefix..'.png')
  local data={};for i=0,0x85ff do data[#data+1]=string.pack('<I2',vr:read(i)) end;local f=assert(io.open(out..'/vram/'..prefix..'.bin','wb'));f:write(table.concat(data));f:close()
  data={};for i=0,4095 do data[#data+1]=string.pack('<I4',pal:pen_color(i)) end;f=assert(io.open(out..'/palette/'..prefix..'.bin','wb'));f:write(table.concat(data));f:close()
 end
 if reason then finish('blocked',reason)
 elseif phase=='observe' and t>=observeFrames-1 then finish('attempted','ordinary command chain delivered; parent/cancel/throw result needs visual review') end
 t=t+1
end)
