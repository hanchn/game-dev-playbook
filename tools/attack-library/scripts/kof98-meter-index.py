#!/usr/bin/env python3
"""Atomic per-batch playback assembly; never infer real move acceptance from capture."""
import pathlib,csv,json,os,re
R=pathlib.Path(__file__).resolve().parents[1];B=R/'data/research/kof98-meter-20261016'
def build():
 annotations=json.loads((B/'visual-observations.json').read_text()) if (B/'visual-observations.json').exists() else {};characters={}
 records=sorted(B.glob('*/*/capture.json'));selected={};archived={}
 for p in records:
  rec=json.loads(p.read_text()); cfg=json.loads((p.parent/'move.json').read_text()).get('configuration',{}); key=(rec['character'],rec['label'],str(rec.get('officialMoveIndex','')),rec['condition'],bool(cfg.get('air') and cfg.get('close')));version=int((re.findall(r'v(\d+)',p.parent.name) or ['0'])[-1]);old=selected.get(key)
  if old is None or version>old[0]:
   if old:archived.setdefault(rec['character'],[]).append(str(old[1].parent.relative_to(B)))
   selected[key]=(version,p)
  else:archived.setdefault(rec['character'],[]).append(str(p.parent.relative_to(B)))
 for _,p in selected.values():
  rec=json.loads(p.read_text());out=p.parent;ch=rec['character'];item=characters.setdefault(ch,{'clips':[],'blocked':[],'archivedBatches':archived.get(ch,[])});
  if rec.get('returnCode') or 'missing end' in rec.get('conditionResult',''):
   item['blocked'].append({'id':out.name,'label':rec['label'],'reason':'interrupted runtime or missing end-result evidence'});continue
  rows=list(csv.DictReader((out/'trace.csv').open()));frames=[x for x in rows if x['phase'] in ['prepare-spacing','jump','neutral-before-command','motion','observe'] and (out/'snap'/(x['tick']+'.png')).is_file()];ticks=[int(x['tick']) for x in frames]
  if not ticks or not all(y==x+1 for x,y in zip(ticks,ticks[1:])):item['blocked'].append({'id':out.name,'label':rec['label'],'reason':'non-contiguous full-screen output or no gameplay frames'});continue
  ann=annotations.get(str(out.relative_to(B)),{});move=json.loads((out/'move.json').read_text()) if (out/'move.json').exists() else {};button=move.get('configuration',{}).get('button','?');item['clips'].append({'id':out.name,'button':button,'variantID':str(rec.get('officialMoveIndex','')),'label':rec['label']+' · '+button+' ['+out.name+'] · '+('自然低血+满气条件' if rec['condition']=='max' else 'EXTRA自然充气'),'refreshHz':59.185606,'refreshHzSource':'MAME0.289-listxml kof98 display','nativeScene':True,'frames':[{'image':str((out/'snap'/(x['tick']+'.png')).relative_to(R)),'ticks':1,'sourceTick':int(x['tick'])} for x in frames],'captureStatus':'captured','triggerStatus':ann.get('triggerStatus','not_verified'),'batch':str(out.relative_to(B)),'conditionEvidence':{'memoryWrites':False,'ordinaryInputOnly':True,'hp1Range':[min(int(x['hp1']) for x in rows),max(int(x['hp1']) for x in rows)],'meterRawRange':[min(int(x['meterRaw']) for x in rows),max(int(x['meterRaw']) for x in rows)],'meterRawIsNotAutomaticModeProof':True},'visualObservation':ann,'maxVariantVerified':ann.get('maxVariantVerified',False)})
 pilot=B/'kyo-extra-probe-v5';characters.setdefault('kyo',{'clips':[],'blocked':[]})['clips'].insert(0,{'id':'kyo-orochinagi-extra-natural-A-pilot','label':'大蛇薙A · EXTRA自然蓄气实看','refreshHz':59.185606,'nativeScene':True,'frames':[{'image':str((pilot/'snap'/f'{t}.png').relative_to(R)),'ticks':1,'sourceTick':t} for t in range(3100,3401)],'captureStatus':'captured','triggerStatus':'observed','batch':'kyo-extra-probe-v5','visualObservation':'EXTRA1080、满气3000、3175超杀起手/3200火焰/P2HP103→72实际view','maxVariantVerified':False})
 tmp=B/'playback-index.tmp';tmp.write_text(json.dumps({'characters':characters,'scope':'original MAME scene capture; attempted commands and natural conditions are not automatic move or MAX acceptance'},ensure_ascii=False,indent=2));os.replace(tmp,B/'playback-index.json');print('characters',len(characters),'clips',sum(len(v['clips']) for v in characters.values()))
if __name__=='__main__':build()
