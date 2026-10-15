#!/usr/bin/env python3
"""Four authored key poses -> exactly 12 RIFE v4.6 loop frames. No blended-frame fallback."""
import argparse,pathlib,subprocess,json,hashlib,shutil
from PIL import Image,ImageDraw
from source_key_gate import validate_source_gate
p=argparse.ArgumentParser();p.add_argument('--source-gate');p.add_argument('--allow-unreviewed',action='store_true',help='Legacy QA experiment only, never art acceptance');p.add_argument('--keyframes',required=True);p.add_argument('--output',required=True);p.add_argument('--clip',default='punch');p.add_argument('--label',default='出拳');p.add_argument('--fps',type=int,default=12);p.add_argument('--asset-prefix');p.add_argument('--terminal',action='store_true');p.add_argument('--rife',default=str(pathlib.Path.home()/'.local/share/codex-rife/selected/rife-ncnn-vulkan'));p.add_argument('--model',default=str(pathlib.Path.home()/'.local/share/codex-rife/selected/rife-v4.6'));p.add_argument('--gpu',default='0');a=p.parse_args();src=pathlib.Path(a.keyframes).resolve();out=pathlib.Path(a.output).resolve();
if not a.source_gate and not a.allow_unreviewed:p.error('Review four source keys first: --source-gate FILE (legacy experiments require --allow-unreviewed)')
gate=validate_source_gate(src,a.source_gate) if a.source_gate else None
out.mkdir(exist_ok=True,parents=True)
for n in ['keyframes','input-rgb','frames']:(out/n).mkdir(exist_ok=True)
inputs=[]
for i in range(1,5):
 f=src/f'{i:03d}.png';im=Image.open(f).convert('RGBA');(shutil.copyfile(f,out/'keyframes'/f.name) if f.resolve()!=(out/'keyframes'/f.name).resolve() else None);bg=Image.new('RGBA',im.size,(29,41,56,255));bg.alpha_composite(im);f2=out/'input-rgb'/f.name;bg.convert('RGB').save(f2);inputs.append({'file':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
rows=[]
for k in range(4):
 first=out/'input-rgb'/f'{k+1:03d}.png';second=out/'input-rgb'/f'{(k+1)%4+1:03d}.png';idx=k*3+1;shutil.copyfile(first,out/'frames'/f'{idx:03d}.png');rows.append({'frame':idx,'kind':'original-keypose','keyframe':k+1})
 for step in [1,2]:
  dest=out/'frames'/f'{idx+step:03d}.png'
  if a.terminal and k==3:
   shutil.copyfile(first,dest);rows.append({'frame':idx+step,'kind':'terminal-hold','keyframe':4});continue
  cmd=[a.rife,'-0',str(first),'-1',str(second),'-s',str(step/3),'-m',a.model,'-o',str(dest),'-g',a.gpu]
  r=subprocess.run(cmd,capture_output=True,text=True);(out/f'rife-{idx+step:03d}.log').write_text(r.stdout+r.stderr);r.check_returncode();rows.append({'frame':idx+step,'kind':'RIFE-inferred','from':k+1,'to':(k+1)%4+1,'t':step/3})
frames=[Image.open(out/'frames'/f'{i:03d}.png').convert('RGB')for i in range(1,13)];w,h=frames[0].size;sheet=Image.new('RGB',(w*4,h*3));contact=Image.new('RGB',(4*256,3*280),(242,237,220));draw=ImageDraw.Draw(contact)
for i,im in enumerate(frames):sheet.paste(im,((i%4)*w,(i//4)*h));contact.paste(im.resize((256,256)),((i%4)*256,(i//4)*280));draw.text(((i%4)*256+8,(i//4)*280+257),f'{i+1:02d} '+('KEY'if i%3==0 else 'RIFE'),fill=(20,20,20))
sheet.save(out/'interpolated-sheet.png');contact.save(out/'contact-sheet.jpg',quality=93);video=out/f'{a.clip}-4-to-12.mp4';subprocess.run(['ffmpeg','-y','-framerate',str(a.fps),'-i',str(out/'frames'/'%03d.png'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:color=0x1d2938','-c:v','libx264','-pix_fmt','yuv420p','-crf','18',str(video)],capture_output=True,check=True)
base=a.asset_prefix or out.name;clip={'id':a.clip,'label':a.label+' · 4关键帧→RIFE补12','fps':a.fps,'loop':not a.terminal,'frames':[f'{base}/frames/{i:03d}.png'for i in range(1,13)],'sheet':base+'/interpolated-sheet.png','contactSheet':base+'/contact-sheet.jpg','video':base+'/'+video.name}
manifest={'origin':'four-original-imagegen-keyposes-plus-real-RIFE-v4.6','sourceKeyframeCount':4,'frameCount':12,'fps':a.fps,'loop':not a.terminal,'visualAccepted':False,'clips':[clip],**{k:v for k,v in clip.items()if k in ['sheet','contactSheet','video']},'alpha':'Opaque RGB inference on dark background; transparent source keys retained; no fabricated alpha','method':('Original keys1/4/7/10; six RIFE frames over first three intervals; frames11/12 hold key4; no return to standing' if a.terminal else 'Original keys at frames1,4,7,10; t1/3,t2/3 for each pair including4→1'),'sources':inputs,'sourceGate':gate,'unreviewedExperiment':gate is None,'mapping':rows,'qualityLimit':'Large pose displacement and newly revealed fist surfaces can smear; requires individual visual review, not automatically accepted','runtimeSHA256':hashlib.sha256(pathlib.Path(a.rife).read_bytes()).hexdigest(),'weightsSHA256':hashlib.sha256((pathlib.Path(a.model)/'flownet.bin').read_bytes()).hexdigest()};(out/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False));print(json.dumps({'output':str(out),'frameCount':12,'visualAccepted':False}))
