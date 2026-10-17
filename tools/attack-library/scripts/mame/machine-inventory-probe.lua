-- Read-only machine inventory for one MAME system. No ROM, RAM or VRAM writes.
local out = assert(os.getenv('MSLUG_INVENTORY_OUT'))
local m = manager.machine
local f = assert(io.open(out .. '/machine-inventory.txt', 'w'))
local function line(...)
  local parts = {}
  for i = 1, select('#', ...) do parts[i] = tostring(select(i, ...)) end
  f:write(table.concat(parts, '\t') .. '\n')
end
line('system', m.system.name)
line('description', m.system.description)
for tag, s in pairs(m.screens) do
  line('screen', tag, s.width .. 'x' .. s.height, s.refresh)
  local ok, area = pcall(function() return s.visible_area end)
  line('screen-visible', tag, tostring(ok), tostring(area))
end
for tag, d in pairs(m.devices) do line('device', tag, d.shortname) end
for tag, p in pairs(m.ioport.ports) do
  for name, field in pairs(p.fields) do line('ioport', tag, name, field.type) end
end
for tag, pal in pairs(m.palettes) do line('palette', tag, pal.colors) end
local cpu = m.devices[':maincpu']
if cpu then
  line('maincpu-shortname', cpu.shortname)
  local space = cpu.spaces['program']
  line('program-space', space and 'yes' or 'no')
  if space then line('program-address-mask', space.address_mask, space.endianness) end
end
local sg = m.devices[':spritegen']
if sg then
  for tag, _ in pairs(sg.items) do line('spritegen-item', tag) end
else
  line('spritegen-item', 'ABSENT')
end
f:close()
m:exit()
