import re,json,hashlib,pathlib
root=pathlib.Path(__file__).resolve().parents[3]
p=root/'output/attack-library/sources/moves.ts'
s=p.read_text()
rows=[]
for m in re.finditer(r'^\t(?:"([^"]+)"|(\w+)): \{\n(.*?)^\t\},',s,re.M|re.S):
    key=m[1] or m[2]; block=m[3]; row={'id':key}
    for field in ['num','name','type','category','basePower','accuracy','pp','priority','target','isNonstandard','isZ','isMax']:
        v=re.search(r'^\t\t'+field+r': ("[^"\n]*"|true|false|-?\d+)',block,re.M)
        if v: row[field]=json.loads(v[1])
    if 'name' not in row: continue
    row['sourceLine']=s[:m.start()].count('\n')+1
    row['preview']='generic-status' if row.get('category')=='Status' else 'generic-contact' if re.search(r'contact: 1',block) else 'generic-projectile'
    row['verification']='Showdown data; generic preview; Empress unverified'
    rows.append(row)
assert len(rows)>900,len(rows)
out=root/'tools/attack-library/data/moves.json'
out.write_text(json.dumps({'source':'https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts','retrieved':'2026-10-15','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'count':len(rows),'moves':rows},ensure_ascii=False,indent=2)+'\n')
print(len(rows),'moves imported')
