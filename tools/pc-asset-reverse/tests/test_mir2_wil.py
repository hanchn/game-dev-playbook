"""Synthetic round-trip for the classic Mir2 WIL/WIX reader.

Builds a v2 WIL (57-byte header + 1024-byte palette) and a count-only WIX, then
checks header auto-detection, image geometry, palette decoding and transparency.
This proves the reader against the format contract taken from the original Delphi
client source, not against a retail client library.
"""
import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / 'mir2_wil.py'
spec = importlib.util.spec_from_file_location('mir2_wil', MODULE)
mir2_wil = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mir2_wil)


def shortstring(text):
    raw = text.encode('ascii')
    return bytes([len(raw)]) + raw + b'\0' * (40 - len(raw))


def build(wil_path, wix_path):
    palette = bytearray()
    for i in range(256):
        palette += bytes((i, 255 - i, (i * 3) % 256, 0))
    width, height = 3, 2
    pixels = bytes([0, 1, 2, 3, 4, 0])
    image = struct.pack('<hhhh', width, height, 7, 9) + pixels
    header = shortstring('WEMADE') + struct.pack('<iiii', 1, 256, 1024, 2)
    body = header + bytes(palette) + image
    wil_path.write_bytes(body)
    wix = shortstring('WEMADE') + struct.pack('<i', 1) + struct.pack('<I', len(header) + 1024)
    wix_path.write_bytes(wix)


class Mir2WilRoundTrip(unittest.TestCase):
    def test_header_and_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            wil = Path(tmp) / 'test.WIL'
            wix = Path(tmp) / 'test.WIX'
            build(wil, wix)
            data = wil.read_bytes()
            header = mir2_wil.read_wil_header(data)
            self.assertEqual(header['headerSize'], 57)
            self.assertEqual(header['imageCount'], 1)
            self.assertEqual(header['colorCount'], 256)
            candidates = mir2_wil.wix_candidates(wix.read_bytes(), len(data))
            self.assertTrue(candidates, 'no WIX layout recognised')
            layout = candidates[0]
            self.assertEqual(layout['indexCount'], 1)
            palette = []
            for i in range(256):
                b, g, r, _ = struct.unpack_from('<BBBB', data, header['paletteOffset'] + i * 4)
                palette.append((r, g, b))
            image, meta = mir2_wil.image_at(data, layout['offsets'][0], palette)
            self.assertEqual((meta['width'], meta['height']), (3, 2))
            self.assertEqual((meta['px'], meta['py']), (7, 9))
            self.assertEqual(image.getpixel((0, 0))[3], 0, 'palette index 0 must be transparent')
            self.assertEqual(image.getpixel((1, 0))[3], 255)
            self.assertEqual(image.getpixel((1, 0))[:3], palette[1])

    def test_v1_header_is_53_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            wil = Path(tmp) / 'v1.WIL'
            header = shortstring('WEMADE') + struct.pack('<iiii', 4, 256, 1024, 0)
            wil.write_bytes(header + b'\0' * 1024)
            parsed = mir2_wil.read_wil_header(wil.read_bytes())
            self.assertEqual(parsed['headerSize'], 53)
            self.assertEqual(parsed['paletteOffset'], 53)


if __name__ == '__main__':
    unittest.main()
