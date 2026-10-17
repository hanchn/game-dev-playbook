#!/usr/bin/env python3
"""Read classic Legend of Mir 2 (热血传奇 1.76) WIL/WIX image libraries.

Format taken from the original Delphi client source (lzxsz/MIR2,
GameOfMir/Client/WIL.pas and wmUtil.pas):

  WIL header   shortstring Title[41] + ImageCount i32 + ColorCount i32
               + PaletteSize i32 + VerFlag i32          (v2, 57 bytes)
               v1 has no VerFlag field (53 bytes) and VerFlag reads as 0.
  palette      256 x RGBQUAD = 1024 bytes, immediately after the header
  image        i16 width, i16 height, i16 px, i16 py, then width*height
               palette indices (raw, one byte per pixel)

  WIX header   shortstring Title[41] + IndexCount i32 + VerFlag i32 (v2)
               then IndexCount x u32 image offsets into the WIL (v2)

The client loads images through a memory-mapped WIL, so the WIX entries are
stored as offsets into the WIL file. Palette index 0 is transparent.
"""
from pathlib import Path
import argparse
import json
import struct

from PIL import Image


def read_shortstring(buf, pos):
    length = buf[pos]
    text = buf[pos + 1:pos + 1 + length].decode('gb18030', 'replace')
    return text, pos + 41


def read_wil_header(buf):
    """Auto-detect the 57-byte v2 header vs the 53-byte v1 header.

    Delphi source reads a full TWMImageHeader (57 bytes) and, when the fourth
    integer is zero, treats the file as v1 and seeks back four bytes so the
    palette starts at 53. ColorCount/PaletteSize act as the sanity check.
    """
    title, pos = read_shortstring(buf, 0)
    a, b, c, d = struct.unpack_from('<iiii', buf, pos)
    header_size = 57 if (d != 0 or b != 256 or c != 1024) else 53
    return {'title': title, 'imageCount': a, 'colorCount': b, 'paletteSize': c,
            'versionFlag': d, 'headerSize': header_size,
            'paletteOffset': header_size}


def wix_candidates(buf, wil_size):
    """Return plausible (header_size, offsets) layouts for the WIX file."""
    title, pos = read_shortstring(buf, 0)
    count = struct.unpack_from('<i', buf, pos)[0]
    out = []
    for header_size in (pos + 4, pos + 8):
        offsets = []
        for i in range(count):
            at = header_size + i * 4
            if at + 4 > len(buf):
                break
            offsets.append(struct.unpack_from('<I', buf, at)[0])
        if len(offsets) != count or not offsets:
            continue
        if all(o < wil_size for o in offsets) and all(offsets[i] <= offsets[i + 1] for i in range(len(offsets) - 1)):
            out.append({'title': title, 'indexCount': count, 'headerSize': header_size,
                        'offsets': offsets, 'layout': 'count+verflag' if header_size == pos + 8 else 'count-only'})
    return out


def image_at(wil, offset, palette):
    width, height, px, py = struct.unpack_from('<hhhh', wil, offset)
    start = offset + 8
    need = width * height
    if width <= 0 or height <= 0 or start + need > len(wil):
        raise ValueError(f'bad image at {offset}: {width}x{height}')
    out = bytearray(width * height * 4)
    for i in range(need):
        index = wil[start + i]
        if index == 0:
            continue
        r, g, b = palette[index]
        out[i * 4:i * 4 + 4] = bytes((r, g, b, 255))
    img = Image.frombytes('RGBA', (width, height), bytes(out))
    return img, {'width': width, 'height': height, 'px': px, 'py': py}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wil', type=Path)
    parser.add_argument('--wix', type=Path, default=None)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--extract', type=Path, default=None)
    parser.add_argument('--indices', default=None, help='comma separated image indices to extract')
    parser.add_argument('--report', type=Path, default=None)
    args = parser.parse_args()
    wil = args.wil.read_bytes()
    wix_path = args.wix or args.wil.with_suffix('.WIX')
    if not wix_path.exists():
        wix_path = args.wil.with_suffix('.wix')
    header = read_wil_header(wil)
    candidates = wix_candidates(wix_path.read_bytes(), len(wil)) if wix_path.exists() else []
    wix = candidates[0] if candidates else {'offsets': [], 'indexCount': 0, 'layout': 'missing-or-unrecognised'}
    wix['allLayouts'] = candidates
    palette = []
    for i in range(256):
        b, g, r, _ = struct.unpack_from('<BBBB', wil, header['paletteOffset'] + i * 4)
        palette.append((r, g, b))
    rows = []
    for index, offset in enumerate(wix['offsets']):
        try:
            img, meta = image_at(wil, offset, palette)
        except Exception as error:  # noqa: BLE001
            rows.append({'index': index, 'offset': offset, 'error': str(error)})
            continue
        rows.append({'index': index, 'offset': offset, 'image': meta})
        if args.extract and (not args.indices or index in {int(x) for x in args.indices.split(',')}):
            args.extract.mkdir(parents=True, exist_ok=True)
            img.save(args.extract / f'{args.wil.stem}-{index:04d}.png')
    report = {'wil': str(args.wil), 'wilBytes': len(wil), 'header': header,
              'wix': {k: wix[k] for k in ('title', 'indexCount', 'versionFlag', 'version1')},
              'images': rows[:args.limit] if args.limit else rows,
              'imageCount': len(rows),
              'scope': 'Raw WIL/WIX decode from the original client library format. Palette index 0 is transparent.'}
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'wil': args.wil.name, 'bytes': len(wil), 'images': len(rows),
                      'header': header, 'wixCount': wix['indexCount']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
