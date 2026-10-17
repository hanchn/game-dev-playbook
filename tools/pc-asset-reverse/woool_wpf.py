#!/usr/bin/env python3
"""List and extract 传奇世界 (Woool) .wpf packages.

Format derived from the open-source WoOOLToOOLsSharp reader
(Formats/Wpf/WpfCodec.cs, MIT) and cross-checked against the original client
packages in output/pc-original-games. No game executable is run.

Header (little endian):
    0   u32 magic 0x57504601 ("WPF\\x01")
    4   u16 header size
    6   u16 bytes per block (0 -> 128)
    8   u32 directory count (primary layout)
    12  u32 file count (primary layout)
    16  i64 FAT position (primary layout)
    28  u32 directory count (legacy layout)
    32  u32 file count (legacy layout)
    20  i64 FAT position (legacy layout)

FAT, two parallel tables of `dirs + files` entries:
    FCB1 (16 bytes): u32 start block, u32 size, i64 path hash
    FCB2 (56 bytes): 32-byte name, u32 attr @48, u32 uncompressed size @52

Directory entries (attr & 1) point at a child range in FCB1/FCB2. File data is at
`start * bytes_per_block + header_size`, length `size`, zlib-compressed when
attr & 4, uncompressed size in the FCB2 revision field.
"""
from pathlib import Path
import argparse
import json
import struct
import sys
import zlib

MAGIC = 0x57504601
ATTR_DIR = 0x0001
ATTR_COMPRESS = 0x0004
FCB1 = 16
FCB2 = 56


def read_header(data):
    if len(data) < 128 or struct.unpack_from('<I', data, 0)[0] != MAGIC:
        raise ValueError('not a WPF package')
    header_size, bytes_per_block = struct.unpack_from('<HH', data, 4)
    if not bytes_per_block:
        bytes_per_block = 128
    dirs_primary, files_primary = struct.unpack_from('<II', data, 8)
    fat_primary = struct.unpack_from('<q', data, 16)[0]
    fat_legacy = struct.unpack_from('<q', data, 20)[0]
    dirs_legacy, files_legacy = struct.unpack_from('<II', data, 28)
    size = len(data)

    def valid(pos):
        return 0 < pos < size

    if valid(fat_primary) and (dirs_primary or files_primary):
        dirs, files, fat = dirs_primary, files_primary, fat_primary
    else:
        dirs, files, fat = dirs_legacy, files_legacy, fat_legacy
    total = dirs + files
    if not valid(fat):
        fat = header_size
    if not valid(fat):
        raise ValueError('invalid FAT position')
    if fat + total * (FCB1 + FCB2) > size:
        raise ValueError('FAT outside file')
    return {
        'headerSize': header_size,
        'bytesPerBlock': bytes_per_block,
        'directoryCount': dirs,
        'fileCount': files,
        'fatPosition': fat,
        'totalEntries': total,
    }


def decode_name(raw):
    raw = raw.split(b'\0', 1)[0]
    for codec in ('utf-8', 'gb18030'):
        try:
            return raw.decode(codec)
        except UnicodeDecodeError:
            continue
    return raw.decode('latin-1')


def entries(data):
    header = read_header(data)
    total, fat = header['totalEntries'], header['fatPosition']
    starts, sizes, hashes, names, attrs, uncompressed = [], [], [], [], [], []
    for i in range(total):
        off = fat + i * FCB1
        start, size, digest = struct.unpack_from('<IIq', data, off)
        starts.append(start)
        sizes.append(size)
        hashes.append(digest)
    fcb2 = fat + total * FCB1
    for i in range(total):
        off = fcb2 + i * FCB2
        names.append(decode_name(data[off:off + 32]))
        attrs.append(struct.unpack_from('<I', data, off + 48)[0])
        uncompressed.append(struct.unpack_from('<I', data, off + 52)[0])

    out = []

    def walk(start, count, base):
        for i in range(start, min(total, start + count)):
            full = f'{base}/{names[i]}' if base else names[i]
            is_dir = bool(attrs[i] & ATTR_DIR)
            if is_dir:
                out.append({'index': i, 'path': full, 'directory': True})
                walk(starts[i], sizes[i], full)
            else:
                offset = starts[i] * header['bytesPerBlock'] + header['headerSize']
                out.append({'index': i, 'path': full, 'directory': False,
                            'offset': offset, 'size': sizes[i],
                            'compressed': bool(attrs[i] & ATTR_COMPRESS),
                            'uncompressedSize': uncompressed[i] if attrs[i] & ATTR_COMPRESS else sizes[i],
                            'hash': hashes[i]})

    if total:
        walk(starts[0], sizes[0], '')
    return header, out


def extract(data, entry):
    raw = data[entry['offset']:entry['offset'] + entry['size']]
    if entry['compressed'] or raw[:1] == b'\x78':
        try:
            return zlib.decompress(raw)
        except zlib.error:
            # Chunked variant: repeated [u32 length][zlib chunk] records.
            out = bytearray()
            pos = 0
            while pos + 4 <= len(raw):
                length = struct.unpack_from('<I', raw, pos)[0]
                pos += 4
                chunk = raw[pos:pos + length]
                pos += length
                if len(chunk) != length:
                    return raw
                out += zlib.decompress(chunk)
            return bytes(out) if out else raw
    return raw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package', type=Path)
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--extract-all', type=Path)
    parser.add_argument('--match', default=None)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    data = args.package.read_bytes()
    header, rows = entries(data)
    if args.list:
        for row in rows:
            print(('D ' if row['directory'] else 'F '), row['path'],
                  '' if row['directory'] else f"({row['size']} -> {row['uncompressedSize']})")
    if args.report:
        args.report.write_text(json.dumps({'package': str(args.package), 'header': header,
                                           'entries': rows}, ensure_ascii=False, indent=2) + '\n')
    if args.extract_all:
        args.extract_all.mkdir(parents=True, exist_ok=True)
        written = 0
        for row in rows:
            if row['directory']:
                continue
            if args.match and args.match not in row['path']:
                continue
            target = args.extract_all / row['path']
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(extract(data, row))
            written += 1
        print(json.dumps({'package': str(args.package), 'filesWritten': written,
                          'header': header}, ensure_ascii=False))


if __name__ == '__main__':
    main()
