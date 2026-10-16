"""Adapt actual SNK icon tokens into proposed ordinary-input schedules. No RAM operations."""
import pathlib,re,json
b=pathlib.Path(__file__).resolve().parent
matrix=json.loads((b/'target16-evidence-matrix.json').read_text())
# Wii remote 1/2/A/B -> NeoGeo LP/LK/HP/HK mapping is explicit adaptation,
# not an extraction of the game's command-recognition window.
buttons={'1':'A','2':'B','A':'C','B':'D'}
directions={'1':['Down','Left'],'2':['Down'],'3':['Down','Right'],'4':['Left'],'5':[],'6':['Right'],'7':['Up','Left'],'8':['Up'],'9':['Up','Right']}
characters=[]
for ch in matrix:
 lines=ch['officialSelectedSection']['selectedMovesOriginalTextWithImageTokens'];moves=[];name='';conditions=[]
 for line in lines:
  if '[image:' not in line:
   name=line;continue
  ds=re.findall(r'directionkey_(\d).gif',line);bs=re.findall(r'images/([12AB])_remote_text.gif',line)
  if not ds or not bs:continue
  cond=[]
  if '空中' in name+line:cond.append('airborne; schedule must start after a real jump')
  if '接近' in name+line:cond.append('close range; spacing must be established with ordinary walk inputs')
  if '★' in name:cond.append('super: real meter availability required; do not write power/health RAM')
  charge='ため' in line
  if charge:cond.append('charge move; proposed 70-frame hold is adaptation, not recovered native minimum')
  for bi in dict.fromkeys(bs):
   steps=[]
   for idx,d in enumerate(ds):steps.append({'direction':d,'fields':directions[d],'frames':70 if charge and idx==0 else 3})
   steps[-1]['buttons']=[buttons[bi]];steps[-1]['frames']=3
   moves.append({'name':name.rstrip('： '),'source':f'snk-official-chara{ch["officialSelectedSection"]["page"]}.html','rawCommandImageText':line,'directionNotation':''.join(ds),'sourceWiiButton':bi,'adaptedNeoGeoButton':buttons[bi],'conditions':cond,'ordinaryInputProposal':{'facing':'right','p1FieldPrefix':'P1 ','neutralBeforeFrames':12,'steps':steps,'releaseAllAfter':True,'observeFrames':90},'commandSourceVerified':True,'runtimeExecutionVerified':False,'nativeTimingRecovered':False})
 common=[]
 for posture in ['stand-far','stand-close','crouch','jump-neutral','jump-forward']:
  for button in 'ABCD':common.append({'id':posture+'-'+button,'button':button,'sourceStatus':'ordinary-input coverage candidate; exact normal name/range not yet recovered','ordinaryInputProposal':{'posture':posture,'buttonFrames':2,'airbornePressAfterJumpFrames':18 if posture.startswith('jump') else None,'observeFrames':75},'runtimeExecutionVerified':False})
 for button in 'CD':common.append({'id':'normal-throw-'+button,'sourceStatus':'unverified candidate 4/6+button at close range; original character throw names and conditions not yet recovered','requiresOpponent':'standing close and throwable','button':button,'directionChoices':['4','6'],'runtimeExecutionVerified':False})
 common.append({'id':'receive-heavy-opponent-C-or-D','sourceStatus':'test setup rather than move command; opponent must actually hit target','requiresOpponent':'P2 standing close, actual P2 C/D impact; capture health change/knockback and guard distinction','runtimeExecutionVerified':False})
 characters.append({'character':ch['character'],'officialName':ch['officialName'],'specialVariants':moves,'basicAndReactionCandidates':common,'completeMoveList':False,'missing':['all named normals and near/far variations','command normals','all normal/command/air throws','all follow-up branches','missing specials and supers not listed by SNK subset','MAX variants/hit vs whiff/guard/cancel conditions','actual native timing and sprite frame coverage']})
result={'schema':'kof98-ordinary-input-checklist/v1','scope':'official selected special variants plus explicitly unverified coverage candidates; NOT complete','buttonAdaptation':{'source':'Wii remote icons on SNK VC page','map':buttons,'status':'explicit controller adaptation; confirm against actual original in-game move before accepting'},'timingPolicy':'3 frames per motion direction/70 charge/90 observation are capture proposals, NOT ROM-derived timings; mirror left/right when facing left; suppress vertical Up after air launch unless needed','meterPolicy':'ordinary input only; no RAM power/health injection. Unavailable super is blocked-not-tested, not failed command. Charge meter naturally in applicable original mode or attack to earn stocks.','characters':characters}
(b/'executable-move-checklist.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('characters',len(characters),'official special button variants',sum(len(c['specialVariants']) for c in characters),'unverified common coverage',sum(len(c['basicAndReactionCandidates']) for c in characters))
