#!/usr/bin/env python3
"""Publish original Joe v5 candidates; keep every observed entity position and tick."""
from pathlib import Path
from PIL import Image
import csv,hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'data/research/kof98-multichar-20261016/joe/occlusion-render-v5'
DEST=ROOT/'assets/original-kof98-study/joe'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 data=json.loads((SOURCE/'study-manifest.json').read_text());DEST.mkdir(parents=True,exist_ok=True);receipts=[]
 for p in sorted((SOURCE/'frames').glob('*.png')):
  target=DEST/p.name
  if target.exists() and target.read_bytes()!=p.read_bytes():raise ValueError('Conflicting source PNG: '+p.name)
  pixel=hashlib.sha256(Image.open(p).convert('RGBA').tobytes()).hexdigest()
  refs=[f for f in data['frames'] if f['image']=='frames/'+p.name]
  if not refs or any(f['pixelSHA256']!=pixel for f in refs):raise ValueError('Source pixel checksum mismatch')
  if not target.exists():shutil.copyfile(p,target)
  receipts.append({'file':str(target.relative_to(ROOT)),'sha256':sha(target),'pixelSHA256':pixel})
 clips=[]
 for c in data['clips']:
  fs=[f for f in data['frames'] if f['phase']==c['id']]
  passed=bool(fs) and all(f['nativeMismatches']==0 and f['occlusionCompositeMismatches']==0 and f['visibleOwnPixels']>0 and not f['unsupportedZoomObjects'] for f in fs)
  frames=[{'image':'assets/original-kof98-study/joe/'+Path(f['image']).name,'ticks':1,'sourceTick':f['tick'],'pivot':f['pivot'],'entityNativeScreen':f['entityNativeScreen'],'nativePixelPassed':passed} for f in fs]
  clip={'id':c['id'],'frames':frames,'nativeSprite':True,'refreshHz':data['refreshHz'],'allFrameSamplesPassed':passed,'scope':'Observed ordinary-input window; pixel/composite match excludes HUD; move trigger and full moveset not accepted'}
  if c['id']=='jump-neutral':clip['triggerReview']={'status':'not-observed','reason':'Original 2840..2904 window did not take off; y remains216 and reviewed alpha silhouette stays grounded. Three Up ticks directly after running are not accepted as a successful jump.'}
  clips.append(clip)
 result={**{k:data[k] for k in ['character','refreshHz','nativeViewport','canvasContract','samples','uniqueDrawings','sourceFiles','limitations','visualAccepted','allMovesComplete']},'sourceManifestSHA256':sha(SOURCE/'study-manifest.json'),'clips':clips,'files':receipts,'sourceKind':'original-KOF98-VRAM-reconstruction-with-composite-occlusion-proof'}
 (ROOT/'data/research/kof16-coverage-20261016/joe-original-study.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 probe=ROOT/'data/research/kof98-multichar-20261016/joe-jump-standalone-v1'
 if (probe/'trace.csv').exists():
  rows=list(csv.DictReader((probe/'trace.csv').open()));jump=[r for r in rows if r['phase']=='jump-neutral']
  if len(jump)!=120 or min(int(r['p1y']) for r in jump)>=216:raise ValueError('Standalone jump evidence incomplete')
  targetDir=ROOT/'assets/original-kof98-study/joe-jump-native';targetDir.mkdir(parents=True,exist_ok=True);frames=[];files=[]
  for row in jump:
   source=probe/'snap'/f"{row['tick']}.png";target=targetDir/source.name
   if target.exists() and sha(target)!=sha(source):raise ValueError('Conflicting native jump PNG')
   if not target.exists():shutil.copyfile(source,target)
   frames.append({'image':str(target.relative_to(ROOT)),'sourceTick':int(row['tick']),'ticks':1,'pivot':[0,0]});files.append({'file':str(target.relative_to(ROOT)),'sha256':sha(target)})
  clip={'id':'jump-standalone','label':'站定后独立跳跃补采','nativeScene':True,'triggerObserved':True,'refreshHz':data['refreshHz'],'frames':frames}
  payload={'clip':clip,'files':files,'traceSHA256':sha(probe/'trace.csv'),'scope':'Original scene: standing probe with12 Up input ticks, not claimed minimum input duration; original failed run-to-jump window retained'}
  (ROOT/'data/research/kof16-coverage-20261016/joe-jump-probe.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'PNGs':len(receipts),'sourceRefreshes':sum(len(c['frames']) for c in clips),'windows':len(clips),'completeMoves':False}))
if __name__=='__main__':main()
