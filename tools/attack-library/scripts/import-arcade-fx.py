import pathlib,re,json
from PIL import Image
from sff_codec import load_sff
ROOT=pathlib.Path(__file__).resolve().parents[1];RAW=ROOT.parents[1]/'output/attack-library/arcade-kfm';result={}
for pack in ['Kyo','Benimaru','Joe','Kim','King','Vice','Shingo','Ryo','Chun-Li','Ken','Guile']:
 p=RAW/pack;sprites=load_sff(p/'Sprite.sff');text=(p/'Anim.air').read_text(encoding='utf-8-sig');sections={};current=None
 for line in text.splitlines():
  m=re.match(r'\[Begin Action (\d+)\]',line,re.I)
  if m:current=int(m[1]);sections[current]=[]
  elif current is not None:sections[current].append(line)
 clips={};directory=ROOT/'assets/arcade-fx'/pack.lower();directory.mkdir(parents=True,exist_ok=True);atlas=Image.new('RGBA',(2048,2048));page=0;x=y=row=0;positions={}
 for aid,lines in sections.items():
  if not (8000<=aid<=8150 or aid in [8500,8501,8502,1005,1205,3005,3105]):continue
  fs=[]
  for line in lines:
   parts=[p.strip() for p in line.split(';')[0].split(',')]
   if len(parts)<5 or not all(re.fullmatch('-?\d+',v) for v in parts[:5]):continue
   g,n,dx,dy,ticks=map(int,parts[:5])
   if (g,n) not in sprites:continue
   im,ax,ay=sprites[g,n];flip=parts[5].upper() if len(parts)>5 else '';key=(g,n,flip)
   if key not in positions:
    im=im.copy()
    if 'H' in flip:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT);ax=im.width-ax
    if 'V' in flip:im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM);ay=im.height-ay
    if x+im.width>2048:x=0;y+=row;row=0
    if y+im.height>2048:atlas.save(directory/f'fx-{page}.png');atlas=Image.new('RGBA',(2048,2048));page+=1;x=y=row=0
    atlas.paste(im,(x,y));positions[key]=(page,x,y,ax,ay);x+=im.width;row=max(row,im.height)
   pg,xx,yy,ax,ay=positions[key];fs.append({'image':f'assets/arcade-fx/{pack.lower()}/fx-{pg}.png','x':xx,'y':yy,'w':im.width,'h':im.height,'anchor':[ax-dx,ay-dy],'duration':max(1,ticks)/60})
  if fs:clips[str(aid)]=fs
 atlas.save(directory/f'fx-{page}.png');cues={}
 for state in (p/'States').glob('*'):
  if state.suffix.lower() not in ('.st','.cns'):continue
  text=state.read_text(errors='replace')
  for sm in re.finditer(r'\[State\s+(\d+),[^\]]*\]([^\[]*)',text,re.I):
   sid,body=sm.groups()
   if not re.search(r'type\s*=\s*Explod\b',body,re.I):continue
   aid=re.search(r'^anim\s*=\s*(\d+)\s*$',body,re.M|re.I);trigger=re.search(r'trigger1\s*=\s*AnimElem\s*=\s*(\d+)\s*$',body,re.M|re.I)
   if not aid or aid[1] not in clips or not trigger:continue
   def vec(key,default):
    m=re.search(r'^'+key+r'\s*=\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)',body,re.I|re.M);return [float(m[1]),float(m[2])] if m else default
   cues.setdefault('attack-'+sid,[]).append({'clip':aid[1],'element':int(trigger[1]),'offset':vec('pos',[0,0]),'scale':vec('scale',[1,1])})
 result['arcade-'+pack.lower()]={'clips':clips,'cues':cues,'source':f'Jmorphman/{pack}/Anim.air + States','limitations':'仅解析固定Explod与AnimElem触发；Helper、条件表达式与完整CNS仍未模拟'}
 print(pack,len(clips),'native effect clips',flush=True)
(ROOT/'data/arcade-fx.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
