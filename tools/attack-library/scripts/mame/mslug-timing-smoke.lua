-- Metal Slug timing smoke: ordinary inputs only, read-only observation.
-- Purpose: find when credit, start and the first stage are actually reached.
local out = assert(os.getenv('MSLUG_OUT'))
local m = manager.machine
local s = m.screens[':screen']
local ram = m.devices[':maincpu'].spaces['program']
local fields = {}
for _, p in pairs(m.ioport.ports) do for n, v in pairs(p.fields) do fields[n] = v end end
local function set(n, v) assert(fields[n], n):set_value(v) end
local log = assert(io.open(out .. '/smoke-log.csv', 'w'))
log:write('tick,phase,coin,start,image\n')
local tick = 0
emu.register_frame_done(function()
  tick = tick + 1
  local coin = (tick >= 900 and tick < 906) and 1 or 0
  local start = (tick >= 960 and tick < 966) and 1 or 0
  set('Coin 1', coin)
  set('1 Player Start', start)
  if tick % 30 == 0 then
    local name = string.format('%06d', tick)
    s:snapshot(out .. '/snap/' .. name .. '.png')
    log:write(table.concat({tick, 'sample', coin, start, name}, ',') .. '\n')
  end
  if tick >= 3300 then log:close(); m:exit() end
end)
