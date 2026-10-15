"""Snapshot title/rank facts from the publisher's public Top 100 list."""
import pathlib,json,re,html,hashlib,urllib.request,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1];URL='https://bitvint.com/pages/top-100-arcade-games-of-all-time'
s=urllib.request.urlopen(URL,timeout=30).read();text=s.decode();rows=[]
for name,rank in re.findall(r'<p class="bold">(.*?)</p><p class="h2">(\d+)\.</p>',text,re.S):
 rows.append({'rank':int(rank),'name':html.unescape(re.sub('<[^>]+>','',name)).strip(),'status':'待取得','characters':0,'scenes':0})
assert len(rows)==100 and sorted(x['rank'] for x in rows)==list(range(1,101)),'Publisher format changed or incomplete list'
d={'publisher':'Bitvint','title':'Top 100 Arcade Games of All Time','url':URL,'retrieved':'2026-10-15','scope':'该站编辑榜单；不是全网统一排名。榜单内含3D游戏，不能将其伪装成已取得的2D帧资源。','sha256':hashlib.sha256(s).hexdigest(),'games':sorted(rows,key=lambda x:x['rank']),'priorityExtras':['三国战纪','吞食天地','兰博','茶杯头']}
(ROOT/'data/arcade-top100.json').write_text(json.dumps(d,ensure_ascii=False,indent=2));print('Verified 100 unique ranks')
