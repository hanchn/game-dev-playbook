#!/usr/bin/env python3
import argparse,csv,json,hashlib,os,pathlib,subprocess,time,runpy
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/'data/research/kof98-author-20261016'
ROUTES={'kyo':[],'benimaru':['Right'],'joe':['Right']*5,'kim':['Down']*2,'king':['Right']*8+['Down'],'ryo':['Right']*6,'vice':['Down']*3+['Right']*2,'shingo':['Right']*5+['Down']*4,'iori':['Down']*3,'terry':['Right']*3,'mai':['Right']*7+['Down'],'athena':['Right']*3+['Down'],'leona':['Down'],'daimon':['Right']*2,'andy':['Right']*4,'robert':['Right']*7}
def lua(v):
 if isinstance(v,list):return '{'+','.join(lua(x) for x in v)+'}'
 if isinstance(v,dict):return '{'+','.join('['+lua(k)+']='+lua(x) for k,x in v.items() if x is not None)+'}'
 if isinstance(v,str):return json.dumps(v,ensure_ascii=False)
 if isinstance(v,bool):return str(v).lower()
 return str(v)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('characters',nargs='*',choices=list(ROUTES));ap.add_argument('--first-probe',action='store_true');ap.add_argument('--source-rows');ap.add_argument('--ids');ap.add_argument('--air-throws',action='store_true');ap.add_argument('--observe-frames',type=int,default=120);ap.add_argument('--batch-size',type=int,default=4);ap.add_argument('--tag',default='batch');a=ap.parse_args();plan=json.loads((BASE/'execution-plan.json').read_text())
 for name in a.characters or ROUTES:
  moves=[x for x in plan['candidates'] if x['character']==name]
  if a.air_throws:moves=[x for x in moves if x['airThrow']]
  if a.ids:moves=[x for x in moves if x['id'] in a.ids.split(',')]
  if a.source_rows:moves=[x for x in moves if x['sourceRow'] in [int(z) for z in a.source_rows.split(',')]]
  if a.first_probe:moves=[x for x in moves if (name=='kyo' and x['sourceRow'] in [5,6,7,8]) or (name=='joe' and x['sourceRow']==4)]
  for bi in range(0,len(moves),a.batch_size):
   chunk=moves[bi:bi+a.batch_size];out=BASE/name/f'{"probe" if a.first_probe else a.tag}-{bi//a.batch_size:03d}'
   if (out/'capture.json').exists():continue
   for sub in ['snap','selection','vram','palette','cfg','nvram']:(out/sub).mkdir(parents=True,exist_ok=True)
   script=ROOT/'scripts/kof98-author-capture.lua';(out/'capture-script.lua').write_bytes(script.read_bytes());(out/'moves.lua').write_text('return '+lua(chunk));(out/'moves.json').write_text(json.dumps(chunk,ensure_ascii=False,indent=2))
   cmd=['mame','kof98','-rompath',str(ROOT/'assets/original-games/kof98'),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(out/'capture-script.lua'),'-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-seconds_to_run','110','-frameskip','0']
   start=time.time();(BASE/'active.json').write_text(json.dumps({'character':name,'batch':out.name,'pid':os.getpid(),'start':start}))
   with (out/'runtime.log').open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,env={**os.environ,'KOF_OBSERVE_FRAMES':str(a.observe_frames),'KOF_AUTHOR_OUT':str(out),'KOF_ROUTE':','.join(ROUTES[name]),'KOF_BOX_OUT':str(out),'KOF_RECORDER':str(ROOT/'data/research/kof98-move-research-20261016/kof98-readonly-box-recorder.lua')},timeout=240)
   rows=list(csv.DictReader((out/'trace.csv').open()));bad=[i for i,x in enumerate(rows) if None in x or any(v is None for v in x.values())];frames=[int(x['screenFrame']) for x in rows if x.get('screenFrame')];valid=bool(frames) and not bad and all(y==x+1 for x,y in zip(frames,frames[1:]));attempts=list(csv.DictReader((out/'attempts.tsv').open(),delimiter='\t'));valid=valid and len(attempts)==len(chunk)
   rec={'character':name,'batch':out.name,'traceValid':valid,'fieldErrors':bad,'rows':len(rows),'frames':len(list((out/'snap').glob('*.png'))),'returnCode':r.returncode,'wallSeconds':time.time()-start,'scriptSHA256':sha(out/'capture-script.lua'),'ordinaryInputOnly':True,'memoryWrites':False,'attempts':attempts,'nativeMovesVerified':False,'command':cmd};(out/'validation.json').write_text(json.dumps(rec,indent=2))
   if not valid:raise RuntimeError(f'failed continuous frame gate {out}; retained, stop batch')
   (out/'capture.json').write_text(json.dumps(rec,indent=2));print(name,out.name,rec['frames'],[x['status'] for x in attempts],flush=True);subprocess.run(['python3',str(ROOT/'scripts/kof98-author-index.py')],check=True,stdout=subprocess.DEVNULL)
if __name__=='__main__':main()
