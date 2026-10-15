import zipfile,json,pathlib,struct,re
root=pathlib.Path(__file__).resolve().parents[1];z=zipfile.ZipFile(root.parents[1]/'output/attack-library/NinjaAdventure-full.zip');rows=json.loads((root/'data/characters.json').read_text());rows=[r for r in rows if not r['id'].startswith('na-')]
for n in z.namelist():
 if '/Actor/' not in n or '/SpriteSheet' not in n or not n.endswith('.png'):continue
 rel=n.split('/Actor/')[1];typ=rel.split('/')[0];name=rel.split('/')[1];variant=pathlib.Path(n).stem.replace('SpriteSheet','');b=z.read(n);w,h=struct.unpack('>II',b[16:24]);key='na-'+re.sub('[^a-z0-9]+','-',typ.lower()+'-'+name.lower()+'-'+variant.lower()).strip('-');layout='direction-columns';kind={'Animal':'动物','Monster':'怪物','Character':'人形'}.get(typ,'人形')
 if typ=='Animal':
  if 'Chicken' in name or 'Duck' in name or 'Bird' in name or 'Owl' in name:kind='鸟类'
  cols=2;nr=1;dirs={'left':0,'right':0};actions={'idle':[0],'walk':[0,1]};layout='horizontal';notes='2帧移动；左右镜像；没有前后与攻击动作。基础动作资源。'
 elif typ in ['Monster','Character'] and w==64 and h in [64,112]:
  cols=4;nr=h//16;dirs={'down':0,'up':1,'left':2,'right':3};actions={'idle':[0],'walk':[0,1,2,3]};notes='四方向4帧走动。'
  if h==112:actions.update({'attack':[4],'jump':[5],'dead':[6]});notes+='攻击、跳跃、倒地各1姿势；倒地固定第0列。'
  if any(x in name.lower() for x in ['trex','dragon']):kind='恐龙' if 'trex' in name.lower() else '龙类'
  elif any(x in name.lower() for x in ['fish','octopus','axolot']):kind='鱼类 / 水生'
  elif any(x in name.lower() for x in ['bat','butterfly']):kind='飞行生物'
  elif any(x in name.lower() for x in ['bear','panda','mouse','racoon']):kind='动物'
 else:continue
 (root/'assets'/f'{key}.png').write_bytes(b);rows.append({'id':key,'name':name+(' · '+variant if variant else ''),'kind':kind,'image':f'assets/{key}.png','width':w,'height':h,'columns':cols,'rows':nr,'directions':dirs,'layout':layout,'actions':actions,'source':'https://pixel-boy.itch.io/ninja-adventure-asset-pack','license':'CC0','notes':notes,'archivePath':n})
(root/'data/characters.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');(root/'data/NinjaAdventure-LICENSE.txt').write_bytes(z.read('Ninja Adventure - Asset Pack/LICENSE.txt'))
print(len(rows),'characters')
