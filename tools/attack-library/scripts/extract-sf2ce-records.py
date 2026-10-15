"""Reproduce the conservative CE geometry-record pass described by sf2-lineage.
These records are NOT startup/active/recovery frame data. Nonstandard headers are skipped.
"""
import pathlib,json,zipfile,hashlib,struct,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
RESEARCH=ROOT.parents[1]/'output/attack-library/research/sf2-lineage'
ROM=ROOT/'assets/original-games/sf2ce/sf2ce.zip'
spec=json.loads((RESEARCH/'verify/romsets.json').read_text())['sf2ce']
image=bytearray(int(spec['image_size'],16))
with zipfile.ZipFile(ROM) as z:
 for name,base in spec['map']:
  raw=z.read(name);expected=spec['chips'][name]
  assert hashlib.sha1(raw).hexdigest()==expected['sha1'],f'Wrong ROM revision: {name}'
  swapped=bytearray(raw);swapped[0::2]=raw[1::2];swapped[1::2]=raw[0::2]
  start=int(base,16);image[start:start+len(raw)]=swapped
u16=lambda a:struct.unpack_from('>H',image,a)[0]
u32=lambda a:struct.unpack_from('>I',image,a)[0]
signed=lambda v:v-256 if v>127 else v
names=['Ryu','Honda','Blanka','Guile','Ken','Chun-Li','Zangief','Dhalsim','M.Bison(dictator)','Sagat','Balrog(boxer)','Vega(claw)']
characters=[]
for cid,name in enumerate(names):
 table=0x3D4A6+cid*8;block=u32(table);begin=block+u16(block+8);end=block+u16(block+10);span=end-begin;records=[]
 valid=0<span<=0x2000 and span%12==0 and 0<=begin<end<=len(image)
 if valid:
  for offset in range(begin,end,12):
   raw=image[offset:offset+12];category=raw[4];row=category&0x3f
   records.append({'address':hex(offset),'boxOffset':[signed(raw[0]),signed(raw[1])],'halfExtent':[raw[2],raw[3]],'damageCategory':category,'damageBaseRow':row,'baseDamageTier0':image[0xC63E4+row*32] if row<17 else None,'hitClass':raw[11]})
 characters.append({'id':cid,'name':name,'pushboxHalfWidth':u16(table+4),'recordCount':len(records),'status':'decoded geometry; move association unverified' if valid else 'nonstandard header skipped','records':records})
report={'game':'sf2ce World 920513','source':'https://github.com/ROMArchaeology/sf2-lineage','sourceCommit':subprocess.check_output(['git','-C',str(RESEARCH),'rev-parse','HEAD'],text=True).strip(),'romSHA256':hashlib.sha256(ROM.read_bytes()).hexdigest(),'limitations':['CPS1 Champion Edition only; do not apply these addresses to CPS2 Super Turbo','Geometry/damage-category records only; no startup/active/recovery timing','Standard six-slot headers only; skipped characters require separate analysis','No original runtime validation or move-to-record association yet'],'characters':characters}
(ROOT/'data/research/sf2ce-geometry-records.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('CE geometry:',sum(c['recordCount'] for c in characters),'records;',sum(c['recordCount']>0 for c in characters),'characters; nonstandard headers explicitly skipped')
