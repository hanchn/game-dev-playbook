#!/usr/bin/env python3
"""Run fresh original matches and publish continuous native supplementary windows."""
from pathlib import Path
import argparse,ast,csv,hashlib,json,os,shutil,subprocess,time
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'data/research/kof98-edges-20261016'
tree=ast.parse((ROOT/'scripts/kof98-multichar-run.py').read_text())
def route_literal(node):
 if isinstance(node,ast.Dict):return {route_literal(k):route_literal(v) for k,v in zip(node.keys,node.values)}
 if isinstance(node,ast.List):return [route_literal(x) for x in node.elts]
 if isinstance(node,ast.BinOp) and isinstance(node.op,ast.Mult):
  left,right=route_literal(node.left),route_literal(node.right)
  if not isinstance(left,list) or not isinstance(right,int) or not 0<=right<=12:raise ValueError('Invalid route repetition')
  return left*right
 if isinstance(node,ast.BinOp) and isinstance(node.op,ast.Add):return route_literal(node.left)+route_literal(node.right)
 return ast.literal_eval(node)
ROUTES=route_literal(next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='ROUTES' for t in n.targets)))
NAMES={'idle':'待机','p2-approach':'对手接近','opponent-cross-turn':'对手跳过后的地面转身','settle':'落地站定','super-neutral':'下压后原地高跳尝试','super-forward':'下压后前向高跳尝试','super-back':'下压后后向高跳尝试','hyper-forward':'下压后前向短跳尝试','hyper-back':'下压后后向短跳尝试','crouch-hurt-light':'蹲姿轻受击','crouch-hurt-heavy':'蹲姿重受击','air-hurt-light':'空中轻受击','air-hurt-heavy':'空中重受击','air-guard-attempt':'空中防御尝试'}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,data):
 tmp=path.with_name(path.name+f'.{os.getpid()}.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)
def publish():
 chars={}
 for name in ROUTES:
  clips=[]
  for p in sorted((BASE/name).glob('*/capture.json')):
   if p.parent.name=='extra-reactions' and (BASE/name/'extra-reactions-v2/capture.json').exists():continue
   result=json.loads(p.read_text())
   if not result['traceValid']:continue
   clips.extend(result['clips'])
  chars[name]={'clips':clips,'blocked':[],'identityVisualVerified':False}
 write(BASE/'playback-index.json',{'schema':'original-kof98-extra-inputs/v1','characters':chars,'fullMovesVerified':False})
def run(name,batch):
 out=BASE/name/batch
 if (out/'capture.json').exists():return
 for sub in ['snap','vram','palette','selection','cfg','nvram']:(out/sub).mkdir(parents=True,exist_ok=True)
 script=out/'source.lua';shutil.copyfile(ROOT/'scripts/kof98-edges-capture.lua',script)
 command=['mame','kof98','-rompath',str(ROOT/'assets/original-games/kof98'),'-noreadconfig','-video','none','-sound','none','-nothrottle','-skip_gameinfo','-autoboot_delay','0','-autoboot_script',str(script),'-cfg_directory',str(out/'cfg'),'-nvram_directory',str(out/'nvram'),'-seconds_to_run','110','-frameskip','0']
 write(BASE/'active.json',{'character':name,'batch':batch,'started':time.time(),'pid':os.getpid()})
 with (out/'runtime.log').open('w') as log:
  process=subprocess.run(command,env={**os.environ,'KOF_STUDY_OUT':str(out),'KOF_ROUTE':','.join(ROUTES[name]),'KOF_EDGE_BATCH':batch,'KOF_DUMP_GFX':'0'},stdout=log,stderr=subprocess.STDOUT,timeout=240)
 with (out/'trace.csv').open() as stream:rows=list(csv.DictReader(stream))
 valid=process.returncode==0 and bool(rows) and all(None not in r and all(v is not None for v in r.values()) for r in rows)
 if valid:valid=len(list((out/'snap').glob('*.png')))==len(rows)
 if valid:valid=all(int(b['tick'])==int(a['tick'])+1 and int(b['screenFrame'])==int(a['screenFrame'])+1 for a,b in zip(rows,rows[1:]))
 if not valid:write(out/'failure.json',{'returnCode':process.returncode,'rows':len(rows),'continuous':False});raise RuntimeError('Invalid capture '+str(out))
 phases={}
 for row in rows:phases.setdefault(row['phase'],[]).append(row)
 clips=[]
 for phase,frames in phases.items():
  ys=[int(f['p1y']) for f in frames];faces=[int(f['p1facing']) for f in frames];life=[int(f['p1life']) for f in frames];airborne=min(ys)<200
  observed=(phase=='opponent-cross-turn' and len(set(faces))>1 and min(ys)==216) or ((phase.startswith('super-') or phase.startswith('hyper-') or phase.startswith('air-')) and airborne)
  if 'hurt' in phase:observed=(min(life)<life[0] and ('crouch' in phase or airborne))
  if 'guard' in phase:observed=False
  status='observed' if observed else 'not_observed' if (phase.startswith('super-') or phase.startswith('hyper-') or phase.startswith('air-')) and not airborne else 'not_verified'
  label=NAMES.get(phase,phase.replace('air-forward-','前向空中 ').replace('air-back-','后向空中 ').replace('air-short-','短跳空中 '))
  clips.append({'id':name+'-'+batch+'-'+phase,'label':label,'refreshHz':float(frames[0]['refreshHz']),'nativeScene':True,'captureStatus':'captured','triggerStatus':status,'batch':batch,'frames':[{'image':str((out/'snap'/f"{f['tick']}.png").relative_to(ROOT)),'sourceTick':int(f['tick']),'ticks':1} for f in frames],'stateEvidence':{'minY':min(ys),'maxY':max(ys),'facingValues':sorted(set(faces)),'lifeStart':life[0],'lifeMin':min(life)},'evidenceNote':'状态证据仅指实体腾空/朝向变化/HP变化；具体招式、防御、帧表与判定须另验。'})
 result={'characterIntended':name,'batch':batch,'traceValid':True,'rawRefreshes':len(rows),'sourceSHA256':sha(script),'traceSHA256':sha(out/'trace.csv'),'inputSHA256':sha(out/'inputs.csv'),'memoryWrites':False,'command':command,'clips':clips}
 write(out/'capture.json',result);publish();print(name,batch,len(rows),'continuous',flush=True)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--characters',nargs='+',choices=list(ROUTES),default=list(ROUTES));parser.add_argument('--batches',nargs='+');args=parser.parse_args()
 batches=args.batches or list(json.loads((BASE/'plan.json').read_text())['batches'])
 for name in args.characters:
  for batch in batches:run(name,batch)
 write(BASE/'active.json',{'status':'ended'});publish()
if __name__=='__main__':main()
