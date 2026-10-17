"""Synthetic round-trip for the classic Mir2 .map reader."""
import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / 'mir2_map.py'
spec = importlib.util.spec_from_file_location('mir2_map', MODULE)
mir2_map = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mir2_map)


def build(path, width=2, height=3):
    title = b'TESTMAP'
    header = struct.pack('<HH', width, height) + bytes([len(title)]) + title + b'\0' * (16 - len(title))
    header += struct.pack('<d', 0.0) + b'\0' * 23
    assert len(header) == 52, len(header)
    cells = bytearray()
    for i in range(width * height):
        cells += struct.pack('<HHHBBBBBB', 100 + i, 200 + i, 0x8000 | (300 + i), 1, 2, 3, 4, 5, 6)
    path.write_bytes(header + bytes(cells))


class Mir2MapRoundTrip(unittest.TestCase):
    def test_header_and_cells(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'test.map'
            build(path)
            parsed = mir2_map.parse(path)
            self.assertEqual((parsed['width'], parsed['height']), (2, 3))
            self.assertEqual(parsed['title'], 'TESTMAP')
            self.assertEqual(len(parsed['cells']), 6)
            first = parsed['cells'][0]
            self.assertEqual(first['back'], 100)
            self.assertEqual(first['front'] & 0x7FFF, 300)
            self.assertTrue(first['front'] & 0x8000)
            self.assertEqual((first['doorIndex'], first['animationFrame'], first['light']), (1, 3, 6))

    def test_size_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'bad.map'
            build(path)
            data = path.read_bytes()
            path.write_bytes(data[:-1])
            with self.assertRaises(ValueError):
                mir2_map.parse(path)


if __name__ == '__main__':
    unittest.main()
