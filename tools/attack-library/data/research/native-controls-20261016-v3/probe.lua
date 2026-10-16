-- Actual emulated I/O and native frame capture. No ROM or RAM writes.
local out = assert(os.getenv('ARCADE_PROBE_OUT'))
local machine = manager.machine
local fields = {}
local inventory = assert(io.open(out..'/input-fields.tsv','w'))
inventory:write('port\tname\ttype\n')
for tag,port in pairs(machine.ioport.ports) do
 for name,field in pairs(port.fields) do
  inventory:write(tag..'\t'..name..'\t'..tostring(field.type)..'\n')
  fields[name] = field
 end
end
inventory:close()
local log = assert(io.open(out..'/input-events.tsv','w'))
log:write('frame\tfield\tvalue\tpresent\n')
local frame = 0
local boot = tonumber(os.getenv('ARCADE_BOOT_FRAMES')) or 1800
local delay = tonumber(os.getenv('ARCADE_CONTROL_DELAY')) or 840
local jumpFirst = os.getenv('ARCADE_JUMP_FIRST')=='1'
local screen
for _,s in pairs(machine.screens) do screen=s;break end
assert(screen,'No emulated screen')
local previous = {}
local function input(name,value)
 if previous[name]~=value then
  log:write(frame..'\t'..name..'\t'..value..'\t'..tostring(fields[name]~=nil)..'\n');log:flush()
  previous[name]=value
 end
 if fields[name] then fields[name]:set_value(value) end
end
local photos={ [180]='boot', [boot+180]='ready', [boot+300]='after-coin', [boot+420]='after-start', [boot+delay]='before-control', [boot+delay+120]='right', [boot+delay+240]='down', [boot+delay+360]='left', [boot+delay+480]='up', [boot+delay+540]='button1', [boot+delay+660]='after-control', [boot+delay+900]='end' }
if jumpFirst then
 photos[boot+delay+20]='jump-early';photos[boot+delay+40]='jump-late';photos[boot+delay+80]='right-early'
end
emu.register_frame_done(function()
 frame=frame+1
 local tick=frame-boot
 local action=tick-delay
 input('Coin 1',tick>=240 and tick<246 and 1 or 0)
 input('1 Player Start',tick>=360 and tick<366 and 1 or 0)
 input('P1 Right',action>=10 and action<130 and 1 or 0)
 input('P1 Down',action>=130 and action<250 and 1 or 0)
 input('P1 Left',action>=250 and action<370 and 1 or 0)
 input('P1 Up',action>=370 and action<490 and 1 or 0)
 input('P1 Button 1',((jumpFirst and action>=10 and action<15) or (action>=500 and action<560 and action%20<5)) and 1 or 0)
 if photos[frame] then screen:snapshot(out..'/snap/'..string.format('%05d',frame)..'-'..photos[frame]..'.png') end
 if frame>=boot+delay+960 then log:close();machine:exit() end
end)
