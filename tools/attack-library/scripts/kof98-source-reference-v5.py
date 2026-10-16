#!/usr/bin/env python3
"""Repair body ownership/palette gaps in existing KOF98 r2 source references.

Tile bitplane/order formulas follow the existing local MAME 0.289 study scripts.
Outputs are observation canvases, never recovered artist canvases or bones.
One process, one character at a time. Existing clip receipts are immutable.
The default r3 directory contains overrides; unchanged clips remain in r2.
"""
from pathlib import Path
from functools import lru_cache
from collections import Counter
from PIL import Image, ImageChops, ImageDraw
import argparse, csv, hashlib, json, re, struct, sys, time, zipfile, importlib.util

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/research'
REVISION = BASE / 'kof98-source-reference-20261016-r5'
PARENT_REVISION = BASE / 'kof98-source-reference-20261016-r2'
COLLECTIONS = ('actions', 'edges', 'author', 'meter')
CHARACTERS = ('robert', 'king', 'vice', 'benimaru', 'kyo', 'daimon', 'joe', 'ryo',
              'mai', 'athena', 'terry', 'kim', 'andy', 'shingo', 'leona', 'iori')
TARGETS = dict(zip(CHARACTERS, ('horse', 'cow', 'fishing_expert', 'weasel', 'naifrog',
               'bull', 'kangaroo', 'boar', 'fox', 'cat', 'dog', 'toad', 'fish',
               'rat', 'tech_scarf_woman', 'paul')))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def rel(path):
    return str(path.relative_to(ROOT))


def count(mask):
    return sum(mask.histogram()[1:])


def mismatch(a, b, mask):
    diff = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
    red, green, blue = diff.split()
    diff = ImageChops.lighter(red, ImageChops.lighter(green, blue))
    return count(ImageChops.multiply(diff.point(lambda x: 255 if x else 0), mask))


def objects(v, auto):
    x = y = zx = zy = n = 0
    group = 0
    for i in range(381):
        control, zoom = v[0x8200+i], v[0x8000+i]
        if control & 64:
            x = (x+zx+1) & 511
            zx = zoom >> 8 & 15
        else:
            x, y = v[0x8400+i] >> 7, (512-(control >> 7)) & 511
            n, zy, zx, group = control & 63, zoom & 255, zoom >> 8 & 15, i
        if not n or n > 32:
            continue
        for k in range(n):
            code, attr = v[i*64+k*2], v[i*64+k*2+1]
            code |= (attr << 12) & 0xf0000
            needs_auto = bool(attr & 12)
            if auto is not None:
                if attr & 8:
                    code = code & ~7 | auto & 7
                elif attr & 4:
                    code = code & ~3 | auto & 3
            yield {'column': i, 'group': group, 'x': x, 'y': (y+k*16) & 511,
                   'groupY': y, 'code': code, 'attr': attr, 'palette': attr >> 8,
                   'zx': zx, 'zy': zy, 'missingAuto': needs_auto and auto is None}


class Renderer:
    def __init__(self):
        self.gfx_path = BASE/'kof98-multichar-20261016/kyo/sprites-region.bin'
        self.gfx = self.gfx_path.read_bytes()
        self.zoomy_path = self.gfx_path.parent/'zoomy.bin'
        self.zoomy = self.zoomy_path.read_bytes()
        self.fixed_zip = ROOT/'assets/original-games/kof98/kof98.zip'
        with zipfile.ZipFile(self.fixed_zip) as archive:
            self.fixed = archive.read('242-s1.s1')
        self.body_catalog = None
        self.visibility_path = BASE/'kof98-source-reference-audit-20261016/r4-visibility-reviewed.json'
        self.visibility_sha = sha(self.visibility_path.read_bytes())
        self.visibility_registry = {f['sourceFrameImage']:f for f in json.loads(self.visibility_path.read_text())['items']}
        if len(self.fixed) != 131072:
            raise ValueError('Unexpected KOF98 unbanked fixed-layer region size')

    @lru_cache(maxsize=4096)
    def fixed_tile(self, code, colors):
        # MAME mame0289 neogeo_spr.cpp draw_fixed_layer / _2pixels.
        out = bytearray(8*8*4)
        for y in range(8):
            for pair, offset in enumerate((0x10, 0x18, 0x00, 0x08)):
                data = self.fixed[((code << 5) | y)+offset]
                for bit in (0, 1):
                    index = data >> (4*bit) & 15
                    if index:
                        color = colors[index]
                        pos = (y*8+pair*2+bit)*4
                        out[pos:pos+4] = bytes((color >> 16 & 255, color >> 8 & 255,
                                               color & 255, 255))
        return Image.frombytes('RGBA', (8, 8), bytes(out))

    @lru_cache(maxsize=32000)
    def tile(self, code):
        pixels = bytearray(256)
        start = (code*128) % len(self.gfx)
        for y in range(16):
            for x in range(16):
                q, bit = start+(64 if x < 8 else 0)+(y << 2), x % 8
                pixels[y*16+x] = (((self.gfx[q+3] >> bit & 1) << 3) |
                                  ((self.gfx[q+1] >> bit & 1) << 2) |
                                  ((self.gfx[q+2] >> bit & 1) << 1) |
                                  (self.gfx[q] >> bit & 1))
        return bytes(pixels)

    @lru_cache(maxsize=16000)
    def colored(self, code, flip, colors):
        out = bytearray(1024)
        for i, index in enumerate(self.tile(code)):
            if index:
                color = colors[index]
                out[i*4:i*4+4] = bytes((color >> 16 & 255, color >> 8 & 255,
                                       color & 255, 255))
        image = Image.frombytes('RGBA', (16, 16), bytes(out))
        if flip & 1:
            image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if flip & 2:
            image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        return image

    def image(self, obj, palette):
        offset = obj['palette']*16
        return self.colored(obj['code'], obj['attr'] & 3,
                            tuple(palette[offset:offset+16]))

    def zoomed_column(self, v, palette, auto, obj):
        """Native deletion-table shrink, not Pillow image resizing.

        Port of the observed MAME0.289 hardware column mapping. Returns the
        absolute viewport layer, with unknown automatic-animation columns
        explicitly blocked when their device counter was not captured.
        """
        tables = (0x0080,0x0880,0x0888,0x2888,0x288a,0x2a8a,0x2aaa,0xaaaa,
                  0xaaea,0xbaea,0xbaeb,0xbbeb,0xbbef,0xfbef,0xfbff,0xffff)
        rows = v[0x8200+obj['group']] & 63
        x = obj['x'] if obj['x'] <= 496 else obj['x']-512
        if 320 <= x <= 496:
            return Image.new('RGBA', (320,224)), False
        data = bytearray(320*224*4)
        unknown = False
        for scanline in range(16,240):
            line = (scanline-obj['groupY']) & 511
            if rows < 32 and line >= rows*16:
                continue
            zoom_line, invert = line & 255, bool(line & 256)
            if invert:
                zoom_line ^= 255
            if rows > 32:
                zoom_line %= (obj['zy']+1)*2
                if zoom_line > obj['zy']:
                    zoom_line = (obj['zy']+1)*2-1-zoom_line
                    invert = not invert
            mapping = self.zoomy[(obj['zy'] << 8) | zoom_line]
            source_y, tile_index = mapping & 15, mapping >> 4
            if invert:
                source_y ^= 15
                tile_index ^= 31
            address = obj['column']*64+tile_index*2
            attr = v[address+1]
            code = v[address] | ((attr << 12) & 0xf0000)
            if attr & 12:
                if auto is None:
                    unknown = True
                    continue
                code = (code & ~7 | auto & 7) if attr & 8 else (code & ~3 | auto & 3)
            if attr & 2:
                source_y ^= 15
            pixels, target_x = self.tile(code), x
            table = tables[obj['zx']]
            for source_x in range(16):
                if table & (1 << (15-source_x)):
                    index = pixels[source_y*16+(15-source_x if attr & 1 else source_x)]
                    if index and 0 <= target_x < 320:
                        color = palette[(attr >> 8)*16+index]
                        pos = ((scanline-16)*320+target_x)*4
                        data[pos:pos+4] = bytes((color >> 16 & 255,color >> 8 & 255,color & 255,255))
                    target_x += 1
        return Image.frombytes('RGBA',(320,224),bytes(data)), unknown

    def render(self, row, native_path, extra):
        folder, stem = native_path.parent.parent, native_path.stem
        vraw = (folder/'vram'/f'{stem}.bin').read_bytes()
        praw = (folder/'palette'/f'{stem}.bin').read_bytes()
        v, palette = struct.unpack('<34304H', vraw), struct.unpack('<4096I', praw)
        camera = int(row['cameraX']) if row.get('cameraX') else extra.get('cameraX')
        facing = row.get('p1facing', row.get('face'))
        if facing is None and extra.get('players'):
            facing = extra['players'][0]['flip']
        entity = [int(row['p1x']), int(row['p1y'])]
        auto = int(row['auto']) if row.get('auto') else None
        obs = list(objects(v, auto))
        # Exact duplicate tile identity with inverted Y flags proves the
        # earlier group is the renderer reflection, even if its origin is
        # one pixel above RAM entityY. A Y cutoff alone misclassified it.
        groups = {}
        for obj in obs:
            if obj['palette'] in (16, 17, 18, 19):
                groups.setdefault(obj['group'], []).append(obj)
        reflection_groups = []
        for group, members in groups.items():
            inverted = Counter((o['code'], o['attr'] ^ 2) for o in members)
            for later, other in groups.items():
                if later > group and inverted == Counter((o['code'], o['attr']) for o in other):
                    reflection_groups.append(group)
                    break
        body = [o for o in obs if o['palette'] in (16, 17, 18, 19) and
                o['group'] not in reflection_groups and
                (o['groupY']-512 if o['groupY'] >= 384 else o['groupY']) < entity[1]]
        candidate_body = body
        ownership = {'status': 'single-candidate-group'}
        if len({o['group'] for o in body}) > 1:
            if camera is not None and self.body_catalog:
                body, ownership = self.body_catalog.select(body, [entity[0]-camera, entity[1]-16],
                    rel(native_path), sha(vraw), sha(native_path.read_bytes()))
            else:
                body, ownership = [], {'status': 'multiple-groups-without-native-entity-registration'}
        problems = []
        if camera is None:
            problems.append('missing-cameraX')
        if facing is None:
            problems.append('missing-facing')
        if any(o['missingAuto'] for o in body):
            problems.append('missing-body-auto-animation-counter')
        if any(o['zx'] != 15 or o['zy'] != 255 for o in body):
            problems.append('unsupported-body-zoom')
        if candidate_body and not body:
            problems.append('ambiguous-body-effect-ownership')
        metadata = {'entityWorldXY': entity, 'cameraWorldX': camera,
                    'autoAnimationCounter': auto,
                    'observedRefreshHz': float(row['refreshHz']) if row.get('refreshHz') else None,
                    'gamePhaseRaw': int(row['gamePhase']) if row.get('gamePhase') else None,
                    'facingRaw': int(facing) if facing is not None else None,
                    'sourceScreenFrame': int(row['screenFrame']),
                    'sourceTracePhase': row.get('phase'),
                    'sourcePhaseTick': int(row.get('phaseTick') or 0),
                    'vramSHA256': sha(vraw), 'paletteSHA256': sha(praw),
                    'nativeSnapshotSHA256': sha(native_path.read_bytes()),
                    'bodyOwnership': 'P1 palettes16/17/18/19; exact reflections removed; multi-group ownership separately calibrated/reviewed',
                    'bodyOwnershipResolution': ownership,
                    'candidateBodyGroups': sorted({o['group'] for o in candidate_body}),
                    'excludedReflectionGroups': reflection_groups,
                    'bodyObjects': body, 'problems': problems}
        raw_ram = folder/'ram'/f'{stem}.bin'
        if raw_ram.exists():
            metadata['rawRAMObservation'] = {'path': rel(raw_ram), 'sha256': sha(raw_ram.read_bytes()),
                                             'spans': [[0x108000,0x1085ff],[0x10b000,0x10b0ff]],
                                             'decodedStateOrHitboxes': False}
        absent=self.visibility_registry.get(rel(native_path))
        if not candidate_body and absent and camera is not None and facing is not None:
            if absent['vramSHA256']==sha(vraw) and absent['snapshotSHA256']==metadata['nativeSnapshotSHA256'] and absent['entityWorldXY']==entity and absent['cameraWorldX']==camera and absent['facingRaw']==int(facing):
                metadata.update({'renderedVisibility':False,'registeredVisibilityGatePassed':True,
                                 'entityNativeScreen':[entity[0]-camera,entity[1]-16],
                                 'pivot':None,'offset':None,'pixelGatePassed':False,
                                 'sourceDrawingPixelGatePassed':False,
                                 'visibilityEvidence':{'path':rel(self.visibility_path),'sha256':self.visibility_sha,
                                     'status':'exact-native-frame-observed-not-drawn','gameplayCause':'pending'},'problems':[]})
                return None,None,metadata
        blocking = [p for p in problems if p not in ('missing-cameraX', 'missing-facing')]
        if blocking or not body:
            if not body:
                problems.append('no-body-objects')
            return None, None, metadata
        registered = camera is not None and facing is not None
        # With no camera log, use only a source-screen drawing coordinate
        # basis. It is never exported as an inferred RAM pivot or camera.
        origin = [entity[0]-camera if camera is not None else 0, entity[1]-16]
        # Reconstruct into entity-relative coordinates before cropping. This
        # retains VRAM body pixels outside the source screenshot viewport.
        canvas_anchor_x = 256 if registered else 512
        canvas = Image.new('RGBA', (512 if registered else 1024, 512))
        visible = Image.new('RGBA', (320, 224))
        for obj in body:
            x = (min((obj['x']-512, obj['x'], obj['x']+512), key=lambda a: abs(a-origin[0]))
                 if camera is not None else (obj['x'] if obj['x'] < 384 else obj['x']-512))
            y = obj['y']-512 if obj['y'] >= 384 else obj['y']
            image = self.image(obj, palette)
            canvas.alpha_composite(image, (x-origin[0]+canvas_anchor_x, y-16-origin[1]+384))
            visible.alpha_composite(image, (x, y-16))
        bounds = canvas.getbbox()
        if bounds is None:
            problems.append('empty-body')
            return None, None, metadata
        cropped = canvas.crop(bounds)
        pivot = [canvas_anchor_x-bounds[0], 384-bounds[1]]
        native_bounds = [bounds[0]-canvas_anchor_x+origin[0], bounds[1]-384+origin[1],
                         bounds[2]-canvas_anchor_x+origin[0], bounds[3]-384+origin[1]]
        # Validate later-sprite occlusion in actual VRAM order. A mismatch is
        # never hidden by a rectangular exclusion or a blanket P2 mask.
        mask = visible.getchannel('A')
        composite = visible.copy()
        later_mask = Image.new('L', visible.size)
        first_column = min(o['column'] for o in body)
        uncertain = []
        body_ids = {(o['column'], o['y']) for o in body}
        roi = mask.getbbox()
        zoomed_columns = set()
        if roi:
            for obj in obs:
                if obj['column'] < first_column or (obj['column'], obj['y']) in body_ids:
                    continue
                x = obj['x'] if obj['x'] < 384 else obj['x']-512
                y = (obj['y']-512 if obj['y'] >= 384 else obj['y'])-16
                if obj['zx'] != 15 or obj['zy'] != 255:
                    if obj['column'] in zoomed_columns:
                        continue
                    zoomed_columns.add(obj['column'])
                    if x+obj['zx']+1 <= roi[0] or x >= roi[2]:
                        continue
                    layer, unknown = self.zoomed_column(v,palette,auto,obj)
                    alpha = layer.getchannel('A')
                    if unknown:
                        uncertain.append([obj['column'],'missing-auto-for-native-zoom'])
                    composite.alpha_composite(layer)
                    later_mask = ImageChops.lighter(later_mask,alpha)
                    continue
                if x+16 <= roi[0] or x >= roi[2] or y+16 <= roi[1] or y >= roi[3]:
                    continue
                if obj['missingAuto'] or obj['zx'] != 15 or obj['zy'] != 255:
                    uncertain.append([obj['column'], obj['zx'], obj['zy']])
                    continue
                image = self.image(obj, palette)
                composite.alpha_composite(image, (x, y))
                later_mask.paste(image.getchannel('A'), (x, y), image.getchannel('A'))
        sprite_occluded = count(ImageChops.multiply(mask, later_mask))
        fixed_mask = Image.new('L', visible.size)
        if roi:
            for x in range(roi[0]//8, (roi[2]+7)//8):
                for y in range((roi[1]+16)//8, (roi[3]+23)//8):
                    value = v[0x7000+x*32+y]
                    offset = (value >> 12)*16
                    fixed = self.fixed_tile(value & 0xfff, tuple(palette[offset:offset+16]))
                    composite.alpha_composite(fixed, (x*8, y*8-16))
                    alpha = fixed.getchannel('A')
                    later_mask.paste(alpha, (x*8, y*8-16), alpha)
                    fixed_mask.paste(alpha, (x*8, y*8-16), alpha)
        later_mask = ImageChops.multiply(mask, later_mask)
        own_mask = ImageChops.subtract(mask, later_mask)
        native = Image.open(native_path).convert('RGB')
        if native.size != (320, 224):
            raise ValueError('Unexpected native viewport '+str(native.size))
        own_errors = mismatch(visible, native, own_mask)
        occlusion_errors = mismatch(composite, native, later_mask)
        metadata.update({'entityNativeScreen': origin if registered else None,
                         'pivot': pivot if registered else None,
                         'offset': [-pivot[0], -pivot[1]] if registered else None,
                         'nativeDrawingBounds': native_bounds,
                         'registrationStatus': 'native-RAM-camera' if registered else 'unregistered-source-screen-drawing-only',
                         'canvas': list(cropped.size),
                         'alphaBounds': list(cropped.getbbox()),
                         'observationCanvasBounds': list(bounds),
                         'observationCanvasSize': list(canvas.size),
                         'visibleOwnPixels': count(own_mask),
                         'visibleOwnMismatchPixels': own_errors,
                         'totalOccludedPixels': count(later_mask),
                         'laterSpriteOccludedPixels': sprite_occluded,
                         'spriteOccludedPixels': sprite_occluded,
                         'fixedLayerOccludedPixels': count(ImageChops.multiply(mask, fixed_mask)),
                         'occlusionCompositeMismatchPixels': occlusion_errors,
                         'unresolvedOccluders': uncertain,
                         'nativeZoomOccluderColumns': sorted(zoomed_columns),
                         'noHUDPixelsExcluded': True,
                         'sourceDrawingPixelGatePassed': own_errors == 0 and occlusion_errors == 0
                         and bool(count(mask)) and not uncertain,
                         'pixelGatePassed': registered and own_errors == 0 and occlusion_errors == 0
                         and bool(count(mask)) and not uncertain})
        return cropped, pivot if registered else None, metadata


@lru_cache(maxsize=32)
def trace(folder):
    return {int(r['tick']): r for r in csv.DictReader((Path(folder)/'trace.csv').open())}


@lru_cache(maxsize=8)
def extras(folder):
    path = Path(folder)/'box-observations.jsonl'
    if not path.exists():
        return {}
    result = {}
    with path.open() as stream:
        for line in stream:
            item = json.loads(line)
            result[item['tick']] = item
    return result


def clip_receipt(character, collection, source, renderer, output):
    clip_id = collection+'--'+source['id']
    path = output/character/'clips'/f'{clip_id}.json'
    if path.exists():
        return json.loads(path.read_text())
    samples, holds, unregistered_holds, unique, parents = [], [], [], {}, {}
    visibility_holds=[]
    for index, element in enumerate(source['frames']):
        if element.get('ticks', 1) != 1:
            raise ValueError('Scene index must retain each refresh before body dedup')
        native_path = ROOT/element['image']
        folder = native_path.parent.parent
        tick = element['sourceTick']
        parent = rel(folder)
        if parent not in parents:
            parents[parent] = {'traceSHA256': sha((folder/'trace.csv').read_bytes())}
            for filename in ('capture.json', 'source.lua', 'capture-script.lua', 'move.json',
                             'moves.json', 'inputs.csv', 'raw-sha256.json', 'box-observations.jsonl'):
                if (folder/filename).exists():
                    parents[parent][filename] = sha((folder/filename).read_bytes())
        row = trace(str(folder)).get(tick)
        if row is None:
            raise ValueError(f'Missing trace tick {parent}/{tick}')
        sample = {'sourceTick': tick, 'nativeFrame': index,
                  'nativeSceneImage': element['image'], 'parentCapture': parent}
        try:
            image, pivot, metadata = renderer.render(row, native_path, extras(str(folder)).get(tick, {}))
            sample.update(metadata)
        except FileNotFoundError as error:
            image = None
            sample['problems'] = ['missing-captured-file: '+str(error.filename)]
        if sample.get('registeredVisibilityGatePassed'):
            hold={'nativeFrame':index,'sourceTick':tick,'ticks':1,'visible':False,
                  'image':None,'sourceDrawingID':None,'pivot':None,'offset':None}
            if visibility_holds and visibility_holds[-1]['nativeFrame']+visibility_holds[-1]['ticks']==index:
                visibility_holds[-1]['ticks']+=1
            else:visibility_holds.append(hold)
        if image is not None:
            sample['renderedVisibility']=True
            drawing = sha(struct.pack('<II', *image.size)+image.tobytes())
            destination = output/character/'drawings'/f'{drawing}.png'
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True)
                image.save(destination)
            sample.update({'image': str(destination.relative_to(output)), 'pivot': pivot,
                           'sourceDrawingID': drawing})
            unique.setdefault(drawing, {'image': sample['image'], 'sourceDrawingID': drawing,
                              'pngSHA256': sha(destination.read_bytes()),
                              'rgbaWithSizeSHA256': drawing, 'size': list(image.size),
                              'alphaBounds': list(image.getbbox()),
                              'alphaMargins': [0, 0, 0, 0],
                              'canvasKind': 'native-resolution cropped renderer observation'})
            hold = {k: sample[k] for k in ('image', 'pivot', 'sourceDrawingID', 'nativeFrame', 'sourceTick')}
            hold['ticks'] = 1
            hold['offset'] = [-pivot[0], -pivot[1]] if pivot is not None else None
            sequence = holds if pivot is not None else unregistered_holds
            if pivot is None:
                hold['nativeDrawingBounds'] = sample['nativeDrawingBounds']
            if sequence and all(sequence[-1][k] == hold[k] for k in ('image', 'pivot')) and sequence[-1]['nativeFrame']+sequence[-1]['ticks'] == index and (pivot is not None or sequence[-1]['nativeDrawingBounds'] == hold['nativeDrawingBounds']):
                sequence[-1]['ticks'] += 1
            else:
                sequence.append(hold)
        samples.append(sample)
    complete = len(samples) == sum(h['ticks'] for h in holds)
    start = samples[0].get('entityNativeScreen') if samples else None
    roots = [{'x': f['entityNativeScreen'][0]-start[0], 'y': f['entityNativeScreen'][1]-start[1]}
             if start and f.get('entityNativeScreen') else None for f in samples]
    passed = sum(bool(f.get('pixelGatePassed')) for f in samples)
    clip = {'id': clip_id, 'sourceClipID': source['id'], 'label': source['label'],
            'collection': collection, 'refreshHz': 59.185606060843,
            'sourceIndexDeclaredRefreshHz': source['refreshHz'],
            'refreshHzBasis': 'Same KOF98/MAME0.289 observed screen timebase; retain truncated old index value separately',
            'frames': holds, 'unregisteredFrames': unregistered_holds, 'visibilityFrames':visibility_holds,
            'roots': roots, 'samples': len(samples),
            'uniqueDrawings': len(unique), 'firstSourceTick': samples[0]['sourceTick'] if samples else None,
            'baselineOffset': unique[holds[0]['sourceDrawingID']]['size'][1]-holds[0]['pivot'][1] if holds else None,
            'validation': {'transparentSequenceComplete': complete, 'passedSamples': passed,
                           'observedSequenceComplete':len(samples)==sum(h['ticks']for h in holds+unregistered_holds+visibility_holds),
                           'registeredObservedSequenceGatePassed':bool(samples) and all(f.get('pixelGatePassed') or f.get('registeredVisibilityGatePassed')for f in samples),
                           'explicitNativeNotDrawnSamples':sum(h['ticks']for h in visibility_holds),
                           'samples': len(samples), 'pixelGatePassed': complete and passed == len(samples),
                           'sourceDrawingSequenceComplete': len(samples) == sum(h['ticks'] for h in holds+unregistered_holds),
                           'sourceDrawingPixelPassedSamples': sum(bool(f.get('sourceDrawingPixelGatePassed')) for f in samples),
                           'visualAnatomy': 'pending', 'moveIdentity': source.get('triggerStatus', 'not_verified'),
                           'boxes': 'pending-separate-raw-observation-audit',
                           'stateTransitions': 'pending', 'cancelWindows': 'pending', 'hitstop': 'pending',
                           'scope': 'P1 palettes16/17/18/19 single body candidate after source-calibrated/reviewed ownership; exact later-sprite and fixed-layer comparisons. Unregistered frames have no native RAM pivot/root; no all-moves acceptance'}}
    receipt = {'schema': 'kof98-source-reference/v1', 'sourceCharacter': character,
               'targetMapping': TARGETS[character], 'clip': clip, 'drawings': list(unique.values()),
               'perRefresh': samples, 'parentCaptures': parents,
               'originalIndexMetadata': {k: v for k, v in source.items() if k != 'frames'},
               'producerSHA256': sha(Path(__file__).read_bytes()), 'memoryWrites': False,
               'originalArtistCanvasRecovered': False, 'skeletalDataRecovered': False}
    parent_path = BASE/'kof98-source-reference-20261016-r3'/character/'clips'/f'{clip_id}.json'
    if not parent_path.exists():
        parent_path = PARENT_REVISION/character/'clips'/f'{clip_id}.json'
    if parent_path.exists():
        receipt['parentReferenceRevision'] = {'path': rel(parent_path), 'sha256': sha(parent_path.read_bytes())}
    receipt['bodyOwnershipProducerSHA256'] = sha((ROOT/'scripts/kof98-body-ownership-v5.py').read_bytes())
    write(path, receipt)
    if unique:
        drawings = list(unique.values())[:60]
        sheet = Image.new('RGB', (160*min(8, len(drawings)), 190*((len(drawings)+7)//8)), '#1d2938')
        draw = ImageDraw.Draw(sheet)
        for i, drawing in enumerate(drawings):
            image = Image.open(output/drawing['image']).convert('RGBA')
            image.thumbnail((150, 160), Image.Resampling.NEAREST)
            x, y = i % 8*160+(160-image.width)//2, i//8*190+8
            sheet.paste(image, (x, y), image)
            draw.text((i % 8*160+5, i//8*190+170), drawing['sourceDrawingID'][:12], fill='white')
        sheet.save(path.with_suffix('.jpg'))
    print(json.dumps({'character': character, 'clip': clip_id, 'samples': len(samples),
                      'unique': len(unique), 'pixelPassed': passed, 'complete': complete}), flush=True)
    return receipt


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--characters',nargs='+',choices=CHARACTERS,default=list(CHARACTERS))
    parser.add_argument('--output',type=Path,default=REVISION)
    parser.add_argument('--observation-root',type=Path,default=BASE/'kof98-gap-observations-20261016-r4-headless')
    parser.add_argument('--clip-pattern',default='.')
    parser.add_argument('--manual-registry',type=Path,
                        default=BASE/'kof98-source-reference-audit-20261016/r4-body-ownership-reviewed-v2.json',
                        help='Reviewed body-ownership registry. The v2 revision re-derives the trusted '
                             'calibration signatures from their own frozen VRAM; the v1 file is retained '
                             'unchanged as superseded evidence.')
    args=parser.parse_args()
    renderer=Renderer()
    ownership_path=ROOT/'scripts/kof98-body-ownership-v5.py'
    spec=importlib.util.spec_from_file_location('kof_body_ownership',ownership_path)
    owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
    identity_path=BASE/'kof98-multichar-20261016/identity-review.json'
    identity=json.loads(identity_path.read_text())
    args.output.mkdir(exist_ok=True,parents=True)
    for folder,file in [('producers',Path(__file__)),('ownership-producers',ownership_path)]:
        dest=args.output/folder/(sha(file.read_bytes())+'.py');dest.parent.mkdir(exist_ok=True)
        if not dest.exists():dest.write_bytes(file.read_bytes())
    provenance=json.loads((BASE/'kof98-source-reference-20261016-r3/provenance.json').read_text())
    provenance.update({'revision':'r4','producerSHA256':sha(Path(__file__).read_bytes()),
                       'producerSnapshot':'producers/'+sha(Path(__file__).read_bytes())+'.py',
                       'scope':'New independent same-input observations with simultaneous metadata; proven palette18 and palette19 flash repair. Original r2/r3 immutable.',
                       'baseRevision':rel(BASE/'kof98-source-reference-20261016-r3')})
    write(args.output/'provenance.json',provenance)
    camera_source=BASE/'kof98-source-reference-20261016-r3/camera-evidence.json'
    if not (args.output/'camera-evidence.json').exists():(args.output/'camera-evidence.json').write_bytes(camera_source.read_bytes())
    for character in args.characters:
        renderer.body_catalog=owner.BodyCatalog(character,PARENT_REVISION)
        manual_path=args.manual_registry
        manual=json.loads(manual_path.read_text())
        renderer.body_catalog.manual={f['sourceFrameImage']:f for f in manual['items'] if f['sourceCharacter']==character}
        renderer.body_catalog.registry_sha=sha(manual_path.read_bytes())
        for item in manual['items']:
            if item['sourceCharacter']!=character or not item.get('trustedCalibration'):continue
            native=ROOT/item['sourceFrameImage'];folder=native.parent.parent
            vraw=(folder/'vram'/(native.stem+'.bin')).read_bytes()
            if sha(vraw)!=item['vramSHA256'] or sha(native.read_bytes())!=item['snapshotSHA256']:
                raise ValueError('Trusted calibration original source hash changed')
            row=trace(str(folder))[item['sourceTick']];auto=int(row['auto'])if row.get('auto')else None
            group=[o for o in objects(struct.unpack('<34304H',vraw),auto)if o['group']==item['selectedGroup']]
            if owner.signature(group)!=item['selectedGroupSignature']:raise ValueError('Trusted calibration group signature changed')
            parent=PARENT_REVISION/item['calibrationReceipt']
            if sha(parent.read_bytes())!=item['calibrationReceiptSHA256']:raise ValueError('Trusted calibration receipt changed')
            signature=item['selectedGroupSignature'];anchor=tuple(item['selectedGroupOffset'])
            renderer.body_catalog.catalog[signature][anchor]={'receipt':item['calibrationReceipt'],
                'receiptSHA256':item['calibrationReceiptSHA256'],'sourceTick':item['sourceTick'],
                'expectedGroupOffset':list(anchor),'exactAnchorOnly':True,
                'nativeGroupReview':{'path':rel(args.output/'ownership-review'/(sha(manual_path.read_bytes())+'.json')),'sha256':sha(manual_path.read_bytes())}}

        for review in (manual_path,renderer.visibility_path):
            target=args.output/'ownership-review'/(sha(review.read_bytes())+'.json');target.parent.mkdir(exist_ok=True)
            if not target.exists():target.write_bytes(review.read_bytes())
        renderer.visibility_path=args.output/'ownership-review'/(renderer.visibility_sha+'.json')
        out=args.output/character;out.mkdir(exist_ok=True)
        indexes={}
        for collection in COLLECTIONS:
            source_index=BASE/f'kof98-{collection}-20261016/playback-index.json'
            raw=source_index.read_bytes();h=sha(raw)
            indexes[collection]={'path':rel(source_index),'sha256':h}
            frozen=args.output/'indexes'/f'{h}.json';frozen.parent.mkdir(exist_ok=True)
            if not frozen.exists():frozen.write_bytes(raw)
            for original in json.loads(raw)['characters'][character]['clips']:
                cid=collection+'--'+original['id']
                if not re.search(args.clip_pattern,cid):continue
                previous=BASE/'kof98-source-reference-20261016-r3'/character/'clips'/f'{cid}.json'
                if not previous.exists():previous=PARENT_REVISION/character/'clips'/f'{cid}.json'
                before=json.loads(previous.read_text()) if previous.exists() else None
                source=original
                if collection=='meter':
                    capture=args.observation_root/character/original['id']
                    if not (capture/'capture.json').exists():continue
                    receipt=json.loads((capture/'capture.json').read_text())
                    if not receipt.get('structuralCapturePassed'):continue
                    ticks=sorted(int(p.stem)for p in (capture/'vram').glob('*.bin'))
                    source={**original,'frames':[{'image':rel(capture/'snap'/f'{tick}.png'),'sourceTick':tick,'ticks':1}for tick in ticks],
                            'captureStatus':'new-independent-observation','triggerStatus':'pending-new-capture-QA',
                            'previousDeclaredTriggerStatus':original.get('triggerStatus'),
                            'newObservationReceipt':{'path':rel(capture/'capture.json'),'sha256':sha((capture/'capture.json').read_bytes())},
                            'newCaptureOfOriginalClipID':cid,'metadataTransplantedIntoOldCapture':False}
                elif before:
                    changed=(before['perRefresh'][0]['nativeSceneImage']!=original['frames'][0]['image'])
                    if before['clip']['validation']['pixelGatePassed'] and not changed:continue
                clip_receipt(character,collection,source,renderer,args.output)
        receipts=[json.loads(p.read_text())for p in sorted((out/'clips').glob('*.json'))]
        summary={'schema':'kof98-source-character/v1','sourceCharacter':character,'targetMapping':TARGETS[character],
                 'engine':'MAME0.289 / KOF98 NGM2420','identity':identity['characters'][character],
                 'identityReceipt':{'path':rel(identity_path),'sha256':sha(identity_path.read_bytes())},
                 'inputIndexes':indexes,'baseRevision':rel(BASE/'kof98-source-reference-20261016-r3'),
                 'containsOverridesOnly':True,'allMovesComplete':False,
                 'clips':[{'path':str((out/'clips'/f"{r['clip']['id']}.json").relative_to(args.output)),
                           **{k:r['clip'][k]for k in ('id','label','collection','samples','uniqueDrawings','validation')}}for r in receipts]}
        write(out/'manifest.json',summary)
        print('CHARACTER',character,'clips',len(receipts),flush=True)
if __name__=='__main__':main()
