#!/usr/bin/env python3
"""Preserve author rows; explicit alternatives and parent chains, never flatten stages."""
import json,pathlib,re,itertools
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/'data/research/kof98-author-20261016';SRC=ROOT/'data/research/kof98-move-research-20261016/author-guide-extended-checklist.json'
# Original rendered PDF row inspection corrects missing/split command icons and notes.
FIX={('Daimon',10):('41236','A'),('Daimon',11):('41236','C'),('Terry',9):('41236','B/D'),('Andy',8):('41236','B/D'),('Andy',12):('41236','A/C'),('Joe',4):('41236','A/C'),('Joe',8):('41236','B/D'),('Ryo',8):('41236','A/C'),('Robert',9):('41236','B/D'),('Mai',10):('41236','B/D'),('Athena',11):('41236','A/C'),('Vice',6):('41236','A/C'),('Vice',7):('41236','B/D'),('Shingo',9):('41236','B/D')}
NOTES={('Daimon',6):'footnote: C fakes Jirai Shin, not separate named move',('Terry',10):'unresolved spill row, not independently named move',('Mai',12):'hold-button attack note for preceding Chijou Musasabi, not separate move',('Leona',6):'Ground Saber using D prerequisite note for following Gliding Buster',('Kim',6):'Hi En Zan using D prerequisite note for following Ten Sou Zan'}
PARENT={('Leona',7):['Ground Saber'],('Kim',7):['Hi En Zan'],('Vice',9):['Black End','Mayhem']}
DIR={'1':['Down','Left'],'2':['Down'],'3':['Down','Right'],'4':['Left'],'5':[],'6':['Right'],'7':['Up','Left'],'8':['Up'],'9':['Up','Right']}
def segment(motion,btn,charge=False,repeat=1,hold=3):
 steps=[]
 for _ in range(repeat):
  for i,d in enumerate(motion or '5'):steps.append({'direction':d,'fields':DIR[d],'frames':70 if charge and i==0 else 3})
  steps[-1]['buttons']=btn.split('+');steps[-1]['frames']=max(steps[-1]['frames'],hold)
  if repeat>1:steps.append({'direction':'5','fields':[],'frames':8})
 return steps
j=json.loads(SRC.read_text());plan=[];gaps=[]
for c in j['characters']:
 name=c['character'];byname={x['name']:x for x in c['sourceMoves']}
 def variants(m,idx):
  tok=m['commandTokens'];cond=m['conditionRaw'];key=(name,idx)
  if key in FIX:motion,btn=FIX[key];return [(motion,b) for b in btn.split('/')]
  if 'or' in tok:
   # Direction alternatives precede one final button; repeated-button Kyo75 handled separately.
   if name=='Kyo' and idx==19:return [('236','B'),('236','D')]
   dirs=[x for x in tok if re.fullmatch('[1-9]+',x)];btn=next((x for x in reversed(tok) if re.fullmatch('[ABCD](/[ABCD])*',x)),None)
   return [(d,b) for d in dirs for b in (btn or '').split('/') if b]
  buttons=[x for x in tok if re.fullmatch('[ABCD](/[ABCD])*',x)];motion=''.join(re.sub('[^1-9]','',x) for x in tok if re.fullmatch('[1-9]+',x) or 'charge' in x)
  if not buttons:return []
  return [(motion or '5',b) for b in buttons[0].split('/')]
 def chains(m,idx,btn,depth=0):
  if depth>4:return []
  cond=m['conditionRaw'];parents=PARENT.get((name,idx))
  if parents is None:
   parents=[n for n in byname if n and n in cond]
   if parents:parents=sorted(parents,key=lambda n:cond.index(n))
  if not parents:return [[]]
  out=[]
  for pn in parents:
   pm=byname[pn];pi=c['sourceMoves'].index(pm);vs=variants(pm,pi)
   if not vs:continue
   choice=next((v for v in vs if v[1]==btn),vs[0])
   if (name,idx) in [('Leona',7),('Kim',7)]:choice=(choice[0],'D')
   for chain in chains(pm,pi,choice[1],depth+1):out.append(chain+[{'name':pn,'motion':choice[0],'button':choice[1],'charge':any('charge' in x for x in pm['commandTokens']),'condition':pm['conditionRaw']}])
  return out
 for idx,m in enumerate(c['sourceMoves']):
  base={'character':name.lower(),'sourceRow':idx,'label':m['name'],'sourcePage':m['sourcePage'],'sourceRawRow':m['sourceRawRow'],'conditionRaw':m['conditionRaw'],'sourceKind':m['sourceKind']}
  if m['authorCategory']=='desperation':gaps.append({**base,'reason':'super/desperation delegated to independent natural-meter batch'});continue
  if (name,idx) in NOTES:gaps.append({**base,'reason':NOTES[(name,idx)]});continue
  vs=variants(m,idx)
  if not vs:gaps.append({**base,'reason':'no unambiguous command/button after source review'});continue
  for motion,btn in vs:
   parent=chains(m,idx,btn)
   if not parent:gaps.append({**base,'reason':'parent chain unresolved'});continue
   for chain in parent:
    full=chain+[{'name':m['name'],'motion':motion,'button':btn,'charge':any('charge' in x for x in m['commandTokens']),'condition':m['conditionRaw']}]
    steps=[]
    for si,seg in enumerate(full):
     repeat=8 if name=='Joe' and seg['name']=='BakuRetsu Ken' else 3 if seg['name'].startswith('x3') else 1
     steps+=segment(seg['motion'],seg['button'],seg['charge'],repeat)
     if si<len(full)-1:steps.append({'direction':'5','fields':[],'frames':10})
    if (name,idx) in [('Kyo',19),('Iori',2)]:steps += [{'direction':'5','fields':[],'frames':10},{'direction':'5','fields':[],'frames':3,'buttons':[btn]}]
    cond=' '.join(x['condition'] for x in full);item={**base,'id':f'{name.lower()}-{idx:02d}-{motion}-{btn}-p{len(plan):03d}','motion':motion,'button':btn,'chain':full,'steps':steps,'close':('close' in cond and 'not too close' not in cond) or bool(chain),'air':'jump' in cond,'airThrow':'jump close' in cond,'charge':any(s['charge'] for s in full),'counter':name=='Kyo' and idx in [14,15,16],'conditionNotes':'Parent chain 10-frame handoff is probe timing, not recovered native cancel window','sourceCorrection':'rendered original PDF row manually inspected' if (name,idx) in FIX else None}
    
    if item['counter']:item['close']=True;item['conditionNotes']+='; corrected counter probe establishes close opponent for ordinary attack'
    if name=='Daimon' and idx in [7,9,10,11]:
     item['close']=True;item['opponentJump']=idx in [9,10];item['opponentAirAttack']=idx==9;item['opponentLowAttack']=False
    if name=='King' and idx==4:item['steps'].insert(3,{'direction':'5','fields':[],'frames':3})
    plan.append(item)
BASE.mkdir(parents=True,exist_ok=True);(BASE/'execution-plan.json').write_text(json.dumps({'sourceSHA256':j['sourceSha256'],'candidates':plan,'blockedSourceRows':gaps,'scope':'explicit author non-super variants including direction alternatives and parent branches; probes, not verified named moves'},ensure_ascii=False,indent=2))
print('non-super variant plans',len(plan),'source rows excluded',len(gaps))
