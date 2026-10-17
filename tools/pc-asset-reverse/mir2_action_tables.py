#!/usr/bin/env python3
"""Extract the original Legend of Mir 2 (热血传奇) action tables from client source.

Source: lzxsz/MIR2 `GameOfMir/Client/Actor.pas` (Delphi 6, Mir 1.5/1.7.6 client).
The client defines one `THumanAction` and 39 `TMonsterAction` records. Each action
has start frame, frame count, skip, per-frame time (ms) and usetick. Frames are
addressed per direction: the client comment says every action reserves 600 frames
per direction, so `start = layer * 600 + direction * 600`, i.e. a direction
stride of 600.

This extracts the declared tables verbatim. It does not decode WIL/WIX images and
does not prove runtime timing on a server.
"""
from pathlib import Path
import argparse
import json
import re

ACTION_FIELDS = ('start', 'frame', 'skip', 'ftime', 'usetick')
HUMAN_ACTIONS = ('ActStand', 'ActWalk', 'ActRun', 'ActRushLeft', 'ActRushRight', 'ActWarMode',
                 'ActHit', 'ActHeavyHit', 'ActBigHit', 'ActFireHitReady', 'ActSpell',
                 'ActSitdown', 'ActStruck', 'ActDie')
MONSTER_ACTIONS = ('ActStand', 'ActWalk', 'ActAttack', 'ActCritical', 'ActStruck', 'ActDie', 'ActDeath')

TABLE_RE = re.compile(r'\b(HA|MA\d+)\s*:\s*T(?:Human|Monster)Action\s*=\s*\((.*?)\n\s*\);', re.S)
ACTION_RE = re.compile(r'(Act\w+)\s*:\s*\(([^)]*)\)', re.I)


def parse(path):
    text = path.read_text(encoding='latin-1')
    tables = {}
    for name, body in TABLE_RE.findall(text):
        actions = {}
        for action, fields in ACTION_RE.findall(body):
            values = {}
            for key, value in re.findall(r'(\w+)\s*:\s*(-?\d+)', fields):
                values[key.lower()] = int(value)
            actions[action] = {k: values.get(k) for k in ACTION_FIELDS}
        tables[name] = {'actions': actions}
    return tables


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    tables = parse(args.source)
    human = tables.get('HA', {'actions': {}})
    monsters = {k: v for k, v in tables.items() if k.startswith('MA')}
    result = {
        'schema': 'mir2-action-tables/v1',
        'source': str(args.source),
        'sourceSHA256': __import__('hashlib').sha256(args.source.read_bytes()).hexdigest(),
        'engine': 'Legend of Mir 2 (热血传奇) Delphi 6 client source, Mir 1.5/1.7.6',
        'directionStrideFrames': 600,
        'actionFields': list(ACTION_FIELDS),
        'humanActionFields': list(HUMAN_ACTIONS),
        'monsterActionFields': list(MONSTER_ACTIONS),
        'human': human,
        'monsterTables': monsters,
        'monsterTableCount': len(monsters),
        'scope': ('Declared client tables only: start frame, frame count, skip, per-frame ms and usetick. '
                  'No WIL/WIX image bytes are decoded here and no server-side timing is claimed.'),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'tables': len(tables), 'human': len(human['actions']),
                      'monsters': len(monsters),
                      'output': str(args.output)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
