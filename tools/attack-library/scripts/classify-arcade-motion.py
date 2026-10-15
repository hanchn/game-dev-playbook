"""Keep AIR-only previews out of combat when native CNS motion is unresolved."""
import pathlib,json,re
ROOT=pathlib.Path(__file__).resolve().parents[1];RAW=ROOT.parents[1]/'output/attack-library/arcade-kfm';p=ROOT/'data/characters.json';cs=json.loads(p.read_text());report=[]
for c in cs:
 if not c['id'].startswith('arcade-') or not c.get('skills'):continue
 pack=next((d for d in RAW.iterdir() if d.is_dir() and 'arcade-'+d.name.lower()==c['id']),None)
 if not pack:continue
 states={}
 for file in (pack/'States').glob('*'):
  if file.suffix.lower() not in ('.st','.cns'):continue
  text=file.read_text(errors='replace')
  for m in re.finditer(r'\[StateDef\s+(\d+)\]([\s\S]*?)(?=\[StateDef|\Z)',text,re.I):states[int(m[1])]=states.get(int(m[1]),'')+'\n'+m[2]
 for skill in c['skills']:
  aid=int(skill.get('sourceState',skill['action'].split('-')[-1] if skill['action'].split('-')[-1].isdigit() else -1));body=states.get(aid,'');reasons=[]
  if re.search(r'\bair(?:borne)?\b',skill['name'],re.I):reasons.append('空中招式条件尚未执行')
  if re.search(r'^type\s*=\s*A\s*$|^physics\s*=\s*A\s*$|type\s*=\s*Gravity\b',body,re.M|re.I):reasons.append('CNS空中/重力状态未执行')
  for block in re.split(r'\[State\s',body,flags=re.I):
   if re.search(r'type\s*=\s*(?:VelSet|VelAdd|PosAdd)',block,re.I) and re.search(r'^y\s*=\s*(?!0\s*$)[^;\n]+',block,re.M|re.I):reasons.append('CNS纵向运动未执行');break
  if any(f.get('hold') for f in c['clips'].get(skill['action'],[])):reasons.append('AIR等待帧需要CNS退出条件')
  skill['previewOnly']=bool(reasons);skill['previewLimitations']=list(dict.fromkeys(reasons))
  hit=re.search(r'^ground\.hittime\s*=\s*(\d+)\s*(?:;[^\n]*)?$',body,re.M|re.I)
  if hit:skill['nativeHitstunSeconds']=int(hit[1])/60
  if reasons:report.append({'character':c['id'],'skill':skill['name'],'limitations':skill['previewLimitations']})
 c['defaultMoves']=[s for s in c.get('defaultMoves',[]) if any(v['id']==s and not v['previewOnly'] for v in c['skills'])]
p.write_text(json.dumps(cs,ensure_ascii=False,separators=(',',':')));(ROOT/'data/arcade-motion-limitations.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('Excluded from simplified auto combat:',len(report),'moves; retained in native frame study')
