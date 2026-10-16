#!/usr/bin/env python3
from pathlib import Path
import os,json,csv,subprocess,time,hashlib,argparse,fcntl
R=Path(__file__).resolve().parents[1];B=R/'data/research/kof98-actions-20261016'
# Routes previously verified with original roster/HUD screenshots.
ROUTES = {'kyo':[],'benimaru':['Right'],'joe':['Right']*5,'kim':['Down']*2,'king':['Right']*8+['Down'],'ryo':['Right']*6,'vice':['Down']*3+['Right']*2,'shingo':['Right']*5+['Down']*4,'iori':['Down']*3,'terry':['Right']*3,'mai':['Right']*7+['Down'],'athena':['Right']*3+['Down'],'leona':['Down'],'daimon':['Right']*2,'andy':['Right']*4,'robert':['Right']*7}
a=argparse.ArgumentParser();a.add_argument('--characters',nargs='+',default=['joe']);a.add_argument('--batches',nargs='+',default=['locomotion']);args=a.parse_args();plan=json.loads((B/'batch-plan.json').read_text())['batches']
for name in args.characters:
 for batch in args.batches:
  out=B/name/batch
  out.parent.mkdir(parents=True,exist_ok=True)
  lockHandle=(out.parent/f'.{batch}.lock').open('a');fcntl.flock(lockHandle,fcntl.LOCK_EX)
  if (out/'capture.json').exists():
   lockHandle.close();continue
  for d in ['selection','snap','vram','palette','cfg','nvram']:(out/d).mkdir(parents=True,exist_ok=True)
  import shutil
  lua=out/'source.lua';shutil.copyfile(R/'scripts/kof98-actions-capture.lua',lua);command=['mame','kof98','-rompath',str(R/'assets/original-games/kof98'),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(lua),'-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-seconds_to_run','120','-frameskip','0'];start=time.time();(B/'active.json').write_text(json.dumps({'character':name,'batch':batch,'started':start,'pid':os.getpid()}))
  with(out/'runtime.log').open('w')as log:p=subprocess.run(command,env={**os.environ,'KOF_STUDY_OUT':str(out),'KOF_ROUTE':','.join(ROUTES[name]),'KOF_ACTION_BATCH':batch,'KOF_CHARACTER':name,'KOF_DUMP_GFX':'0'},stdout=log,stderr=subprocess.STDOUT,timeout=240)
  rows=list(csv.DictReader((out/'trace.csv').open()));valid=bool(rows)and all(x.get('tick','').isdigit()and x.get('gamePhase')is not None for x in rows);ph={}
  if valid:
   for x in rows:ph.setdefault(x['phase'],[]).append(x)
  clips=[]
  for phase,rs in ph.items():
   ys=[int(x['p1y'])for x in rs];clips.append({'id':phase,'samples':len(rs),'startTick':int(rs[0]['tick']),'minY':min(ys),'maxY':max(ys),'startGrounded':ys[0]==216,'startDistance':abs(int(rs[0]['p2x'])-int(rs[0]['p1x'])),'endDistance':abs(int(rs[-1]['p2x'])-int(rs[-1]['p1x'])),'p1LifeBeforeAfter':[int(rs[0]['p1life']),int(rs[-1]['p1life'])],'p2LifeBeforeAfter':[int(rs[0]['p2life']),int(rs[-1]['p2life'])],'triggerStatus':'not_observed'if ('jump'in phase or phase.startswith('air-'))and min(ys)>=216 else 'not_verified','nativeFrames':[{'image':str((out/'snap'/f"{x['tick']}.png").relative_to(R)),'ticks':1,'sourceTick':int(x['tick'])}for x in rs]})
  for clip in clips:
   cr=ph[clip['id']]
   if cr and 'stockRaw'in cr[0]:
    clip['stockRawBeforeAfter']=[int(cr[0]['stockRaw']),int(cr[-1]['stockRaw'])]
    clip['meterRawBeforeAfter']=[int(cr[0]['meterRaw']),int(cr[-1]['meterRaw'])]
    if clip['id'].startswith('guard-cancel') and int(cr[0]['stockRaw'])<1:
     clip['triggerStatus']='not_observed';clip['triggerFailureReason']='Guard cancel attempted without a verified real ADV stock; ordinary move is not a guard cancel.'
  result={'characterIntended':name,'batch':batch,'returnCode':p.returncode,'rawFrames':len(rows),'traceValid':valid,'contiguous':valid and all(int(rows[i+1]['tick'])==int(rows[i]['tick'])+1 for i in range(len(rows)-1)),'scriptSHA256':hashlib.sha256(lua.read_bytes()).hexdigest(),'route':ROUTES[name],'command':command,'seconds':time.time()-start,'memoryWrites':False,'visualAccepted':False,'allMovesComplete':False,'capturePolicy':{'victoryHoldTicks':int(os.environ.get('KOF_WIN_HOLD','300')),'reactionHoldTicks':120},'clips':clips}
  (out/'capture.json').write_text(json.dumps(result,indent=2)+'\n');print(name,batch,len(rows),valid,flush=True);subprocess.run(['python3',str(R/'scripts/kof98-actions-index.py')],check=True);lockHandle.close()
(B/'active.json').write_text(json.dumps({'status':'ended','at':time.time()}))
