-- Adaptation of Jesuszilla c35f354 kof-hitboxes.lua geometry only.
-- NO write taps, memory writes, cheat health, forced action or input simulation.
-- Start with -autoboot_script; KOF_BOX_OUT must be a writable directory.
local out=assert(os.getenv('KOF_BOX_OUT'));local m=manager.machine
assert(m.system.name=='kof98','Only exact parent kof98 supported')
local ram=m.devices[':maincpu'].spaces['program'];local file=assert(io.open(out..'/box-observations.jsonl','w'));file:setvbuf('no');local tick=0
local function box(base,off,kind,bit)
 local id=ram:read_u8(base+off);local status=ram:read_u8(base+0x7c)
 if bit and ((status>>bit)&1)==0 then return nil end
 if kind=='push' and id==255 then return nil end
 if kind=='typed' then
  if id==0 then kind='undefined' elseif id<=9 then kind='vulnerability' elseif id<=11 then kind='guard' elseif id<=55 then kind='attack' elseif id<=57 then kind='guard' elseif id<=64 then kind='proj-vulnerability' else kind='undefined' end
  if kind=='attack' and bit==1 then return nil end
 end
 local dx=ram:read_i8(base+off+1);local dy=ram:read_i8(base+off+2);local rx=ram:read_u8(base+off+3);local ry=ram:read_u8(base+off+4)
 if dx==0 and dy==0 and rx==0 and ry==0 then return nil end
 return string.format('{"offset":%d,"id":%d,"kind":"%s","dx":%d,"dy":%d,"rx":%d,"ry":%d}',off,id,kind,dx,dy,rx,ry)
end
emu.register_frame_done(function()
 tick=tick+1;local players={}
 for p=0,1 do local b=0x108100+p*0x200;local boxes={}
  for _,x in ipairs({{0xa4,'push'},{0x9f,'typed',3},{0x9a,'typed',2},{0x95,'typed',1},{0x90,'typed',0}}) do local v=box(b,x[1],x[2],x[3]);if v then boxes[#boxes+1]=v end end
  players[#players+1]=string.format('{"player":%d,"base":%d,"x":%d,"y":%d,"flip":%d,"status":%d,"boxes":[%s]}',p+1,b,ram:read_i16(b+0x18),ram:read_i16(b+0x26),ram:read_u8(b+0x31),ram:read_u8(b+0x7c),table.concat(boxes,','))
 end
 file:write(string.format('{"tick":%d,"phaseRaw":%d,"cameraX":%d,"players":[%s]}\n',tick,ram:read_u8(0x10b094),ram:read_i16(0x10b0cc),table.concat(players,',')));if tick%60==0 then file:flush() end
end)
-- MAME0.289 has no emu.register_stop; process closes file, periodic flush retains records.
