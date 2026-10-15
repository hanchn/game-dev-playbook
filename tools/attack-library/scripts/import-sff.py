"""Import an SFF v2 + AIR character, preserving axes, timing and frame flips.
Decoder follows IKEMEN src/image.go Lz5Decode / Rle8Decode.
Unsupported compression fails explicitly. AIR collision metadata retained separately.
"""
import pathlib,struct,json,io,re,hashlib,sys
from PIL import Image
def read_air(path):
 try:return path.read_text(encoding='utf-8-sig')
 except UnicodeDecodeError:return path.read_text(encoding='latin-1')
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT.parents[1]/'output/attack-library/arcade-kfm'
PACK=sys.argv[sys.argv.index('--pack')+1] if '--pack' in sys.argv else None
IS_KYO='--kyo' in sys.argv
KEY='kyo' if IS_KYO else 'kfm'
SFF=RAW/'Kyo/Sprite.sff' if IS_KYO else RAW/'kfm.sff'
AIR=RAW/'Kyo/Anim.air' if IS_KYO else RAW/'kfm.air'
if PACK:
 KEY=PACK.lower();SFF=RAW/PACK/'Sprite.sff';AIR=RAW/PACK/'Anim.air'
from sff_codec import load_sff
sprites=load_sff(SFF)
out=ROOT/f'assets/arcade/{KEY}';out.mkdir(parents=True,exist_ok=True)
labels={0:'idle',20:'walk',21:'walk-back',40:'jump-start',41:'jump',42:'jump-forward',43:'jump-back',47:'jump-land',100:'run',120:'block-start',130:'block',140:'block-end',11:'crouch',200:'attack-punch-light',210:'attack-punch-medium',220:'attack-punch-heavy',230:'attack-kick-light',240:'attack-kick-medium',250:'attack-kick-heavy',5000:'hurt',5100:'fall',5110:'dead',5120:'get-up'}
sections={};current=None;comment='';names={}
for line in read_air(AIR).splitlines():
 if line.startswith(';') and len(line.strip('; -'))>2:comment=line.strip('; ')
 match=re.match(r'\[Begin Action\s+(\d+)\]',line,re.I)
 if match:current=int(match[1]);sections[current]=[];names[current]=comment
 elif current is not None:sections[current].append(line)
clips={};actions={};metadata={};missing=[]
for aid,lines in sections.items():
 # Character state actions only; effect helpers remain in original AIR, not selectable body animations.
 if aid>=6000:continue
 action=labels.get(aid,('attack-' if 200<=aid<5000 else 'state-')+str(aid));fs=[]
 for line in lines:
  row=line.split(';')[0].strip();parts=[p.strip() for p in row.split(',')]
  if len(parts)<5 or not all(re.fullmatch(r'-?\d+',v) for v in parts[:5]):continue
  g,num,dx,dy,ticks=map(int,parts[:5])
  if g == -1:
   im=Image.new('RGBA',(1,1));ax=ay=0
  elif (g,num) not in sprites:missing.append([aid,g,num]);continue
  else:im,ax,ay=sprites[(g,num)]
  im=im.copy();flip=parts[5].upper() if len(parts)>5 else ''
  if 'H' in flip:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT);ax=im.width-ax
  if 'V' in flip:im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM);ay=im.height-ay
  name=f'{aid}-{len(fs)}.png';im.save(out/name)
  fs.append({'image':f'assets/arcade/{KEY}/{name}','x':0,'y':0,'w':im.width,'h':im.height,'anchor':[ax-dx,ay-dy],'duration':max(1,ticks)/60 if ticks>=0 else 1,'hold':ticks<0})
 if fs:clips[action]=fs;actions[action]=list(range(len(fs)));metadata[action]={'airAction':aid,'sourceName':names[aid],'raw':lines}
rejected=sorted(set(x[0] for x in missing))
for aid in rejected:
 action=labels.get(aid,('attack-' if 200<=aid<5000 else 'state-')+str(aid));clips.pop(action,None);actions.pop(action,None);metadata.pop(action,None)
c={'id':'arcade-kfm','name':'Kung Fu Man · 原版','kind':'人类 / 格斗','style':'街机 / 精细像素','series':'IKEMEN · Kung Fu Man','perspective':'横版 / 原生左右','source':'https://github.com/ikemen-engine/Ikemen-GO-Screenpack/tree/master/chars/kfm','license':'保留原始来源；授权另行处理','layout':'clips','directions':{'right':0,'left':1},'actions':actions,'clips':clips,'width':200,'height':200,'image':clips['idle'][0]['image'],'recommended':True,'notes':'原始SFF/AIR解码；保留轴心、帧偏移、镜像和60Hz时序。当前是同角色双实例练习，并非两个不同角色。'}
if IS_KYO:
 c.update(id='arcade-kyo',name='草薙京 · Jmorphman',series='拳皇改编 · Jmorphman',source='https://network.mugenguild.com/jmorphman/characters/kyo-kusanagi/',notes='MUGEN改编版本，不冒充拳皇原版。SFF v1与AIR保留原生帧轴心和时间；CNS招式逻辑尚未模拟。')
if PACK:
 c.update(id='arcade-'+KEY,name={'Benimaru':'二阶堂红丸','Joe':'东丈','Kim':'金家藩','King':'琼','Ryo':'坂崎良','Vice':'薇丝','Shingo':'矢吹真吾','Chun-Li':'春丽','Ken':'肯','Guile':'古烈','Rolento':'罗兰多','Eagle':'伊格尔'}.get(PACK,PACK)+' · Jmorphman',series='拳皇改编 · Jmorphman',source='https://network.mugenguild.com/jmorphman/characters',notes='MUGEN改编版本；保留原生SFF/AIR轴心与时序。只演示动画，未模拟完整CNS逻辑。')
 if PACK in ['Chun-Li','Ken','Guile','Rolento','Eagle']:c['series']='街头霸王改编 · Jmorphman'
 skills=[]
 for a,n in [('attack-punch-light','站立轻拳'),('attack-punch-medium','站立中拳'),('attack-punch-heavy','站立重拳'),('attack-kick-light','站立轻脚'),('attack-kick-medium','站立中脚'),('attack-kick-heavy','站立重脚')]:
  if a in clips:skills.append(dict(id=a,action=a,name=n,kind='native',category='普攻'))
 for state in (RAW/PACK/'States').glob('*'):
  if state.suffix.lower() not in ('.st','.cns'):continue
  text=state.read_text(errors='replace')
  for m in re.finditer(r';=+<([^>]+)>[^\n]*\n\[StateDef (\d+)\][\s\S]*?\nanim\s*=\s*(\d+)',text,re.I):
   title,sid,aid=m.groups();a=labels.get(int(aid),'attack-'+aid)
   if a in clips and 1000<=int(sid)<4000 and not any(x['id']==a for x in skills):skills.append(dict(id=a,action=a,name=title.title(),kind='native',category='超必杀' if int(sid)>=3000 else '必杀',sourceState=int(sid)))
 c['skills']=skills;c['actionNames']={x['id']:x['name'] for x in skills};c['defaultMoves']=[x['id'] for x in skills[:1]+[x for x in skills if x['category']!='普攻'][:3]]
cs=json.loads((ROOT/'data/characters.json').read_text());cs=[x for x in cs if x['id']!=c['id']];cs.insert(0,c);(ROOT/'data/characters.json').write_text(json.dumps(cs,ensure_ascii=False,separators=(',',':')))
report={'character':c['id'],'sprites':len(sprites),'actions':len(actions),'frameReferences':sum(map(len,clips.values())),'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [SFF,AIR]},'metadata':metadata,'excludedIncompleteActions':rejected,'limitations':['AIR动画已导入；CNS战斗状态逻辑未模拟','AIR含-1帧的无限保持标志保留，预览暂按1秒展示','当前同角色双实例，不计作两个不同角色']}
(ROOT/f'data/arcade-{KEY}-import.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:report[k] for k in ['sprites','actions','frameReferences']}))
