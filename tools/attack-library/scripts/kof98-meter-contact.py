#!/usr/bin/env python3
from PIL import Image,ImageDraw
import pathlib,csv,json,sys,os
B=pathlib.Path(__file__).resolve().parents[1]/'data/research/kof98-meter-20261016'
suffix=os.getenv('KOF_METER_CONTACT_SUFFIX','v2')
for character in sys.argv[1:]:
 outs=sorted(p.parent for p in (B/character).glob('*/capture.json') if p.parent.name.endswith(suffix));sheet=Image.new('RGB',(1280,250*len(outs)),'#191919');draw=ImageDraw.Draw(sheet)
 for y,out in enumerate(outs):
  rows=list(csv.DictReader((out/'trace.csv').open()));obs=[x for x in rows if x['phase']=='observe'];rows=[obs[min(v,len(obs)-1)] for v in [0,10,35,65]] if obs else rows[-4:]
  for x,row in enumerate(rows):
   p=out/'snap'/(row['tick']+'.png')
   if p.exists():sheet.paste(Image.open(p),(320*x,250*y));draw.text((320*x,250*y+225),out.name+' t'+row['tick']+' hp'+row['hp1'],fill='white')
 sheet.save(B/(character+'-'+suffix+'-contact.png'));print(character,len(outs))
