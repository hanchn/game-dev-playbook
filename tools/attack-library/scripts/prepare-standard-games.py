#!/usr/bin/env python3
"""Restore missing priority sources and deterministic BIOS transports. Never replace originals."""
import hashlib,json,pathlib,subprocess,sys,urllib.request,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def restore(path,url,expected):
 if not path.exists():
  path.parent.mkdir(parents=True,exist_ok=True);part=path.with_suffix(path.suffix+'.part')
  with urllib.request.urlopen(url,timeout=90) as src,part.open('wb') as out:
   while chunk:=src.read(1024*1024):out.write(chunk)
  if sha(part)!=expected:raise ValueError('Downloaded SHA mismatch: '+str(path))
  with zipfile.ZipFile(part) as z:
   if z.testzip():raise ValueError('Downloaded ZIP CRC failed')
  part.rename(path)
 if sha(path)!=expected:raise ValueError('Existing original differs; preserved without overwrite: '+str(path))
def main():
 config=json.loads((ROOT/'data/standard-games.json').read_text())
 for item in json.loads((ROOT/'data/research/kov-acquisition-20261016.json').read_text()):
  rel=pathlib.Path(item['file']).relative_to('tools/attack-library')
  restore(ROOT/rel,item['observedDownloadURL'],item['sha256'])
 source=json.loads((ROOT/'data/research/kov-fbneo-bios-20261016.json').read_text())
 kov=next(g for g in config['games'] if g['id']=='kov')
 restore(ROOT/kov['bios'],source['sourceUrl'],source['sha256'])
 for game in config['games']:
  for key in ['rom','bios']:
   if game.get(key):
    path=ROOT/game[key]
    if not path.is_file() or sha(path)!=game[key+'Sha256']:raise ValueError('Missing/different source: '+str(path))
  if game.get('bios'):
   subprocess.run([sys.executable,str(ROOT/'scripts/pack-arcade-bios.py'),'--bios',str(ROOT/game['bios']),'--output',str(ROOT/game['biosContainer'])],check=True,stdout=subprocess.DEVNULL)
   if sha(ROOT/game['biosContainer'])!=game['biosContainerSha256']:raise ValueError('Transport SHA mismatch')
 print('Priority source ZIPs and deterministic BIOS containers verified; gameplay acceptance is separate.')
if __name__=='__main__':main()
