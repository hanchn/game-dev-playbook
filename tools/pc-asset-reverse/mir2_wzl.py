#!/usr/bin/env python3
"""Read Mir2 WZL/WZX image libraries (data/Hum.wzl, Weapon.wzl, Mon*.wzl, Tiles*.wzl).

WZX index file: 48-byte header, then `count` u32 offsets into the WZL
(offset 0 = empty slot). 182448-byte Weapon.wzx gives 45600 slots.

WZL image record at an offset:
    u32 magic/format (0x103 observed)
    u16 width, u16 height
    i16 px, i16 py
    u32 storedSize          (0 = raw bytes, else zlib-compressed pixel bytes)
    pixel bytes             (raw or zlib)

Pixel width is inferred from the stored byte count: width*height -> 8-bit
palette indices; width*height*2 -> 16-bit. Palette handling is separate: Mir2
clients share an external palette (texture.dat / a .pal), and this reader accepts
one via --palette (256*3 RGB or 256*4 BGRA bytes).

The format is inferred from real retail data, not from vendor source, so the
report records every field that was used and flags images whose stored size
does not match a known pixel width.
"""
from pathlib import Path
import argparse
import json
import struct
import zlib

from PIL import Image

HEADER_SIZE = 16


def read_wzx(path):
    data = path.read_bytes()
    if len(data) < 48:
        return []
    count = (len(data) - 48) // 4
    return list(struct.unpack_from('<%dI' % count, data, 48))


def load_palette(path):
    raw = path.read_bytes()
    palette = []
    if len(raw) >= 1024:
        for i in range(256):
            b, g, r, _ = struct.unpack_from('<BBBB', raw, i * 4)
            palette.append((r, g, b))
    elif len(raw) >= 768:
        for i in range(256):
            r, g, b = raw[i * 3:i * 3 + 3]
            palette.append((r, g, b))
    return palette


def image_record(wzl, offset, palette=None):
    if offset <= 0 or offset + HEADER_SIZE > len(wzl):
        raise ValueError(f'offset {offset} outside library')
    magic, width, height, px, py, stored = struct.unpack_from('<IHHhhI', wzl, offset)
    body = wzl[offset + HEADER_SIZE: offset + HEADER_SIZE + stored] if stored else b''
    if stored:
        try:
            body = zlib.decompress(body)
        except zlib.error:
            pass
    expected = width * height
    if len(body) == expected:
        mode, channels = 'index8', 1
    elif len(body) == expected * 2:
        mode, channels = 'rgb16', 2
    else:
        mode, channels = 'unknown', 0
    info = {'offset': offset, 'magic': magic, 'width': width, 'height': height,
            'px': px, 'py': py, 'storedSize': stored, 'pixelBytes': len(body),
            'pixelFormat': mode}
    if mode == 'index8':
        out = bytearray(width * height * 4)
        for i, index in enumerate(body):
            if index == 0:
                continue
            if palette and index < len(palette):
                r, g, b = palette[index]
            else:
                r = g = b = index
            out[i * 4:i * 4 + 4] = bytes((r, g, b, 255))
        info['image'] = Image.frombytes('RGBA', (width, height), bytes(out))
    elif mode == 'rgb16':
        out = bytearray(width * height * 4)
        for i in range(width * height):
            value = body[i * 2] | (body[i * 2 + 1] << 8)
            r = ((value >> 11) & 0x1F) * 255 // 31
            g = ((value >> 5) & 0x3F) * 255 // 63
            b = (value & 0x1F) * 255 // 31
            out[i * 4:i * 4 + 4] = bytes((r, g, b, 255))
        info['image'] = Image.frombytes('RGBA', (width, height), bytes(out))
    return info


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wzl', type=Path)
    parser.add_argument('--wzx', type=Path, default=None)
    parser.add_argument('--palette', type=Path, default=None)
    parser.add_argument('--report', type=Path, default=None)
    parser.add_argument('--extract', type=Path, default=None)
    parser.add_argument('--indices', default=None, help='comma separated slot indices')
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    wzl = args.wzl.read_bytes()
    wzx_path = args.wzx or args.wzl.with_suffix('.wzx')
    offsets = read_wzx(wzx_path)
    palette = load_palette(args.palette) if args.palette else None
    wanted = {int(x) for x in args.indices.split(',')} if args.indices else None
    rows = []
    for index, offset in enumerate(offsets):
        if not offset:
            continue
        if wanted is not None and index not in wanted:
            continue
        try:
            info = image_record(wzl, offset, palette)
        except Exception as error:  # noqa: BLE001
            rows.append({'index': index, 'offset': offset, 'error': str(error)})
            continue
        row = {k: v for k, v in info.items() if k != 'image'}
        row['index'] = index
        rows.append(row)
        if args.extract and 'image' in info:
            args.extract.mkdir(parents=True, exist_ok=True)
            info['image'].save(args.extract / f'{args.wzl.stem}-{index:05d}.png')
        if args.limit and len(rows) >= args.limit:
            break
    formats = {}
    for row in rows:
        key = row.get('pixelFormat', row.get('error', 'error'))
        formats[key] = formats.get(key, 0) + 1
    result = {'schema': 'mir2-wzl/v1', 'wzl': str(args.wzl), 'wzlBytes': len(wzl),
              'wzx': str(wzx_path), 'slots': len(offsets),
              'nonEmptySlots': sum(1 for o in offsets if o),
              'scanned': len(rows), 'pixelFormats': formats, 'images': rows,
              'scope': ('Image geometry and pixel bytes decoded from the retail WZL/WZX pair. '
                        'Palette colours require the client palette; without it indices render as grey.')}
    if args.report:
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ('wzl', 'slots', 'nonEmptySlots', 'scanned', 'pixelFormats')},
                     ensure_ascii=False))


if __name__ == '__main__':
    main()
