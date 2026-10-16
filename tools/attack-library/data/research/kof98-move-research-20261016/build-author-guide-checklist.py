import json,pathlib,re,hashlib
b=pathlib.Path(__file__).resolve().parent;rows=json.loads((b/'encyclopedia-layout-rows.json').read_text())
names={'Kyo Kusanagi':'Kyo','Benimaru Nikaido':'Benimaru','Goro Daimon':'Daimon','Terry Bogard':'Terry','Andy Bogard':'Andy','Joe Higashi':'Joe','Ryo Sakazaki':'Ryo','Robert Garcia':'Robert','King':'King','Mai Shiranui':'Mai','Athena Asamiya':'Athena','Leona':'Leona','Kim Kaphwan':'Kim','Vice':'Vice','Shingo Yabuki':'Shingo','Iori Yagami':'Iori'}
others=['Yuri Sakazaki','Ralf','Clark','Kensou Sie','Chin Gentsai','Chizuru Kagura','Choi Bounge','Chang Koehan','Yashiro Nanakase','Shermie','Chris','Ryuji Yamazaki','Blue Mary','Billy Kane','Mature','Heidern','Takuma Sakazaki','Saisyu Kusanagi','Heavy D!','Lucky Glauber','Brian Battler','Rugal Barnstein']
result={v:{'character':v,'authorName':k,'sourceMoves':[],'fullOriginalMovesetVerified':False} for k,v in names.items()};current=None;category='moves';pending=None
for row in rows:
 if row['page']==1:continue
 txt=row['text'].strip()
 if txt in names:current=result[names[txt]];category='moves';pending=None;continue
 if txt in others:current=None;pending=None;continue
 if current is None:continue
 if txt=='Desperation Moves':category='desperation';continue
 icons=[i for i in row['items'] if i['kind']=='command-icon' and i['text']!='[-]']
 if not icons:
  if txt.startswith('*'):
   if current['sourceMoves']:current['sourceMoves'][-1].setdefault('authorNotes',[]).append(txt)
  elif not any(x in txt for x in ['TEAM','http:','03/01/04']):pending=row
  continue
 first=min(i['x'] for i in icons);last=max(i['x'] for i in icons)
 prefix=' '.join(i['text'] for i in row['items'] if i['kind']=='text' and i['x']<first)
 name=' '.join(i['text'] for i in row['items'] if i['kind']=='text' and i['x']>last)
 if not name and pending and pending['page']==row['page'] and abs(pending['y']-row['y'])<9:name=pending['text'];pending=None
 if not name:name='UNRESOLVED-NAME-AT-PAGE-'+str(row['page'])+'-Y'+str(round(row['y']))
 tokens=[i['text'][1:-1] for i in icons];entry={'name':name,'authorCategory':category,'sourcePage':row['page'],'sourceRowY':round(row['y'],2),'sourceRawRow':txt,'conditionRaw':prefix,'commandTokens':tokens,'sourceKind':'nonofficial original author guide, NEO Encyclopedia Moves & Codes, printed2004; exact original KOF98 title, notUM','inputRuntimeVerified':False,'nativeTimingRecovered':False}
 if category=='desperation':entry['meterCondition']='Use actual stock/MAX/red-life condition per chosen original mode; no RAM modification'
 if prefix and not all(w in ['close','jump','tap','hold','not','too'] for w in prefix.split()):entry['priorMoveOrConditionRequiresReview']=prefix
 # Deterministic local segment proposals only when direction alternation is unambiguous.
 letter=[t for t in tokens if re.fullmatch('[ABCD](/[ABCD])*',t)]
 dirs=[t for t in tokens if re.fullmatch('[1-9]+',t) or 'charge' in t]
 if len(letter)==1 and 'or' not in tokens and not any('or' in t for t in tokens):
  motion=''.join(re.sub('[^1-9]','',t) for t in dirs);charge=any('charge' in t for t in dirs)
  entry['segmentCandidates']=[{'motion':motion or '5','button':btn,'rightFacing':True,'directionFrames':3,'chargeFirstDirectionFrames':70 if charge else None,'releaseAfter':True,'prerequisite':prefix or None,'status':'author-command-derived candidate; parent move/spacing/air/meter must be established with real ordinary inputs'} for btn in letter[0].split('/')]
 else:entry['segmentCandidates']=[];entry['candidateBlockReason']='multiple button stages or alternative directions; source tokens retained for explicit scheduling, do not flatten blindly'
 current['sourceMoves'].append(entry)
obj={'schema':'kof98-author-research-checklist/v1','sourceFile':'neo-encyclopedia-kof98-moves.pdf','sourceSha256':hashlib.sha256((b/'neo-encyclopedia-kof98-moves.pdf').read_bytes()).hexdigest(),'sourceAuthorAttribution':'The Unofficial SNK Neo Geo Games Encyclopedia of Moves & Codes; http://sindoni.altervista.org/neoencyclopedia/; hosted original printed guide at neo-arcadia.com','scope':'extended named-move candidate list from original author guide; not a claim of all normals/ROM tables/runtime verified','symbolReview':'Actual rendered page2 visually reviewed. Source inline RGB rows require vertical orientation correction. Command icons decoded by exact palette/RGB pixel hash; gray palette expanded to RGB. Source images and decoded rows preserved.','characters':list(result.values())}
(b/'author-guide-extended-checklist.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2));print([(x['character'],len(x['sourceMoves'])) for x in result.values()]);print('total',sum(len(x['sourceMoves']) for x in result.values()))
