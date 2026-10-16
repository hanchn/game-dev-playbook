#!/usr/bin/env python3
"""Deterministic capture audit + representative contact; not a move-success classifier."""
from pathlib import Path
import csv, json, hashlib
from PIL import Image, ImageDraw
BASE = Path(__file__).resolve().parents[1] / 'data/research/kof98-actions-20261016'
report = {'scope': 'Packaging and read-only conditions; contact inspection is a separate visual gate.', 'characters': {}}
for folder in sorted(BASE.iterdir()):
    if not folder.is_dir(): continue
    items, batches = [], {}
    for capture in sorted(folder.glob('*/capture.json')):
        if 'pilot-' in capture.parent.name: continue
        meta = json.loads(capture.read_text())
        rows = list(csv.DictReader((capture.parent / 'trace.csv').open()))
        ticks = [int(row['tick']) for row in rows]
        errors = []
        if not all(b == a + 1 for a, b in zip(ticks, ticks[1:])): errors.append('non-contiguous source ticks')
        screen_frames = [int(row['screenFrame']) for row in rows]
        if not all(b == a + 1 for a, b in zip(screen_frames, screen_frames[1:])): errors.append('non-contiguous native screenFrame')
        pngs = list((capture.parent/'snap').glob('*.png'))
        if len(pngs) != len(rows): errors.append(f'PNG count {len(pngs)} != trace count {len(rows)}')
        for image_path in pngs:
            with Image.open(image_path) as image:
                if image.size != (320,224): errors.append(f'{image_path.name}: native dimensions {image.size}')
                image.verify()
        for row in rows:
            tick = row['tick']
            for sub, ext in [('snap', 'png'), ('vram', 'bin'), ('palette', 'bin')]:
                p = capture.parent / sub / f'{tick}.{ext}'
                if not p.is_file() or not p.stat().st_size: errors.append(f'missing or empty {sub}/{tick}.{ext}')
                elif sub == 'vram' and p.stat().st_size != 68608: errors.append(f'bad VRAM size at {tick}')
                elif sub == 'palette' and p.stat().st_size != 16384: errors.append(f'bad palette size at {tick}')
        phases = {}
        for row in rows: phases.setdefault(row['phase'], []).append(row)
        conditions = {}
        for phase, rr in phases.items():
            conditions[phase] = {'samples': len(rr), 'p1YRange': [min(int(r['p1y']) for r in rr), max(int(r['p1y']) for r in rr)], 'p1LifeValues': sorted({int(r['p1life']) for r in rr}), 'p2LifeValues': sorted({int(r['p2life']) for r in rr}), 'triggerStatus': 'not_verified'}
        samples = [rows[0], rows[-1]]
        if meta['batch'] == 'locomotion': samples.insert(1, min(rows, key=lambda r: int(r['p1y'])))
        for row in samples:
            p = capture.parent / 'snap' / f"{row['tick']}.png"
            if p.is_file(): items.append((meta['batch'], row['tick'], p))
        batches[meta['batch']] = {'rawFrames': len(rows), 'packagingPassed': not errors, 'errors': errors[:50], 'conditions': conditions, 'sourceSHA256': hashlib.sha256((capture.parent / 'source.lua').read_bytes()).hexdigest()}
    if not batches: continue
    contact = Image.new('RGB', (960, ((len(items)+2)//3)*248), '#eeeeee')
    draw = ImageDraw.Draw(contact)
    for i, (batch, tick, path) in enumerate(items):
        x, y = (i%3)*320, (i//3)*248
        native = Image.open(path).convert('RGB')
        if native.size != (320,224): batches[batch]['errors'].append(f'unexpected native dimensions {native.size}'); batches[batch]['packagingPassed'] = False
        contact.paste(native, (x,y+24));draw.text((x+3,y+4),f'{folder.name} {batch} {tick}',fill='black')
    dest = folder / 'review';dest.mkdir(exist_ok=True)
    contact.save(dest/'batch-contact.jpg')
    report['characters'][folder.name] = {'batches':batches, 'contact': str((dest/'batch-contact.jpg').relative_to(BASE)), 'identityVisualVerified':False, 'allMovesComplete':False}
(BASE/'capture-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print({n:{b:v['rawFrames'] for b,v in c['batches'].items()} for n,c in report['characters'].items()})
