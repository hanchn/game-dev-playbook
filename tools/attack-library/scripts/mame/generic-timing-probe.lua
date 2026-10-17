-- Generic native timing probe: ordinary inputs only, read-only observation.
-- Env: ARCADE_OUT, ARCADE_COIN_AT, ARCADE_START_AT, ARCADE_LAST,
--      ARCADE_SNAPSHOT_EVERY, ARCADE_ACTION_AT (first frame of repeated button 1),
--      ARCADE_ACTION_EVERY (period), ARCADE_ACTION_FIELD (ioport field name)
local out = assert(os.getenv('ARCADE_OUT'))
local m = manager.machine
local s = m.screens[':screen']
local fields = {}
for _, p in pairs(m.ioport.ports) do for n, v in pairs(p.fields) do fields[n] = v end end
local function set(n, v) assert(fields[n], n):set_value(v) end
local coinAt = tonumber(os.getenv('ARCADE_COIN_AT') or '600')
local startAt = tonumber(os.getenv('ARCADE_START_AT') or '900')
local last = tonumber(os.getenv('ARCADE_LAST') or '7200')
local every = tonumber(os.getenv('ARCADE_SNAPSHOT_EVERY') or '60')
local actionAt = tonumber(os.getenv('ARCADE_ACTION_AT') or '0')
local actionEvery = tonumber(os.getenv('ARCADE_ACTION_EVERY') or '60')
local actionField = os.getenv('ARCADE_ACTION_FIELD') or 'P1 Button 1'
local log = assert(io.open(out .. '/timing-log.csv', 'w'))
log:write('tick,coin,start,action,image\n')
local tick = 0
emu.register_frame_done(function()
  tick = tick + 1
  local coin = (tick >= coinAt and tick < coinAt + 6) and 1 or 0
  local start = (tick >= startAt and tick < startAt + 6) and 1 or 0
  local action = 0
  if actionAt > 0 and tick >= actionAt and (tick - actionAt) % actionEvery < 6 then action = 1 end
  set('Coin 1', coin)
  set('1 Player Start', start)
  if fields[actionField] then set(actionField, action) end
  if tick % every == 0 and tick >= coinAt then
    local name = string.format('%06d', tick)
    s:snapshot(out .. '/snap/' .. name .. '.png')
    log:write(table.concat({tick, coin, start, action, name}, ',') .. '\n')
  end
  if tick >= last then log:close(); m:exit() end
end)
