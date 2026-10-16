#!/usr/bin/env python3
from pathlib import Path
import json,csv,os,fcntl
R=Path(__file__).resolve().parents[1];B=R/'data/research/kof98-actions-20261016';result={'characters':{},'scope':'Actual original engine input windows. Trigger acceptance is separate and full move coverage is incomplete.'}
index_lock=(B/'.playback-index.lock').open('a');fcntl.flock(index_lock,fcntl.LOCK_EX)
for p in sorted(B.glob('*/*/capture.json')):
 
 if 'pilot-' in p.parent.name:continue
 try:
  j=json.loads(p.read_text());rs=list(csv.DictReader((p.parent/'trace.csv').open()))
 except (FileNotFoundError,json.JSONDecodeError):
  continue # A separately preserved repair may move while this snapshot is read.
 name=j['characterIntended'];batch=j['batch'];entry=result['characters'].setdefault(name,{'clips':[],'blocked':[]});ph={}
 for x in rs:ph.setdefault(x['phase'],[]).append(x)
 review_path=p.parent.parent/'trigger-review.json'
 review=json.loads(review_path.read_text()).get('clips',{})if review_path.is_file()else{}
 for c in j['clips']:
  phase=c['id'];rr=ph.get(phase,[]);trigger=next((x for x in rr if int(x['phaseTick'])==55),rr[0]if rr else None);review_item=review.get(batch+'--'+phase,{});status=review_item.get('triggerStatus',c['triggerStatus']);e={'id':batch+'--'+phase,'label':phase,'refreshHz':59.185606060843,'nativeScene':True,'frames':[{'image':str((p.parent/'snap'/f"{x['tick']}.png").relative_to(R)),'ticks':1,'sourceTick':int(x['tick'])}for x in rr],'captureStatus':'captured','triggerStatus':status,'batch':batch,'conditions':{k:v for k,v in c.items()if k not in ['nativeFrames','id','triggerStatus']},'allMovesComplete':False}
  if review_item:e['triggerReview']=review_item
  if trigger:e['conditions']['distanceAt55orEntry']=abs(int(trigger['p2x'])-int(trigger['p1x']))
  entry['clips'].append(e)
  if status=='not_observed':entry['blocked'].append({'id':e['id'],'label':phase,'reason':review_item.get('reason',c.get('triggerFailureReason','No native vertical displacement occurred during intended airborne window; input alone is not jump acceptance.'))})
dest=B/'playback-index.json';temp=B/f'playback-index.{os.getpid()}.tmp.json';temp.write_text(json.dumps(result,indent=2)+'\n');temp.replace(dest);print({k:len(v['clips'])for k,v in result['characters'].items()})
