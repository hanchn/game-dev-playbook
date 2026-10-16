#!/usr/bin/env python3
"""Re-derive trusted body-ownership calibration from frozen original evidence.

Why this exists: the first r4 registry carried `selectedGroupSignature` values
that no decode of its own frozen VRAM reproduces, so
`kof98-source-reference-v5.py` refused the whole KOF98 export with
"Trusted calibration group signature changed". The recorded `selectedGroupOffset`
*does* reproduce, from the receipt's own `entityNativeScreen`, which confirms the
anchor convention and isolates the signature field as the stale part.

This tool does not overwrite that frozen registry. It re-derives each trusted
entry from its own frozen VRAM/palette/screenshot/trace quadruple and writes a new
registry revision plus an audit report.

Frame of reference, fixed by the exporter:
  signature = kof98-body-ownership-v5.signature(group) over the group decoded by
              kof98-source-reference-v5.objects() from the named frozen VRAM at
              the named source tick
  offset    = kof98-body-ownership-v5.offset(group, [p1x - cameraX, p1y - 16])
              from the same trace row

`--verify-visible` is a camera-independent check that the declared group really
is on screen: every selected object is drawn at its own native column X, which is
the position the hardware uses, and the resulting layer must match the original
screenshot in a high fraction of its opaque pixels. A group that is not the
on-screen body cannot survive this check.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import importlib.util
import json
import struct
import sys

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/research'
AUDIT_DIR = BASE / 'kof98-source-reference-audit-20261016/calibration-audit'
REGISTRY = BASE / 'kof98-source-reference-audit-20261016/r4-body-ownership-reviewed.json'
CORRECTED = BASE / 'kof98-source-reference-audit-20261016/r4-body-ownership-reviewed-v2.json'
BODY_PALETTES = (16, 17, 18, 19)


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def visible_pixel_match(layer, native):
    """Exact colour agreement of an absolute-position sprite layer."""
    sprite, screen = layer.load(), native.load()
    opaque = exact = 0
    for y in range(16, 224):
        for x in range(320):
            if sprite[x, y][3]:
                opaque += 1
                if sprite[x, y][:3] == screen[x, y]:
                    exact += 1
    return {'opaquePixels': opaque, 'exactPixels': exact,
            'exactRatio': round(exact / opaque, 6) if opaque else None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--registry', type=Path, default=REGISTRY)
    parser.add_argument('--output', type=Path, default=CORRECTED)
    parser.add_argument('--audit-dir', type=Path, default=AUDIT_DIR)
    parser.add_argument('--characters', nargs='+', default=None)
    parser.add_argument('--trusted-only', action='store_true', default=True)
    parser.add_argument('--min-exact-ratio', type=float, default=0.90)
    args = parser.parse_args()

    export = load_module('kof98_export_calib', ROOT / 'scripts/kof98-source-reference-v5.py')
    owner = load_module('kof98_owner_calib', ROOT / 'scripts/kof98-body-ownership-v5.py')
    renderer = export.Renderer()

    raw = args.registry.read_bytes()
    registry = json.loads(raw)
    args.audit_dir.mkdir(parents=True, exist_ok=True)

    report = {
        'schema': 'kof98-calibration-recompute/v1',
        'registry': str(args.registry.relative_to(ROOT.parent.parent)),
        'registrySHA256': sha_bytes(raw),
        'signatureScript': {'path': 'scripts/kof98-body-ownership-v5.py',
                            'sha256': sha_bytes((ROOT / 'scripts/kof98-body-ownership-v5.py').read_bytes())},
        'decoderScript': {'path': 'scripts/kof98-source-reference-v5.py',
                          'sha256': sha_bytes((ROOT / 'scripts/kof98-source-reference-v5.py').read_bytes())},
        'originConvention': 'origin = [p1x - cameraX, p1y - 16] from the same trace row',
        'items': [],
    }

    items = []
    for item in registry['items']:
        name = item['sourceCharacter']
        if args.trusted_only and not item.get('trustedCalibration'):
            items.append(item)
            continue
        if args.characters and name not in args.characters:
            items.append(item)
            continue
        native = ROOT / item['sourceFrameImage']
        folder = native.parent.parent
        vram_path = folder / 'vram' / f'{native.stem}.bin'
        palette_path = folder / 'palette' / f'{native.stem}.bin'
        trace_path = folder / 'trace.csv'
        entry = {'sourceCharacter': name, 'sourceClipID': item.get('sourceClipID'),
                 'sourceFrameImage': item['sourceFrameImage'], 'sourceTick': item['sourceTick'],
                 'selectedGroup': item['selectedGroup'],
                 'recordedSignature': item.get('selectedGroupSignature'),
                 'recordedOffset': item.get('selectedGroupOffset')}
        if not (native.exists() and vram_path.exists() and palette_path.exists() and trace_path.exists()):
            entry['status'] = 'failed-missing-frozen-evidence'
            report['items'].append(entry)
            continue
        rows = {int(r['tick']): r for r in csv.DictReader(trace_path.open())}
        row = rows.get(int(item['sourceTick']))
        if row is None:
            entry['status'] = 'failed-tick-absent-from-trace'
            report['items'].append(entry)
            continue
        camera_source = 'trace.cameraX'
        if 'cameraX' not in row:
            # Older action batches recorded the camera in box observations
            # instead of the trace. It is read, never inferred or defaulted.
            boxes = folder / 'box-observations.jsonl'
            camera = None
            if boxes.exists():
                for line in boxes.open():
                    observation = json.loads(line)
                    if int(observation.get('tick', -1)) == int(item['sourceTick']):
                        camera = observation.get('cameraX')
                        break
            if camera is None:
                entry['status'] = 'failed-trace-without-camera'
                entry['traceColumns'] = sorted(row)
                report['items'].append(entry)
                continue
            row = dict(row)
            row['cameraX'] = camera
            camera_source = 'box-observations.cameraX'
        entry['cameraSource'] = camera_source
        vraw = vram_path.read_bytes()
        praw = palette_path.read_bytes()
        v = struct.unpack('<34304H', vraw)
        palette = struct.unpack('<4096I', praw)
        auto = int(row['auto']) if row.get('auto') else None
        origin = [int(row['p1x']) - int(row['cameraX']), int(row['p1y']) - 16]
        all_objects = list(export.objects(v, auto))
        chosen = [o for o in all_objects if o['group'] == item['selectedGroup']]
        entry.update({'frozenVramSHA256': sha_bytes(vraw), 'frozenSnapshotSHA256': sha_bytes(native.read_bytes()),
                      'frozenTraceSHA256': sha_bytes(trace_path.read_bytes()),
                      'declaredVramMatches': sha_bytes(vraw) == item.get('vramSHA256'),
                      'declaredSnapshotMatches': sha_bytes(native.read_bytes()) == item.get('snapshotSHA256'),
                      'originNativeEntity': origin, 'autoAnimationCounter': auto,
                      'candidateGroupCount': len({o['group'] for o in all_objects})})
        if not chosen:
            entry['status'] = 'failed-selected-group-absent'
            report['items'].append(entry)
            continue

        signature = owner.signature(chosen)
        offset = list(owner.offset(chosen, origin))
        entry.update({'recomputedSignature': signature, 'recomputedOffset': offset,
                      'groupMembers': len(chosen),
                      'palettes': sorted({o['palette'] for o in chosen}),
                      'signatureChanged': signature != item.get('selectedGroupSignature'),
                      'offsetChanged': offset != list(item.get('selectedGroupOffset') or [])})

        # Camera-independent visibility proof: native column X is the hardware
        # position, so the chosen group must land on the recorded body pixels.
        native_image = Image.open(native).convert('RGB')
        layer = Image.new('RGBA', (320, 224))
        missing_auto = False
        for obj in sorted(chosen, key=lambda o: (o['column'], o['y'])):
            tiles, missing = renderer.zoomed_column(v, palette, auto, obj)
            if missing:
                missing_auto = True
                break
            layer.alpha_composite(tiles)
        if missing_auto:
            entry['status'] = 'failed-group-needs-unknown-auto-animation'
            report['items'].append(entry)
            continue
        match = visible_pixel_match(layer, native_image)
        entry['visiblePixelCheck'] = match
        entry['visiblePixelPassed'] = bool(match['exactRatio'] is not None
                                           and match['exactRatio'] >= args.min_exact_ratio)

        sheet = Image.new('RGB', (320 * 3 + 16, 240), '#101820')
        flat = Image.new('RGB', (320, 224), '#101820')
        flat.paste(layer, (0, 0), layer)
        overlay = native_image.copy()
        overlay.paste(flat, (0, 0), layer)
        sheet.paste(native_image, (0, 16))
        sheet.paste(flat, (320 + 8, 16))
        sheet.paste(overlay, (2 * (320 + 8), 16))
        draw = ImageDraw.Draw(sheet)
        draw.text((4, 2), f'{name} tick{item["sourceTick"]} group{item["selectedGroup"]} '
                          f'n={len(chosen)} exact={match["exactRatio"]}', fill='#ffe08a')
        sheet_path = args.audit_dir / f'{name}-{item["sourceTick"]}-group{item["selectedGroup"]}.png'
        sheet.save(sheet_path)
        entry['reviewSheet'] = str(sheet_path.relative_to(ROOT.parent.parent))
        entry['reviewSheetSHA256'] = sha_bytes(sheet_path.read_bytes())
        entry['status'] = 'recomputed'

        corrected = dict(item)
        if item.get('trustedCalibration') and entry['visiblePixelPassed'] and (
                entry['signatureChanged'] or entry['offsetChanged']):
            corrected['selectedGroupSignature'] = signature
            corrected['selectedGroupOffset'] = offset
            corrected['calibrationDerivation'] = {
                'schema': 'kof98-calibration-derivation/v1',
                'originConvention': report['originConvention'],
                'decoderSHA256': report['decoderScript']['sha256'],
                'signatureScriptSHA256': report['signatureScript']['sha256'],
                'frozenVramSHA256': entry['frozenVramSHA256'],
                'frozenSnapshotSHA256': entry['frozenSnapshotSHA256'],
                'frozenTraceSHA256': entry['frozenTraceSHA256'],
                'reviewSheet': entry['reviewSheet'],
                'reviewSheetSHA256': entry['reviewSheetSHA256'],
                'visiblePixelCheck': match,
                'supersededRecordedSignature': item.get('selectedGroupSignature'),
                'supersededRecordedOffset': item.get('selectedGroupOffset'),
                'note': ('Recomputed from the frozen original VRAM/screenshot/trace set after the first '
                         'recorded signature failed the exporter gate; the human group choice and the '
                         'recorded offset convention are unchanged.'),
            }
            entry['trustedRewritten'] = True
        items.append(corrected)
        report['items'].append(entry)

    report['summary'] = {
        'items': len(report['items']),
        'trustedConsidered': sum(1 for i in report['items'] if 'selectedGroup' in i),
        'recomputed': sum(1 for i in report['items'] if i.get('status') == 'recomputed'),
        'visiblePixelPassed': sum(1 for i in report['items'] if i.get('visiblePixelPassed')),
        'trustedRewritten': sum(1 for i in report['items'] if i.get('trustedRewritten')),
        'failed': sum(1 for i in report['items'] if str(i.get('status', '')).startswith('failed')),
    }
    result = dict(registry)
    result['items'] = items
    result['schema'] = str(registry.get('schema', 'kof98-body-ownership-reviewed/v1')) + '+calibration-recompute-v2'
    result['calibrationAudit'] = {'report': str((args.audit_dir / 'report.json').relative_to(ROOT.parent.parent)),
                                  'baseRegistrySHA256': sha_bytes(raw)}
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (args.audit_dir / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), **report['summary']}, ensure_ascii=False))
    return report


if __name__ == '__main__':
    main()
