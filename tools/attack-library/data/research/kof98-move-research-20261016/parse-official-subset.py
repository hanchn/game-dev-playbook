"""Keep SNK selected-move text and original command image tokens; never label complete."""
import pathlib,re,json,html
base=pathlib.Path(__file__).resolve().parent
characters=[]
for page in [1,2]:
 raw=(base/f'snk-official-chara{page}.html').read_text()
 for block in re.split(r'<div class="chara_list">',raw)[1:]:
  name=re.search(r'<div class="chara_name2_2">(.*?)</div>',block,re.S)
  moves=re.search(r'<div class="chara_waza_name">(.*?)</div>',block,re.S)
  if not name or not moves:continue
  content=re.sub(r'<img[^>]*src="([^"]+)"[^>]*>',lambda m:' [image:'+m[1]+'] ',moves[1]);content=re.sub(r'<br\s*/?>','\n',content);content=html.unescape(re.sub('<[^>]+>','',content))
  characters.append({'name':html.unescape(re.sub('<[^>]+>','',name[1])).strip(),'page':page,'selectedMovesOriginalTextWithImageTokens':[line.strip() for line in content.splitlines() if line.strip()],'scope':'official-selected-specials-not-complete-normal-throw-command-branch-list'})
(base/'official-selected-moves.json').write_text(json.dumps({'scope':'subset-only','characters':characters},ensure_ascii=False,indent=2));print('SNK character subset sections:',len(characters))
