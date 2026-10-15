import pathlib,json,zipfile,io,shutil,re
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1];raw=root.parents[1]/'output/attack-library';(root/'assets/rich').mkdir(exist_ok=True);rows=[]
def make(key,name,kind,source,license):return {'id':key,'name':name,'kind':kind,'source':source,'license':license,'layout':'clips','directions':{'left':0,'right':0},'actions':{},'clips':{},'notes':'侧视原生朝向 + 镜像；没有独立前后朝向。','width':0,'height':0,'columns':1,'rows':1}
def action(c,key,im,rects,mirror=False):
 frames=[]
 for i,box in enumerate(rects):
  f=im.crop(box);p=f'assets/rich/{c["id"]}-{key}-{i}.png';f.save(root/p);frames.append({'image':p,'x':0,'y':0,'w':f.width,'h':f.height})
 c['actions'][key]=list(range(len(frames)));c['clips'][key]=frames;c['image']=frames[0]['image'] if 'image' not in c else c['image'];c['width']=frames[0]['w'];c['height']=frames[0]['h'];c['mirrorRight']=mirror
z=zipfile.ZipFile(raw/'bird.zip');c=make('little-bird','持剑鸟','鸟类','https://foozlecc.itch.io/little-bird','CC0')
for n in z.namelist():
 if n.endswith('.aseprite'):
  d=root/'assets/source/bird';d.mkdir(parents=True,exist_ok=True);(d/pathlib.Path(n).name).write_bytes(z.read(n))
 if '/Spritesheet/' not in n or not n.endswith('.png') or '/_Main' in n:continue
 key={'Death':'dead','Fly Forward':'fly','Fly Up':'fly-up','Glide':'glide','Heavy Attack':'attack-heavy','Hurt':'hurt','Idle on foot':'idle-ground','Idle':'idle','Jump Up':'jump','Run':'run','Light Attack':'attack'}[pathlib.Path(n).stem.replace('Little Bird ','').replace('Little Birt ','')];im=Image.open(io.BytesIO(z.read(n))).convert('RGBA');action(c,key,im,[(x,0,x+64,64) for x in range(0,im.width,64)])
rows.append(c)
c=make('fox','狐狸','动物','https://elthen.itch.io/2d-pixel-art-fox-sprites','作者免费发布；授权由使用者处理');im=Image.open(raw/'fox.png').convert('RGBA')
for y,key in enumerate(['idle','idle-2','run','catch','hurt','sleep','dead']):
 rects=[]
 for x in range(im.width//32):
  box=(x*32,y*32,(x+1)*32,(y+1)*32)
  if im.crop(box).getbbox():rects.append(box)
 action(c,key,im,rects)
rows.append(c)
im=Image.open(raw/'fish.png').convert('RGBA');cw,ch=32,32
for v in range(12):
 c=make('fish-'+str(v),'鱼 · '+str(v+1),'鱼类 / 水生','https://opengameart.org/content/cute-fish-sprites','OGA-BY 3.0');ox=(v%4)*128;oy=(v//4)*256
 for y,key in enumerate(['idle','swim','swim-down','win','heal','bubble','dead','attack']):action(c,key,im,[(ox+x*32,oy+y*32,ox+(x+1)*32,oy+(y+1)*32) for x in range(4)])
 rows.append(c)
# Preserve the rejected candidates only as metadata, outside the formal playable catalog.
p=root/'data/characters.json';old=json.loads(p.read_text());(root/'data/rejected-candidates.json').write_text(json.dumps({'reason':'动作不足；只有走动或单姿势攻击，不纳入正式库','candidates':old},ensure_ascii=False,indent=2))
p.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print([(c['id'],{a:len(f) for a,f in c['actions'].items()}) for c in rows[:3]])
