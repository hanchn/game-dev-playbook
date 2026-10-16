#!/usr/bin/env python3
"""Serial, ordinary-input-only recapture of missing original KOF98 metadata.

Every observation is a new capture, never a metadata transplant into old frames.
Reuses the exact original move configuration and input code; adds read-only
camera/facing/device fields and raw game RAM regions for later state research.
"""
from pathlib import Path
import argparse, csv, hashlib, json, os, subprocess, time
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/research'
OUT=BASE/'kof98-gap-observations-20261016-r4'
ORDER=['robert','king','vice','benimaru','kyo','daimon','joe','ryo','mai','athena','terry','kim','andy','shingo','leona','iori']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,d):
 p.parent.mkdir(parents=True,exist_ok=True);t=p.with_suffix(p.suffix+'.tmp');t.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');t.replace(p)
def enhance(source):
 text=source.read_text()
 text=text.replace('_G.KOF98_METER_CAPTURE_REGISTERED','_G.KOF98_GAP_CAPTURE_REGISTERED')
 anchor="local vr=emu.item(assert(m.devices[':spritegen'].items['0/m_videoram']));"
 assert text.count(anchor)==1
 text=text.replace(anchor,anchor+"local auto=emu.item(assert(m.devices[':spritegen'].items['0/m_auto_animation_counter']));")
 old='meterRaw,timerRaw,fields\\n'
 new='meterRaw,timerRaw,fields,cameraX,p1facing,p2facing,auto,refreshHz,gamePhase,stockRaw,modeRaw\\n'
 assert text.count(old)==1;text=text.replace(old,new)
 old="table.concat(keys,'+')},',')"
 new="table.concat(keys,'+'),ram:read_i16(0x10b0cc),ram:read_u8(0x108131),ram:read_u8(0x108331),auto:read(0),1e18/screen.refresh_attoseconds,ram:read_u8(0x10b094),ram:read_u8(0x1082e3),ram:read_u8(0x1081f0)},',')"
 assert text.count(old)==1;text=text.replace(old,new)
 anchor="f:write(table.concat(a));f:close()\n  end"
 assert text.count(anchor)==1
 extra="""f:write(table.concat(a));f:close()
   -- Read-only raw spans: 0x108000..0x1085ff then 0x10b000..0x10b0ff.
   a={};for i=0x108000,0x1085ff do a[#a+1]=string.char(ram:read_u8(i)) end
   for i=0x10b000,0x10b0ff do a[#a+1]=string.char(ram:read_u8(i)) end
   f=assert(io.open(out..'/ram/'..tick..'.bin','wb'));f:write(table.concat(a));f:close()
  end"""
 text=text.replace(anchor,extra)
 assert ':write_u' not in text and ':write_i' not in text
 return text

def capture(name,clip):
 source_image=ROOT/clip['frames'][0]['image'];old=source_image.parent.parent
 out=OUT/name/clip['id']
 if (out/'capture.json').exists():
  prior=json.loads((out/'capture.json').read_text())
  if not prior.get('structuralCapturePassed'):raise RuntimeError('Previous failed capture requires distinct revision, not overwrite')
  return prior
 if out.exists() and (out/'source.lua').exists():raise RuntimeError('Incomplete prior observation: preserve and use a distinct output revision')
 for sub in ['snap','selection','vram','palette','ram','cfg','nvram']:(out/sub).mkdir(parents=True,exist_ok=True)
 (out/'move.lua').write_bytes((old/'move.lua').read_bytes());(out/'move.json').write_bytes((old/'move.json').read_bytes())
 source=old/'source.lua';script=out/'source.lua';script.write_text(enhance(source))
 cmd=['mame','kof98','-rompath',str(ROOT/'assets/original-games/kof98'),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(script),'-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-seconds_to_run','150','-frameskip','0']
 write(OUT/'active.json',{'character':name,'clip':clip['id'],'started':time.time(),'ownerPID':os.getpid()})
 with (out/'runtime.log').open('w')as log:
  process=subprocess.run(cmd,env={**os.environ,'KOF_METER_OUT':str(out),'SDL_VIDEODRIVER':'dummy','SDL_AUDIODRIVER':'dummy'},stdout=log,stderr=subprocess.STDOUT,timeout=300)
 rows=list(csv.DictReader((out/'trace.csv').open())) if (out/'trace.csv').exists() else []
 fields=['tick','screenFrame','p1x','p1y','p1facing','p2facing','cameraX','auto','refreshHz','gamePhase']
 valid=process.returncode==0 and bool(rows) and all(None not in r and all(r.get(k) not in (None,'')for k in fields)for r in rows)
 valid=valid and all(int(b['tick'])==int(a['tick'])+1 and int(b['screenFrame'])==int(a['screenFrame'])+1 for a,b in zip(rows,rows[1:]))
 sampled=sorted((out/'vram').glob('*.bin'),key=lambda p:int(p.stem))
 valid=valid and bool(sampled) and all((out/'snap'/f'{p.stem}.png').exists() and p.stat().st_size==68608 and (out/'palette'/p.name).stat().st_size==16384 and (out/'ram'/p.name).stat().st_size==1792 for p in sampled)
 record={'schema':'kof98-gap-observation/v1','sourceCharacter':name,'originalClipID':'meter--'+clip['id'],'label':clip['label'],'engine':'MAME0.289 / KOF98 NGM2420','newIndependentCapture':True,'metadataTransplantedIntoOldCapture':False,'memoryWrites':False,'ordinaryInputOnly':True,'parentInputCapture':str(old.relative_to(ROOT)),'parentSourceSHA256':sha(source),'parentMoveLuaSHA256':sha(old/'move.lua'),'sourceSHA256':sha(script),'producerSHA256':sha(Path(__file__)),'traceSHA256':sha(out/'trace.csv')if rows else None,'command':cmd,'runtimeEnvironment':{'SDL_VIDEODRIVER':'dummy','SDL_AUDIODRIVER':'dummy'},'returnCode':process.returncode,'traceRows':len(rows),'nativeSpriteSamples':len(sampled),'structuralCapturePassed':bool(valid),'identityVisualVerified':False,'triggerStatus':'pending-independent-observation','rawRAMSpans':[[0x108000,0x1085ff],[0x10b000,0x10b0ff]],'conditionResult':(out/'condition-result.txt').read_text()if(out/'condition-result.txt').exists()else None}
 write(out/'capture.json',record);print(json.dumps(record,ensure_ascii=False),flush=True)
 if not valid:raise RuntimeError('Capture failed structural gate; preserve failure evidence')
 return record

def main():
 global OUT
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--characters',nargs='+',choices=ORDER,default=ORDER);p.add_argument('--clip-pattern',default='');p.add_argument('--limit',type=int,default=0);p.add_argument('--output',type=Path,default=OUT);args=p.parse_args();OUT=args.output.resolve()
 if not OUT.is_relative_to(BASE.resolve()):raise ValueError('Observations must stay within this knowledge base research root')
 OUT.mkdir(exist_ok=True,parents=True)
 lock=OUT/'serial.lock';fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY);os.write(fd,str(os.getpid()).encode());os.close(fd)
 try:
  index=json.loads((BASE/'kof98-meter-20261016/playback-index.json').read_text());done=0
  for name in args.characters:
   for clip in index['characters'][name]['clips']:
    if args.clip_pattern not in clip['id']:continue
    parent=(ROOT/clip['frames'][0]['image']).parent.parent
    if not all((parent/p).exists()for p in ['source.lua','move.lua','move.json']):
     write(OUT/name/(clip['id']+'-adapter-pending.json'),{'clip':clip['id'],'reason':'legacy custom pilot has no shared move configuration; requires exact-script observer adapter'});continue
    capture(name,clip);done+=1
    if args.limit and done>=args.limit:return
 finally:
  write(OUT/'active.json',{'status':'ended','ownerPID':os.getpid()});lock.unlink()
if __name__=='__main__':main()
