#!/usr/bin/env python3
"""Audit immutable published original-frame windows; never classify move success."""
from pathlib import Path
import json,struct,hashlib,time,zlib
ROOT=Path(__file__).resolve().parents[1]
SOURCES=['actions','author','meter','edges']
TARGET=['kyo','benimaru','joe','kim','king','ryo','vice','shingo','iori','terry','mai','athena','leona','daimon','andy','robert']
def png_valid(data):
 if len(data)<24 or data[:8]!=b'\x89PNG\r\n\x1a\n' or struct.unpack('>II',data[16:24])!=(320,224):return False
 offset=8;imageData=False
 while offset+12<=len(data):
  length=struct.unpack('>I',data[offset:offset+4])[0];end=offset+12+length
  if end>len(data):return False
  kind=data[offset+4:offset+8];payload=data[offset+4:offset+8+length];crc=struct.unpack('>I',data[offset+8+length:end])[0]
  if zlib.crc32(payload)&0xffffffff!=crc:return False
  if kind==b'IDAT':imageData=True
  if kind==b'IEND':return imageData and end==len(data)
  offset=end
 return False
def audit():
 report={'createdUnix':time.time(),'scope':'Native PNG packaging and per-window timing, not full move acceptance, transparent sprite extraction or hitbox validation.','targetCharacters':TARGET,'collections':{},'allMovesAccepted':False};seen={};hashes={}
 for source in SOURCES:
  path=ROOT/f'data/research/kof98-{source}-20261016/playback-index.json'
  if not path.exists():continue
  data=json.loads(path.read_text());chars={};prefix=f'data/research/kof98-{source}-20261016/'
  for name,entry in data['characters'].items():
   clips=entry.get('clips',[]);errors=[];ids=set();count=0
   for clip in clips:
    if clip['id'] in ids:errors.append('duplicate id '+clip['id'])
    ids.add(clip['id']);end=None
    if abs(clip.get('refreshHz',0)-59.185606060843)>.00001:errors.append('invalid refresh '+clip['id'])
    for f in clip.get('frames',[]):
     count+=1;image=f['image'];tick=f['sourceTick'];duration=f['ticks']
     if not image.startswith(prefix) or '..' in Path(image).parts:errors.append('source escape '+image);continue
     if duration<1 or (end is not None and tick!=end):errors.append('timeline discontinuity '+clip['id'])
     end=tick+duration
     if image not in seen:
      file=ROOT/image
      try:
       payload=file.read_bytes();seen[image]=png_valid(payload);hashes[image]=hashlib.sha256(payload).digest()
      except OSError:seen[image]=False
     if not seen[image]:errors.append('missing or invalid native PNG '+image)
   blocked=entry.get('blocked',[])
   chars[name]={'clips':len(clips),'nativeRefreshSamples':count,'stateObserved':sum(c.get('triggerStatus')=='observed' for c in clips),'notObserved':sum(c.get('triggerStatus')=='not_observed' for c in clips),'unverified':sum(c.get('triggerStatus','not_verified')=='not_verified' for c in clips),'blocked':sum(not b.get('delegated') for b in blocked),'delegated':sum(bool(b.get('delegated')) for b in blocked),'packagingPassed':not errors,'errors':errors[:30]}
  report['collections'][source]={'indexSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'characters':chars}
 planPath=ROOT/'data/research/kof98-author-20261016/execution-plan.json'
 if planPath.exists() and 'author' in report['collections']:
  planned={c['id'] for c in json.loads(planPath.read_text())['candidates']};index=json.loads((ROOT/'data/research/kof98-author-20261016/playback-index.json').read_text());actual={c['id'] for e in index['characters'].values() for c in e.get('clips',[])};report['authorCandidateCoverage']={'planned':len(planned),'present':len(planned & actual),'missing':sorted(planned-actual),'meaning':'A captured candidate is not verified move identity or complete move timing.'}
 report['samplingContainsAllTargetRoles']={source:all(entry['characters'].get(name,{}).get('clips',0)>0 for name in TARGET) for source,entry in report['collections'].items()};fingerprint=hashlib.sha256()
 for image in sorted(hashes):fingerprint.update(image.encode()+b'\0'+hashes[image])
 report['nativePNGSequenceSHA256']=fingerprint.hexdigest();report['nativePNGValidation']='Each PNG geometry, complete chunk boundaries, CRCs, IDAT/IEND and complete-file SHA256; content is not visual move classification.';report['uniqueNativeImagesChecked']=len(seen);report['packagingPassed']=all(c['packagingPassed'] for s in report['collections'].values() for c in s['characters'].values())
 dest=ROOT/'data/research/kof98-full-action-qa-20261016';dest.mkdir(exist_ok=True);tmp=dest/'audit.json.tmp';tmp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');tmp.replace(dest/'audit.json')
 print(json.dumps({'packagingPassed':report['packagingPassed'],'uniqueNativeImagesChecked':len(seen),'counts':{s:sum(c['clips'] for c in e['characters'].values()) for s,e in report['collections'].items()}},ensure_ascii=False))
 if not report['packagingPassed']:raise SystemExit(1)
if __name__=='__main__':audit()
