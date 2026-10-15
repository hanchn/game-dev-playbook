import json,pathlib,zipfile,re,io,collections
from PIL import Image
r=pathlib.Path(__file__).resolve().parents[1];raw=r.parents[1]/'output/attack-library';cs=json.loads((r/'data/characters.json').read_text());cs=[c for c in cs if not c['id'].startswith(('ga-','foozle-warrior','foozle-mecha'))];dest=r/'assets/expansion';dest.mkdir(exist_ok=True)
def slug(s):return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def actor(key,name,kind,style,series,source,layout='clips'):
 return {'id':key,'name':name,'kind':kind,'style':style,'series':series,'perspective':'俯视 2D / 4向' if layout=='grid-clips' else '侧视 2D','source':source,'license':'来源随包；用户处理','layout':layout,'directions':{'right':0,'left':0},'actions':{},'clips':{},'notes':'真实序列帧；侧视朝向镜像，不含独立前后动作。','width':0,'height':0,'columns':1,'rows':1}
alias={'dead':'dead','death':'dead','idle':'idle','walk':'walk','walking':'walk','run':'run','hurt':'hurt','attack':'attack','jump':'jump','jumpattack':'jump-attack','jumpthrow':'jump-throw','throw':'throw','slide':'slide','glide':'glide','shoot':'shoot','melee':'attack','fall':'fall','climb':'climb','land':'land'}
labels={'red-hat-boy-free-sprites':'红帽男孩','the-boy---free-sprites':'冒险男孩','cute-girl-free-sprites':'可爱女孩','ninja-adventure---free-sprites':'忍者','ninja-girl---free-sprites':'女忍者','adventurer-girl---free-sprites':'探险女孩','the-knight-free-sprites':'骑士','santa-claus-free-sprites':'圣诞老人','the-zombies-free-sprites':'僵尸','the-robot---free-sprites':'卡通机器人','cat-and-dog-free-sprites':'猫与狗','temple-run---free-sprites':'神庙跑者','jack-o-lantern-free-sprites':'南瓜怪'}
for p in sorted(raw.glob('*free-sprites-0.zip')):
 base=p.stem[:-2]
 if base not in labels:continue
 z=zipfile.ZipFile(p);groups=collections.defaultdict(lambda:collections.defaultdict(list))
 for n in z.namelist():
  if not n.endswith('.png') or any(t in n.lower().split('/') for t in ['library','__macosx','spritesheet']):continue
  m=re.fullmatch(r'([A-Za-z ]+?)(?:\s*\((\d+)\)|__(\d+))\.png',pathlib.Path(n).name)
  if not m:continue
  variant=str(pathlib.Path(n).parent).replace('png','').strip('/.');groups[variant][alias.get(slug(m[1]).replace('-',''),slug(m[1]))].append((int(m[2] or m[3]),n))
 for variant,acts in groups.items():
  if len(acts)<5:continue
  key='ga-'+slug(base+'-'+variant);kind='动物' if 'cat-and-dog' in base else '机甲 / 机器人' if 'robot' in base else '怪物' if 'zombie' in base or 'lantern' in base else '人类';c=actor(key,labels[base]+(' · '+variant if variant else ''),kind,'高清卡通','GameArt2D · 高清卡通',f'https://www.gameart2d.com/{base}.html')
  # Keep all frames in a common canvas so switching actions retains a stable baseline.
  frames=[]
  for a,items in acts.items():
   for i,n in items:
    im=Image.open(io.BytesIO(z.read(n))).convert('RGBA');frames.append((a,i,n,im))
  w=max(f[3].width for f in frames);h=max(f[3].height for f in frames)
  for a in acts:
   fs=[]
   for _,i,n,im in sorted([f for f in frames if f[0]==a],key=lambda f:f[1]):
    out=Image.new('RGBA',(w,h));out.alpha_composite(im,((w-im.width)//2,h-im.height));path=f'assets/expansion/{key}-{a}-{i}.png';out.save(r/path);fs.append({'image':path,'x':0,'y':0,'w':w,'h':h,'duration':.1,'anchor':[w/2,h*.93]})
   c['actions'][a]=list(range(len(fs)));c['clips'][a]=fs
  c.update(width=w,height=h,image=(c['clips'].get('idle') or next(iter(c['clips'].values())))[0]['image']);cs.insert(0,c)
# Warrior four native facings, authored frame size48.
z=zipfile.ZipFile(raw/'warrior.zip');c=actor('foozle-warrior','四向战士','人类','像素','Foozle · Lucifer','https://foozlecc.itch.io/lucifer-warrior','grid-clips');c['directions']={d:0 for d in ['down','left','right','up']};c['notes']='四方向原生10动作组，3种攻击，Aseprite源保留。';c.update(width=48,height=48)
for n in z.namelist():
 m=re.search(r'/Png/Warrior(Down|Left|Right|Up)(\w+)\.png$',n)
 if not m:continue
 d=m[1].lower();a={'Attack01':'attack','Attack02':'attack-2','Attack03':'attack-3','Death':'dead'}.get(m[2],m[2].lower());im=Image.open(io.BytesIO(z.read(n)));p=f'assets/expansion/warrior-{d}-{a}.png';(r/p).write_bytes(z.read(n));count=im.width//48;c['actions'][a]=list(range(count));c['clips'].setdefault(a,{})[d]={'image':p,'row':0,'w':48,'h':48,'count':count,'durations':[.1]*count,'anchors':[[24,40]]*count}
c['image']=c['clips']['idle']['down']['image'];cs.insert(0,c)
# Mecha source cells are80x64; dimensions are not square.
z=zipfile.ZipFile(raw/'mecha.zip');c=actor('foozle-mecha','科幻机甲 Boss','机甲 / Boss','像素','Foozle · Sci-fi Lab','https://foozlecc.itch.io/sci-fi-lab-mecha-boss')
for n in z.namelist():
 if '/mecha_boss/' not in n or not n.endswith('.png'):continue
 text=pathlib.Path(n).stem.lower();a='attack-heavy' if 'heavy attack' in text else 'attack' if 'light attack' in text else 'dead' if 'death' in text else 'jump' if 'jump' in text else 'fly' if 'flying' in text else 'fall' if 'falling' in text else 'charge' if 'charge' in text else 'hurt' if 'hurt' in text else 'run' if 'run' in text else 'idle';im=Image.open(io.BytesIO(z.read(n))).convert('RGBA');fs=[]
 for i in range(im.width//80):
  p=f'assets/expansion/mecha-{a}-{i}.png';im.crop((i*80,0,(i+1)*80,64)).save(r/p);fs.append({'image':p,'x':0,'y':0,'w':80,'h':64,'duration':.1})
 c['actions'][a]=list(range(len(fs)));c['clips'][a]=fs
c.update(width=80,height=64,image=c['clips']['idle'][0]['image']);cs.insert(0,c)
# Additional actual magic frame sequences.
fx=json.loads((r/'data/effects.json').read_text());fx=[f for f in fx if not f['id'].startswith('magic-')];z=zipfile.ZipFile(raw/'magic.zip');groups=collections.defaultdict(list)
for n in z.namelist():
 if re.search(r'/\d+\.png$',n):groups[pathlib.Path(n).parent.name].append(n)
for name,files in groups.items():
 key='magic-'+slug(name);paths=[]
 for i,n in enumerate(sorted(files)):
  p=f'assets/expansion/{key}-{i}.png';(r/p).write_bytes(z.read(n));paths.append(p)
 fx.append({'id':key,'name':name,'frames':paths,'source':'https://foozlecc.itch.io/pixel-magic-sprite-effects','license':'CC0'})
(r/'data/characters.json').write_text(json.dumps(cs,ensure_ascii=False,separators=(',',':'))+'\n');(r/'data/effects.json').write_text(json.dumps(fx,ensure_ascii=False,indent=2)+'\n');print('actors',len(cs),'new',[(c['name'],len(c['actions'])) for c in cs if c['id'].startswith(('ga-','foozle'))],'effects',len(fx))
