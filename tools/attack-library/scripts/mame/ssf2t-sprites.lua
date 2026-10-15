-- Read-only CPS2 graphics/object observation. No chroma-key and no palette/RAM writes.
-- Reconstructors must still verify every result against the native screenshot.
local out=assert(os.getenv('NAIFROG_TRACE_DIR'))
local actions=assert(os.getenv('NAIFROG_ACTION_SCRIPT'))
local objects=assert(io.open(out..'/sprite-objects.csv','w'))
objects:write('frame,bank,index,x,y,code,attr\n')
local palettes=assert(io.open(out..'/sprite-palettes.csv','w'))
palettes:write('frame,index,argb\n')
local outputs=assert(io.open(out..'/sprite-outputs.csv','w'))
outputs:write('frame,xoffset,yoffset\n')
local init=false
local function capture(frame,phase,path)
 local cpu=manager.machine.devices[':maincpu'].spaces['program']
 outputs:write(frame..','..cpu:read_u16(0x400008)..','..cpu:read_u16(0x40000a)..'\n');outputs:flush()
 if not init then
  local gfx=assert(manager.machine.memory.regions[':gfx'])
  local bin=assert(io.open(out..'/gfx-decoded-region.bin','wb'))
  bin:write(gfx:read(0,gfx.size));bin:close();init=true
 end
 for bank=0,2 do
  local share,words,read
  if bank==0 then
   local index=assert(manager.machine.devices[':'].items['0/m_cps2_buffered_obj'])
   local item=emu.item(index);assert(item.size==2)
   words=item.count;read=function(i) return item:read(i) end
  else
   share=assert(manager.machine.memory.shares[':objram'..bank]);words=share.size//2
   read=function(i) return share:read_u16(i*2) end
  end
  for word=0,words-4,4 do
   local i=word*2
   local x,y,code,attr=read(word),read(word+1),read(word+2),read(word+3)
   if y>=0x8000 or attr>=0xff00 then break end
   local palette=attr&31
   if palette==1 or palette==16 then objects:write(table.concat({frame,bank,i//8,x,y,code,attr},',')..'\n') end
  end
 end
 objects:flush()
 local palette=assert(manager.machine.palettes[':palette'])
 for _,base in ipairs({16,256}) do
  for pen=base,base+15 do palettes:write(frame..','..pen..','..palette:pen_color(pen)..'\n') end
 end
 palettes:flush()
end
assert(loadfile(actions))(capture)
