#!/usr/bin/env python3
"""Inventory every KOF98 character and every observed action window.

This is a decomposition index, not a completion claim. It reads only frozen
capture indexes and move-research records and reports, per character and per
action category, how many original windows exist, how many frames they carry
and which acceptance gates are still open. It never re-labels an input attempt
as a verified move.
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/research'
COLLECTIONS = ('actions', 'edges', 'author', 'meter')
CHECKLIST = BASE / 'kof98-move-research-20261016/executable-move-checklist.json'
SPECIALS = BASE / 'kof98-specials-20261016'
OUT_JSON = ROOT / 'data/kof98-decomposition-inventory.json'
OUT_MD = ROOT.parent.parent / 'docs/kof98-full-decomposition-2026-10-16.md'

TARGETS = {
    'robert': 'horse', 'king': 'cow', 'vice': 'fishing_expert', 'benimaru': 'weasel',
    'kyo': 'naifrog', 'daimon': 'bull', 'joe': 'kangaroo', 'ryo': 'boar',
    'mai': 'fox', 'athena': 'cat', 'terry': 'dog', 'kim': 'toad',
    'andy': 'fish', 'shingo': 'rat', 'leona': 'tech_scarf_woman', 'iori': 'paul',
}
ORDER = ('robert', 'king', 'vice', 'benimaru', 'kyo', 'daimon', 'joe', 'ryo',
         'mai', 'athena', 'terry', 'kim', 'andy', 'shingo', 'leona', 'iori')

# Category semantics. A window counts as observed only when its frozen capture
# receipt exists; motion trigger, native timing and hit/box semantics stay open.
CATEGORY_SCOPE = {
    'locomotion': ('ground movement, turn, crouch transition, jump, roll, taunt',
                   'motion trigger per window, exact state durations, landing frames'),
    'normals': ('stood far/near and crouching A/B/C/D + CD', 'exact normal identity, range split, active frames'),
    'air': ('airborne A/B/C/D + CD', 'exact air normal identity and landing cancel'),
    'air-normals-by-jump-direction': ('air normals repeated per jump direction',
                                      'exact air normal identity and jump-direction-specific frames'),
    'reaction-variants': ('air/crouch hurt and air guard variants',
                          'hurt state enum, air guard truth, launch direction'),
    'turn-experiment': ('turn, cross-turn and back-turn experiments',
                        'turn legality, cross-up and facing transition'),
    'author-command-sweep': ('numbered original command sweep (motion + button + p-index)',
                             'real move trigger per command, move identity, native timing'),
    'desperation-and-max': ('DM (desperation) and MAX variants observed with charged meter',
                            'DM/MAX distinction, hit/whiff, guard and cancel conditions'),
    'meter-other': ('metered special observations', 'meter cost and cancel conditions'),
    'reactions': ('guard high/low, light/heavy receive, sweep knockdown rise, stun/KO attempt',
                  'guard direction truth, hurt state enum, stun and KO transitions'),
    'victory': ('round-win attempt and approach', 'real round-end condition'),
    'guard-cancel-*': ('guard cancel into CD / AB variants', 'actual guard-cancel window and meter cost'),
    'ground-recovery-ab-v2': ('sweep knockdown plus AB ground recovery', 'recovery input legality and invulnerability frames'),
    'stun-*': ('stun chain probes', 'stun threshold and escape'),
}
MISSING_BY_DESIGN = [
    'all named normals and their near/far range variants',
    'command normals (e.g. forward+button moves)',
    'all normal, command and air throws',
    'all special follow-up branches and rekkas',
    'specials and supers absent from the SNK subset',
    'MAX variants plus hit/whiff/guard/cancel conditions',
    'actual native timing and complete sprite frame coverage',
]


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text())


def clip_category(clip_id, collection):
    """Map a frozen clip to a semantic action family.

    Collection prefixes alone are not semantics: the edges collection mixes air
    normals, reaction variants and turn experiments, and the author collection is
    a raw numbered command sweep.
    """
    if '--' in clip_id:
        head, label = clip_id.split('--', 1)
    else:
        head, label = collection, clip_id
    if collection == 'author':
        return 'author-command-sweep', label
    if collection == 'edges':
        if '-air-' in label and re.search(r'-(A|B|C|D|CD)$', label):
            return 'air-normals-by-jump-direction', label
        if 'extra-reactions' in label:
            return 'reaction-variants', label
        if 'turn-super' in label:
            return 'turn-experiment', label
        return head, label
    if collection == 'meter':
        if '-dm-' in label or '-max-' in label:
            return 'desperation-and-max', label
        return 'meter-other', label
    return head, label


def collect_windows():
    windows = {}
    sources = {}
    for collection in COLLECTIONS:
        path = BASE / f'kof98-{collection}-20261016/playback-index.json'
        raw = path.read_bytes()
        sources[collection] = {'path': str(path.relative_to(ROOT.parent.parent)),
                              'sha256': sha_bytes(raw)}
        index = json.loads(raw)
        for name, info in index['characters'].items():
            for clip in info['clips']:
                head, label = clip_category(clip['id'], collection)
                frames = clip.get('frames', [])
                cid = f'{collection}--{clip["id"]}'
                windows.setdefault(name, []).append({
                    'id': cid,
                    'collection': collection,
                    'category': head,
                    'label': label,
                    'observedWindows': 1,
                    'observedFrames': sum(int(f.get('ticks', 1)) for f in frames),
                    'uniqueNativeFrames': len(frames),
                    'refreshHz': clip.get('refreshHz'),
                    'nativeScene': bool(clip.get('nativeScene')),
                    'reconstructedSprites': bool(clip.get('reconstructed')),
                })
    return windows, sources


def capture_receipts():
    out = {}
    for path in sorted((BASE / 'kof98-actions-20261016').glob('*/*/capture.json')):
        name, batch = path.parts[-3], path.parts[-2]
        receipt = read_json(path)
        out[f'{name}/{batch}'] = {
            'path': str(path.relative_to(ROOT.parent.parent)),
            'sha256': sha_bytes(path.read_bytes()),
            'rawFrames': receipt.get('rawFrames'),
            'traceValid': receipt.get('traceValid'),
            'contiguous': receipt.get('contiguous'),
            'visualAccepted': receipt.get('visualAccepted'),
            'memoryWrites': receipt.get('memoryWrites'),
        }
    return out


def move_records():
    checklist = read_json(CHECKLIST)
    rows = {}
    for entry in checklist['characters']:
        name = entry['character'].lower()
        rows[name] = {
            'officialName': entry.get('officialName'),
            'officialSpecialVariants': len(entry.get('specialVariants', [])),
            'basicAndReactionCandidates': len(entry.get('basicAndReactionCandidates', [])),
            'completeMoveList': bool(entry.get('completeMoveList')),
            'declaredMissing': entry.get('missing', []),
        }
    return checklist, rows


def specials_records():
    summary = read_json(SPECIALS / 'summary.json')
    rows = {}
    for name, info in summary['characters'].items():
        rows[name] = {
            'captureReady': info.get('captureReady'),
            'traceValid': info.get('traceValid'),
            'frames': info.get('frames'),
            'attempted': info.get('attempted'),
            'blocked': info.get('blocked'),
            'identityVisualVerified': info.get('identityVisualVerified'),
            'moveVariantsVerified': info.get('moveVariantsVerified'),
            'blockedReason': 'natural super meter not established; no RAM injection',
        }
    return summary, rows


def write_markdown(result):
    lines = [
        '# 拳皇98 全角色·全动作拆解清单（2026-10-16）',
        '',
        '本清单是**拆解索引**，不是完成度声明。窗口数只代表已冻结的原机观察片段；'
        '招式实际触发、原生时序、判定框/有效帧、取消窗口、伤害与命中停顿逐窗口仍未关闭。',
        '',
        f"- 角色：{result['characterCount']} 名（用户选定目标集，非全角色表 38 人）",
        f"- 原机观察窗口：{result['observedWindowTotal']} 段",
        f"- 引擎：{result['engine']}",
        f"- 来源 SHA 与逐角色明细：`{OUT_JSON.relative_to(ROOT.parent.parent)}`",
        '',
        '## 覆盖矩阵',
        '',
        '| 角色 | 目标映射 | 观察窗口 | 观察刷新 | 源参考待补窗口 | 官方部分招式变体 | 普通/反应候选 | 已尝试必杀 | 明确 blocked | 全招式清单 |',
        '|---|---|---|---|---|---|---|---|---|---|',
    ]
    for c in result['characters']:
        mr = c['moveResearch']
        sp = c['specials']
        lines.append(
            f"| {c['character']} | {c['targetMapping']} | {c['observedWindows']} | {c['observedFrames']} | "
            f"{c['sourceReferencePendingWindows']} | {mr.get('officialSpecialVariants', '')} | "
            f"{mr.get('basicAndReactionCandidates', '')} | {sp.get('attempted', '')} | "
            f"{sp.get('blocked', '')} | {'是' if mr.get('completeMoveList') else '否'} |")
    lines += [
        '',
        '`源参考待补窗口` 指 `kof98-source-reference-next-evidence.json` 中的 212 个基线缺口窗口；'
        '它与观察窗口不是同一计数，不可相加成招式数。',
        '',
        '## 动作族语义',
        '',
        '| 动作族 | 已观察内容 | 仍未关闭的验收门 |',
        '|---|---|---|',
    ]
    seen = {}
    for c in result['characters']:
        for cat in c['categories']:
            seen.setdefault(cat['category'], (cat['scope'], cat['closedGate']))
    for key in sorted(seen):
        scope, gate = seen[key]
        lines.append(f"| {key} | {scope} | {gate} |")
    lines += [
        '',
        '## 结构性缺项（官方子集与本批采集都没有覆盖）',
        '',
    ]
    lines += [f'- {item}' for item in result['remainingByDesign']]
    lines += [
        '',
        '## 当前硬阻塞',
        '',
        '- 36 个超必杀需要**自然气槽**才能观察；拒绝写 RAM 改气槽/血量，因此保留 `blocked`，'
        '不用改内存取得，也不拿准备动作冒充招式。',
        '- 源参考缺口流水线中断：8/16 角色已完成 observe→export→audit，剩余 8 角色（mai、athena、'
        'terry、kim、andy、shingo、leona、iori）待续；mai 的 trusted calibration 登记与导出器签名不一致，'
        '必须先按同一冻结 VRAM 重新推导签名/偏移，不能直接放行。',
        '- 全部 16 人 `moveVariantsVerified=0`、`completeOriginalCharacters=0`；'
        '必杀采集只证明输入已投递与原图存在，不证明招式真的触发。',
        '',
        '## 复现',
        '',
        '```sh',
        'python3 tools/attack-library/scripts/kof98-decompose-inventory.py',
        '```',
        '',
    ]
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text('\n'.join(lines))
    return OUT_MD


def main():
    windows, sources = collect_windows()
    receipts = capture_receipts()
    checklist, moves = move_records()
    special_summary, specials = specials_records()
    next_evidence = read_json(ROOT / 'data/kof98-source-reference-next-evidence.json')
    pending = {s['source']: len(s['pendingWindows']) for s in next_evidence['sources']}

    characters = []
    for name in ORDER:
        rows = sorted(windows.get(name, []), key=lambda r: (r['collection'], r['category'], r['label']))
        categories = {}
        for row in rows:
            key = row['category']
            bucket = categories.setdefault(key, {'windows': 0, 'observedFrames': 0,
                                                 'uniqueNativeFrames': 0, 'labels': [],
                                                 'collections': set()})
            bucket['windows'] += 1
            bucket['observedFrames'] += row['observedFrames']
            bucket['uniqueNativeFrames'] += row['uniqueNativeFrames']
            bucket['labels'].append(row['label'])
            bucket['collections'].add(row['collection'])
        for key, bucket in categories.items():
            bucket['collections'] = sorted(bucket['collections'])
            scope = CATEGORY_SCOPE.get(key)
            if scope is None and key.startswith('guard-cancel'):
                scope = CATEGORY_SCOPE['guard-cancel-*']
            if scope is None and key.startswith('stun'):
                scope = CATEGORY_SCOPE['stun-*']
            bucket['scope'] = scope[0] if scope else 'probe batch'
            bucket['closedGate'] = scope[1] if scope else 'batch-specific validation'
            bucket['motionTriggerVerified'] = False
            bucket['nativeTimingVerified'] = False
        characters.append({
            'character': name,
            'targetMapping': TARGETS.get(name),
            'officialName': moves.get(name, {}).get('officialName'),
            'observedWindows': len(rows),
            'observedFrames': sum(r['observedFrames'] for r in rows),
            'sourceReferencePendingWindows': pending.get(name),
            'artifactAuditPassed': (BASE / f'kof98-source-reference-20261016-r5/{name}/artifact-audit.json').exists(),
            'moveResearch': moves.get(name, {}),
            'specials': specials.get(name, {}),
            'categories': [{'category': key, **{k: v for k, v in val.items()}}
                           for key, val in sorted(categories.items())],
        })

    result = {
        'schema': 'kof98-full-decomposition/v1',
        'scope': ('All 16 selected original KOF98 characters and every frozen action window. '
                  'Window counts are observations, never completed moves or recovered skeletons. '
                  'Motion trigger, native timing, hitboxes, cancels and damage stay open per window.'),
        'engine': 'MAME 0.289 / KOF98 NGM2420, 59.185606060843Hz original refresh',
        'characterCount': len(characters),
        'observedWindowTotal': sum(c['observedWindows'] for c in characters),
        'collectionSources': sources,
        'actionsCaptureReceipts': receipts,
        'specialsScope': {'schema': special_summary.get('schema'),
                          'captureReadyCharacters': special_summary.get('captureReadyCharacters'),
                          'completeMovesCharacters': special_summary.get('completeMovesCharacters'),
                          'verifiedMoveVariants': special_summary.get('verifiedMoveVariants'),
                          'scope': special_summary.get('scope'),
                          'memoryWrites': special_summary.get('memoryWrites')},
        'remainingByDesign': MISSING_BY_DESIGN,
        'completeOriginalCharacters': 0,
        'allMovesComplete': False,
        'targetArtworkComplete': False,
        'characters': characters,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    md = write_markdown(result)
    print(json.dumps({'output': str(OUT_JSON), 'markdown': str(md), 'characters': len(characters),
                      'windows': result['observedWindowTotal']}, ensure_ascii=False))
    return result


if __name__ == '__main__':
    main()
