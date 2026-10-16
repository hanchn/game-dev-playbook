import pathlib,json
B=pathlib.Path(__file__).resolve().parents[1]/'data/research/kof98-meter-20261016';p=B/'visual-observations.json';d=json.loads(p.read_text())
def note(char,suffix,text,status='observed',maxok=True,exclude=()):
 for f in (B/char).glob('*/capture.json'):
  if f.parent.name.endswith(suffix) and not any(s in f.parent.name for s in exclude):
   d[f'{char}/{f.parent.name}']={'triggerStatus':status,'maxVariantVerified':maxok and '-max-' in f.parent.name,'observed':text,'reviewMethod':'Actual native MAME contact sheets, selected action phases; not full-frame UI QA.'}
for c in ['andy','robert']:
 note(c,'neutral-v4','Actual blue DM / orange critical SDM flash, distinctive rush / kick and hit sparks, RUSH2 visible. Weak/strong buttons preserved separately.')
for c in ['mai','athena','leona','daimon']:
 note(c,'neutral-v4',{'mai':'Blue/orange flash and fiery spin/kick hit.','athena':'Blue/orange flash, crystal orbit and target launch. No follow-up inferred.','leona':'Blue/orange flash and descending air activation; far spacing whiffs, full V-hit not established in this batch.','daimon':'Blue/orange flash, grab/throw start; end-to-end follow-up not established from this four-phase contact.'}[c])
for c in ['kyo','joe','kim','king','ryo']:
 note(c,'critical-v5','Actual orange critical super flash at naturally attained HP6–9, distinct SDM animation / target reaction; Kim far-air activation whiffs and is not hit-confirm proof.')
for c in ['kyo','benimaru','joe']:
 note(c,'author-critical-v1',{'kyo':'Orochinagi blue/orange flash, raised fire and sweeping fire hit.','benimaru':'Close electric grab blue/orange flash, target held and large lightning/white-background SDM hit.','joe':'Blue/orange flash and close rushing punch combo, RUSH9 visible.'}[c])
note('daimon','author-critical-v1','Blue/orange flash and first Arashi grab; chain stages NOT demonstrated, later dedicated follow-up needed.')
for c in ['kyo','iori']:
 note(c,'hold90-v1','Actual sustained raised-hand charge through observe55/90, release after90 yields fire / purple projectile and target hit. MAX Kyo shows initial gold charge/fire before release; timing is actual sampler condition, not reconstructed native duration.')
note('athena','cancel-v1','Actual orbit at55, ABCD55–57 then orbit absent by90 and neutral recovered earlier than uncancelled comparison. Critical version also dissipates early. Cancel observed.')
note('athena','crystalshoot-v1','Actual crystals orbit and travel under QCB+P55 candidate. Orbit persists to200 similarly to base; distinct shoot follow-up NOT yet established. Base DM/SDM activation observed but requested branch remains unverified.',status='not_verified')
note('daimon','chain-v1','Actual first Arashi grab and slam only, P2 HP103→92/93. Incorrect HCF follow-up candidate at50, DP110 did not establish full chain.',status='not_observed',maxok=False)
note('leona','air-close-v1','Actual close V Slasher DM full V-shaped slash and target knockdown; critical variant prolonged hit then large explosion. Target HP103→77 DM /61 critical.')
note('kim','air-close-v1','Actual close air multi-kick combo and target launch, RUSH12 normal D and RUSH22 critical B. Critical D shows no activation and is excluded.',exclude=['official-09-dm','official-10-max'])
note('kim','air-close-v1','No activation after jump; meter remains full and target HP103. Input candidate failed at this timing.',status='not_observed',maxok=False,exclude=['official-09-max','official-10-dm'])
for c,txt in {
 'kim':'Blue/orange flash and ground Houou rush kick, RUSH3 DM /5 SDM visible.',
 'king':'Blue/orange flash, Silent Flash acrobatic kick, RUSH2/3.',
 'ryo':'Haoh blue/orange flash and large white projectile, target launched/hit.',
 'vice':'Blue/orange flash, Withering surfacing rush motion. Normal version passes target in shown phases; full hit not asserted.',
 'shingo':'Blue/orange flash, Burning advancing strikes and sparks.',
 'iori':'Blue/orange flash, YaSakazuki held flame and purple pillar activation.',
 'mai':'Blue/orange flash, Cho fiery charge and SuiChou fan combo, RUSH2/7 visible.',
 'athena':'Air Shining orbit and air Phoenix projectile blue/orange flash. Far spacing misses target; activation only.',
 'leona':'Blue/orange flash, Rebel rush/critical red transformation and Gravity kick impact; 2-hit sparks shown.',
 'andy':'Blue/orange flash, Cho fiery flying kick RUSH2–4.',
 'robert':'Blue/orange flash, Ryuko rush RUSH4 and Haoh white projectile hit.'
}.items(): note(c,'author-critical-v1',txt)
note('daimon','chain-v2','Actual first Arashi grab/slam only. Author-corrected neutral K105 then DP+K165 still fails follow-up timing; HP103→92/93, no second/third throw. Exact input trace retained.',status='not_observed',maxok=False)
note('athena','air-close-v1','Actual close air Shining orbit hits and target launches; Phoenix air multi-hit projectile combo RUSH10 normal and RUSH24 critical. Natural charge/lowHP ordinary inputs only.')
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print(len(d))
