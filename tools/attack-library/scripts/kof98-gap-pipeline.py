#!/usr/bin/env python3
"""One serial source pipeline: observe one role, export, audit, record progress."""
from pathlib import Path
import argparse,hashlib,json,os,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'data/research'
REV=BASE/'kof98-source-reference-20261016-r5';OBS=BASE/'kof98-gap-observations-20261016-r4-headless'
ORDER=['robert','king','vice','benimaru','kyo','daimon','joe','ryo','mai','athena','terry','kim','andy','shingo','leona','iori']
QA=BASE/'kof98-source-reference-audit-20261016/continuation'
def write(p,d):
 p.parent.mkdir(exist_ok=True,parents=True);q=p.with_suffix('.tmp');q.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');q.replace(p)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def native_frame_level(f):
 if f.get('pixelGatePassed'):return 'visible-pixel-compared'
 if f.get('registeredVisibilityGatePassed'):return 'exact-source-not-drawn'
 b=f.get('nativeDrawingBounds');body=f.get('bodyObjects',[])
 if f.get('image') and f.get('entityNativeScreen') and b and (b[2]<=0 or b[0]>=320 or b[3]<=0 or b[1]>=224) and not f.get('problems') and not f.get('unresolvedOccluders') and f.get('visibleOwnPixels')==0 and not f.get('visibleOwnMismatchPixels') and not f.get('occlusionCompositeMismatchPixels') and len({o['group']for o in body})==1:
  return 'offscreen-native-vram-only'
 return 'pending'
def progress():
 baseline=json.loads((ROOT/'data/kof98-source-reference-next-evidence.json').read_text())
 totals={'baselinePendingWindows':212,'metadataGapBaseline':187,'metadataRecoveredWindows':0,'pixelGateClosedBaselineWindows':0,'registeredNativeTimelineClosedBaselineWindows':0}
 roles=[];review=[]
 for source in baseline['sources']:
  name=source['source'];manifest=REV/name/'manifest.json';audit=REV/name/'artifact-audit.json'
  if not manifest.exists():continue
  m=json.loads(manifest.read_text());a=json.loads(audit.read_text()) if audit.exists()else None
  pending_ids={c['id']for c in source['pendingWindows']};rows=[]
  for c in m['clips']:
   p=REV/c['path'];r=json.loads(p.read_text());v=r['clip']['validation'];levels=[native_frame_level(f)for f in r['perRefresh']]
   timeline=(bool(levels) and all(x!='pending'for x in levels) and (v['transparentSequenceComplete']or v.get('observedSequenceComplete')))
   metadata=bool(r['originalIndexMetadata'].get('newObservationReceipt')) and all(f.get('cameraWorldX')is not None and f.get('facingRaw')is not None for f in r['perRefresh'])
   item={'id':c['id'],'receipt':str(p.relative_to(ROOT)),'receiptSHA256':digest(p),'baselineGap':c['id']in pending_ids,'simultaneousMetadataRecovered':metadata,'strictVisiblePixelWindowPassed':v['pixelGatePassed'],'registeredNativeTimelineComplete':timeline,'offscreenVRAMOnlySamples':levels.count('offscreen-native-vram-only'),'explicitNotDrawnSamples':levels.count('exact-source-not-drawn'),'pendingSamples':levels.count('pending')}
   rows.append(item)
   if item['baselineGap']:
    totals['metadataRecoveredWindows']+=metadata;totals['pixelGateClosedBaselineWindows']+=bool(v['pixelGatePassed']);totals['registeredNativeTimelineClosedBaselineWindows']+=timeline
   for f,level in zip(r['perRefresh'],levels):
    if level=='offscreen-native-vram-only':review.append({'source':name,'clip':c['id'],'sourceTick':f['sourceTick'],'receiptSHA256':item['receiptSHA256'],'nativeSnapshotSHA256':f['nativeSnapshotSHA256'],'vramSHA256':f['vramSHA256'],'sourceDrawingID':f['sourceDrawingID'],'nativeDrawingBounds':f['nativeDrawingBounds'],'level':level,'pixelGatePassedRemainsFalse':not f['pixelGatePassed']})
  roles.append({'source':name,'artifactAuditPassed':bool(a)and all(x['artifactAuditPassed']for x in a['characters']),'clips':rows})
 totals.update({'remainingHistoricalMetadataWindows':187-totals['metadataRecoveredWindows'],'remainingStrictVisiblePixelBaselineWindows':212-totals['pixelGateClosedBaselineWindows'],'remainingNativeTimelineBaselineWindows':212-totals['registeredNativeTimelineClosedBaselineWindows']})
 result={'schema':'kof98-gap-progress/v1','scope':'Original212 source-window gaps; dedicated context gaps and gameplay semantics separate. Offscreen native VRAM images are not screenshot pixel-proof.','updatedUnixTime':time.time(),**totals,'roles':roles,'allMovesComplete':False,'targetArtworkComplete':False}
 write(QA/'progress.json',result);write(QA/'offscreen-native-vram-review.json',{'schema':'kof98-native-offscreen-review/v1','scope':'Geometric source registration and native CROM/VRAM provenance only. Does not flip any original pixel gate or claim unseen pixels screenshot-proved.','frames':review})
 return totals

def combine_audits():
 chars=[]
 for n in ORDER:
  p=REV/n/'artifact-audit.json'
  if p.exists():chars.extend(json.loads(p.read_text())['characters'])
 write(REV/'artifact-audit.json',{'schema':'kof98-source-reference-artifact-audit/v1','characters':chars,'allReferencedRawSourceHashesChecked':True,'scope':'Per-role actual artifact and source hashes, independently audited after serial export; incomplete imagery/semantic claims stay recorded.'})
def run(stage,arguments,name):
 log=QA/f'{name}-{stage}.log'
 with log.open('w')as stream:r=subprocess.run([sys.executable,*map(str,arguments)],stdout=stream,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(f'{stage} failed for {name}; see {log}')
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--characters',nargs='+',choices=ORDER,default=ORDER);p.add_argument('--progress-only',action='store_true');args=p.parse_args();QA.mkdir(exist_ok=True,parents=True);REV.mkdir(exist_ok=True,parents=True)
 if args.progress_only:print(json.dumps(progress()));return
 lock=REV/'serial-pipeline.lock';fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL);os.write(fd,str(os.getpid()).encode());os.close(fd)
 try:
  for name in args.characters:
   print(json.dumps({'role':name,'stage':'observe','time':time.time()}),flush=True)
   run('observe',[ROOT/'scripts/kof98-gap-observe.py','--characters',name,'--output',OBS],name)
   print(json.dumps({'role':name,'stage':'export'}),flush=True)
   run('export',[ROOT/'scripts/kof98-source-reference-v5.py','--characters',name],name)
   print(json.dumps({'role':name,'stage':'audit'}),flush=True)
   run('audit',[ROOT/'scripts/audit-kof98-source-reference.py',REV,'--characters',name,'--source-hashes','--output',REV/name/'artifact-audit.json'],name)
   combine_audits();print(json.dumps({'role':name,'stage':'complete',**progress()}),flush=True)
 finally:lock.unlink()
if __name__=='__main__':main()
