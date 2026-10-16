#!/usr/bin/env python3
"""Ordinary-input official partial-special capture. No automatic move acceptance."""
import csv,argparse,hashlib,json,os,pathlib,runpy,subprocess,time
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'data/research/kof98-specials-20261016'
ROUTES={'kyo':[],'benimaru':['Right'],'joe':['Right']*5,'kim':['Down']*2,'king':['Right']*8+['Down'],'ryo':['Right']*6,'vice':['Down']*3+['Right']*2,'shingo':['Right']*5+['Down']*4,'iori':['Down']*3,'terry':['Right']*3,'mai':['Right']*7+['Down'],'athena':['Right']*3+['Down'],'leona':['Down'],'daimon':['Right']*2,'andy':['Right']*4,'robert':['Right']*7}
def lua(v):
 if isinstance(v,list):return '{'+','.join(lua(x) for x in v)+'}'
 if isinstance(v,dict):return '{'+','.join('['+lua(k)+']='+lua(x) for k,x in v.items())+'}'
 if isinstance(v,str):return json.dumps(v,ensure_ascii=False)
 if isinstance(v,bool):return str(v).lower()
 return str(v)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('characters',nargs='*',choices=list(ROUTES));a=ap.parse_args()
 source=ROOT/'data/research/kof98-move-research-20261016/executable-move-checklist.json';j=json.loads(source.read_text())
 for name in a.characters or ROUTES:
  out=BASE/name
  if (out/'capture.json').exists():print('retained',name,flush=True);continue
  for sub in ['selection','snap','cfg','nvram']:(out/sub).mkdir(parents=True,exist_ok=True)
  c=next(c for c in j['characters'] if c['character'].lower()==name);moves=[]
  for i,x in enumerate(c['specialVariants'],1):
   cond=x['conditions'];p=x['ordinaryInputProposal'];moves.append({'id':i,'name':x['name'],'conditions':cond,'super':any('super:' in y for y in cond),'close':any('close range' in y for y in cond),'air':any('airborne' in y for y in cond),'steps':p['steps'],'charge':any('charge move' in y for y in cond),'proposal':p})
  (out/'moves.json').write_text(json.dumps(moves,ensure_ascii=False,indent=2));(out/'moves.lua').write_text('return '+lua(moves))
  script=ROOT/'scripts/kof98-special-capture.lua';cmd=['mame','kof98','-rompath',str(ROOT/'assets/original-games/kof98'),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(script),'-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-seconds_to_run','120','-frameskip','0']
  start=time.time();script_sha=hashlib.sha256(script.read_bytes()).hexdigest();(out/'capture-script.lua').write_bytes(script.read_bytes())
  with (out/'runtime.log').open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,env={**os.environ,'KOF_SPECIAL_OUT':str(out),'KOF_ROUTE':','.join(ROUTES[name]),'KOF_BOX_OUT':str(out),'KOF_RECORDER':str(ROOT/'data/research/kof98-move-research-20261016/kof98-readonly-box-recorder.lua')},timeout=240)
  rows=list(csv.DictReader((out/'trace.csv').open()));bad=[i for i,x in enumerate(rows) if None in x or any(v is None for v in x.values())];frames=[int(x['screenFrame']) for x in rows if x.get('screenFrame')];continuity=bool(frames) and all(b==a+1 for a,b in zip(frames,frames[1:]));validation={'fieldErrors':bad,'continuousScreenFrames':continuity,'rows':len(rows),'pass':not bad and continuity};(out/'trace-validation.json').write_text(json.dumps(validation,indent=2))
  rec={'characterIntended':name,'route':ROUTES[name],'command':cmd,'returnCode':r.returncode,'wallSeconds':round(time.time()-start,2),'frames':len(list((out/'snap').glob('*.png'))),'scriptSHA256':script_sha,'checklistSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'ordinaryInputOnly':True,'memoryWrites':False,'runtimeExecutionVerified':False,'identityVisualVerified':False,'scope':'official partial subset; attempted inputs are not verified specials'}
  if not validation['pass']: raise RuntimeError('Trace integrity failed; retain batch, do not continue')
  (out/'capture.json').write_text(json.dumps(rec,indent=2));print(json.dumps(rec),flush=True)
if __name__=='__main__':main()
