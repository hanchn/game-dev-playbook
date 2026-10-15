# coding: utf-8
from PIL import Image,ImageFile
import json,pathlib,collections
ImageFile.LOAD_TRUNCATED_IMAGES=True
r=pathlib.Path(__file__).resolve().parents[1];cs=json.loads((r/'data/characters.json').read_text());issues=[];checked=0;cache={};bad=collections.Counter();empty=collections.Counter()
for c in cs:
 for action in c['actions']:
  clip=c['clips'][action]
  if isinstance(clip,list):groups=[('side',clip)]
  else:
   groups=[]
   for d,v in clip.items():
    if isinstance(v,list):groups.append((d,v));continue
    cells=[]
    for i in range(v['count']):
     cell=v.get('start',0)+i;cols=v.get('gridColumns');x=(cell%cols)*v['w'] if cols else i*v['w'];y=(cell//cols)*v['h'] if cols else v['row']*v['h'];cells.append({'image':v['image'],'x':x,'y':y,'w':v['w'],'h':v['h']})
    groups.append((d,cells))
  for direction,frames in groups:
   nonempty=0
   for f in frames:
    p=f['image']
    if p not in cache:
     try:
      im=Image.open(r/p).convert('RGBA');cache[p]=im.getchannel('A')
     except Exception as e:cache[p]=None;bad[p]+=1
    im=cache[p];checked+=1
    if im and im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).getbbox():nonempty+=1
   if not nonempty:issues.append({'id':c['id'],'action':action,'direction':direction,'frames':len(frames)})
 if len(cache)>150:cache.clear()
report={'checkedFrameReferences':checked,'emptyActionDirections':issues,'decodeFailures':list(bad)};(r/'data/pixel-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('checked',checked,'empty actions',len(issues),'decode failures',len(bad));print(str(issues[:20]));print(list(bad)[:10])
