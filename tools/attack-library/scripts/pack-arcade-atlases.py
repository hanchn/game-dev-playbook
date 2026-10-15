"""Pack decoded arcade frame PNGs into source-preserving atlases.
Frame axes/timings remain unchanged; only image and rectangle references change.
"""
import pathlib,json,hashlib
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1];path=ROOT/'data/characters.json';cs=json.loads(path.read_text());count=0
for c in cs:
 if not c['id'].startswith('arcade-'):continue
 frames=[f for clip in c['clips'].values() for f in clip];individual={f['image'] for f in frames if '/atlas-' not in f['image']}
 if not individual:continue
 directory=(ROOT/next(iter(individual))).parent;images={};keys={}
 for src in sorted(individual):
  im=Image.open(ROOT/src).convert('RGBA');key=hashlib.sha256(im.tobytes()+str(im.size).encode()).hexdigest();keys[src]=key
  if key not in images:images[key]=im
 pages=[];positions={};x=y=row=0;canvas=Image.new('RGBA',(2048,2048));page=0
 for key,im in sorted(images.items(),key=lambda kv:-kv[1].height):
  w,h=im.size
  if w>2048 or h>2048:raise ValueError('Oversized sprite')
  if x+w>2048:x=0;y+=row;row=0
  if y+h>2048:pages.append(canvas);canvas=Image.new('RGBA',(2048,2048));page+=1;x=y=row=0
  canvas.paste(im,(x,y));positions[key]=(page,x,y);x+=w;row=max(row,h)
 pages.append(canvas)
 for i,im in enumerate(pages):im.save(directory/f'atlas-{i}.png',optimize=True)
 for f in frames:
  if f['image'] not in keys:continue
  i,x,y=positions[keys[f['image']]];f['image']=(directory/f'atlas-{i}.png').relative_to(ROOT).as_posix();f['x']+=x;f['y']+=y
 c['image']=c['clips']['idle'][0]['image']
 for src in individual:(ROOT/src).unlink()
 print(c['name'],len(individual),'frames ->',len(pages),'atlases',flush=True);count+=1
path.write_text(json.dumps(cs,ensure_ascii=False,separators=(',',':')));print('Packed actors',count)
