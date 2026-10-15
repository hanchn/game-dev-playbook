"""Validate and package MAME observations. No ROM/RAM writes or sprite-size claims."""
import argparse,collections,csv,hashlib,json,pathlib,shutil,zipfile
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--motions',type=pathlib.Path,required=True);p.add_argument('--contact',type=pathlib.Path,required=True);a=p.parse_args()
out=ROOT/'assets/research/ssf2t-runtime';out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
report={'game':'Super Street Fighter II Turbo (World 940223)','set':'ssf2t','emulator':'MAME 0.289','captureMethod':'headless native screen:snapshot + ordinary I/O inputs + read-only RAM','memoryWrites':False,'nativeViewport':[384,224],'screenRefreshHz':59.637405,'phaseScreenTicks':96,'scriptSHA256':sha((ROOT/'scripts/mame/ssf2t-actions.lua').read_bytes()),'limitations':['Only Ryu P1 versus Ken P2; not all sixteen fighters.','Full viewport observations are not native transparent character frames, original skeletons or authoring canvases.','State durations include turbo/frameskip/hitstop; they are not startup/active/recovery frame data.','Debug boxes are reconstructed from community pointer decoding; exact render-to-RAM latency and projectile/throw boxes are not verified.','KO unsigned life 65535 must not be interpreted as healthy.','No super capture, all-character fidelity or finished Naifrog art is claimed.'],'sources':[{'url':'https://github.com/peon2/fbneo-training-mode/tree/master/games/ssf2t','role':'RAM address research; raw observed values retained'},{'url':'https://github.com/JordanAnthonyKing/sf2-hitbox-extractor','commit':'cf65fd8da487affce4b68788c56e0ea3667ed721','role':'read-only push/hurt/attack pointer and screen-origin reconstruction, original authors Dammit, MZ, Felineki'}],'runs':[]}
for name,source in [('motions',a.motions),('contact',a.contact)]:
 log=(source/'runtime.log').read_text();assert 'LUA ERROR' not in log.upper() and 'LUA ERROR' not in log,log
 rows=list(csv.DictReader((source/'actions.csv').open()));assert rows
 byphase=collections.defaultdict(list)
 for r in rows:byphase[r['phase']].append(r)
 if name=='motions':
  assert len(byphase)==22 and len(rows)==2112
  assert all(r['gameState']=='10' for r in rows),'A sample crossed the round boundary'
  for phase in ['qcf-lp','dp-lp','qcb-lk']:assert any(r['p1state']=='12' for r in byphase[phase]),phase
  for n in range(1,7):
   for context in ['stand','crouch']:assert any(r['p1state']=='10' for r in byphase[f'{context}-{n}'])
   assert max(int(r['p1y']) for r in byphase[f'air-{n}'])>100
 else:
  assert any(int(r['p2hitfreeze'])>0 for r in rows)
  assert any(r['p2state']=='14' for r in rows)
  assert any(r['p2life']=='65535' for r in rows)
 snapshots=sorted((source/'snap').glob('*.png'));assert snapshots
 cols=8;atlas=Image.new('RGB',(384*cols,224*((len(snapshots)+cols-1)//cols)))
 boxrows=collections.defaultdict(list)
 for b in csv.DictReader((source/'boxes.csv').open()):boxrows[int(b['frame'])].append({k:(v if k=='kind' else int(v)) for k,v in b.items() if k!='frame'})
 lookup={int(r['frame']):r for r in rows};frames=[]
 for i,path in enumerate(snapshots):
  img=Image.open(path);assert img.size==(384,224)
  x,y=(i%cols)*384,(i//cols)*224;atlas.paste(img,(x,y))
  frame=int(path.name.split('-')[0]);r=lookup[frame]
  frames.append({'frame':frame,'phase':r['phase'],'phaseTick':int(r['phaseTick']),'rect':[x,y,384,224],'sourceSHA256':sha(path.read_bytes()),'p1State':int(r['p1state']),'p2State':int(r['p2state']),'p1Life':int(r['p1life']),'p2Life':int(r['p2life']),'boxes':boxrows[frame]})
 atlas.save(out/(name+'.png'))
 payload={'run':name,'nativeViewport':[384,224],'atlas':name+'.png','tickUnit':'emulated screen frame; raw counters in CSV','frames':frames,'limitations':report['limitations']}
 (out/(name+'.json')).write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
 shutil.copyfile(source/'actions.csv',out/(name+'-actions.csv'));shutil.copyfile(source/'boxes.csv',out/(name+'-boxes.csv'))
 phases=[]
 for phase,rs in byphase.items():phases.append({'id':phase,'samples':len(rs),'stateHistogram':dict(collections.Counter(r['p1state'] for r in rs)),'animationPointers':len(set(r['p1anim'] for r in rs)),'yRange':[min(int(r['p1y']) for r in rs),max(int(r['p1y']) for r in rs)],'p2LifeStart':int(rs[0]['p2life']),'p2LifeEnd':int(rs[-1]['p2life']),'maxObservedP2Hitfreeze':max(int(r['p2hitfreeze']) for r in rs)})
 with zipfile.ZipFile(out/(name+'-raw.zip'),'w',zipfile.ZIP_DEFLATED) as z:
  for f in [source/'actions.csv',source/'boxes.csv',source/'runtime.log',*snapshots]:z.write(f,f.relative_to(source))
 report['runs'].append({'id':name,'sourceOutput':str(source.resolve().relative_to(ROOT.parents[1])),'samples':len(rows),'snapshots':len(snapshots),'phases':phases,'artifacts':{f.name:sha(f.read_bytes()) for f in out.glob(name+'*')}})
(ROOT/'data/research/ssf2t-runtime-study.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Validated',[(r['id'],r['samples'],r['snapshots']) for r in report['runs']])
