import pathlib,re,json,sys
from sff_codec import load_sff
ROOT=pathlib.Path(__file__).resolve().parents[1];RAW=ROOT.parents[1]/'output/attack-library/arcade-kfm';IS_SF='--sf' in sys.argv;KEY='sf2-suzaku' if IS_SF else 'kof98-china';path=RAW/('SuzakuCastleCE.def' if IS_SF else 'KOF98-China.def')
text=path.read_text();sprites=load_sff(RAW/('SuzakuCastleCE.sff' if IS_SF else 'KOF98-China.sff'));out=ROOT/f'assets/scenes/{KEY}';out.mkdir(parents=True,exist_ok=True);lookup={}
for (g,n),(im,ax,ay) in sprites.items():
 name=f'{g}-{n}.png';im.save(out/name);lookup[f'{g},{n}']={'image':f'assets/scenes/{KEY}/{name}','w':im.width,'h':im.height,'anchor':[ax,ay]}
sections=[];cur=None
for line in text.splitlines():
 line=line.split(';')[0].strip()
 if line.startswith('['):cur={'section':line.strip('[]'),'records':[]};sections.append(cur)
 elif cur is not None:
  if '=' in line:
   k,v=line.split('=',1);cur[k.strip().lower()]=v.strip()
  elif line:cur['records'].append(line)
def vec(v,default):
 try:return [float(x.strip()) for x in v.split(',')]
 except:return default
animations={}
for s in sections:
 m=re.match('Begin Action (\\d+)',s['section'],re.I)
 if not m:continue
 frames=[]
 for row in s['records']:
  parts=[x.strip() for x in row.split(',')]
  if len(parts)<5 or not all(re.fullmatch('-?\\d+',x) for x in parts[:5]):continue
  g,n,dx,dy,duration=map(int,parts[:5]);sprite=lookup.get(f'{g},{n}')
  if sprite:frames.append({**sprite,'offset':[dx,dy],'duration':max(1,duration)/60})
 animations[m[1]]=frames
layers=[]
for s in sections:
 if not s['section'].lower().startswith('bg '):continue
 kind=s.get('type','normal');fs=animations.get(s.get('actionno'),[]) if kind=='anim' else [lookup.get(','.join(x.strip() for x in s.get('spriteno','').split(',')))]
 fs=[f for f in fs if f]
 if not fs:continue
 layers.append({'name':s['section'],'type':kind,'frames':fs,'start':vec(s.get('start','0,0'),[0,0]),'delta':vec(s.get('delta','1,1'),[1,1]),'tile':vec(s.get('tile','0,0'),[0,0]),'spacing':vec(s.get('tilespacing','0,0'),[0,0]),'velocity':vec(s.get('velocity','0,0'),[0,0]),'foreground':s.get('layerno','0')=='1','raw':s})
scene={'id':'kof98-china','name':'拳皇98 · 中国场景（PotS改编）','series':'拳皇改编 · Jmorphman','source':'https://network.mugenguild.com/pots/stages.html','ground':216,'viewport':[480,240],'layers':layers,'rawDefinition':text,'notes':'原DEF/SFF场景分层、动画、平铺与速度已解析。当前固定镜头；BG控制器、parallax变形尚未模拟，不作为完整关卡逻辑。'}
if IS_SF:scene.update(id=KEY,name='街头霸王II · 朱雀城（PotS改编）',series='街头霸王改编 · Jmorphman')
scenes=json.loads((ROOT/'data/scenes.json').read_text()) if (ROOT/'data/scenes.json').exists() else [];scenes=[x for x in scenes if x['id']!=scene['id']]+[scene]
(ROOT/'data/scenes.json').write_text(json.dumps(scenes,ensure_ascii=False,separators=(',',':')));print('Scene',len(sprites),'sprites,',len(layers),'layers')
