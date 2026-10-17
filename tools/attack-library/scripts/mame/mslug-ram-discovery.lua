-- Metal Slug work-RAM discovery: read-only observation, ordinary input only.
-- Boots, coins, starts, waits for the post-tutorial mission, then executes a
-- fixed action sequence while dumping work RAM so field candidates can be
-- correlated with the scripted actions afterwards.
local out = assert(os.getenv('MSLUG_OUT'))
local m = manager.machine
local s = m.screens[':screen']
local ram = m.devices[':maincpu'].spaces['program']
local vr = emu.item(assert(m.devices[':spritegen'].items['0/m_videoram']))
local auto = emu.item(assert(m.devices[':spritegen'].items['0/m_auto_animation_counter']))
local pal = m.palettes[':palette']
local fields = {}
for _, p in pairs(m.ioport.ports) do for n, v in pairs(p.fields) do fields[n] = v end end
local function set(n, v) assert(fields[n], n):set_value(v) end
local trace = assert(io.open(out .. '/trace.csv', 'w'))
trace:write('tick,phase,phaseTick,screenFrame,coin,start,p1A,p1B,p1C,p1D,up,down,left,right\n')
local inputs = assert(io.open(out .. '/inputs.csv', 'w'))
inputs:write('tick,field,value\n')
local phases = {
  {'idle', 90},
  {'walk-right', 180},
  {'idle-2', 60},
  {'walk-left', 180},
  {'idle-3', 60},
  {'crouch', 60},
  {'jump', 90},
  {'shoot', 90},
  {'grenade', 90},
  {'knife-approach', 240},
}
local playBegin = tonumber(os.getenv('MSLUG_PLAY_BEGIN') or '4900')
local total = 0
for _, p in ipairs(phases) do total = total + p[2] end
local tick = 0
local prev = {}
local function emit(name, value)
  if prev[name] ~= value then
    inputs:write(tick .. ',' .. name .. ',' .. value .. '\n')
    prev[name] = value
  end
end
local function read16(addr) return ram:read_u16(addr) end
emu.register_frame_done(function()
  tick = tick + 1
  local coin = (tick >= 600 and tick < 606) and 1 or 0
  local start = (tick >= 900 and tick < 906) and 1 or 0
  set('Coin 1', coin)
  set('1 Player Start', start)
  emit('Coin 1', coin)
  emit('1 Player Start', start)
  local state = {}
  for _, n in ipairs({'A', 'B', 'C', 'D', 'Up', 'Down', 'Left', 'Right'}) do
    state[n] = 0
    set('P1 ' .. n, 0)
  end
  -- Sample the whole work RAM every 10 frames once the mission is live.
  if tick >= playBegin - 60 and tick <= playBegin + total + 60 and (tick % 10 == 0) then
    local data = {}
    for i = 0x100000, 0x10FFFF do data[#data + 1] = string.char(ram:read_u8(i)) end
    local f = assert(io.open(out .. '/ram/' .. string.format('%06d', tick) .. '.bin', 'wb'))
    f:write(table.concat(data)); f:close()
  end
  if tick >= playBegin then
    local rel = tick - playBegin
    local phase, t = 'end', rel
    for _, p in ipairs(phases) do
      if t < p[2] then phase = p[1]; break end
      t = t - p[2]
    end
    local function hold(n) state[n] = 1; set('P1 ' .. n, 1) end
    if phase == 'walk-right' then hold('Right') end
    if phase == 'walk-left' then hold('Left') end
    if phase == 'crouch' then hold('Down') end
    if phase == 'jump' and t >= 20 and t < 32 then hold('Up') end
    if phase == 'shoot' and t % 30 < 6 then hold('A') end
    if phase == 'grenade' and t % 30 < 6 then hold('D') end
    if phase == 'knife-approach' then hold('Right') end
    local values = {}
    for _, n in ipairs({'A', 'B', 'C', 'D', 'Up', 'Down', 'Left', 'Right'}) do
      emit('P1 ' .. n, state[n])
      values[#values + 1] = state[n]
    end
    local sf = type(s.frame_number) == 'function' and s:frame_number() or s.frame_number
    local row = {tick, phase, t, sf, coin, start}
    for _, v in ipairs(values) do row[#row + 1] = v end
    trace:write(table.concat(row, ',') .. '\n')
    -- Native frame evidence at every phase boundary.
    if tick % 30 == 0 then
      s:snapshot(out .. '/snap/' .. string.format('%06d', tick) .. '.png')
      local vd = {}
      for i = 0, 0x85ff do vd[#vd + 1] = string.pack('<I2', vr:read(i)) end
      local f = assert(io.open(out .. '/vram/' .. string.format('%06d', tick) .. '.bin', 'wb'))
      f:write(table.concat(vd)); f:close()
      local pd = {}
      for i = 0, 4095 do pd[#pd + 1] = string.pack('<I4', pal:pen_color(i)) end
      f = assert(io.open(out .. '/palette/' .. string.format('%06d', tick) .. '.bin', 'wb'))
      f:write(table.concat(pd)); f:close()
    end
    if rel >= total then trace:close(); inputs:close(); m:exit() end
  end
end)
