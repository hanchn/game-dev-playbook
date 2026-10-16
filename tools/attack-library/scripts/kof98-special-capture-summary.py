#!/usr/bin/env python3
"""Audit only completed formal captures; attempt labels never imply successful moves."""
import csv,json,pathlib,hashlib
BASE=pathlib.Path(__file__).resolve().parents[1]/'data/research/kof98-specials-20261016'
characters={}
for folder in sorted(BASE.iterdir()):
 if not folder.is_dir() or not (folder/'capture.json').exists():continue
 rec=json.loads((folder/'capture.json').read_text());rows=list(csv.DictReader((folder/'trace.csv').open()));bad=[i for i,x in enumerate(rows) if None in x or any(v is None for v in x.values())];sf=[int(x['screenFrame']) for x in rows if x.get('screenFrame')];valid=not bad and bool(sf) and all(b==a+1 for a,b in zip(sf,sf[1:]));attempts=list(csv.DictReader((folder/'attempts.tsv').open(),delimiter='\t'));moves=json.loads((folder/'moves.json').read_text());review=json.loads((folder/'first-visual-review.json').read_text()) if (folder/'first-visual-review.json').exists() else {}
 details=[]
 for a in attempts:
  move=moves[int(a['id'])-1];details.append({'id':move['id'],'name':move['name'],'status':a['status'],'reason':a['reason'],'runtimeExecutionVerified':False,'conditions':move['conditions']})
 (folder/'attempt-status.json').write_text(json.dumps(details,ensure_ascii=False,indent=2))
 characters[folder.name]={'captureReady':valid and len(attempts)==len(moves),'traceValid':valid,'frames':len(list((folder/'snap').glob('*.png'))),'traceRows':len(rows),'attempted':sum(a['status']=='attempted' for a in attempts),'blocked':sum(a['status']=='blocked' for a in attempts),'identityVisualVerified':review.get('identityVisualVerified',False),'moveVariantsVerified':0,'refreshHz':59.185606,'refreshHzSource':'existing original kof98 runtime source; not unique-pose FPS'}
summary={'schema':'kof98-special-capture/v1','characters':characters,'captureReadyCharacters':sum(c['captureReady'] for c in characters.values()),'completeMovesCharacters':0,'scope':'16 characters/155 official partial variants; input attempts, not complete moves or successful execution','memoryWrites':False,'failedBatch':'failed-initial-no-screenframe','verifiedMoveVariants':0}
(BASE/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps({'characters':len(characters),'ready':summary['captureReadyCharacters']}))
