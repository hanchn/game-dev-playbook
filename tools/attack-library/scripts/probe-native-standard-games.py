#!/usr/bin/env python3
"""Capture actual original-game boot/input evidence; visual acceptance stays manual."""
import argparse, hashlib, json, os, pathlib, shutil, subprocess, sys, time
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from native_runtime import NativeRuntime
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('games',nargs='+');ap.add_argument('--batch',required=True)
 ap.add_argument('--boot-frames',type=int,default=1800);ap.add_argument('--control-delay',type=int,default=840)
 ap.add_argument('--jump-first',action='store_true')
 args=ap.parse_args()
 if pathlib.Path(args.batch).name!=args.batch:ap.error('batch must be one directory name')
 binary=shutil.which('mame')
 if not binary:raise SystemExit('MAME missing')
 adapter=NativeRuntime(root=ROOT,binary=binary)
 directories=[adapter.game_path(id) for id in args.games]
 batch=ROOT/'data/research'/args.batch
 if batch.exists():raise SystemExit('Existing evidence retained; choose a new batch')
 batch.mkdir(parents=True)
 script=batch/'probe.lua';shutil.copyfile(ROOT/'scripts/mame/standard-input-probe.lua',script)
 version=subprocess.run([binary,'-help'],capture_output=True,text=True,check=True).stdout.splitlines()[0]
 records=[]
 for id,directory in zip(args.games,directories):
  out=batch/id
  for sub in ('snap','cfg','nvram','state','diff'):(out/sub).mkdir(parents=True,exist_ok=True)
  check=adapter.verify(id);(out/'verifyroms.txt').write_text(check['output'])
  sourceFiles=[]
  for folder in adapter.rom_search_path(id).split(';'):
   sourceFiles.extend({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(pathlib.Path(folder).glob('*.zip')))
  record={'id':id,'dependencyCheckPassed':check['ok'],'ROMContainers':sourceFiles,'engine':version,'engineBinarySHA256':sha(pathlib.Path(binary).resolve()),'visualReviewed':False,'gameplayVerified':False,'scope':'Actual native emulator frames and ordinary I/O. Input injection alone is not gameplay acceptance.'}
  if check['ok']:
   command=[binary,id,'-rompath',adapter.rom_search_path(id),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(script),'-seconds_to_run',str((args.boot_frames+args.control_delay+960)//20+30),'-frameskip','0']
   for option,sub in [('cfg_directory','cfg'),('nvram_directory','nvram'),('state_directory','state'),('diff_directory','diff')]:command.extend(['-'+option,str(out/sub)])
   begin=time.monotonic()
   try:
    with (out/'runtime.log').open('w') as log:
     process=subprocess.run(command,env={**os.environ,'ARCADE_PROBE_OUT':str(out),'ARCADE_BOOT_FRAMES':str(args.boot_frames),'ARCADE_CONTROL_DELAY':str(args.control_delay),'ARCADE_JUMP_FIRST':'1' if args.jump_first else '0'},stdout=log,stderr=subprocess.STDOUT,timeout=180)
    record['returnCode']=process.returncode
   except subprocess.TimeoutExpired:record['timedOut']=True
   record.update({'command':command,'scriptSHA256':sha(script),'bootFrames':args.boot_frames,'controlDelay':args.control_delay,'jumpFirst':args.jump_first,'wallSeconds':round(time.monotonic()-begin,3),'nativeSnapshots':len(list((out/'snap').glob('*.png')))})
  record['files']=[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(out.rglob('*')) if p.is_file()]
  records.append(record)
  (batch/'capture-report.json').write_text(json.dumps({'schema':'native-standard-input-probe/v1','games':records},ensure_ascii=False,indent=2)+'\n')
  print(json.dumps({k:record.get(k) for k in ('id','returnCode','nativeSnapshots','wallSeconds')},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
