#!/usr/bin/env python3
"""Review contact sheets. Raw native snapshots stay unchanged; optional aspect correction is labelled."""
import argparse, pathlib
from PIL import Image, ImageDraw
ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('batch',type=pathlib.Path);args=ap.parse_args()
for folder in sorted(args.batch.iterdir()):
 if not folder.is_dir() or not (folder/'snap').is_dir():continue
 frames=sorted((folder/'snap').glob('*.png'))
 sheet=Image.new('RGB',(1200,((len(frames)+3)//4)*340),'#25313a');draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(frames):
  image=Image.open(p).convert('RGB')
  if folder.name=='frogger':image=image.resize((224,256),Image.Resampling.NEAREST)
  image.thumbnail((290,310),Image.Resampling.NEAREST)
  x=(i%4)*300;y=(i//4)*340
  sheet.paste(image,(x+(300-image.width)//2,y+22));draw.text((x+5,y+5),p.stem,fill='white')
 sheet.save(folder/'contact.png')
 (folder/'contact-notes.txt').write_text('Derived review sheet only. Native PNG snapshots unchanged. Nearest-neighbour fit into labelled cells. '+('Frogger raw 224x768 non-square raster resampled to 224x256 for review; not native pixel dimensions.' if folder.name=='frogger' else 'No aspect correction.')+'\n')
 print(folder/'contact.png')
