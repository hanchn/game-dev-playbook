"""Acquire publicly linked study packages; never substitute them for decoded frame assets."""
import pathlib,re,urllib.parse,json,zipfile,hashlib,concurrent.futures,shutil,subprocess,html,argparse
def fetch(url):return subprocess.check_output(['curl','-fLsS','--connect-timeout','10','--max-time','40',url]).decode()
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT.parents[1]/'output/attack-library/originals';OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--system',choices=['neogeo','cps1','cps2'],default='neogeo')
parser.add_argument('--games',nargs='+',default=['kof97','kof2002','mslug'])
args=parser.parse_args()
if any(not re.fullmatch(r'[a-z0-9]+',g) for g in args.games):parser.error('Invalid game ID')
INDEX=f'https://www.kawaks.org/roms/{args.system}/index.htm'
index=fetch(INDEX);links={urllib.parse.urljoin(INDEX,x) for x in re.findall(r'href="([^"]+)"',index)}
def acquire(game):
 page=urllib.parse.urljoin(INDEX,game+'.htm')
 if page not in links:raise ValueError('Game absent from source index: '+game)
 text=fetch(page);downloads=[urllib.parse.urljoin(page,x) for x in re.findall(r'href="([^"]+-download\.htm)"',text)]
 if not downloads:raise ValueError('No public download page: '+game)
 detail=downloads[0];text=fetch(detail);packs=[urllib.parse.urljoin(detail,html.unescape(x)) for x in re.findall(r'href="([^"]+\.zip)"',text) if 'winkawaks.org' in x]
 if not packs:raise ValueError('No linked ZIP: '+game)
 path=OUT/(game+'.zip')
 if not path.exists():
  tmp=path.with_suffix('.part')
  subprocess.run(['curl','-fLsS','--connect-timeout','10','--max-time','120',packs[0],'-o',str(tmp)],check=True)
  tmp.rename(path)
 with zipfile.ZipFile(path) as z:
  assert sum(f.file_size for f in z.infolist())<2_000_000_000,'Oversized package'
  assert z.testzip() is None,'Archive CRC error'
  members=[{'name':f.filename,'bytes':f.file_size,'crc32':f'{f.CRC:08x}'} for f in z.infolist()]
 target=ROOT/'assets/original-games'/game/path.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
 return {'game':game,'system':args.system,'source':detail,'file':target.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'members':members,'status':'archive CRC passed; original runtime and frame extraction not yet verified'}
report=ROOT/'data/original-study-downloads.json'
results=json.loads(report.read_text()) if report.exists() else []
results=[r for r in results if r['game'] not in args.games]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 futures={pool.submit(acquire,g):g for g in args.games}
 for future in concurrent.futures.as_completed(futures):
  game=futures[future]
  try:result=future.result();results.append(result);print(game,result['bytes'],'downloaded and archived',flush=True)
  except Exception as e:results.append({'game':game,'status':'download failed','error':str(e)});print(game,str(e),flush=True)
  report.write_text(json.dumps(results,ensure_ascii=False,indent=2))
