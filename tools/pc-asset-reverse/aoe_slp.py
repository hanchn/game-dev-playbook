#!/usr/bin/env python3
"""Inventory and decode Age of Empires 1 (Gold) DRS/SLP graphics.

DRS layout (Empire Studios):
    char  copyright[40]
    int32 version = 1
    char  version2[4]
    char  name[6]
    int32 num_tables
    int32 table_offset      # in the retail AoE1 Gold files this is not the first
                            # table position, so tables are chained from 0x40
Table header (12 bytes): char ext[4], int32 file_count, int32 entry_offset
Entry (12 bytes): int32 id, int32 offset, int32 size

SLP "2.0N" layout (openage doc/media/slp-files.md):
    uint32 version, uint32 num_frames, uint32 comment_offset, char comment[24]
    frame_info[num_frames]: cmd_offset, outline_offset, palette_offset,
                            properties, width, height, hotspot_x, hotspot_y
Draw commands use the low four bits of the command byte; AoE1 Gold SLPs are
1-byte palette index per pixel.
"""
from pathlib import Path
import argparse
import json
import struct
import zlib

from PIL import Image


def read_tables(data):
    tables = []
    pos = 0x40
    total = len(data)
    while pos + 12 <= total:
        ext = data[pos:pos + 4]
        if not ext.isascii() or not all(32 <= c < 127 for c in ext):
            break
        count, entry_offset = struct.unpack_from('<ii', data, pos + 4)
        if count <= 0 or count > 100000:
            break
        entries = []
        ok = True
        for i in range(count):
            off = pos + 12 + i * 12
            if off + 12 > total:
                ok = False
                break
            fid, doff, size = struct.unpack_from('<iii', data, off)
            if doff < 0 or size <= 0 or doff + size > total:
                ok = False
                break
            entries.append({'id': fid, 'offset': doff, 'size': size})
        if not ok or not entries:
            break
        entries.sort(key=lambda e: e['offset'])
        tables.append({'ext': ext[::-1].decode('ascii', 'replace'), 'count': len(entries),
                       'headerOffset': pos, 'entries': entries})
        pos += 12 + count * 12
    return tables


def decode_slp(data, frame_index=0, palette=None, player=1):
    if len(data) < 32:
        raise ValueError('SLP too short')
    version = data[:4]
    num_frames = struct.unpack_from('<I', data, 4)[0]
    frames = []
    for i in range(num_frames):
        base = 32 + i * 32
        if base + 32 > len(data):
            break
        cmd_off, outline_off, pal_off, props, width, height, hx, hy = struct.unpack_from('<IIIIiiii', data, base)
        frames.append({'cmd': cmd_off, 'width': width, 'height': height,
                       'hotspot': [hx, hy], 'properties': props})
    if not frames:
        raise ValueError('no frames')
    frame_index %= len(frames)
    info = frames[frame_index]
    width, height = info['width'], info['height']
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    px = img.load()

    def color(index):
        # Palette index 0 is the transparent colour in AoE1 SLPs; drawing it as
        # opaque would fill the whole frame and hide the real silhouette.
        if index == 0:
            return (0, 0, 0, 0)
        if palette and 0 <= index < len(palette):
            r, g, b = palette[index]
            return (r, g, b, 255)
        return (index, index, index, 255)

    # One command-stream offset per row; the commands themselves follow the table.
    row_offsets = []
    for row in range(height):
        at = info['cmd'] + row * 4
        if at + 4 > len(data):
            break
        row_offsets.append(struct.unpack_from('<I', data, at)[0])

    for y, pos in enumerate(row_offsets):
        x = 0
        while pos < len(data):
            cmd = data[pos]
            pos += 1
            low4 = cmd & 0x0F
            low2 = cmd & 0x03
            if cmd == 0x0F:
                break
            if low4 == 0x06:            # player colour draw
                count = cmd >> 4
                if count == 0:
                    count = data[pos]; pos += 1
                base = 16 + player * 16
                for _ in range(count):
                    if x < width:
                        px[x, y] = color(base + data[pos])
                    pos += 1
                    x += 1
            elif low4 == 0x07:          # fill
                count = cmd >> 4
                if count == 0:
                    count = data[pos]; pos += 1
                c = color(data[pos]); pos += 1
                for _ in range(count):
                    if x < width:
                        px[x, y] = c
                    x += 1
            elif low4 == 0x0A:          # fill player colour
                count = cmd >> 4
                if count == 0:
                    count = data[pos]; pos += 1
                c = color(16 + player * 16 + data[pos]); pos += 1
                for _ in range(count):
                    if x < width:
                        px[x, y] = c
                    x += 1
            elif low4 == 0x0B:          # shadow draw
                count = cmd >> 4
                if count == 0:
                    count = data[pos]; pos += 1
                for _ in range(count):
                    if x < width:
                        px[x, y] = (0, 0, 0, 96)
                    x += 1
            elif low4 == 0x0E:
                raise ValueError('extended command %#04x' % cmd)
            elif low2 == 0x00:          # lesser draw
                count = cmd >> 2
                for _ in range(count):
                    if x < width:
                        px[x, y] = color(data[pos])
                    pos += 1
                    x += 1
            elif low2 == 0x01:          # lesser skip
                count = cmd >> 2
                if count == 0:
                    count = data[pos]; pos += 1
                x += count
            elif low2 == 0x02:          # greater draw
                count = ((cmd & 0xF0) << 4) + data[pos]; pos += 1
                for _ in range(count):
                    if x < width:
                        px[x, y] = color(data[pos])
                    pos += 1
                    x += 1
            else:                       # greater skip
                count = ((cmd & 0xF0) << 4) + data[pos]; pos += 1
                x += count
    return img, frames, version


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('drs', type=Path)
    parser.add_argument('--inventory', type=Path)
    parser.add_argument('--extract', type=Path, default=None)
    parser.add_argument('--render', type=Path, default=None)
    parser.add_argument('--render-ids', default='0,1,2')
    parser.add_argument('--frame', type=int, default=0)
    parser.add_argument('--palette', type=Path, default=None)
    parser.add_argument('--flat', action='store_true',
                        help='render every drawn pixel as opaque white to inspect the silhouette')
    args = parser.parse_args()
    data = args.drs.read_bytes()
    tables = read_tables(data)
    inventory = {'drs': str(args.drs), 'bytes': len(data),
                 'tables': [{'ext': t['ext'], 'count': t['count'],
                             'ids': [e['id'] for e in t['entries']],
                             'sizes': [e['size'] for e in t['entries']]} for t in tables]}
    if args.inventory:
        args.inventory.write_text(json.dumps(inventory, indent=2) + '\n')
    print(json.dumps({'drs': args.drs.name, 'bytes': len(data),
                      'tables': [(t['ext'], t['count']) for t in tables]}))
    if args.extract:
        args.extract.mkdir(parents=True, exist_ok=True)
        for table in tables:
            for entry in table['entries']:
                blob = data[entry['offset']:entry['offset'] + entry['size']]
                (args.extract / f"{table['ext'].strip()}-{entry['id']}.bin").write_bytes(blob)
    if args.render:
        palette = None
        if args.flat:
            palette = [(0, 0, 0)] * 256
        elif args.palette:
            raw = args.palette.read_bytes()
            palette = [(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]) for i in range(256)]
        args.render.mkdir(parents=True, exist_ok=True)
        wanted = {int(x) for x in args.render_ids.split(',') if x.strip()}
        for table in tables:
            if table['ext'].strip() != 'slp':
                continue
            for entry in table['entries']:
                if entry['id'] not in wanted:
                    continue
                blob = data[entry['offset']:entry['offset'] + entry['size']]
                try:
                    img, frames, version = decode_slp(blob, args.frame, palette)
                except Exception as error:  # noqa: BLE001
                    print(json.dumps({'id': entry['id'], 'error': str(error)}))
                    continue
                img.save(args.render / f"slp-{entry['id']}-f{args.frame}.png")
                print(json.dumps({'id': entry['id'], 'version': version.decode('latin-1'),
                                  'frames': len(frames), 'size': [img.width, img.height]}))


if __name__ == '__main__':
    main()
