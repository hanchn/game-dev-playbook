#!/usr/bin/env python3
import argparse,pathlib,json,os,subprocess,hashlib,csv
R=pathlib.Path(__file__).resolve().parents[1];B=R/'data/research/kof98-meter-20261016';ROUTES={'kyo':[],'benimaru':['Right'],'joe':['Right']*5,'kim':['Down']*2,'king':['Right']*8+['Down'],'ryo':['Right']*6,'vice':['Down']*3+['Right']*2,'shingo':['Right']*5+['Down']*4,'iori':['Down']*3,'terry':['Right']*3,'mai':['Right']*7+['Down'],'athena':['Right']*3+['Down'],'leona':['Down'],'daimon':['Right']*2,'andy':['Right']*4,'robert':['Right']*7}
def lua(v):
 if isinstance(v,dict):return '{'+','.join('['+lua(k)+']='+lua(x) for k,x in v.items())+'}'
 if isinstance(v,list):return '{'+','.join(lua(x) for x in v)+'}'
 if isinstance(v,str):return json.dumps(v,ensure_ascii=False)
 if isinstance(v,bool):return str(v).lower()
 return str(v)
def main():
 a=argparse.ArgumentParser();a.add_argument('characters',nargs='*');a.add_argument('--air-close',action='store_true');a.add_argument('--followup',choices=['crystalshot','cancel','delay','arashi-chain']);a.add_argument('--author-extra',action='store_true');a.add_argument('--dry-run',action='store_true');a.add_argument('--condition',choices=['dm','max','both'],default='dm');a.add_argument('--orochinagi-pilot',action='store_true');a.add_argument('--version',default='v3');a.add_argument('--limit',type=int,default=0);args=a.parse_args();check=R/'data/research/kof98-move-research-20261016/executable-move-checklist.json';src=json.loads(check.read_text())
 for name in args.characters or ['kyo']:
  c=next(x for x in src['characters'] if x['character'].lower()==name);supers=[(i,m) for i,m in enumerate(c['specialVariants'],1) if any('super:' in x for x in m['conditions'])]
  if args.author_extra:
   official={(m['directionNotation'],m['adaptedNeoGeoButton'],any('airborne' in x for x in m['conditions'])) for _,m in supers}
   check=B/'author-dm-queue.json';author=json.loads(check.read_text());supers=[]
   for m in author['candidates']:
    if m['character']!=name or (m['motion'],m['button'],m['air']) in official:continue
    adapted={'name':m['name'],'conditions':['super: real meter']+(['close range'] if m['close'] else [])+(['airborne'] if m['air'] else []),'directionNotation':m['motion'],'adaptedNeoGeoButton':m['button'],'authorEvidence':m}
    supers.append((m['id'],adapted))
  if args.air_close:supers=[(i,m) for i,m in supers if any('airborne' in x for x in m['conditions'])]
  if args.followup:
   desired={'crystalshot':'6321463214','cancel':'6321463214','arashi-chain':'4123641236','delay':'2141236'}[args.followup]
   supers=[(i,m) for i,m in supers if m['directionNotation']==desired]
  if args.limit:supers=supers[:args.limit]
  if args.dry_run:print(name,[(i,m['name'],m['directionNotation'],m['adaptedNeoGeoButton']) for i,m in supers]);continue
  for i,m in supers:
   for mode in (['dm','max'] if args.condition=='both' else [args.condition]):
    out=B/name/((f'official-{i:02d}' if isinstance(i,int) else i)+f'-{mode}-{args.version}')
    if (out/'capture.json').exists():continue
    for p in ['snap','selection','vram','palette','cfg','nvram']:(out/p).mkdir(parents=True,exist_ok=True)
    cfg={'route':ROUTES[name],'directions':list(m['directionNotation']),'button':m['adaptedNeoGeoButton'],'max':mode=='max','close':not any('airborne' in x for x in m['conditions']),'air':any('airborne' in x for x in m['conditions'])};
    if args.air_close:cfg['close']=True
    if args.followup:cfg['followup']=args.followup;m={**m,'name':m['name']+' → '+args.followup}
    motion=cfg['directions']
    if len(motion)%2==0 and motion[:len(motion)//2]==motion[len(motion)//2:]:
     cfg['directions']=motion[:len(motion)//2]+['5']+motion[len(motion)//2:]
    if args.orochinagi_pilot:
     cfg['directions']=list('2141236');m={**m,'name':'Ura108 Orochinagi manual probe (author guide)'}
    (out/'move.lua').write_text('return '+lua(cfg));(out/'move.json').write_text(json.dumps({'configuration':cfg,'officialSource':m},ensure_ascii=False,indent=2));script=R/'scripts/kof98-meter-capture.lua';(out/'source.lua').write_bytes(script.read_bytes());cmd=['mame','kof98','-rompath',str(R/'assets/original-games/kof98'),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(out/'source.lua'),'-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-seconds_to_run','150','-frameskip','0']
    with (out/'runtime.log').open('w') as f:r=subprocess.run(cmd,env={**os.environ,'KOF_METER_OUT':str(out)},stdout=f,stderr=subprocess.STDOUT,timeout=240)
    tr=list(csv.DictReader((out/'trace.csv').open()));fs=[int(x['screenFrame']) for x in tr];valid=bool(fs) and all(y==x+1 for x,y in zip(fs,fs[1:])) and all(None not in x and None not in x.values() for x in tr)
    rec={'character':name,'condition':mode,'officialMoveIndex':i,'label':m['name'],'engine':'MAME0.289','command':cmd,'returnCode':r.returncode,'scriptSHA256':hashlib.sha256((out/'source.lua').read_bytes()).hexdigest(),'sourceChecklistSHA256':hashlib.sha256(check.read_bytes()).hexdigest(),'traceRows':len(tr),'continuousScreenFrames':valid,'memoryWrites':False,'ordinaryInputOnly':True,'triggerStatus':'not_verified','identityStatus':'not_verified','conditionResult':(out/'condition-result.txt').read_text() if (out/'condition-result.txt').exists() else 'missing end result'};(out/'capture.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2));print(json.dumps(rec,ensure_ascii=False),flush=True)
    if not valid or r.returncode:raise RuntimeError('capture failed; preserve batch')
if __name__=='__main__':main()
