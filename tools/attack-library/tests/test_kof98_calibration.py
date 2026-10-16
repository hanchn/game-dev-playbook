"""Check that trusted KOF98 calibration is reproducible from its own frozen evidence.

The first r4 registry shipped trusted signatures that no decode of the same frozen
VRAM reproduces, which blocked the whole export. This test replays the derivation
independently: it decodes every trusted entry's frozen VRAM, recomputes the
signature and anchor, and requires the v2 registry to carry exactly those values.
It also requires the superseded v1 registry to stay unchanged and the visible-pixel
proof to have passed. No MAME run is needed; only frozen bytes are read.
"""
import csv
import importlib.util
import json
import struct
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).parents[1] / 'scripts'
BASE = Path(__file__).parents[1] / 'data/research'
AUDIT = BASE / 'kof98-source-reference-audit-20261016'
V1 = AUDIT / 'r4-body-ownership-reviewed.json'
V2 = AUDIT / 'r4-body-ownership-reviewed-v2.json'
REPORT = AUDIT / 'calibration-audit/report.json'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class TrustedCalibrationRepro(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.export = load('kof98_export_calibration_test', SCRIPTS / 'kof98-source-reference-v5.py')
        cls.owner = load('kof98_owner_calibration_test', SCRIPTS / 'kof98-body-ownership-v5.py')
        cls.v2 = json.loads(V2.read_text())
        cls.report = json.loads(REPORT.read_text())
        cls.trusted = [i for i in cls.v2['items'] if i.get('trustedCalibration')]
        cls.reported = {i['sourceClipID']: i for i in cls.report['items'] if 'selectedGroup' in i}

    def frozen(self, item):
        native = Path(__file__).parents[1] / item['sourceFrameImage']
        folder = native.parent.parent
        vram = (folder / 'vram' / f'{native.stem}.bin').read_bytes()
        with (folder / 'trace.csv').open() as stream:
            rows = {int(r['tick']): r for r in csv.DictReader(stream)}
        row = rows[int(item['sourceTick'])]
        if 'cameraX' not in row:
            with (folder / 'box-observations.jsonl').open() as stream:
                for line in stream:
                    observation = json.loads(line)
                    if int(observation.get('tick', -1)) == int(item['sourceTick']):
                        row = dict(row, cameraX=observation['cameraX'])
                        break
        return vram, row

    def test_trusted_entries_exist_and_were_recomputed(self):
        self.assertTrue(self.trusted, 'no trusted calibration entries found')
        for item in self.trusted:
            self.assertEqual(item.get('calibrationDerivation', {}).get('schema'),
                             'kof98-calibration-derivation/v1', item['sourceClipID'])

    def test_signature_and_anchor_match_frozen_vram(self):
        for item in self.trusted:
            with self.subTest(clip=item['sourceClipID']):
                vram, row = self.frozen(item)
                v = struct.unpack('<34304H', vram)
                auto = int(row['auto']) if row.get('auto') else None
                group = [o for o in self.export.objects(v, auto) if o['group'] == item['selectedGroup']]
                self.assertTrue(group, 'selected group missing from frozen VRAM')
                self.assertEqual(self.owner.signature(group), item['selectedGroupSignature'])
                origin = (int(row['p1x']) - int(row['cameraX']), int(row['p1y']) - 16)
                self.assertEqual(list(self.owner.offset(group, origin)), item['selectedGroupOffset'])

    def test_frozen_hashes_still_match_the_declared_evidence(self):
        for item in self.trusted:
            with self.subTest(clip=item['sourceClipID']):
                native = Path(__file__).parents[1] / item['sourceFrameImage']
                vram, _ = self.frozen(item)
                import hashlib
                self.assertEqual(hashlib.sha256(vram).hexdigest(), item['vramSHA256'])
                self.assertEqual(hashlib.sha256(native.read_bytes()).hexdigest(), item['snapshotSHA256'])

    def test_visible_pixel_proof_was_recorded_and_passed(self):
        for item in self.trusted:
            with self.subTest(clip=item['sourceClipID']):
                proof = item['calibrationDerivation']['visiblePixelCheck']
                self.assertGreater(proof['opaquePixels'], 0)
                self.assertGreaterEqual(proof['exactRatio'], 0.90)

    def test_superseded_values_are_preserved_on_the_derivation(self):
        for item in self.trusted:
            with self.subTest(clip=item['sourceClipID']):
                derivation = item['calibrationDerivation']
                self.assertIn('supersededRecordedSignature', derivation)
                self.assertNotEqual(derivation['supersededRecordedSignature'], item['selectedGroupSignature'])

    def test_superseded_v1_registry_is_untouched(self):
        v1 = json.loads(V1.read_text())
        for item in v1['items']:
            if not item.get('trustedCalibration'):
                continue
            self.assertNotIn('calibrationDerivation', item)
        self.assertEqual(v1.get('schema'), 'kof98-body-ownership-reviewed/v1')

    def test_audit_report_covers_every_trusted_entry(self):
        for item in self.trusted:
            self.assertIn(item['sourceClipID'], self.reported)
            entry = self.reported[item['sourceClipID']]
            self.assertEqual(entry['status'], 'recomputed')
            self.assertTrue(entry['visiblePixelPassed'])
            self.assertTrue(entry['reviewSheet'].endswith('.png'))


if __name__ == '__main__':
    unittest.main()
