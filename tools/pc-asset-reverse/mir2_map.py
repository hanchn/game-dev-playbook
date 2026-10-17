#!/usr/bin/env python3
"""Read classic Mir2 (热血传奇 1.76) .map grids.

Format from the original client source (lzxsz/MIR2, GameOfMir/Client/MapUnit.pas):

  TMapHeader (52 bytes, packed)
      u16  width
      u16  height
      shortstring title[17]        (1 length byte + 16 chars)
      double updateDate            (TDateTime)
      char reserved[23]

  TMapInfo (12 bytes, packed, one per cell, column-major: x * height + y)
      u16 backImage
      u16 middleImage
      u16 frontImage
      u8  doorIndex
      u8  doorOffset
      u8  animationFrame
      u8  animationTick
      u8  area
      u8  light

The client draws tile indices with `& 0x7FFF` (bit 15 is a flag). Walkability
does NOT live in the .map: it comes from the tile library attributes, so this
reader reports tile ids and flags only.
"""
from pathlib import Path
import argparse
import json
import struct

from PIL import Image


def read_shortstring(buf, pos):
    length = buf[pos]
    text = buf[pos + 1:pos + 1 + length].decode('gb18030', 'replace')
    return text, pos + 17


def parse(path):
    data = path.read_bytes()
    if len(data) < 52:
        raise ValueError('short map header')
    width, height = struct.unpack_from('<HH', data, 0)
    title, pos = read_shortstring(data, 4)
    update_date = struct.unpack_from('<d', data, pos)[0]
    header_size = 52
    expected = header_size + width * height * 12
    if len(data) != expected:
        raise ValueError(f'size mismatch: {len(data)} != {expected} for {width}x{height}')
    cells = []
    for i in range(width * height):
        at = header_size + i * 12
        back, middle, front = struct.unpack_from('<HHH', data, at)
        door_index, door_offset, ani_frame, ani_tick, area, light = struct.unpack_from('<BBBBBB', data, at + 6)
        cells.append({'back': back, 'middle': middle, 'front': front,
                      'doorIndex': door_index, 'doorOffset': door_offset,
                      'animationFrame': ani_frame, 'animationTick': ani_tick,
                      'area': area, 'light': light})
    return {'title': title, 'width': width, 'height': height,
            'updateDate': update_date, 'cells': cells}


def render(parsed, layer='back'):
    width, height = parsed['width'], parsed['height']
    img = Image.new('RGB', (width, height))
    px = img.load()
    for x in range(width):
        for y in range(height):
            cell = parsed['cells'][x * height + y]
            value = cell[layer] & 0x7FFF
            if value == 0:
                px[x, y] = (0, 0, 0)
            else:
                # Deterministic pseudo-colour per tile id, for layout review only.
                px[x, y] = ((value * 37) % 200 + 40, (value * 71) % 200 + 40, (value * 113) % 200 + 40)
    return img


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('maps', type=Path, nargs='+')
    parser.add_argument('--report', type=Path, default=None)
    parser.add_argument('--render', type=Path, default=None)
    parser.add_argument('--layer', default='back', choices=['back', 'middle', 'front'])
    args = parser.parse_args()
    rows = []
    for path in args.maps:
        try:
            parsed = parse(path)
        except Exception as error:  # noqa: BLE001
            rows.append({'file': str(path), 'error': str(error)})
            continue
        used = sum(1 for c in parsed['cells'] if (c['back'] & 0x7FFF))
        rows.append({'file': str(path), 'bytes': path.stat().st_size,
                     'title': parsed['title'], 'width': parsed['width'],
                     'height': parsed['height'], 'cells': len(parsed['cells']),
                     'cellsWithBackTile': used,
                     'animatedCells': sum(1 for c in parsed['cells'] if c['animationFrame']),
                     'doorCells': sum(1 for c in parsed['cells'] if c['doorIndex'] & 0x7F)})
        if args.render:
            args.render.mkdir(parents=True, exist_ok=True)
            render(parsed, args.layer).save(args.render / f'{path.stem}-{args.layer}.png')
    result = {'schema': 'mir2-map/v1',
              'scope': 'Tile grid only. Walkability lives in the tile library, not in the .map file.',
              'maps': rows}
    if args.report:
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    for row in rows:
        print(json.dumps(row, ensure_ascii=False))


if __name__ == '__main__':
    main()
