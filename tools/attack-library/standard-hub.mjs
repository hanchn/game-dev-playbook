/** Independent integration: import this module from the attack-library index. */
export function buildStandardHubModel(manifest, runtime, ranking) {
  const configured=new Map((runtime?.games||[]).map(g=>[g.id,g]));
  const cards=(manifest.priorityGames||[]).map(item=>{
    const originalWeb=item.kind==='original-web-node-game';
    const game=originalWeb?item:configured.get(item.runtimeGameId);
    const verified=game?.runtimeVerified===true;
    const ready=Boolean(game);
    return {...item,ready,runtimeVerified:verified,status:originalWeb?item.status:(game?.verificationStatus||'missing-runtime-configuration'),
      statusLabel:originalWeb?item.statusLabel:verified?'基础游玩实测通过':ready?'原ROM已配置 · 投币/选人/实际对局待验收':'尚缺原游戏运行配置',
      evidence:originalWeb?item.runtimeEvidence:null};
  });
  const mappings=new Map((manifest.catalogMappings||[]).map(m=>[m.catalogName,m.runtimeGameId]));
  const target=manifest.activeBatchCount||manifest.targetGameCount;
  const entries=(ranking?.games||[]).filter(entry=>entry.rank<=target).map(entry=>{
    const gameId=mappings.get(entry.name),game=configured.get(gameId);
    return {rank:entry.rank,name:entry.name,runtimeGameId:gameId||null,configured:Boolean(game),runtimeVerified:game?.runtimeVerified===true,status:game?.verificationStatus||'not-integrated'};
  });
  return {targetGameCount:target,rankedEntries:entries.length,configuredTargetEntries:entries.filter(e=>e.configured).length,
    verifiedTargetEntries:entries.filter(e=>e.runtimeVerified).length,remainingTargetEntries:Math.max(0,target-entries.filter(e=>e.runtimeVerified).length),
    cards,entries,priorityCardCount:cards.length,priorityRuntimeVerified:cards.filter(c=>c.runtimeVerified).length};
}
const css=`#standard-game-hub{background:linear-gradient(135deg,#152b3b,#202135);border:1px solid #405b75;border-radius:16px;padding:22px;margin:0 0 28px;color:#eef5ff}#standard-game-hub h2{margin:0 0 10px}#standard-game-hub .standard-summary{color:#b8cce0}#standard-game-hub .standard-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}#standard-game-hub article{padding:16px;background:#101b2b;border:1px solid #3b5368;border-radius:12px}#standard-game-hub article h3{margin:0 0 10px;font-size:18px}#standard-game-hub article p{line-height:1.5;font-size:14px}#standard-game-hub .standard-status{color:#ffc976}#standard-game-hub article[data-verified=true] .standard-status{color:#90e8b0}#standard-game-hub a{display:inline-block;background:#255472;color:#fff;padding:9px 14px;border-radius:7px;text-decoration:none}#standard-game-hub code{font-size:11px;overflow-wrap:anywhere;color:#9cb2c8}a[data-standard-hub-nav]{align-self:center;padding:12px;color:#bce9ff;border:1px solid #54728a;border-radius:8px;text-decoration:none}`;
export function renderStandardHub(model, doc=document) {
  const section=doc.createElement('section');section.id='standard-game-hub';section.setAttribute('aria-label','标准游戏模式');
  const heading=doc.createElement('h2');heading.textContent='标准游戏模式 · 当前先接前20款';
  const summary=doc.createElement('p');summary.className='standard-summary';summary.textContent=`目标 ${model.targetGameCount} 款 · 原榜 ${model.rankedEntries} 条 · 原榜已配置 ${model.configuredTargetEntries} 款 · 基础操作实测 ${model.verifiedTargetEntries} 款 · 待操作验收 ${model.remainingTargetEntries} 款`;
  const native=doc.createElement('a');native.href='native-play.html';native.textContent='前20款 · 本地窗口标准模式 ↗';
  const note=doc.createElement('p');note.textContent=(model.sets?`原包已取得 ${model.sets.acquired} 款，另有2款无需ROM；本地依赖校验 ${model.sets.setCompatible}/100。`:'')+'以下是原游戏入口。配置或下载完成不等于实际对局通过；宝可梦采用原Web/Node运行，不属于ROM模拟。';
  const grid=doc.createElement('div');grid.className='standard-cards';
  for(const card of model.cards){const article=doc.createElement('article');article.dataset.game=card.id;article.dataset.verified=String(card.runtimeVerified);
    const title=doc.createElement('h3');title.textContent=card.title;const body=doc.createElement('p');body.textContent=card.description;
    const status=doc.createElement('p');status.className='standard-status';status.textContent=card.statusLabel;
    const raw=doc.createElement('details');const summary=doc.createElement('summary');summary.textContent='验收记录';const code=doc.createElement('code');code.textContent=card.status;raw.append(summary,code);
    article.append(title,body,status,raw);
    if(card.ready){const link=doc.createElement('a');link.href=card.href;link.textContent=card.kind==='original-web-node-game'?'打开原Web游戏 ↗':'打开原标准游戏 ↗';link.target='_blank';link.rel='noopener';article.append(link);}
    grid.append(article);
  }
  section.append(heading,summary,native,note,grid);return section;
}
export async function mountStandardHub({doc=document,fetcher=fetch}={}) {
  const read=async url=>{const response=await fetcher(url,{cache:'no-store'});if(!response.ok)throw new Error(`标准模式配置读取失败：${url}`);return response.json();};
  const [manifest,runtime,ranking]=await Promise.all(['data/standard-hub.json','data/standard-games.json','data/arcade-top100.json'].map(read));
  const model=buildStandardHubModel(manifest,runtime,ranking);
  let progress;try{progress=await read('data/arcade-local-runtime-progress.json');}catch{}
  let sets;try{sets=await read('data/research/mame-top100-20261016/set-verification.json');}catch{}
  model.sets=sets?.summary;
  const acceptance=await read('data/runtime-acceptance-20261016.json').catch(()=>({games:{}}));
  const progressByName=new Map((progress?.games||[]).map(g=>[g.title,g]));
  if(!doc.getElementById('standard-hub-style')){const style=doc.createElement('style');style.id='standard-hub-style';style.textContent=css;doc.head.append(style);}
  const nav=doc.querySelector('nav');if(nav&&!nav.querySelector('[data-standard-hub-nav]')){const link=doc.createElement('a');link.dataset.standardHubNav='true';link.href='?tab=catalog#standard-game-hub';link.textContent='标准游戏模式';nav.append(link);}
  const catalog=doc.getElementById('catalog');if(!catalog)return model;
  const attach=()=>{
    if(!doc.getElementById('standard-game-hub'))catalog.prepend(renderStandardHub(model,doc));
    const table=catalog.querySelector('table');
    if(table&&!table.dataset.runtimeProgress&&progress){
      table.dataset.runtimeProgress='true';
      for(const label of ['本地原包','标准玩法','逆向解析']){const th=doc.createElement('th');th.textContent=label;table.querySelector('thead tr').append(th);}
      for(const row of table.querySelectorAll('tbody tr')){const item=progressByName.get(row.children[1]?.textContent);if(!item)continue;if(item.acquired&&row.children[2]?.textContent==='待取得')row.children[2].textContent='原生帧/场景待解析';
        const labels=[item.acquired?'已取得 · CRC/SHA记录':item.relatedVariants?.length?'已有相关版本 · 原版本待核对':'待取得',(item.gameplayVerified||acceptance.games?.[item.standardGameId]?.gameplaySmokeVerified)?'基础操作实测通过':item.bootVerified?'已启动 · 操作待验收':(item.standardConfigured||sets?.games?.some(g=>g.id===item.romIdProposal&&g.setCompatible))?'已接本地入口 · 待玩法验收':'待接入',item.reverseEngineering?.complete?'已完成':item.reverseEngineering?.status==='not-started'?'待解析':'部分解析'];
        for(const [index,text] of labels.entries()){const td=doc.createElement('td');td.textContent=text;if(index===1&&item.rank<=20){const link=doc.createElement('a');link.href='native-play.html?game='+encodeURIComponent(item.romIdProposal);link.textContent=' 打开 ↗';td.append(link);}row.append(td);}
      }
    }
  };attach();
  // Existing app replaces catalog children after its asynchronous imports. Restore only our own section.
  const Observer=doc.defaultView?.MutationObserver;if(Observer){const observer=new Observer(attach);observer.observe(catalog,{childList:true});}
  return model;
}
if(typeof document!=='undefined')mountStandardHub().catch(error=>{console.error('Standard game hub:',error);const nav=document.querySelector('nav');if(nav){const warning=document.createElement('span');warning.textContent='标准游戏模式配置暂不可用';warning.setAttribute('role','status');nav.append(warning);}});
