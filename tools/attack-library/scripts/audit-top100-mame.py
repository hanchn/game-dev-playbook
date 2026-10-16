#!/usr/bin/env python3
"""Record original MAME driver metadata and verify local sets, never claim gameplay."""
import sys
import argparse, concurrent.futures, hashlib, json, pathlib, re, shutil, subprocess, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
REPORT=ROOT/'data/research/mame-top100-20261016'
sys.path.insert(0,str(ROOT))
from native_runtime import NativeRuntime
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--metadata',action='store_true');args=ap.parse_args()
 binary=shutil.which('mame')
 if not binary:raise SystemExit('MAME not installed')
 progress=json.loads((ROOT/'data/arcade-local-runtime-progress.json').read_text());games=progress['games'];adapter=NativeRuntime(root=ROOT,binary=binary)
 assert len(games)==100 and all(re.fullmatch(r'[a-z0-9_]+',g['romIdProposal']) for g in games)
 REPORT.mkdir(parents=True,exist_ok=True)
 version=subprocess.run([binary,'-help'],capture_output=True,text=True,timeout=30).stdout.splitlines()[0]
 if args.metadata:
  proc=subprocess.run([binary,'-listxml',*[g['romIdProposal'] for g in games]],capture_output=True,timeout=120)
  xml=REPORT/'original-driver-metadata.xml';xml.write_bytes(proc.stdout);(REPORT/'original-driver-metadata.stderr.txt').write_bytes(proc.stderr)
  data=ET.fromstring(proc.stdout);lookup={m.get('name'):m for m in data.findall('machine')};entries=[]
  for g in games:
   name=g['romIdProposal'];m=lookup.get(name)
   if m is None:entries.append({'rank':g['rank'],'title':g['title'],'id':name,'driverFound':False});continue
   entries.append({'rank':g['rank'],'title':g['title'],'id':name,'driverFound':True,'description':m.findtext('description'),'year':m.findtext('year'),'manufacturer':m.findtext('manufacturer'),'sourceFile':m.get('sourcefile'),'cloneOf':m.get('cloneof'),'romOf':m.get('romof'),'driver':m.find('driver').attrib if m.find('driver') is not None else None,'inputs':m.find('input').attrib if m.find('input') is not None else None,'controls':[c.attrib for c in m.findall('input/control')],'coinDIPSwitches':[{'name':d.get('name'),'values':[v.attrib for v in d.findall('dipvalue')]} for d in m.findall('dipswitch') if 'coin' in d.get('name','').lower()],'screens':[x.attrib for x in m.findall('display')],'ROMs':[x.attrib for x in m.findall('rom')],'disks':[x.attrib for x in m.findall('disk')],'bootVerified':False,'gameplayVerified':False,'reverseEngineeringComplete':False})
  report={'schema':'original-MAME-driver-metadata/v1','version':version,'sourceXML':str(xml.relative_to(ROOT)),'sourceSHA256':sha(xml),'source':'Installed official MAME 0.289 driver declarations; not recovered game source or full ROM reverse engineering.','games':entries,'driverFoundCount':sum(e['driverFound'] for e in entries)}
  (REPORT/'driver-metadata.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
  print(json.dumps({'driverMetadataCount':report['driverFoundCount'],'expected':100}))
 def verify(g):
  name=g['romIdProposal'];directory=ROOT/'assets/original-games'/name;archive=directory/(name+'.zip')
  builtin=adapter.builtin_without_rom(name)
  if not archive.is_file() and not builtin:return {'id':name,'rank':g['rank'],'acquired':False,'setCompatible':False,'bootVerified':False,'gameplayVerified':False}
  proc=subprocess.run([binary,name,'-rompath',adapter.rom_search_path(name),'-verifyroms'],capture_output=True,text=True,timeout=40)
  log=REPORT/(name+'-verifyroms.txt');log.write_text(proc.stdout+proc.stderr)
  return {'id':name,'rank':g['rank'],'acquired':archive.is_file(),'driverAvailable':True,'sourceROM':str(archive.relative_to(ROOT)),'sourceROMSHA256':sha(archive) if archive.is_file() else None,'builtInNoROM':builtin,'command':[binary,name,'-rompath',adapter.rom_search_path(name),'-verifyroms'],'returnCode':proc.returncode,'setCompatible':proc.returncode==0 and 'were OK' in proc.stdout,'log':str(log.relative_to(ROOT)),'logSHA256':sha(log),'bootVerified':False,'gameplayVerified':False}
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:entries=list(pool.map(verify,games))
 report={'schema':'MAME-top100-set-verification/v1','version':version,'scope':'Original emulator ROM/BIOS/device/CHD audit only. No boot, input, match or visual acceptance implied.','games':entries,'summary':{'targets':100,'acquired':sum(e['acquired'] for e in entries),'setCompatible':sum(e['setCompatible'] for e in entries),'bootVerified':0,'gameplayVerified':0}}
 (REPORT/'set-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report['summary']))
if __name__=='__main__':main()
