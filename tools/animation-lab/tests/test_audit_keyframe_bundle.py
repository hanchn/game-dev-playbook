import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

SCRIPT = pathlib.Path(__file__).parents[1] / 'scripts' / 'audit-keyframe-bundle.py'
SPEC = importlib.util.spec_from_file_location('bundle_audit', SCRIPT)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class BundleAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.bundle = self.root / 'action' / 'v1'
        (self.bundle / 'frames').mkdir(parents=True)
        (self.bundle / 'keyframes').mkdir()
        sheet = Image.new('RGBA', (32, 24))
        for i in range(12):
            image = Image.new('RGBA', (8, 8))
            image.putpixel((4, 4), (i*20, 80, 40, 255))
            image.save(self.bundle / 'frames' / f'{i+1:03d}.png')
            sheet.paste(image, ((i % 4)*8, (i//4)*8))
            if i in (0, 3, 6, 9):
                image.save(self.bundle / 'keyframes' / f'{i//3+1:03d}.png')
        sheet.save(self.bundle / 'sheet.png')
        self.data = {'frames': [f'/model-frame-assets/action/v1/frames/{i:03d}.png' for i in range(1, 13)],
                     'frameCount': 12, 'canvas': [8, 8], 'transparent': True,
                     'sheet': 'action/v1/sheet.png', 'grid': {'columns': 4, 'rows': 3},
                     'clips': [{'frames': [f'action/v1/frames/{i:03d}.png' for i in range(1, 13)]}]}

    def run_audit(self, four=True):
        file = self.bundle / 'manifest.json'
        file.write_text(json.dumps(self.data))
        return AUDIT.audit(file, self.root, four_source=four)

    def codes(self, report):
        return {f['code'] for f in report['findings']}

    def test_prefix_normalization_and_exact_packaging(self):
        result = self.run_audit()
        self.assertTrue(result['packagingPassed'])
        self.assertEqual(result['distinct']['decodedRGBA'], 12)
        self.assertTrue(all(s['byteEqual'] for s in result['sources']))
        self.assertFalse(result['art']['assessed'])

    def test_mixed_clip_binding_is_failure(self):
        self.data['clips'][0]['frames'][3] = 'action/v1/frames/005.png'
        self.assertIn('binding-mismatch', self.codes(self.run_audit()))

    def test_wrong_atlas_and_missing_frame_are_failures(self):
        Image.new('RGBA', (32, 24)).save(self.bundle / 'sheet.png')
        (self.bundle / 'frames/005.png').unlink()
        codes = self.codes(self.run_audit())
        self.assertTrue({'frame-unreadable', 'atlas-pixels'} <= codes)

    def test_atlas_hidden_rgb_is_warning_and_packaging_passes(self):
        with Image.open(self.bundle / 'sheet.png') as source:
            sheet = source.copy()
        sheet.putpixel((0, 0), (255, 80, 20, 0))
        sheet.save(self.bundle / 'sheet.png')
        result = self.run_audit()
        self.assertTrue(result['packagingPassed'])
        self.assertNotIn('atlas-pixels', self.codes(result))
        hidden = next(f for f in result['findings'] if f['code'] == 'atlas-hidden-rgb')
        self.assertEqual(hidden['severity'], 'warning')

    def test_atlas_visible_rgb_difference_is_error(self):
        with Image.open(self.bundle / 'sheet.png') as source:
            sheet = source.copy()
        sheet.putpixel((4, 4), (255, 80, 20, 255))
        sheet.save(self.bundle / 'sheet.png')
        result = self.run_audit()
        self.assertFalse(result['packagingPassed'])
        visible = next(f for f in result['findings'] if f['code'] == 'atlas-pixels')
        self.assertEqual(visible['severity'], 'error')

    def test_wrong_source_sha_not_hidden_by_preview(self):
        Image.new('RGBA', (8, 8), 'red').save(self.bundle / 'keyframes/002.png')
        self.assertIn('source-key-mismatch', self.codes(self.run_audit()))

    def test_explicit_source_positions_allow_recovery_until_frame12(self):
        self.data['sourceKeyframePositions'] = [1, 4, 7, 12]
        (self.bundle / 'keyframes/004.png').write_bytes((self.bundle / 'frames/012.png').read_bytes())
        result = self.run_audit()
        self.assertTrue(result['packagingPassed'])
        self.assertEqual([r['frameIndex'] for r in result['sources']], [1, 4, 7, 12])
        self.assertTrue(all(r['byteEqual'] for r in result['sources']))

    def test_invalid_explicit_source_positions_fail_without_guessing(self):
        for positions in ([1, 4, 7], [1, 4, 7, 13], [0, 4, 7, 12],
                          [1, 7, 4, 12], [1, 4, 4, 12], [True, 4, 7, 12], '1,4,7,12'):
            with self.subTest(positions=positions):
                self.data['sourceKeyframePositions'] = positions
                result = self.run_audit()
                self.assertFalse(result['packagingPassed'])
                self.assertIn('source-key-positions', self.codes(result))
                self.assertNotIn('sources', result)

    def test_rgb_is_not_transparent_and_grid_never_guessed(self):
        image = Image.new('RGB', (8, 8), 'red')
        image.save(self.bundle / 'frames/001.png')
        del self.data['grid']
        codes = self.codes(self.run_audit(False))
        self.assertTrue({'transparent-claim-opaque', 'atlas-grid-not-declared'} <= codes)
        self.assertNotIn('alpha-touches-edge', codes)

    def test_duplicate_pixels_counted_even_when_declared_count_wrong(self):
        raw = (self.bundle / 'frames/001.png').read_bytes()
        (self.bundle / 'frames/002.png').write_bytes(raw)
        self.data['distinctPNGCount'] = 12
        result = self.run_audit()
        self.assertEqual(result['distinct']['decodedRGBA'], 11)
        self.assertIn('distinct-count', self.codes(result))

    def test_video_decoded_count_not_declared_metadata(self):
        self.data['video'] = 'preview.mp4'
        response = type('Probe', (), {'stdout': '{"streams":[{"nb_read_frames":"11","width":8,"height":8}]}'})()
        with patch.object(AUDIT.subprocess, 'run', return_value=response) as probe:
            self.assertIn('video-frame-count', self.codes(self.run_audit()))
            self.assertIn('-count_frames', probe.call_args.args[0])

    def test_missing_linked_download_and_source_preview_fail(self):
        self.data['zip'] = 'missing.zip'
        (self.bundle / 'keyframes/004.png').unlink()
        self.assertTrue({'linked-file-missing', 'source-preview-unreadable'} <= self.codes(self.run_audit()))


if __name__ == '__main__':
    unittest.main()
