#!/usr/bin/env python3
"""Read 传奇世界 (Woool) .nmp tile maps and render their walkable grid.

Layout from the Ghidra analysis in NixieProject/WoOOL-docs
(`Docs/uncreated/analysis/nmp-format-deep-dive.md`, derived from
MercenarySystem.dll FUN_1000ee40):

  header  u32 dataOffset, i32 version, i32 width, i32 height, u16 reserved, u16 reserved

  version 1 : fixed 12-byte cells; walkable = (flags byte & 2) != 0
  version 2 : 1 flags byte, then optional u16 (bit 2), u16 (bit 4), u32 (bit 8)
  version 3 : version 2 plus optional u8 (bit 0x10)
  version 5/6: version 3 plus optional u8 (0x20), u8 (0x40), u16 (0x80),
              and two u8 when the u32 value has 0x10000000 set
  version 4 : not handled by the loader (grid stays filled with 1)

The in-memory grid is one byte per cell: 1 = walkable, 0 = blocked. No texture
is built from .nmp by the loader; the grid is logical collision/path data.
"""
from pathlib import Path
import argparse
import json
import struct

from PIL import Image


def parse(path):
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError('short NMP header')
    offset, version, width, height = struct.unpack_from('<Iiii', data, 0)
    r1, r2 = struct.unpack_from('<HH', data, 16)
    if not (3 <= width <= 1200 and 3 <= height <= 1200):
        raise ValueError(f'implausible dimensions {width}x{height}')
    grid = bytearray(width * height)
    pos = offset
    if version == 4:
        grid[:] = b'\x01' * len(grid)
        return {'version': version, 'width': width, 'height': height,
                'dataOffset': offset, 'grid': grid, 'note': 'version 4 is not read by the loader'}

    def take(n):
        nonlocal pos
        if pos + n > len(data):
            raise ValueError('nmp data truncated')
        chunk = data[pos:pos + n]
        pos += n
        return chunk

    for i in range(width * height):
        if version == 1:
            cell = take(12)
            flags = cell[8]
            grid[i] = 1 if flags & 2 else 0
        elif version in (2, 3, 5, 6):
            flags = take(1)[0]
            grid[i] = 1 if flags & 1 else 0
            if flags & 0x02:
                take(2)
            if flags & 0x04:
                take(2)
            extra = 0
            if flags & 0x08:
                chunk = take(4)
                extra = struct.unpack('<I', chunk)[0]
            if version >= 3 and flags & 0x10:
                take(1)
            if version >= 5:
                if flags & 0x20:
                    take(1)
                if flags & 0x40:
                    take(1)
                if flags & 0x80:
                    take(2)
                if extra & 0x10000000:
                    take(2)
        else:
            raise ValueError(f'unsupported nmp version {version}')
    return {'version': version, 'width': width, 'height': height,
            'dataOffset': offset, 'reserved': [r1, r2], 'grid': grid,
            'consumedBytes': pos - offset}


def render(parsed, scale=1):
    width, height = parsed['width'], parsed['height']
    grid = parsed['grid']
    img = Image.new('RGB', (width, height))
    px = img.load()
    for y in range(height):
        for x in range(width):
            walkable = grid[y * width + x]
            px[x, y] = (245, 245, 240) if walkable else (40, 40, 48)
    if scale > 1:
        img = img.resize((width * scale, height * scale), Image.Resampling.NEAREST)
    return img


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('nmp', type=Path, nargs='+')
    parser.add_argument('--render', type=Path, default=None)
    parser.add_argument('--scale', type=int, default=1)
    parser.add_argument('--report', type=Path, default=None)
    args = parser.parse_args()
    rows = []
    for path in args.nmp:
        try:
            parsed = parse(path)
        except Exception as error:  # noqa: BLE001
            rows.append({'file': str(path), 'error': str(error)})
            continue
        grid = parsed['grid']
        walkable = sum(1 for v in grid if v)
        rows.append({'file': str(path), 'bytes': path.stat().st_size,
                     'version': parsed['version'], 'width': parsed['width'],
                     'height': parsed['height'], 'cells': len(grid),
                     'walkable': walkable,
                     'walkableRatio': round(walkable / len(grid), 4),
                     'dataOffset': parsed['dataOffset'],
                     'consumedBytes': parsed.get('consumedBytes')})
        if args.render:
            args.render.mkdir(parents=True, exist_ok=True)
            render(parsed, args.scale).save(args.render / f'{path.stem}.png')
    result = {'schema': 'woool-nmp-maps/v1',
              'scope': 'Logical walkable grids decoded from original .nmp files. Not a tile texture.',
              'maps': rows}
    if args.report:
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    for row in rows:
        print(json.dumps(row, ensure_ascii=False))


if __name__ == '__main__':
    main()
