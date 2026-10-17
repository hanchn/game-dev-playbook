#!/usr/bin/env python3
"""Capture original-arcade action windows with ordinary input and read-only observation.

One plan JSON per game drives a generated MAME autoboot script. Every run keeps:
  plan.json, generated autoboot Lua, inputs.csv, trace.csv, per-refresh native
  screenshots and (sampled) sprite VRAM / palette dumps, plus a capture report
  with hashes and validation results.

This records what the original machine actually displayed. It does not prove
that a move triggered, that a hit landed, or that native timing was recovered;
those stay separate acceptance steps.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from native_runtime import NativeRuntime  # noqa: E402


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha_file(path):
    return sha_bytes(Path(path).read_bytes())


LUA_TEMPLATE = r'''
-- GENERATED from {plan_name}.sha256={plan_sha}. Ordinary input only; RAM, VRAM and
-- palettes are read-only observations.
local out = assert(os.getenv('ARCADE_ACTIONS_OUT'))
local m = manager.machine
local s = m.screens[':screen']
if not s then for _, candidate in pairs(m.screens) do s = candidate; break end end
assert(s, 'no emulated screen')
local sg = m.devices[':spritegen']
local vr = sg and emu.item(sg.items['0/m_videoram'])
local auto = sg and emu.item(sg.items['0/m_auto_animation_counter'])
local pal = m.palettes[':palette']
if not pal then for _, candidate in pairs(m.palettes) do pal = candidate; break end end
local HAVE_VRAM = (vr ~= nil)
local HAVE_PALETTE = false
if pal then local ok = pcall(function() return pal:pen_color(0) end); HAVE_PALETTE = ok end
local fields = {{}}
for _, p in pairs(m.ioport.ports) do for n, v in pairs(p.fields) do fields[n] = v end end
local function set(name, v)
  local field = fields[name]
  if not field then error('missing ioport field: ' .. name) end
  field:set_value(v)
end
local COIN_FIELD = {coin_field}
local START_FIELD = {start_field}
local DIRS = {dirs}
local BUTTONS = {buttons}
local DIR_ORDER = {dir_order}
local BUTTON_ORDER = {button_order}
local COIN_AT = {coin_at}
local START_AT = {start_at}
local PLAY_BEGIN = {play_begin}
local PRELUDE = {prelude}
local PHASES = {phases}
local SNAPSHOT_EVERY = {snapshot_every}
local DUMP_EVERY = {dump_every}
local TOTAL = 0
for _, phase in ipairs(PHASES) do TOTAL = TOTAL + phase[2] end
local trace = assert(io.open(out .. '/trace.csv', 'w'))
local inputs = assert(io.open(out .. '/inputs.csv', 'w'))
inputs:write('tick,field,value\n')
local header = {{'tick', 'phase', 'phaseTick', 'screenFrame'}}
for _, name in ipairs(DIR_ORDER) do header[#header + 1] = 'dir_' .. name end
for _, name in ipairs(BUTTON_ORDER) do header[#header + 1] = 'btn_' .. name end
trace:write(table.concat(header, ',') .. '\n')
local tick = 0
local prev = {{}}
local function emit(name, value)
  if prev[name] ~= value then
    inputs:write(tick .. ',' .. name .. ',' .. value .. '\n')
    prev[name] = value
  end
end
emu.register_frame_done(function()
  tick = tick + 1
  local coin = (tick >= COIN_AT and tick < COIN_AT + 6) and 1 or 0
  local start = (tick >= START_AT and tick < START_AT + 6) and 1 or 0
  set(COIN_FIELD, coin); emit(COIN_FIELD, coin)
  set(START_FIELD, start); emit(START_FIELD, start)
  for _, step in ipairs(PRELUDE) do
    local field = fields[step[1]]
    if field then field:set_value((tick >= step[2] and tick < step[3]) and 1 or 0) end
  end
  local state = {{}}
  for _, name in ipairs(DIR_ORDER) do state[name] = 0 end
  for _, name in ipairs(BUTTON_ORDER) do state[name] = 0 end
  if tick >= PLAY_BEGIN then
    local rel = tick - PLAY_BEGIN
    local phase, t = 'end', rel
    for _, p in ipairs(PHASES) do
      if t < p[2] then phase = p[1]; break end
      t = t - p[2]
    end
    for _, p in ipairs(PHASES) do
      if p[1] ~= phase then goto continue end
      if p[3] then for _, name in ipairs(p[3]) do state[name] = 1 end end
      if p[4] and t >= p[4][1] and t < p[4][2] then for _, name in ipairs(p[4][3]) do state[name] = 1 end end
      if p[5] and (t % p[5][1]) < p[5][2] then for _, name in ipairs(p[5][3]) do state[name] = 1 end end
      if p[6] then
        local at = 0
        for _, step in ipairs(p[6]) do
          if t >= at and t < at + step[1] then
            for _, name in ipairs(step[2]) do state[name] = 1 end
            break
          end
          at = at + step[1]
        end
      end
      ::continue::
    end
    for _, name in ipairs(DIR_ORDER) do set(DIRS[name], 0) end
    for _, name in ipairs(BUTTON_ORDER) do set(BUTTONS[name], 0) end
    for _, name in ipairs(DIR_ORDER) do if state[name] == 1 then set(DIRS[name], 1) end end
    for _, name in ipairs(BUTTON_ORDER) do if state[name] == 1 then set(BUTTONS[name], 1) end end
    for _, name in ipairs(DIR_ORDER) do emit(DIRS[name], state[name]) end
    for _, name in ipairs(BUTTON_ORDER) do emit(BUTTONS[name], state[name]) end
    local sf = type(s.frame_number) == 'function' and s:frame_number() or s.frame_number
    local row = {{tick, phase, t, sf}}
    for _, name in ipairs(DIR_ORDER) do row[#row + 1] = state[name] end
    for _, name in ipairs(BUTTON_ORDER) do row[#row + 1] = state[name] end
    trace:write(table.concat(row, ',') .. '\n')
    if SNAPSHOT_EVERY > 0 and (tick % SNAPSHOT_EVERY == 0) then
      s:snapshot(out .. '/snap/' .. string.format('%06d', tick) .. '.png')
    end
    if DUMP_EVERY > 0 and (tick % DUMP_EVERY == 0) then
      if HAVE_VRAM then
        local vd = {{}}
        for i = 0, 0x85ff do vd[#vd + 1] = string.pack('<I2', vr:read(i)) end
        local f = assert(io.open(out .. '/vram/' .. string.format('%06d', tick) .. '.bin', 'wb'))
        f:write(table.concat(vd)); f:close()
      end
      if HAVE_PALETTE then
        local pd = {{}}
        for i = 0, 4095 do pd[#pd + 1] = string.pack('<I4', pal:pen_color(i)) end
        local f = assert(io.open(out .. '/palette/' .. string.format('%06d', tick) .. '.bin', 'wb'))
        f:write(table.concat(pd)); f:close()
      end
    end
    if rel >= TOTAL then
      trace:close(); inputs:close()
      local f = assert(io.open(out .. '/complete.json', 'w'))
      f:write('{{"completed":true,"finalTick":' .. tick .. '}}\n'); f:close()
      m:exit()
    end
  end
end)
'''


def build_phases(plan):
    rows = []
    for phase in plan['phases']:
        row = [phase['id'], int(phase['frames'])]
        row.append(phase.get('hold') or None)
        if 'press' in phase:
            row.append([int(phase['press']['from']), int(phase['press']['to']), phase['press']['keys']])
        else:
            row.append(None)
        if 'repeat' in phase:
            row.append([int(phase['repeat']['period']), int(phase['repeat']['width']), phase['repeat']['keys']])
        else:
            row.append(None)
        if 'motion' in phase:
            row.append([[int(step['frames']), step['keys']] for step in phase['motion']])
        else:
            row.append(None)
        rows.append(row)
    return rows


def lua_dump(value):
    """Serialize plain Python data as a Lua table literal."""
    if value is None:
        return 'nil'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, (list, tuple)):
        return '{' + ', '.join(lua_dump(item) for item in value) + '}'
    if isinstance(value, dict):
        parts = []
        for key, item in value.items():
            parts.append('[' + json.dumps(str(key), ensure_ascii=False) + '] = ' + lua_dump(item))
        return '{' + ', '.join(parts) + '}'
    raise TypeError(f'unsupported Lua literal: {type(value)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--binary', default=None)
    args = parser.parse_args()
    plan_raw = args.plan.read_bytes()
    plan = json.loads(plan_raw)
    game = plan['game']
    if not re.fullmatch(r'[a-z0-9_]+', game):
        raise SystemExit('invalid game id')
    output = args.output.resolve()
    if output.exists():
        raise SystemExit(f'output exists, refusing to overwrite: {output}')
    for sub in ('snap', 'vram', 'palette', 'cfg', 'nvram'):
        (output / sub).mkdir(parents=True, exist_ok=True)
    binary = args.binary or shutil.which('mame')
    if not binary:
        raise SystemExit('MAME missing')
    adapter = NativeRuntime(root=ROOT, binary=binary)
    # Standard-mode games (sf2ce, kov, ...) are not all Top100 registry ids, so
    # resolve the ROM location from data/standard-games.json when present and
    # fall back to the registry adapter otherwise.
    standard_path = ROOT / 'data/standard-games.json'
    standard = None
    if standard_path.is_file():
        for entry in json.loads(standard_path.read_text()).get('games', []):
            if entry.get('id') == game:
                standard = entry
                break
    asset_dir = ROOT / 'assets/original-games' / game
    if (asset_dir / f'{game}.zip').is_file():
        # ROM acquired under the project's asset root but not yet registered in
        # the Top100 or standard-mode lists (e.g. an explicitly requested extra).
        rompath = str(asset_dir)
        check = subprocess.run([binary, game, '-rompath', rompath, '-verifyroms', '-noreadconfig'],
                               capture_output=True, text=True, timeout=120)
        verify = {'ok': check.returncode == 0, 'output': (check.stdout + check.stderr)[-4000:]}
        rom_file = asset_dir / f'{game}.zip'
    elif standard:
        rom_file = ROOT.parent.parent / standard['rom'] if not (ROOT / standard['rom']).exists() else ROOT / standard['rom']
        if not rom_file.exists():
            rom_file = Path(standard['rom'])
        dirs = [rom_file.resolve().parent]
        if standard.get('bios'):
            bios = ROOT / standard['bios'] if (ROOT / standard['bios']).exists() else Path(standard['bios'])
            if bios.resolve().parent not in dirs:
                dirs.append(bios.resolve().parent)
        rompath = ';'.join(str(d) for d in dirs)
        check = subprocess.run([binary, game, '-rompath', rompath, '-verifyroms', '-noreadconfig'],
                               capture_output=True, text=True, timeout=120)
        verify = {'ok': check.returncode == 0, 'output': (check.stdout + check.stderr)[-4000:]}
    else:
        rompath = adapter.rom_search_path(game)
        verify = adapter.verify(game)
        rom_file = ROOT / 'assets/original-games' / game / f'{game}.zip'

    lua = LUA_TEMPLATE.format(
        plan_name=args.plan.name, plan_sha=sha_bytes(plan_raw)[:16],
        coin_field=lua_dump(plan['fields']['coin']),
        start_field=lua_dump(plan['fields']['start']),
        dirs=lua_dump(plan['fields']['dirs']),
        buttons=lua_dump(plan['fields']['buttons']),
        dir_order=lua_dump(plan['fields'].get('dirOrder') or list(plan['fields']['dirs'])),
        button_order=lua_dump(plan['fields'].get('buttonOrder') or list(plan['fields']['buttons'])),
        coin_at=int(plan['timings']['coin']),
        start_at=int(plan['timings']['start']),
        play_begin=int(plan['timings']['playBegin']),
        prelude=lua_dump([[p['field'], int(p['from']), int(p['to'])] for p in plan.get('prelude', [])]),
        phases=lua_dump(build_phases(plan)),
        snapshot_every=int(plan.get('capture', {}).get('snapshotEvery', 1)),
        dump_every=int(plan.get('capture', {}).get('dumpEvery', 5)),
    )
    script = output / 'autoboot.lua'
    script.write_text(lua)
    (output / 'plan.json').write_bytes(plan_raw)

    total = sum(int(p['frames']) for p in plan['phases'])
    simulate_seconds = int(plan['timings']['playBegin'] / 59.2) + int(total / 59.2) + 20
    command = [binary, game, '-rompath', rompath, '-noreadconfig', '-video', 'none',
               '-sound', 'none', '-nothrottle', '-skip_gameinfo', '-autoboot_delay', '0',
               '-autoboot_script', str(script), '-seconds_to_run', str(simulate_seconds),
               '-frameskip', '0',
               '-cfg_directory', str(output / 'cfg'), '-nvram_directory', str(output / 'nvram')]
    begin = time.monotonic()
    with (output / 'runtime.log').open('w') as log:
        process = subprocess.run(command, env={**os.environ, 'ARCADE_ACTIONS_OUT': str(output),
                                                'SDL_VIDEODRIVER': 'dummy', 'SDL_AUDIODRIVER': 'dummy'},
                                 stdout=log, stderr=subprocess.STDOUT, timeout=900)
    wall = round(time.monotonic() - begin, 3)

    trace_path = output / 'trace.csv'
    rows = []
    if trace_path.exists():
        import csv
        with trace_path.open() as stream:
            rows = list(csv.DictReader(stream))
    contiguous = all(int(b['tick']) == int(a['tick']) + 1 and int(b['screenFrame']) == int(a['screenFrame']) + 1
                     for a, b in zip(rows, rows[1:])) if len(rows) > 1 else False
    snaps = sorted((output / 'snap').glob('*.png'))
    geometry = {}
    for path in snaps[:200]:
        with Image.open(path) as image:
            geometry[image.size] = geometry.get(image.size, 0) + 1
    expected = plan.get('screenSize')
    geometry_ok = bool(geometry) and (expected is None or list(geometry) == [tuple(expected)])
    phase_counts = {}
    for row in rows:
        phase_counts[row['phase']] = phase_counts.get(row['phase'], 0) + 1
    report = {
        'schema': 'native-action-capture/v1',
        'game': game,
        'engines': {'mame': subprocess.run([binary, '-help'], capture_output=True, text=True).stdout.splitlines()[0],
                    'binarySHA256': sha_file(Path(binary).resolve())},
        'plan': {'path': str(args.plan.relative_to(ROOT.parent.parent)) if args.plan.is_relative_to(ROOT.parent.parent) else str(args.plan),
                 'sha256': sha_bytes(plan_raw)},
        'autobootScript': {'path': str(script.relative_to(ROOT.parent.parent)), 'sha256': sha_file(script)},
        'romVerify': {'ok': verify['ok'], 'rompath': rompath,
                      'archive': str(rom_file) if rom_file.exists() else None,
                      'archiveSHA256': sha_file(rom_file) if rom_file.exists() else None},
        'command': command,
        'returnCode': process.returncode,
        'wallSeconds': wall,
        'scope': ('Actual native frames and ordinary input only. A window is an observation; it is not proof that '
                  'the intended move triggered, hit, or matches native timing. RAM writes are absent.'),
        'timings': plan['timings'],
        'phaseFrames': phase_counts,
        'expectedPhaseFrames': {p['id']: int(p['frames']) for p in plan['phases']},
        'trace': {'rows': len(rows), 'contiguous': contiguous,
                  'firstTick': int(rows[0]['tick']) if rows else None,
                  'lastTick': int(rows[-1]['tick']) if rows else None},
        'captures': {'snapshots': len(snaps), 'geometry': {f'{w}x{h}': n for (w, h), n in geometry.items()},
                     'geometryMatchesPlan': geometry_ok,
                     'vramDumps': len(list((output / 'vram').glob('*.bin'))),
                     'paletteDumps': len(list((output / 'palette').glob('*.bin')))},
        'completed': (output / 'complete.json').exists(),
        'visualReviewed': False,
        'moveTriggerVerified': False,
        'nativeTimingVerified': False,
    }
    (output / 'capture-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ('game', 'returnCode', 'completed', 'trace', 'captures')},
                     ensure_ascii=False))
    return report


if __name__ == '__main__':
    main()
