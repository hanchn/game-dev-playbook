from PIL import Image,ImageDraw
import pathlib,csv,sys
B=pathlib.Path(__file__).resolve().parents[1]/'data/research/kof98-meter-20261016'
for char,suffix in [x.split(':') for x in sys.argv[1:]]:
 outs=sorted(p.parent for p in (B/char).glob('*/capture.json') if p.parent.name.endswith(suffix)); im=Image.new('RGB',(1920,250*len(outs)),'#161616');d=ImageDraw.Draw(im)
 for y,o in enumerate(outs):
  rows=[r for r in csv.DictReader((o/'trace.csv').open()) if r['phase']=='observe']
  for x,n in enumerate([0,55,90,140,200,280]):
   r=rows[min(n,len(rows)-1)];im.paste(Image.open(o/'snap'/f"{r['tick']}.png"),(x*320,y*250));d.text((x*320,y*250+225),f"{o.name} o{n} HP2={r['hp2']}",fill='white')
 im.save(B/f'{char}-{suffix}-late-contact.png')
