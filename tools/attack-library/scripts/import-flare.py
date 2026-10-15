# coding: utf-8
import pathlib,json,re,shutil,collections
r=pathlib.Path(__file__).resolve().parents[1];raw=r.parents[1]/'output/attack-library/flare';configs=sorted((raw/'mods/fantasycore/animations/enemies').glob('*.txt'));cs=json.loads((r/'data/characters.json').read_text());cs=[c for c in cs if not c['id'].startswith('flare-')];count=0
# Flare facing order: W, NW, N, NE, E, SE, S, SW.
dirs=['left','up-left','up','up-right','right','down-right','down','down-left']
alias={'stance':'idle','run':'run','melee':'attack','ranged':'shoot','ment':'special','hit':'hurt','die':'dead','critdie':'dead-critical','block':'block','cast':'special','swing':'attack'}
for config in configs:
 sections={};current=None;image=None
 for line in config.read_text().splitlines():
  line=line.strip()
  if line.startswith('#') or not line:continue
  if line.startswith('image='):image=line[6:]
  elif line.startswith('['):current=line[1:-1];sections[current]={'records':[]}
  elif current and '=' in line:
   k,v=line.split('=',1)
   if k=='frame':
    if all(re.fullmatch(r'-?\d+',x.strip()) for x in v.split(',')):sections[current]['records'].append([int(x) for x in v.split(',')])
   else:sections[current][k]=v
 if not image or not (raw/'mods/fantasycore'/image).is_file():continue
 if len(sections)<5:continue
 key='flare-'+config.stem;dst='assets/flare/'+image.removeprefix('images/');p=r/dst;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(raw/'mods/fantasycore'/image,p)
 c={'id':key,'name':config.stem.replace('_',' ').title(),'kind':'怪物','style':'半写实 / 3D预渲染','series':'Flare · Empyrean','perspective':'伪3D / 8向','source':'https://github.com/flareteam/flare-game','license':'原项目授权；用户处理','layout':'rect-clips','directions':dict(zip(dirs,range(8))),'actions':{},'clips':{},'width':256,'height':256,'columns':1,'rows':1,'image':dst,'recommended':True,'notes':'成熟ARPG原生精灵、动作配置与定位点。已按打包矩形解析；站立往返循环保留。'}
 for name,sec in sections.items():
  action=alias.get(name,name);frames=sec['records'];groups=collections.defaultdict(list)
  duration=sec.get('duration','1000ms');total=float(duration.removesuffix('ms'))/1000 if duration.endswith('ms') else float(duration)/60
  for vals in sorted(frames):
   if len(vals)!=8:continue
   idx,d,x,y,w,h,ax,ay=vals;groups[dirs[d]].append({'image':dst,'x':x,'y':y,'w':w,'h':h,'anchor':[ax,ay]})
  if not groups:continue
  for d,fs in groups.items():
   if sec.get('type')=='back_forth' and len(fs)>2:fs.extend(list(reversed(fs[1:-1])))
   for f in fs:f['duration']=total/len(fs)
  c['clips'][action]=dict(groups);c['actions'][action]=list(range(max(map(len,groups.values()))))
 if len(c['actions'])<5:continue
 if 'idle' not in c['actions']:
  c['clips']['idle']=next(iter(c['clips'].values()));c['actions']['idle']=next(iter(c['actions'].values()))
 cs.insert(0,c);count+=1
(r/'data/characters.json').write_text(json.dumps(cs,ensure_ascii=False,separators=(',',':'))+'\n');print('Flare mature actors',count)
