-- Original-runtime observation only. Output is isolated by NAIFROG_TRACE_DIR.
local out = assert(os.getenv('NAIFROG_TRACE_DIR'), 'NAIFROG_TRACE_DIR required')
local fields = {}
local list = assert(io.open(out .. '/ports.tsv', 'w'))
for tag, port in pairs(manager.machine.ioport.ports) do
 for name, field in pairs(port.fields) do
  fields[name] = field
  list:write(tag .. '\t' .. name .. '\t' .. tostring(field.mask) .. '\n')
 end
end
list:close()
local cpu = manager.machine.devices[':maincpu'].spaces['program']
local trace = assert(io.open(out .. '/two-player-trace.csv', 'w'))
trace:write('frame,screenFrame,pc,global8008,p1x,p1y,p2x,p2y,p1state,p2state,p1life,p2life,p1char,p2char,p1input,p2input,match\n')
local frame = 0
local function set(name, value)
 if fields[name] then fields[name]:set_value(value) end
end
emu.register_frame_done(function()
 frame = frame + 1
 set('Coin 1', frame >= 1200 and frame % 300 < 5 and 1 or 0)
 set('Coin 2', frame >= 1200 and frame % 300 < 5 and 1 or 0)
 set('2 Players Start', frame >= 1500 and frame % 300 >= 90 and frame % 300 < 95 and 1 or 0)
 set('P2 Button 1', frame >= 1550 and frame < 3000 and frame % 100 < 3 and 1 or 0)
 set('1 Player Start', frame >= 1260 and frame % 300 >= 60 and frame % 300 < 65 and 1 or 0)
 set('P1 Button 1', frame >= 1320 and frame < 3000 and frame % 120 < 5 and 1 or 0)
 if frame % 10 == 0 then
  trace:write(string.format('%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d\n', frame,(type(manager.machine.screens[':screen'].frame_number)=='function' and manager.machine.screens[':screen']:frame_number() or manager.machine.screens[':screen'].frame_number),manager.machine.devices[':maincpu'].state['PC'].value,cpu:read_u16(0xff8008),cpu:read_i16(0xff8454),cpu:read_i16(0xff8458),cpu:read_i16(0xff8854),cpu:read_i16(0xff8858),cpu:read_u8(0xff8451),cpu:read_u8(0xff8851),cpu:read_u16(0xff8478),cpu:read_u16(0xff8878),cpu:read_u8(0xff87df),cpu:read_u8(0xff8bdf),cpu:read_u16(0xff87e0),cpu:read_u16(0xff8be0),cpu:read_u16(0xff847f)))
  trace:flush()
 end
 if frame == 600 or frame >= 1200 and frame % 300 < 5 or frame == 1800 or frame == 2400 or frame == 3000 or frame == 4200 then
  manager.machine.screens[':screen']:snapshot(out .. '/snap/' .. tostring(frame) .. '.png')
 end
 if frame >= 4400 then trace:close(); manager.machine:exit() end
end)
