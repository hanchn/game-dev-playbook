-- SSF2T World 940223 on MAME 0.289. Inputs only; no game-memory writes.
-- Captures native viewports and raw RAM observations, NOT transparent sprite canvases.
local observe_snapshot = ...
local out = assert(os.getenv('NAIFROG_TRACE_DIR'), 'NAIFROG_TRACE_DIR required')
local machine = manager.machine
local ram = machine.devices[':maincpu'].spaces['program']
local screen = machine.screens[':screen']
local fields = {}
for _,port in pairs(machine.ioport.ports) do
 for name,field in pairs(port.fields) do fields[name] = field end
end
local function set(name,value) assert(fields[name],name):set_value(value) end
-- Read-only adaptation of st-hitboxes.lua by Dammit, MZ and Felineki.
-- Pinned source: sf2-hitbox-extractor cf65fd8da487affce4b68788c56e0ea3667ed721.
-- Throws/projectiles and collision resolution are intentionally not inferred here.
local boxes = assert(io.open(out .. '/boxes.csv','w'))
boxes:write('frame,player,kind,id,address,rawX,rawY,halfW,halfH,originX,originY,left,top,right,bottom\n')
local descriptors={{'push',8,13,4},{'hurt1',0,8,4},{'hurt2',2,9,4},{'hurt3',4,10,4},{'attack',6,12,16}}
local function readBoxes(frame,player,base,p)
 local anim,tableptr=p[8],p[10]
 if anim<=0 or tableptr<=0 then return end
 local ox=p[4]-ram:read_i16(0xff8ed4)
 local oy=224-(p[5]-15)+ram:read_i16(0xff8ed8)
 for _,d in ipairs(descriptors) do
  local id=ram:read_u8(anim+d[3])
  if id~=0 and not(d[1]=='attack' and p[2]==0) then
   local a=tableptr+ram:read_i16(tableptr+d[2])+id*d[4]
   local x,y,w,h=ram:read_i8(a),ram:read_i8(a+1),ram:read_u8(a+2),ram:read_u8(a+3)
   if d[1]=='attack' and ram:read_u8(a+5)>=128 then x=-ram:read_u8(a+5) end
   local cx,cy=ox+x*(p[6]==1 and -1 or 1),oy-y
   boxes:write(table.concat({frame,player,d[1],id,a,x,y,w,h,ox,oy,cx-w,cy-h,cx+w,cy+h},',')..'\n')
  end
 end
end
local trace = assert(io.open(out .. '/actions.csv','w'))
trace:write('frame,screenFrame,gameCounter,phase,phaseTick,gameState,matchState,turbo,frameskip,cameraX,cameraY,p1char,p1state,p1substate,p1x,p1y,p1flip,p1life,p1anim,p1animLeft,p1hitbox,p1air,p1hitfreeze,p1input,p2char,p2state,p2x,p2y,p2life,p2anim,p2hitfreeze,p2input\n')
local actions = {{name='idle',kind='idle'}}
for _,context in ipairs({'stand','crouch','air'}) do
 for button=1,6 do table.insert(actions,{name=context..'-'..button,kind=context,button=button}) end
end
for _,name in ipairs({'qcf-lp','dp-lp','qcb-lk'}) do table.insert(actions,{name=name,kind=name}) end
local scenario=os.getenv('NAIFROG_SCENARIO') or 'motions'
if scenario=='contact' then
 actions={{name='approach',kind='approach'}}
 for n=1,12 do table.insert(actions,{name='contact-'..n,kind='contact',button=(n-1)%6+1}) end
end
local frame,start = 0,nil
local previous = ''
local function readPlayer(base)
 return {ram:read_u8(base+0x391),ram:read_u8(base+3),ram:read_u8(base+4),ram:read_i16(base+6),ram:read_i16(base+10),ram:read_u8(base+0x12),ram:read_u16(base+0x2a),ram:read_u32(base+0x1a),ram:read_u8(base+0x19),ram:read_u32(base+0x34),ram:read_u8(base+0x181),ram:read_u8(base+0x47),ram:read_u16(base+0x392)}
end
emu.register_frame_done(function()
 frame=frame+1
 -- Coin and joining sequences use ordinary arcade inputs, not RAM modifications.
 set('Coin 1',frame>=1200 and frame<2400 and frame%300<5 and 1 or 0)
 set('Coin 2',frame>=1200 and frame<2400 and frame%300<5 and 1 or 0)
 set('1 Player Start',frame>=1260 and frame<2400 and frame%300>=60 and frame%300<65 and 1 or 0)
 set('2 Players Start',frame>=1500 and frame<2400 and frame%300>=90 and frame%300<95 and 1 or 0)
 for p=1,2 do
  for _,direction in ipairs({'Up','Down','Left','Right'}) do set('P'..p..' '..direction,0) end
  for b=1,6 do set('P'..p..' Button '..b,0) end
 end
 if frame<3000 then
  set('P1 Button 1',frame>=1320 and frame%120<5 and 1 or 0)
  set('P2 Button 1',frame>=1550 and frame%100<3 and 1 or 0)
 end
 local p1,p2=readPlayer(0xff844e),readPlayer(0xff884e)
 local game=ram:read_u16(0xff8008)
 if not start and frame>=3100 and game==10 and p1[2]==0 and p2[2]==0 then start=frame end
 local phase,tick='boot',0
 if start then
  local index=math.floor((frame-start)/96)+1
  local action=actions[index]
  if not action then boxes:close();trace:close();machine:exit();return end
  tick=(frame-start)%96;phase=action.name
  if action.kind=='approach' or action.kind=='contact' then
   local delta=p2[4]-p1[4]
   if math.abs(delta)>48 then set(delta>0 and 'P1 Right' or 'P1 Left',1) end
  end
  if action.kind=='crouch' then set('P1 Down',tick<75 and 1 or 0) end
  if action.kind=='air' then set('P1 Up',tick<3 and 1 or 0) end
  if action.button then
   local press=action.kind=='contact' and 36 or 12
   set('P1 Button '..action.button,tick>=press and tick<press+3 and 1 or 0)
  end
  if action.kind=='qcf-lp' then
   set('P1 Down',tick>=12 and tick<20 and 1 or 0)
   set('P1 Right',tick>=16 and tick<24 and 1 or 0)
   set('P1 Button 1',tick>=20 and tick<23 and 1 or 0)
  elseif action.kind=='dp-lp' then
   set('P1 Right',(tick>=12 and tick<16 or tick>=20 and tick<24) and 1 or 0)
   set('P1 Down',tick>=16 and tick<24 and 1 or 0)
   set('P1 Button 1',tick>=20 and tick<23 and 1 or 0)
  elseif action.kind=='qcb-lk' then
   set('P1 Down',tick>=12 and tick<20 and 1 or 0)
   set('P1 Left',tick>=16 and tick<24 and 1 or 0)
   set('P1 Button 4',tick>=20 and tick<23 and 1 or 0)
  end
 end
 if start then
  local sf=type(screen.frame_number)=='function' and screen:frame_number() or screen.frame_number
  local row={frame,sf,ram:read_u8(0xff801d),phase,tick,game,ram:read_u16(0xff847f),ram:read_u8(0xff83a9),ram:read_u8(0xff8cd3),ram:read_i16(0xff8ed4),ram:read_i16(0xff8ed8)}
  for _,v in ipairs(p1) do table.insert(row,v) end
  for _,i in ipairs({1,2,4,5,7,8,12,13}) do table.insert(row,p2[i]) end
  trace:write(table.concat(row,',')..'\n');trace:flush()
  readBoxes(frame,1,0xff844e,p1);readBoxes(frame,2,0xff884e,p2)
  local signature=phase..'-'..p1[8]..'-'..p1[2]..'-'..p2[2]
  if signature~=previous or tick%15==0 then
   local path=out..'/snap/'..string.format('%05d',frame)..'-'..phase..'.png'
   screen:snapshot(path)
   if type(observe_snapshot)=='function' then observe_snapshot(frame,phase,path) end
  end
  previous=signature
 end
 if frame>=6500 then boxes:close();trace:close();machine:exit() end
end)
