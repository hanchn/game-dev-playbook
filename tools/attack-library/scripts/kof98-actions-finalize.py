#!/usr/bin/env python3
"""Summarize actual sixteen-role captures; never infer all-move or visual acceptance."""
from pathlib import Path
import csv,json,hashlib
from PIL import Image,ImageDraw
B=Path(__file__).resolve().parents[1]/'data/research/kof98-actions-20261016'
NAMES=['kyo','benimaru','joe','kim','king','ryo','vice','shingo','iori','terry','mai','athena','leona','daimon','andy','robert']
REQUIRED=['locomotion','normals','air','reactions','victory','sweep-recovery','ground-recovery-ab-v2','guard-cancel-cd-charged-v5','guard-cancel-ab-back-charged-v5','guard-cancel-ab-forward-charged-v7']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
report={'scope':'Original MAME 0.289 ordinary-I/O capture windows; NOT all original moves complete.','allMovesComplete':False,'requiredBatches':REQUIRED,'characters':{},'remainingGaps':['Actual dizzy not established by light-A, heavy-C or repeated Yuri623C probes; do not treat KO as dizzy.','Guard crush, teammate assist and remaining conditional system derivatives not established by this branch.','Near/far normal variant identity and every individual attack transition still require move-level native review.','Turn crossover and directional/conditioned airborne work belongs to the separate root edge branch and is not counted here.']}
contacts={b:[]for b in REQUIRED if b.startswith('guard-cancel')}
for name in NAMES:
    role={'batches':{},'allMovesComplete':False,'identityVisualVerified':True,'identityEvidence':'identity-sixteen.jpg','sweepKnockdownRecoveryVisualVerified':True,'sweepEvidence':['sweep-sixteen.jpg','sweep-recovery-sixteen.jpg'],'missingBatches':[]}
    for batch in REQUIRED:
        actual=batch
        if name=='daimon':
            actual={'guard-cancel-cd-charged-v5':'guard-cancel-cd-charged-daimon-a-v6','guard-cancel-ab-back-charged-v5':'guard-cancel-ab-back-charged-daimon-a-v6','guard-cancel-ab-forward-charged-v7':'guard-cancel-ab-forward-charged-daimon-a-v8'}.get(batch,batch)
        folder=B/name/actual;capture=folder/'capture.json'
        if not capture.is_file():role['missingBatches'].append(batch);continue
        meta=json.loads(capture.read_text());rows=list(csv.DictReader((folder/'trace.csv').open()))
        item={'actualBatch':actual,'rawFrames':len(rows),'inputWindows':len(meta['clips']),'captureReady':meta['traceValid']and meta['contiguous'],'memoryWrites':False,'visualAccepted':False,'sourceSHA256':sha(folder/'source.lua'),'traceSHA256':sha(folder/'trace.csv'),'inputsSHA256':sha(folder/'inputs.csv'),'captureSHA256':sha(capture)}
        if batch.startswith('guard-cancel'):
            rr=[r for r in rows if r['phase'].startswith('guard-cancel')];first=int(rr[0]['stockRaw']);last=int(rr[-1]['stockRaw']);drop=next((r for r in rr if int(r['stockRaw'])<first),None)
            item.update({'stockBeforeAfter':[first,last],'stockConditionEstablished':first>=1,'actualStockConsumed':drop is not None,'triggerStatus':'not_verified'if first>=1 else'not_observed','failureReason':None if first>=1 else'No real ADV stock was earned by the selected natural-charge recipe. Ordinary roll/CD is not a guard cancel.'})
            tick=min(int(rr[-1]['tick']),int(drop['tick'])+22)if drop else int(rr[-1]['tick']);image=folder/'snap'/f'{tick}.png';item['nativeEvidence']={'image':str(image.relative_to(B)),'sourceTick':tick,'sha256':sha(image)};contacts[batch].append((name,image,first,last))
            review_path=B/name/'trigger-review.json'
            if review_path.exists():
                review=json.loads(review_path.read_text()).get('clips',{}).get(actual+'--'+rr[0]['phase'],{})
                if isinstance(review.get('evidence'),dict)and review['evidence'].get('sha256')==item['nativeEvidence']['sha256']:
                    item['triggerStatus']=review['triggerStatus'];item['nativeVisualReviewed']=True
        role['batches'][batch]=item
    role['requiredCapturesComplete']=not role['missingBatches'];report['characters'][name]=role
for batch,items in contacts.items():
    board=Image.new('RGB',(1280,992),'#eeeeee');draw=ImageDraw.Draw(board)
    for name,image,first,last in items:
        i=NAMES.index(name);x=i%4*320;y=i//4*248;board.paste(Image.open(image).convert('RGB'),(x,y+24));draw.text((x+3,y+4),f'{name} stock {first}->{last} t{image.stem}',fill='black')
    board.save(B/f'{batch}-sixteen.jpg')
report['allRequiredCapturesComplete']=all(c['requiredCapturesComplete']for c in report['characters'].values())
report['rawFrameCount']=sum(v['rawFrames']for c in report['characters'].values()for v in c['batches'].values())
(B/'final-sixteen-matrix.json').write_text(json.dumps(report,indent=2)+'\n')
print('complete',report['allRequiredCapturesComplete'],'frames',report['rawFrameCount'],'roles',len(report['characters']))
