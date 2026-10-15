"""Audit native decoded frame geometry without changing dimensions, pivots or pixels."""
import pathlib,json,collections
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
characters=json.loads((ROOT/'data/characters.json').read_text());out=[];images={}
for c in characters:
 if c.get('series')!='街头霸王改编 · Jmorphman':continue
 actions=[]
 for action in ['idle','walk','walk-back','crouch','attack-punch-light','attack-punch-medium','attack-punch-heavy','attack-kick-light','attack-kick-medium','attack-kick-heavy','hurt','fall','dead','get-up']:
  frames=[]
  for index,f in enumerate(c['clips'].get(action,[])):
   key=f['image']
   if key not in images:images[key]=Image.open(ROOT/key).convert('RGBA')
   rect=(f['x'],f['y'],f['x']+f['w'],f['y']+f['h']);alpha=images[key].getchannel('A').crop(rect);box=alpha.getbbox()
   frames.append({'index':index,'nativeCanvas':[f['w'],f['h']],'atlas':key,'atlasRect':[f['x'],f['y'],f['w'],f['h']],'effectivePivot':f['anchor'],'visibleBounds':list(box) if box else None,'transparentMargins':[box[0],box[1],f['w']-box[2],f['h']-box[3]] if box else None,'durationSeconds':f['duration'],'holdUntilStateExit':bool(f.get('hold'))})
  if frames:actions.append({'action':action,'frames':frames})
 dims=collections.Counter(tuple(f['nativeCanvas']) for a in actions for f in a['frames'])
 out.append({'id':c['id'],'source':c['source'],'sourceType':'MUGEN adaptation; not original Street Fighter ROM','distinctNativeCanvasSizes':len(dims),'canvasRange':{'width':[min(w for w,h in dims),max(w for w,h in dims)],'height':[min(h for w,h in dims),max(h for w,h in dims)]},'actions':actions})
report={'method':'Original SFF canvas size and effective AIR pivot retained; inspect alpha bounds only; atlas packing changes storage rect, not native dimensions.','limitations':['Pose joint annotation and exact original-game timing not yet verified','Source is adaptation; cannot label these original Capcom rig or exact original frames','Alpha bound is not automatically a ground contact point'],'characters':out}
(ROOT/'data/research/sf-frame-geometry.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Geometry audited:',len(out),'SF adapted characters;',sum(len(a['frames']) for c in out for a in c['actions']),'frames')
for c in out:print(c['id'],c['distinctNativeCanvasSizes'],'native sizes',c['canvasRange'])
