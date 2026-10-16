#!/usr/bin/env python3
"""Mirror only completed on-disk captures. Optional bounded watcher follows one live job."""
from pathlib import Path
import json,time,argparse,os
B=Path(__file__).resolve().parents[1]/'data/research/kof98-multichar-20261016'
IDS='kyo benimaru joe kim king ryo vice shingo iori terry mai athena leona daimon andy robert'.split()
a=argparse.ArgumentParser();a.add_argument('--follow-pid',type=int);args=a.parse_args()
def update():
 active=json.loads((B/'active.json').read_text()).get('character');chars={}
 for id in IDS:
  p=B/id/'capture.json'
  if not p.exists():continue
  c=json.loads(p.read_text());chars[id]={'rawCaptureReady':c.get('returnCode')==0 and c.get('capturedFrames',0)>0,'frames':c.get('capturedFrames',0),'identityVisualVerified':False,'evidence':f'data/research/kof98-multichar-20261016/{id}/capture.json','allMovesComplete':False}
 result={'active':active,'characters':chars,'scope':'raw capture only; identity/sprite/native-pixel/trigger/full-move reviews separate'}
 dest=B/'progress.json';text=json.dumps(result,indent=2)+'\n'
 if not dest.exists() or dest.read_text()!=text:dest.write_text(text)
update()
if args.follow_pid:
 for _ in range(400):
  try:os.kill(args.follow_pid,0)
  except ProcessLookupError:update();break
  time.sleep(5);update()
