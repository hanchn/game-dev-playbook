#!/usr/bin/env python3
"""Index actual native files only; unverified inputs never become verified moves."""
import pathlib,json,csv,hashlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/'data/research/kof98-author-20261016';plan=json.loads((BASE/'execution-plan.json').read_text());characters={};audit={}
for char in sorted({m['character'] for m in plan['candidates']}):
 clips={};blocked={};batches=[]
 for out in sorted((BASE/char).glob('*')):
  if not out.is_dir() or not (out/'capture.json').exists():continue
  cap=json.loads((out/'capture.json').read_text())
  if not cap['traceValid']:continue
  rows=list(csv.DictReader((out/'trace.csv').open()));moves={x['id']:x for x in json.loads((out/'moves.json').read_text())};attempts=list(csv.DictReader((out/'attempts.tsv').open(),delimiter='\t'));batches.append(out.name)
  for a in attempts:
   v=moves[a['id']];label=v['label']+' '+v['motion']+'+'+v['button'];status=a['status']
   if status=='blocked':
    if a['id'] not in clips:blocked[a['id']]={'id':a['id'],'label':label,'reason':a['reason'],'batch':str(out.relative_to(BASE))}
    continue
   frames=[]
   for row in rows:
    if row['id']!=a['id']:continue
    f=out/'snap'/f"{int(row['tick']):06d}.png"
    if f.exists():frames.append({'image':str(f.relative_to(ROOT)),'ticks':1,'sourceTick':int(row['tick']),'screenFrame':int(row['screenFrame'])})
   if not frames:raise RuntimeError('attempted without original screenshots: '+a['id'])
   # Prefer regular batch over probe duplicate while keeping all original evidence.
   priority=3 if out.name.startswith(('fresh-airtarget-v3','fresh-fast-v3')) else 2 if out.name.startswith(('fresh-','counter-near-')) else 1 if out.name.startswith('batch-') else 0
   if a['id'] not in clips or priority>clips[a['id']].get('capturePriority',-1):
    clips[a['id']]={'id':a['id'],'label':label,'refreshHz':59.185606,'nativeScene':True,'frames':frames,'captureStatus':'captured','triggerStatus':'not_verified','batch':str(out.relative_to(BASE)),'parentChain':v['chain'],'sourcePage':v['sourcePage'],'conditions':v['conditionRaw'],'scope':'ordinary command probe; parent/cancel/throw success unverified','capturePriority':priority}
   blocked.pop(a['id'],None)
 for x in plan['blockedSourceRows']:
  if x['character']==char:blocked['source-row-'+str(x['sourceRow'])]={'id':'source-row-'+str(x['sourceRow']),'label':x['label'],'reason':x['reason'],'delegated':x['reason'].startswith('super/desperation'),'targetCollection':'meter' if x['reason'].startswith('super/desperation') else None}
 for c in clips.values():
  verdict=BASE/'visual-review'/'clip-verdicts.json'
  if verdict.exists():
   entry=json.loads(verdict.read_text()).get(c['id'])
   if entry:c['triggerStatus']=entry['triggerStatus'];c['visualReview']=entry
 characters[char]={'clips':list(clips.values()),'blocked':list(blocked.values())};audit[char]={'validBatches':batches,'capturedVariants':len(clips),'blocked':len(blocked),'unattemptedCandidateIds':[m['id'] for m in plan['candidates'] if m['character']==char and m['id'] not in clips and m['id'] not in blocked],'fullMovesVerified':False}
(BASE/'playback-index.json.writing').write_text(json.dumps({'schema':'kof98-author-playback/v1','characters':characters,'completeMovesCharacters':0},ensure_ascii=False,indent=2));(BASE/'playback-index.json.writing').replace(BASE/'playback-index.json');(BASE/'summary.json.writing').write_text(json.dumps({'schema':'kof98-author-capture/v1','characters':audit,'candidateVariants':len(plan['candidates']),'sourceNamedOrNoteRows':231,'scope':'non-super author command probes; includes explicit alternatives/parent branches, no automatic name/trigger verification','completeMovesCharacters':0},ensure_ascii=False,indent=2));(BASE/'summary.json.writing').replace(BASE/'summary.json');print({k:len(v['clips']) for k,v in characters.items()})
