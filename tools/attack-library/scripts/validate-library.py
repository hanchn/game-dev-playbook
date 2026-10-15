import json,pathlib,struct,collections
r=pathlib.Path(__file__).resolve().parents[1];cs=json.loads((r/'data/characters.json').read_text());dims={};problems=[];frames=0
for c in cs:
 if len(c['actions'])<5:problems.append((c['id'],'too few action groups'))
 for a,clip in c['clips'].items():
  fs=clip if isinstance(clip,list) else [f for v in clip.values() for f in (v if isinstance(v,list) else [v])]
  for f in fs:
   p=r/f['image']
   if p not in dims:
    if not p.is_file():problems.append((str(p),'missing'));continue
    b=p.read_bytes()[:24];dims[p]=struct.unpack('>II',b[16:24])
   w,h=dims[p]
   if isinstance(clip,list) or c['layout']=='rect-clips':
    valid=f['x']>=0 and f['y']>=0 and f['x']+f['w']<=w and f['y']+f['h']<=h;frames+=1
   else:
    frames+=f['count'];cols=f.get('gridColumns');last=f.get('start',0)+f['count']-1
    valid=(last%cols+1)*f['w']<=w and (last//cols+1)*f['h']<=h if cols else f['count']*f['w']<=w and (f['row']+1)*f['h']<=h
    valid=valid and len(f['durations'])==f['count'] and all(v>0 for v in f['durations']) and len(f['anchors'])==f['count']
   if not valid:problems.append((c['id'],a,'bounds or timing'))
dex=json.loads((r/'data/empress-moves.json').read_text());assert len(dex['moves'])==dex['count']==182
report={'characters':len(cs),'series':dict(collections.Counter(c['series'] for c in cs)),'styles':dict(collections.Counter(c['style'] for c in cs)),'uniqueImages':len(dims),'directionalFrameReferences':frames,'empressMoves':len(dex['moves']),'errors':problems}
(r/'data/validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False));assert not problems
