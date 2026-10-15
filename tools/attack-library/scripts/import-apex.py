import pathlib,zipfile,subprocess,json
root=pathlib.Path(__file__).resolve().parents[1];raw=root.parents[1]/'output/attack-library';z=zipfile.ZipFile(raw/'apex.zip');cs=json.loads((root/'data/characters.json').read_text());cs=[c for c in cs if not c['id'].startswith('apex-')];directions=['down','left','right','up','down-left','up-left','down-right','up-right'];specs=[('walk',1,0,8),('run',2,0,8),('idle',3,0,3),('rest',3,24,3),('attack',4,0,3),('attack-2',4,24,3),('special',5,0,3),('block',5,24,3),('evade',6,0,3),('hurt',6,24,3),('critical',7,0,3),('woozy',7,24,3),('behavior',8,0,3),('dead',8,24,1)]
for folder in ['Apex_Hunter','Apex_Predator','Apex_Stalker']:
 key=folder.lower().replace('_','-');dest=root/'assets'/key;dest.mkdir(exist_ok=True)
 for num in range(1,9):
  p=dest/f'Sprite_{num}.png';p.write_bytes(z.read(f'{folder}/Sprite_{num}.png'));subprocess.run(['sips','-s','format','png',str(p),'--out',str(p)],capture_output=True,check=True)
 c={'id':key,'name':folder.replace('_',' '),'kind':'半写实怪兽','style':'半写实 / 3D预渲染','perspective':'2.5D / 8向','source':'https://pvgames.itch.io/pvgames-free-assets-apex-predators','license':'作者免费发布；用户处理','layout':'grid-clips','directions':dict(zip(directions,range(8))),'actions':{},'clips':{},'notes':'14组动作、8向，共400帧；走/跑每向8帧，其余多为每向3帧；死亡为每向1个最终姿势。512px原生帧。','width':512,'height':512,'columns':8,'rows':8,'image':f'assets/{key}/Sprite_3.png'}
 for a,sheet,start,count in specs:
  c['actions'][a]=list(range(count));c['clips'][a]={d:{'image':f'assets/{key}/Sprite_{sheet}.png','row':0,'w':512,'h':512,'count':count,'start':start+i*count,'gridColumns':8,'durations':[.12]*count,'anchors':[[256,400]]*count} for i,d in enumerate(directions)}
 cs.insert(0,c)
(root/'data/characters.json').write_text(json.dumps(cs,ensure_ascii=False,separators=(',',':'))+'\n');(root/'data/apex-animation-reference.txt').write_text((raw/'Reference - Monster Sheets.docx.txt').read_text());print('3 semi-realistic actors imported')
