#!/usr/bin/env python3
"""Resumable ordinary-input original KOF98 capture; source identity needs screenshot QA."""
import pathlib,subprocess,os,json,hashlib,argparse,time
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/'data/research/kof98-multichar-20261016'
ROUTES={'kyo':[],'benimaru':['Right'],'joe':['Right']*5,'kim':['Down']*2,'king':['Right']*8+['Down'],'ryo':['Right']*6,'vice':['Down']*3+['Right']*2,'shingo':['Right']*5+['Down']*4,'iori':['Down']*3,'terry':['Right']*3,'mai':['Right']*7+['Down'],'athena':['Right']*3+['Down'],'leona':['Down'],'daimon':['Right']*2,'andy':['Right']*4,'robert':['Right']*7}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
ap=argparse.ArgumentParser();ap.add_argument('characters',nargs='*',choices=list(ROUTES));a=ap.parse_args()
BASE.mkdir(parents=True,exist_ok=True)
for name in a.characters or ROUTES:
 out=BASE/name
 if (out/'capture.json').exists():print('retained',name,flush=True);continue
 for sub in ('selection','snap','palette','vram','cfg','nvram'):(out/sub).mkdir(parents=True,exist_ok=True)
 script=ROOT/'scripts/kof98-multichar-capture.lua';command=['mame','kof98','-rompath',str(ROOT/'assets/original-games/kof98'),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(script),'-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-seconds_to_run','100','-frameskip','0']
 start=time.time();(BASE/'active.json').write_text(json.dumps({'character':name,'started':start,'route':ROUTES[name],'command':command},indent=2))
 with (out/'runtime.log').open('w') as f:p=subprocess.run(command,stdout=f,stderr=subprocess.STDOUT,env={**os.environ,'KOF_STUDY_OUT':str(out),'KOF_ROUTE':','.join(ROUTES[name]),'KOF_DUMP_GFX':'1' if name=='kyo' else '0'},timeout=200)
 record={'characterIntended':name,'route':ROUTES[name],'engine':'MAME0.289','scriptSHA256':sha(script),'command':command,'wallSeconds':round(time.time()-start,2),'returnCode':p.returncode,'capturedFrames':len(list((out/'snap').glob('*.png'))),'selectionScreens':len(list((out/'selection').glob('*.png'))),'memoryWrites':False,'ordinaryIO':True,'identityVisualVerified':False,'allMovesComplete':False,'specialLabels':'input attempts until visual and timing validation','sourceROMs':[{'file':x.name,'bytes':x.stat().st_size,'sha256':sha(x)} for x in sorted((ROOT/'assets/original-games/kof98').glob('*.zip')) if x.name in ('kof98.zip','neogeo.zip')]}
 (out/'capture.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record),flush=True)
(BASE/'active.json').write_text(json.dumps({'status':'batch-ended','at':time.time()}))
