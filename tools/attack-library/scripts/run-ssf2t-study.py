"""Reproduce the read-only, two-player original-game action study. Requires MAME 0.289 + Pillow."""
import argparse,os,pathlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--mame',default='mame');a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
roms=ROOT/'assets/original-games/mame-0289'
verify=subprocess.run([a.mame,'-rompath',str(roms),'-verifyroms','sf2ce','ssf2t'],text=True,capture_output=True,check=True)
(out/'verifyroms.txt').write_text(verify.stdout+verify.stderr)
assert '2 were OK' in verify.stdout
for run,scenario in [('motions','motions'),('contact','contact')]:
 d=out/run
 if (d/'actions.csv').exists():raise SystemExit('Refusing to replace existing trace: '+str(d))
 (d/'snap').mkdir(parents=True,exist_ok=True)
 args=[a.mame,'ssf2t','-rompath',str(roms),'-noreadconfig','-cfg_directory',str(d/'cfg'),'-nvram_directory',str(d/'nvram'),'-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(ROOT/'scripts/mame/ssf2t-actions.lua'),'-seconds_to_run','115','-frameskip','0']
 with (d/'runtime.log').open('w') as log:subprocess.run(args,env={**os.environ,'NAIFROG_TRACE_DIR':str(d),'NAIFROG_SCENARIO':scenario},stdout=log,stderr=subprocess.STDOUT,check=True)
 subprocess.run([sys.executable,'-c',"import csv,sys; assert len(list(csv.DictReader(open(sys.argv[1]))))>1000",str(d/'actions.csv')],check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/package-ssf2t-study.py'),'--motions',str(out/'motions'),'--contact',str(out/'contact')],check=True)
print('Original runtime observations verified; not completed Naifrog art or all-character fidelity.')
