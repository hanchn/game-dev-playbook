#!/usr/bin/env python3
"""Prepare labelled native screenshots for human identity and input-result review."""
from pathlib import Path
from PIL import Image,ImageDraw
import csv,json,hashlib,shutil,argparse
R=Path(__file__).resolve().parents[1];B=R/'data/research/kof98-multichar-20261016'
a=argparse.ArgumentParser();a.add_argument('characters',nargs='+');args=a.parse_args()
for name in args.characters:
 p=B/name;out=p/'review';out.mkdir(exist_ok=True);rows=list(csv.DictReader((p/'trace.csv').open()));phases={}
 for r in rows:phases.setdefault(r['phase'],[]).append(r)
 chosen=[]
 for phase,rs in phases.items():
  for n in [0,min(10,len(rs)-1),min(20,len(rs)-1),min(35,len(rs)-1),len(rs)-1]:
   r=rs[n];src=p/'snap'/f"{r['tick']}.png";dest=out/f"{phase}-{r['phaseTick']}.png";shutil.copyfile(src,dest);chosen.append((dest,r))
 sheet=Image.new('RGB',(320*5,244*((len(chosen)+4)//5)),(15,20,28));d=ImageDraw.Draw(sheet)
 for i,(f,r) in enumerate(chosen):
  sheet.paste(Image.open(f),(i%5*320,i//5*244));d.text((i%5*320,i//5*244+224),f"{r['phase']} t{r['phaseTick']}",fill='white')
 sheet.save(out/'all-input-attempts-contact.jpg')
 (out/'review-index.json').write_text(json.dumps({'characterIntended':name,'allMovesComplete':False,'automaticVisualAcceptance':False,'phases':[{'id':k,'samples':len(v),'lifeStart':v[0]['p1life'],'lifeEnd':v[-1]['p1life'],'framesUniqueNotYetAudited':True,'triggerVerified':False} for k,v in phases.items()],'nativeScreens':[{'file':f.name,'tick':r['tick'],'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f,r in chosen]},indent=2)+'\n')
 print(name,len(rows),len(chosen))
