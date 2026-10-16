#!/usr/bin/env python3
import json,csv,pathlib
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/'data/research/kof98-author-20261016';j=json.loads((BASE/'playback-index.json').read_text());out=BASE/'visual-review';out.mkdir(exist_ok=True);index=[]
for name,char in j['characters'].items():
 clips=char['clips']
 for off in range(0,len(clips),8):
  group=clips[off:off+8];im=Image.new('RGB',(768,len(group)*160),(20,20,20));d=ImageDraw.Draw(im);entries=[]
  for row,c in enumerate(group):
   batch=BASE/c['batch'];trace=list(csv.DictReader((batch/'trace.csv').open()));rs=[x for x in trace if x['id']==c['id'] and (batch/'snap'/f"{int(x['tick']):06d}.png").exists()];motion=[x for x in rs if x['phase']=='motion'];obs=[x for x in rs if x['phase']=='observe'];selected=[motion[len(motion)//3] if motion else rs[0]]+[obs[min(k,len(obs)-1)] for k in [15,45,85]]
   for col,r in enumerate(selected):
    p=batch/'snap'/f"{int(r['tick']):06d}.png";src=Image.open(p).convert('RGB');src.thumbnail((192,140));im.paste(src,(col*192,row*160));d.text((col*192,row*160+140),f"{off+row+1}:{c['label'][:20]} t{r['tick']}",fill='white')
   entries.append({'row':row+1,'clipId':c['id'],'label':c['label'],'sourceTicks':[int(x['tick']) for x in selected],'batch':c['batch']})
  path=out/f'{name}-{off//8:02d}.jpg';im.save(path,quality=94);index.append({'image':str(path.relative_to(ROOT)),'character':name,'entries':entries})
(out/'contact-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2));print(len(index),'boards')
