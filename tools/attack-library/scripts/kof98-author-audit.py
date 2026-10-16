#!/usr/bin/env python3
"""Verify native evidence correspondence and hash unchanged capture bytes."""
import json,csv,pathlib,hashlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/'data/research/kof98-author-20261016';report=[]
for out in sorted(BASE.glob('*/*')):
 if not out.is_dir() or not (out/'capture.json').exists():continue
 cap=json.loads((out/'capture.json').read_text());rows=list(csv.DictReader((out/'trace.csv').open()));bad=[i for i,r in enumerate(rows) if None in r or any(v is None for v in r.values())];sf=[int(r['screenFrame']) for r in rows];ticks=[int(r['tick']) for r in rows];valid=bool(rows) and not bad and all(b==a+1 for a,b in zip(sf,sf[1:])) and all(b==a+1 for a,b in zip(ticks,ticks[1:]));missing=[];hashes=[];phase=collections.Counter(r['gamePhase'] for r in rows)
 for f in sorted((out/'snap').glob('*.png')):
  prefix=f.stem
  for p in [f,out/'vram'/f'{prefix}.bin',out/'palette'/f'{prefix}.bin']:
   if not p.exists():missing.append(str(p.relative_to(out)));continue
   if p.parent.name=='vram' and p.stat().st_size!=0x8600*2:missing.append('invalid-vram-size:'+p.name)
   if p.parent.name=='palette' and p.stat().st_size!=4096*4:missing.append('invalid-palette-size:'+p.name)
   hashes.append({'path':str(p.relative_to(out)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 for name in ['capture-script.lua','moves.json','moves.lua','inputs.csv','trace.csv','attempts.tsv','box-observations.jsonl']:
  p=out/name;hashes.append({'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 (out/'raw-sha256.json').write_text(json.dumps(hashes,indent=2))
 report.append({'batch':str(out.relative_to(BASE)),'continuousFrames':valid,'missingOrInvalidRaw':missing,'traceBattlePhases':dict(phase),'scriptHashMatches':hashes[-7]['sha256']==cap['scriptSHA256'],'rawFrames':len(list((out/'snap').glob('*.png'))),'rawBytes':sum(x['bytes'] for x in hashes),'pass':valid and not missing and set(phase)=={'2'}})
(BASE/'evidence-audit.json').write_text(json.dumps({'batches':report,'allPass':bool(report) and all(x['pass'] for x in report),'scope':'capture integrity only; not named-move or trigger verification'},indent=2));print(len(report),'batches',sum(x['rawFrames'] for x in report),'frames','allPass',all(x['pass'] for x in report))
