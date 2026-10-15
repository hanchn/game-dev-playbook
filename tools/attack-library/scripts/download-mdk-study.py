"""Archive explicitly linked modern MAME study sets without overwriting old source packs."""
import pathlib,concurrent.futures,subprocess,zipfile,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'assets/original-games/mame-0289';OUT.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'data/research/mame-0289-packages.json'
PREVIOUS={r['id']:r for r in json.loads(REPORT.read_text())} if REPORT.exists() else {}
SOURCES={'sf2ce':'https://mdk.cab/game/sf2ce','ssf2t':'https://mdk.cab/game/ssf2t','qsound_hle':'https://mdk.cab/game/ssf2t'}
def acquire(game):
 url=f'https://mdk.cab/download/split/{game}.zip';p=OUT/(game+'.zip')
 if not p.exists():subprocess.run(['curl','-fLsS','--connect-timeout','10','--max-time','90',url,'-o',str(p)],check=True)
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None,'ZIP CRC error'
  members=[{'name':i.filename,'bytes':i.file_size,'crc32':f'{i.CRC:08x}'} for i in z.infolist()]
 return {'id':game,'sourcePage':SOURCES[game],'observedDownloadURL':url,'file':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'members':members,'runtimeStatus':'not tested'}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(acquire,SOURCES))
for r in results:
 old=PREVIOUS.get(r['id'],{})
 if old.get('sha256')==r['sha256']:
  for key in ('runtimeStatus','mameVerification'):
   if key in old:r[key]=old[key]
REPORT.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:print(r['id'],r['bytes'],len(r['members']),'ZIP members validated')
