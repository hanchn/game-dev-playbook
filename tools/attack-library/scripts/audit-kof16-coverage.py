#!/usr/bin/env python3
"""Keep original KOF98 coverage separate from adapted SFF/AIR previews."""
import argparse, csv, hashlib, html, json, pathlib, re, shutil, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'data/research/kof16-coverage-20261016'
ROSTER=[('kyo','草薙京','草薙 京'),('benimaru','二阶堂红丸','二階堂紅丸'),('joe','东丈','ジョー東'),('kim','金家藩','キム'),('king','琼','キング'),('ryo','坂崎良','リョウ・サカザキ'),('vice','薇丝','バイス'),('shingo','矢吹真吾','矢吹真吾'),('iori','八神庵','八神 庵'),('terry','特瑞','テリー・ボガード'),('mai','不知火舞','不知火 舞'),('athena','麻宫雅典娜','麻宮アテナ'),('leona','莉安娜','レオナ'),('daimon','大门五郎','大門五郎'),('andy','安迪','アンディ・ボガード'),('robert','罗伯特','ロバート・ガルシア')]
CATEGORIES=['待机/转身/蹲起','前后走/跑/后撤','小跳/大跳/超级跳及方向变化','远近站立A/B/C/D','蹲A/B/C/D','空中A/B/C/D/CD','站CD与特殊技','近身投与投技受身','前后闪避/防御取消','站蹲空中防御及防御硬直','站蹲空中受击/击飞','倒地/起身/眩晕/失败','入场/胜利/挑衅','必杀及全部派生/强弱差别','超必杀/MAX及气槽条件','弹道/火焰/命中特效与定位','取消/连段/判定框/伤害/击停']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(s):return html.unescape(re.sub('<[^>]*>','',s)).strip()
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--original-study',type=pathlib.Path);args=ap.parse_args();EVIDENCE.mkdir(parents=True,exist_ok=True)
 sourceRows=[];official={}
 for number in [1,2]:
  url=f'https://game.snk-corp.co.jp/event/virtual-console/kof98/index_kof98-chara{number}_j.html'
  p=EVIDENCE/f'official-chara{number}.html'
  if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=30).read())
  data=p.read_bytes()
  try:text=data.decode('utf-8');encoding='utf-8'
  except UnicodeDecodeError:text=data.decode('cp932');encoding='cp932'
  sourceRows.append({'url':url,'file':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':len(data),'actualDecode':encoding,'scope':'Official Virtual Console reference; selected moves, not a complete arcade move/frame specification.'})
  for block in text.split('<div class="chara_list">')[1:]:
   name=re.search(r'<div class="chara_name2_2">(.*?)</div>',block,re.S)
   moves=re.search(r'<div class="chara_waza_name">(.*?)</div>',block,re.S)
   if not name or not moves:continue
   rows=re.split(r'<br\s*/?>',moves[1],flags=re.I);names=[]
   for row in rows:
    value=clean(row)
    if '：' in value:names.append(value.split('：',1)[0].strip())
   official[clean(name[1])]={'sourceURL':url,'listedSpecialNames':names,'completeMoveList':False,'commandIconFiles':re.findall(r'<img[^>]+src="([^"]+)"',moves[1],re.I),'inputMapping':'Wii remote symbols retained as source filenames; not assumed to be NeoGeo button labels.'}
 original=None
 if args.original_study:
  path=args.original_study.resolve();j=json.loads(path.read_text());base=path.parent.parent
  destination=ROOT/'assets/original-kof98-study/kyo';destination.mkdir(parents=True,exist_ok=True)
  clips=[];receipt=[]
  for clip in j['clips']:
   frames=[]
   for sourceFrame in clip['frames']:
    ref=pathlib.PurePosixPath(sourceFrame['image'])
    if ref.parts[:2]!=('assets','kyo') or '..' in ref.parts:raise ValueError('Only original Kyo images may be imported')
    source=(base/ref).resolve();allowed=(base/'assets/kyo').resolve()
    if not source.is_relative_to(allowed):raise ValueError('Kyo image path escaped')
    target=destination/source.name
    if target.exists() and sha(target)!=sha(source):raise ValueError('Existing image differs')
    if not target.exists():shutil.copyfile(source,target)
    receipt.append({'file':str(target.relative_to(ROOT)),'sha256':sha(target),'bytes':target.stat().st_size})
    frames.append({**sourceFrame,'image':str(target.relative_to(ROOT))})
   clips.append({**clip,'frames':frames,'allFrameSamplesPassed':all(f.get('nativePixelPassed') is True for f in frames),'scope':'Observed window includes idle before/after input; not the exact move duration or active hitbox frames.'})
  original={'character':'kyo','sourceKind':'original-KOF98-read-only-runtime-extraction','ROM_SHA256':'e5ef8ca6e72f364c227aeafacb04f7b9abc4d3dcc8123eaabeef2a603ff7e64b','sourceStudySHA256':sha(path),'refreshHz':j['refreshHz'],'clips':clips,'files':list({r['file']:r for r in receipt}.values()),'limitations':['Only Kyo; not sixteen characters','Pixel checks exclude a HUD-obscured bottom rectangle; not proof of every opaque pixel','Walk/run/kick/hurt candidates have known mismatches','No recovered hitboxes/cancels/complete state machine','Reconstruction canvas and pivot are experimental export coordinates, not an original author sprite canvas']}
  (EVIDENCE/'kyo-original-study.json').write_text(json.dumps(original,ensure_ascii=False,indent=2)+'\n')
 elif (EVIDENCE/'kyo-original-study.json').exists():original=json.loads((EVIDENCE/'kyo-original-study.json').read_text())
 studies={'kyo':original} if original else {}
 for studyId in ['joe']:
  studyPath=EVIDENCE/f'{studyId}-original-study.json'
  if studyPath.exists():studies[studyId]=json.loads(studyPath.read_text())
 characters=json.loads((ROOT/'data/characters.json').read_text());adapted={c['id']:c for c in characters if '拳皇' in c.get('series','')}
 captureRoot=ROOT/'data/research/kof98-multichar-20261016'
 progress=json.loads((captureRoot/'progress.json').read_text()) if (captureRoot/'progress.json').exists() else {'characters':{}}
 identities=json.loads((captureRoot/'identity-review.json').read_text()) if (captureRoot/'identity-review.json').exists() else {'characters':{}}
 rows=[]
 for id,name,japanese in ROSTER:
  c=adapted.get('arcade-'+id);report=ROOT/f'data/arcade-{id}-import.json';imported=json.loads(report.read_text()) if c and report.exists() else {}
  rows.append({'id':id,'name':name,'officialName':japanese,'official':official.get(japanese),'adapted':{'present':bool(c),'sourceKind':'MUGEN adaptation, not original KOF98','characterId':c['id'] if c else None,'sourceURL':c.get('source') if c else None,'selectableActionCount':len(c.get('actions',{})) if c else 0,'skillCount':len(c.get('skills',[])) if c else 0,'parsedAIRGroupCount':imported.get('actions',0),'evidence':str(report.relative_to(ROOT)) if report.exists() else None},'original':{'observedWindows':len(studies[id]['clips']) if id in studies else 0,'evidence':str((EVIDENCE/f'{id}-original-study.json').relative_to(ROOT)) if id in studies else None,'allMovesExtracted':False,'allMovesVisuallyVerified':False,'status':'partial-candidates' if id in studies else 'not-extracted'},'missingCategories':CATEGORIES})
 for row in rows:
  id=row['id'];p=progress.get('characters',{}).get(id,{});identity=identities.get('characters',{}).get(id,{})
  trace=captureRoot/id/'trace.csv';raw={'screenWindows':0,'refreshes':0,'identityVisualVerified':False,'localRawFramesAvailable':False,'evidence':None}
  if p.get('rawCaptureReady') and not p.get('identityRejected') and trace.exists():
   with trace.open() as f:recorded=list(csv.DictReader(f))
   if not recorded or any(int(b['tick'])!=int(a['tick'])+1 or int(b['screenFrame'])!=int(a['screenFrame'])+1 for a,b in zip(recorded,recorded[1:])):raise ValueError('Invalid original trace: '+id)
   proof=identity.get('evidence',[])
   checked=bool(proof) and all((captureRoot/e['file']).is_file() and sha(captureRoot/e['file'])==e['sha256'] for e in proof)
   raw={'screenWindows':len({x['phase'] for x in recorded}),'refreshes':len(recorded),'identityVisualVerified':identity.get('identityVisualVerified') is True and checked,'localRawFramesAvailable':all((captureRoot/id/'snap'/f"{x['tick']}.png").exists() for x in recorded),'evidence':str(trace.relative_to(ROOT))}
  row['original']['rawScreenCapture']=raw
 result={'schema':'kof98-sixteen-original-coverage/v1','targetCharacters':16,'version':'Original NeoGeo KOF98; adaptation catalogs kept separate','completeOriginalCharacters':0,'adaptedCharacterCount':sum(r['adapted']['present'] for r in rows),'adaptedSelectableActions':sum(r['adapted']['selectableActionCount'] for r in rows),'originalPartialCharacterCount':sum(r['original']['observedWindows']>0 for r in rows),'originalScreenCaptureCharacterCount':sum(r['original']['rawScreenCapture']['screenWindows']>0 for r in rows),'originalScreenCaptureWindowCount':sum(r['original']['rawScreenCapture']['screenWindows'] for r in rows),'sourceReferences':sourceRows,'referenceLimit':'Official pages are partial special-move references. They do not define all normal/conditional moves or original timing. No completion percentage is inferred from them.','characters':rows}
 (ROOT/'data/kof16-coverage.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:result[k] for k in ['targetCharacters','completeOriginalCharacters','adaptedCharacterCount','adaptedSelectableActions','originalPartialCharacterCount']}))
if __name__=='__main__':main()
