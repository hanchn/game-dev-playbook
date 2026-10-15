#!/usr/bin/env python3
"""Read-only packaging audit. Requires Pillow; never judges anatomy or balance.

Use --grid 4x3 --four-source only for bundles known to use that contract.
Paths beginning /model-frame-assets/ and asset-root-relative paths are equivalent.
An explicit keyframeConversions entry {sourceIndex, mode: RGB|RGBA} permits a
decoded mode conversion, never a claim of byte identity. No implicit compositing.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import subprocess
from urllib.parse import unquote, urlsplit

from PIL import Image


def sha(data):
    return hashlib.sha256(data).hexdigest()


def resolve(ref, root, parent):
    ref = unquote(str(ref))
    if ref.startswith('/model-frame-assets/'):
        return root / ref[len('/model-frame-assets/'):]
    if urlsplit(ref).scheme:
        raise ValueError('remote references are not local evidence')
    path = pathlib.Path(ref)
    if path.is_absolute():
        return path.resolve()
    # Asset-relative paths identify a directory below root, including absent files.
    if ref.startswith('./') or ref.startswith('../') or not '/' in ref:
        return (parent / path).resolve()
    return (root / path).resolve()


def audit(manifest_path, asset_root, grid=None, four_source=False):
    path, root = pathlib.Path(manifest_path).resolve(), pathlib.Path(asset_root).resolve()
    result = {'manifest': str(path), 'findings': [], 'frames': [],
              'art': {'assessed': False, 'reason': 'Requires actual visual and playback review'},
              'geometry': {'assessed': False, 'reason': 'No bbox-based balance or deformation inference'}}

    def issue(code, detail, severity='error'):
        result['findings'].append({'category': 'packaging', 'severity': severity,
                                   'code': code, 'detail': detail})

    def local(ref):
        return resolve(ref, root, path.parent)

    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError) as exc:
        issue('manifest-unreadable', str(exc))
        return result
    result['art']['declaredVisualAccepted'] = data.get('visualAccepted')
    result['manifestSHA256'] = sha(path.read_bytes())
    clips = data.get('clips', [])
    if len(clips) > 1:
        issue('multiple-clips', 'Single-action auditor requires one clip; not arbitrarily selecting one')
        return result
    clip = clips[0] if clips else {}
    for field in ('frames', 'sheet', 'video', 'contactSheet', 'sourceSheet', 'zip'):
        if field in data and field in clip:
            a, b = data[field], clip[field]
            try:
                same = ([local(x) for x in a] == [local(x) for x in b]) if field == 'frames' else local(a) == local(b)
                if not same:
                    issue('binding-mismatch', field)
            except ValueError as exc:
                issue('invalid-reference', str(exc))
    refs = data.get('frames', clip.get('frames', []))
    expected = data.get('frameCount', clip.get('frameCount'))
    if expected is not None and len(refs) != expected:
        issue('frame-count', f'declared {expected}, referenced {len(refs)}')
    images, byte_hashes, pixel_hashes, visible_hashes = [], [], [], []
    for index, ref in enumerate(refs, 1):
        row = {'index': index, 'reference': ref}
        try:
            file = local(ref)
            row['path'] = str(file)
            with Image.open(file) as source:
                source.load()
                rgba = source.convert('RGBA')
                alpha = rgba.getchannel('A')
                row.update(size=list(source.size), mode=source.mode, alphaExtrema=list(alpha.getextrema()))
                border = list(alpha.crop((0, 0, rgba.width, 1)).tobytes()) + list(alpha.crop((0, rgba.height-1, rgba.width, rgba.height)).tobytes()) + list(alpha.crop((0, 0, 1, rgba.height)).tobytes()) + list(alpha.crop((rgba.width-1, 0, rgba.width, rgba.height)).tobytes())
                row['borderAlphaNonzeroSamples'] = sum(v > 0 for v in border)
                if row['alphaExtrema'][0] < 255 and any(border):
                    issue('alpha-touches-edge', f'frame {index}; numeric boundary observation, not anatomy judgment', 'warning')
                transparent_claim = data.get('transparent') is True or str(data.get('alpha', '')).lower().startswith('true rgba')
                if transparent_claim and row['alphaExtrema'][0] == 255:
                    issue('transparent-claim-opaque', f'frame {index}')
                canvas = data.get('canvas', clip.get('canvas'))
                if canvas and list(source.size) != list(canvas):
                    issue('dimensions', f'frame {index}: {source.size} != {canvas}')
                images.append(rgba.copy())
                byte_hashes.append(sha(file.read_bytes()))
                pixel_hashes.append(sha(str(rgba.size).encode() + rgba.tobytes()))
                visible = bytearray(rgba.tobytes())
                for i in range(0, len(visible), 4):
                    if visible[i+3] == 0:
                        visible[i:i+3] = b'\0\0\0'
                visible_hashes.append(sha(str(rgba.size).encode() + visible))
        except (OSError, ValueError) as exc:
            issue('frame-unreadable', f'{index}: {exc}')
            images.append(None)
        result['frames'].append(row)
    sizes = {tuple(row['size']) for row in result['frames'] if 'size' in row}
    if len(sizes) > 1:
        issue('inconsistent-dimensions', str(sorted(sizes)))
    result['distinct'] = {'fileBytes': len(set(byte_hashes)), 'decodedRGBA': len(set(pixel_hashes)), 'visibleRGBA': len(set(visible_hashes))}
    if 'distinctPNGCount' in data and data['distinctPNGCount'] != result['distinct']['fileBytes']:
        issue('distinct-count', f"declared {data['distinctPNGCount']}, bytes {result['distinct']['fileBytes']}")
    declared_grid = data.get('grid')
    if not grid and isinstance(declared_grid, dict) and all(k in declared_grid for k in ('columns', 'rows')):
        grid = (declared_grid['columns'], declared_grid['rows'])
    sheet_ref = data.get('sheet', clip.get('sheet'))
    if sheet_ref and grid and images and images[0]:
        try:
            with Image.open(local(sheet_ref)) as source:
                sheet = source.convert('RGBA')
                w, h = images[0].size
                if source.format != 'PNG' or sheet.size != (w*grid[0], h*grid[1]) or len(refs) != grid[0]*grid[1]:
                    issue('atlas-layout', f'PNG {grid}, frame size {w,h}, atlas {sheet.size}, count {len(refs)}')
                else:
                    for i, im in enumerate(images):
                        cell = sheet.crop(((i % grid[0])*w, (i//grid[0])*h, (i % grid[0]+1)*w, (i//grid[0]+1)*h))
                        if im is not None and cell.tobytes() != im.tobytes():
                            left, right = cell.tobytes(), im.tobytes()
                            changed = [j for j in range(0, len(left), 4) if left[j:j+4] != right[j:j+4]]
                            visible = sum(left[j+3] > 0 or right[j+3] > 0 for j in changed)
                            if visible:
                                issue('atlas-pixels', f'cell {i+1}: {len(changed)} differing pixels, {visible} visible; exact RGBA equality failed')
                            else:
                                issue('atlas-hidden-rgb', f'cell {i+1}: {len(changed)} alpha=0 hidden RGB differences; visible pixels identical; review engine edge sampling separately', 'warning')
        except (OSError, ValueError) as exc:
            issue('atlas-unreadable', str(exc))
    elif sheet_ref:
        issue('atlas-grid-not-declared', 'Pixel layout not asserted; supply explicit --grid for known schema', 'warning')
    positions = data.get('sourceKeyframePositions', [1, 4, 7, 10])
    positions_valid = (isinstance(positions, list) and len(positions) == 4
                       and all(type(n) is int and 1 <= n <= len(refs) for n in positions)
                       and all(a < b for a, b in zip(positions, positions[1:])))
    if ('sourceKeyframePositions' in data or four_source) and not positions_valid:
        issue('source-key-positions', 'sourceKeyframePositions must contain four strictly increasing integer indices in 1..frameCount')
    if four_source and positions_valid:
        result['sources'] = []
        source_refs = data.get('keyframes')
        for i, frame_index in enumerate(positions, 1):
            source_file = local(source_refs[i-1]) if isinstance(source_refs, list) and len(source_refs) == 4 else path.parent / 'keyframes' / f'{i:03d}.png'
            row = {'sourceIndex': i, 'frameIndex': frame_index, 'path': str(source_file)}
            try:
                raw = source_file.read_bytes()
                row['sha256'] = sha(raw)
                final_file = local(refs[frame_index-1])
                row['byteEqual'] = raw == final_file.read_bytes()
                if not row['byteEqual']:
                    conversion = next((x for x in data.get('keyframeConversions', []) if x.get('sourceIndex') == i), None)
                    with Image.open(source_file) as src, Image.open(final_file) as final:
                        row['decodedRGBAEqual'] = src.convert('RGBA').tobytes() == final.convert('RGBA').tobytes() and src.size == final.size
                        allowed = conversion and conversion.get('mode') in ('RGB', 'RGBA')
                        row['declaredConversionEqual'] = bool(allowed and src.size == final.size and src.convert(conversion['mode']).tobytes() == final.convert(conversion['mode']).tobytes())
                    if not row['decodedRGBAEqual'] and not row['declaredConversionEqual']:
                        issue('source-key-mismatch', f'source {i} != frame {frame_index}; no matching explicit conversion')
                    else:
                        issue('source-not-byte-identical', f'source {i}; pixels/conversion equal, SHA not equal', 'warning')
            except (OSError, ValueError, IndexError) as exc:
                issue('source-preview-unreadable', f'source {i}: {exc}')
            result['sources'].append(row)
    for field in ('sheet', 'contactSheet', 'sourceSheet', 'zip'):
        ref = data.get(field, clip.get(field))
        if ref:
            try:
                if not local(ref).is_file():
                    issue('linked-file-missing', f'{field}: {ref}')
            except ValueError as exc:
                issue('invalid-reference', str(exc))
    video = data.get('video', clip.get('video'))
    if video:
        try:
            probe = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,width,height', '-of', 'json', str(local(video))], capture_output=True, text=True, check=True)
            stream = json.loads(probe.stdout)['streams'][0]
            result['video'] = stream
            if int(stream['nb_read_frames']) != len(refs):
                issue('video-frame-count', f"{stream['nb_read_frames']} != {len(refs)}")
        except (OSError, ValueError, KeyError, IndexError, subprocess.CalledProcessError) as exc:
            issue('video-unreadable', str(exc))
    result['packagingPassed'] = not any(x['severity'] == 'error' for x in result['findings'])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', nargs='+', type=pathlib.Path)
    parser.add_argument('--asset-root', required=True, type=pathlib.Path)
    parser.add_argument('--grid', help='Explicit contractual grid, e.g. 4x3; never guessed')
    parser.add_argument('--four-source', action='store_true', help='Check four source keys at declared sourceKeyframePositions (legacy default 1/4/7/10)')
    parser.add_argument('--output', type=pathlib.Path)
    args = parser.parse_args()
    grid = tuple(map(int, args.grid.lower().split('x'))) if args.grid else None
    if grid and (len(grid) != 2 or min(grid) < 1):
        parser.error('--grid needs positive columns x rows')
    reports = [audit(p, args.asset_root, grid, args.four_source) for p in args.manifest]
    payload = json.dumps({'schemaVersion': 1, 'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'reports': reports}, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + '\n')
    else:
        print(payload)
    return 0 if all(r.get('packagingPassed') for r in reports) else 1


if __name__ == '__main__':
    raise SystemExit(main())
