"""Recover author guide's command image tokens by palette-decoding inline images.
Not ROM decoding. Uses exact RGB pixel SHA match to visually-reviewed symbols.
"""
from pypdf import PdfReader
from PIL import Image
from pdfminer.pdftypes import resolve1
import pdfplumber,pathlib,json,hashlib
b=pathlib.Path(__file__).resolve().parent
symbolFiles=json.loads((b/'symbol-index.json').read_text());hashmap={x['rawRGBsha']:x['id'] for x in symbolFiles}
tokens={2:'A',3:'B',4:'C',5:'D',6:'6',7:'4',8:'C+D',9:'A+B',10:'START',11:'A+B+C',12:'2',13:'7',14:'or',15:'9',16:'A/B/C/D',17:'3',18:'236',19:'A/C',20:'63214',21:'B/D',22:'623',23:'214',24:'421',25:'2141236',26:'236236',29:'C/D',33:'41236',35:'16',36:'2363214',40:'-',44:'[4-charge]',45:'[2-charge]',46:'8',49:'A+B+C+D',82:'4or6',84:'[1-charge]',85:'28'}

rows=[]
for pi,p in enumerate(pdfplumber.open(b/'neo-encyclopedia-kof98-moves.pdf').pages):
 colors=resolve1(p.page_obj.resources.get('ColorSpace',{}));items=[]
 for w in p.extract_words():
  if 20<w['top']<770:items.append({'x':w['x0'],'top':w['top'],'center':(w['top']+w['bottom'])/2,'text':w['text'],'kind':'text'})
 for im in p.images:
  width,height=im['srcsize']
  if width>220 or height>40:continue
  try:
   cs=im['stream'].attrs.get('CS') or im['stream'].attrs.get('ColorSpace');cs=resolve1(colors.get(cs.name,cs)) if hasattr(cs,'name') else resolve1(cs)
   image=Image.frombytes('P',(width,height),im['stream'].get_data());palette=resolve1(cs[3]);
   if getattr(resolve1(cs[1]),'name','')=='DeviceGray':palette=bytes(v for v in palette for _ in range(3))
   image.putpalette(palette);sha=hashlib.sha256(image.convert('RGB').tobytes()).hexdigest();sid=hashmap.get(sha)
  except Exception:continue
  if sid not in tokens:continue
  items.append({'x':im['x0'],'top':im['top'],'center':(im['top']+im['bottom'])/2,'text':'['+tokens[sid]+']','kind':'command-icon','symbolId':sid})
 groups=[]
 for i in sorted(items,key=lambda x:x['center']):
  group=next((g for g in reversed(groups[-3:]) if abs(g['center']-i['center'])<4),None)
  if group:group['items'].append(i)
  else:groups.append({'center':i['center'],'items':[i]})
 for g in groups:
  ordered=sorted(g['items'],key=lambda x:x['x']);rows.append({'page':pi+1,'y':g['center'],'text':' '.join(i['text'] for i in ordered),'items':ordered})
(b/'encyclopedia-layout-rows.json').write_text(json.dumps(rows,indent=2));(b/'encyclopedia-layout-rows.txt').write_text('\n'.join(f'p{r["page"]} y{r["y"]:.1f} '+r['text'] for r in rows));print('rows',len(rows),'commandicons',sum(i['kind']=='command-icon' for r in rows for i in r['items']))
