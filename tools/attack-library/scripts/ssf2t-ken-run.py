"""Reproduce Ken P2 inputs-only original SSF2T study; MAME0.289, numpy/Pillow required."""
import argparse,hashlib,json,os,pathlib,subprocess,sys,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--mame',default='mame');a=p.parse_args();out=a.output.resolve()
if (out/'actions.csv').exists():raise SystemExit('Refusing to replace an existing original trace: '+str(out))
(out/'snap').mkdir(parents=True,exist_ok=True);roms=ROOT/'assets/original-games/mame-0289'
verify=subprocess.run([a.mame,'-rompath',str(roms),'-verifyroms','ssf2t'],text=True,capture_output=True,check=True);(out/'verifyroms.txt').write_text(verify.stdout+verify.stderr);assert '1 were OK' in verify.stdout
args=[a.mame,'ssf2t','-rompath',str(roms),'-noreadconfig','-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(ROOT/'scripts/mame/ssf2t-sprites.lua'),'-seconds_to_run','115','-frameskip','0']
with (out/'runtime.log').open('w') as log:subprocess.run(args,env={**os.environ,'NAIFROG_TRACE_DIR':str(out),'NAIFROG_ACTION_SCRIPT':str(ROOT/'scripts/ssf2t-ken-actions.lua')},stdout=log,stderr=subprocess.STDOUT,check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/ssf2t-ken-extract.py'),str(out)],check=True)
xml=ET.fromstring(subprocess.run([a.mame,'-listxml','ssf2t'],text=True,capture_output=True,check=True).stdout)
machine=next(m for m in xml.findall('machine') if m.attrib['name']=='ssf2t')
metadata={'set':machine.findtext('description'),'mameBuild':xml.attrib.get('build'),'nativeScreen':machine.find('display').attrib,'romSHA256':hashlib.sha256((roms/'ssf2t.zip').read_bytes()).hexdigest(),'verifyroms':verify.stdout.strip(),'command':args,'inputsOnly':True,'ramWrites':False,'targetPlayer':2,'targetCharacterID':4,'samplePolicy':'every native video tick including repeated game counters','limitations':['Input phase labels are intended commands; validate source state transitions separately.','No original authoring pivots or bones recovered.']}
(ROOT/'assets/research/ssf2t-ken-native/runtime-provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
