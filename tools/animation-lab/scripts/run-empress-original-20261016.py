#!/usr/bin/env python3
"""Extract author package unchanged and run its original local Node server, no replacement rules."""
from pathlib import Path
import argparse,zipfile,hashlib,struct,json,os,subprocess,shutil
ROOT=Path(__file__).resolve().parents[3]
ZIP=Path.home()/'Downloads/Empress-Pokemon-Arena-2D-1.0.0-Windows.zip'
ZIP_SHA='9d1a756fabac7249f3eba6a1f372bb4ffbe3e12c2152ee91f3d6092b845044c9'
ASAR_SHA='97a09a00d79eff243993537acd6a2953cfd57bd8f0bbd2c01ca6f1e506ac0e3f'
MEMBER='Empress Pokemon Arena 2D 1.0/resources/app.asar'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def main():
 a=argparse.ArgumentParser();a.add_argument('--archive',type=Path,default=ZIP);a.add_argument('--output',type=Path,default=ROOT/'output/local-original-games/empress-1.0.0');a.add_argument('--port',default='4369');a.add_argument('--extract-only',action='store_true');args=a.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
 if digest(args.archive)!=ZIP_SHA:raise ValueError('Author originalZIP SHA mismatch')
 asar=out/'app.asar'
 if not asar.exists():
  with zipfile.ZipFile(args.archive) as z,z.open(MEMBER) as src,asar.open('wb') as dst:shutil.copyfileobj(src,dst)
 if digest(asar)!=ASAR_SHA:raise ValueError('OriginalASAR SHA mismatch')
 runtime=out/'runtime';runtime.mkdir(exist_ok=True);records=[]
 with asar.open('rb') as stream:
  header=stream.read(16);n=struct.unpack_from('<I',header,12)[0];tree=json.loads(stream.read(n));offset=8+struct.unpack_from('<I',header,4)[0]
  def walk(node,prefix=''):
   for name,v in node.get('files',{}).items():
    rel=prefix+name
    if 'files' in v:walk(v,rel+'/');continue
    if v.get('unpacked') or 'link' in v:raise ValueError('Unsupportedmember '+rel)
    f=(runtime/rel).resolve()
    if not f.is_relative_to(runtime.resolve()):raise ValueError('UnsafeASARpath '+rel)
    stream.seek(offset+int(v['offset']));data=stream.read(v['size'])
    if len(data)!=v['size']:raise ValueError('Truncated '+rel)
    f.parent.mkdir(parents=True,exist_ok=True)
    if not f.exists() or f.read_bytes()!=data:f.write_bytes(data)
    records.append({'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  walk(tree)
 receipt={'sourcePage':'https://omniscye.itch.io/empress-pokemon-2d-arena','archive':str(args.archive),'archiveSHA256':ZIP_SHA,'asarSHA256':ASAR_SHA,'asarMember':MEMBER,'files':records,'extractedFiles':len(records),'originalServer':'server/index.cjs','rulesModified':False,'entryModified':False,'dependencies':'authorbundled node_modules retained, no reinstall','runtime':str(runtime)};(out/'source-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps({'runtime':str(runtime),'files':len(records),'url':f'http://127.0.0.1:{args.port}/'}),flush=True)
 if not args.extract_only:
  env=os.environ.copy();env['PORT']=args.port;env['HOST']='127.0.0.1';env['NODE_ENV']='production';subprocess.run(['node','server/index.cjs','--port',args.port,'--host','127.0.0.1','--save-dir',str(out/'save')],cwd=runtime,env=env,check=True)
if __name__=='__main__':main()
