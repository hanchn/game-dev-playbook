#!/usr/bin/env python3
"""Static top100 local inventory + MDK candidate probe. Never launches or downloads ROM binaries."""
import concurrent.futures
import hashlib
import html
import json
import re
import subprocess
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

LAB=Path(__file__).resolve().parents[1]
DATA=LAB/'data'
RESEARCH=DATA/'research/arcade-runtime-candidates-20261016'
# MAME shortname proposals. Only observed page/ZIP matches are validated.
IDS='pacman dkong invaders galaga sf2 centiped asteroid mspacman defender tmnt simpsons mk2 frogger nbajam bublbobl qbert gauntlet robotron goldnaxe joust mslug tron missile digdug ddragon tempest trackfld altbeast atetris outrun gng ffight kof98 galaxian arkanoid mk berzerk sinistar xmen starwars contra btime gradius 1943 paperboy rtype pong btoads mpatrol dlair ghouls timecris tekken3 smashtv kchamp elevator rthunder breakout spyhunt polepos dino raiden yiear toki shinobi blktiger gyruss rampage bzone ssriders phoenix splatter mooncrst mrdo scramble punchout zaxxon commando wwfwfest 1942 wboy dkongjr pengo outfxies inthunt opwolf timeplt xevious robocop crusnusa tapper avsp choplift marble dkong3 ddonpach narc popeye gorf ridgerac'.split()
assert len(IDS)==100
PROBE_RANKS=list(range(1,101))
SHA=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def plain(value):
    return html.unescape(re.sub('<[^>]+>',' ',value)).strip()
def probe(rank,title,shortname):
    url='https://mdk.cab/game/'+shortname
    row=dict(rank=rank,title=title,romId=shortname,sourcePage=url,
        acquired=False,bootVerified=False,gameplayVerified=False,
        coreCompatibilityVerified=False)
    try:
        cache=RESEARCH/(shortname+'.html')
        if cache.is_file():
            content=cache.read_bytes()
            row['pageHTTPStatus']=200
            row['pageFinalURL']=url
            row['pageReadMode']='retained-20261016-static-HTTP-evidence'
        else:
            req=urllib.request.Request(url,headers={'User-Agent':'Codex-static-resource-inventory/1.0'})
            with urllib.request.urlopen(req,timeout=25) as r:
                content=r.read()
                row['pageHTTPStatus']=r.status
                row['pageFinalURL']=r.url
            row['pageReadMode']='actual-HTTP-fetch'
        text=content.decode('utf-8')
        (RESEARCH/(shortname+'.html')).write_bytes(content)
        row['pageSHA256']=hashlib.sha256(content).hexdigest()
        row['pageEvidence']=str((RESEARCH/(shortname+'.html')).relative_to(LAB))
        row['observedPageTitle']=plain(re.search(r'<title>(.*?)</title>',text,re.S).group(1))
        observed=sorted(set(html.unescape(x) for x in re.findall(r'href=["\']([^"\']*/download/split/[^"\']+|/download/split/[^"\']+)["\']',text)))
        own='/download/split/'+shortname+'.zip'
        row['downloadURL']=urllib.parse.urljoin(url,own) if own in observed else None
        row['observedSplitDownloadLinks']=[urllib.parse.urljoin(url,x)for x in observed]
        row['dependencies']=[{'romId':Path(urllib.parse.urlparse(x).path).stem,
            'observedURL':urllib.parse.urljoin(url,x),'relationship':'page-listed-parent-BIOS-or-device; retain full listed split dependency set'}
            for x in observed if x!=own]
        disk_links=sorted(set(html.unescape(x) for x in re.findall(r'href=["\'](/download/chd/[^"\']+)["\']',text)))
        row['observedCHDDependencies']=[{'url':urllib.parse.urljoin(url,x),'acquired':False,'status':'separate-large-disk-dependency-pending'} for x in disk_links]
        row['completeMediaAcquired']=False
        clone=re.search(r'<td>\s*clone of\s*</td>\s*<td>\s*<a[^>]+href="/game/([^"]+)"',text,re.S|re.I)
        row['cloneOf']=clone.group(1)if clone else None
        row['status']='source-page-download-link-verified-not-acquired'if own in observed else 'blocked-no-observed-ROM-link'
        row['runtimeRequirements']=['MAME 0.289 (MDK set version) with ROM ZIP and every listed parent/BIOS/device; actual boot not tested.',
            'Browser FBNeo/MAME core requires independent DAT/set compatibility audit; current core presence alone does not verify this ROM.',
            'Static page probe and later acquisition are separate stages; see acquired/localZIPs and acquisitionReceipt for downloaded ZIPs. No executable launched.']
    except Exception as e:
        row['status']='blocked-static-probe-failed'
        row['error']=str(e)
    return row

def zip_receipt(path):
    row={'path':str(path),'bytes':path.stat().st_size,'sha256':SHA(path)}
    try:
        with zipfile.ZipFile(path)as z:
            row['zipCRCValid']=z.testzip()is None
            row['members']=[{'name':i.filename,'bytes':i.file_size,'crc32':format(i.CRC,'08x')}for i in z.infolist()if not i.is_dir()]
    except Exception as e:
        row['zipCRCValid']=False
        row['error']=str(e)
    return row

def main():
    RESEARCH.mkdir(parents=True,exist_ok=True)
    top=json.loads((DATA/'arcade-top100.json').read_text())
    standard=json.loads((DATA/'standard-games.json').read_text())
    standard_by_id={g['id']:g for g in standard['games']}
    # Bounded static inventory: user desktop and Downloads; does not claim all disk searched.
    roots=[Path('/Users/lemon/Desktop'),Path('/Users/lemon/Downloads')]
    proc=subprocess.run(['rg','--files',*[str(r)for r in roots if r.exists()]],capture_output=True,text=True,check=True)
    wanted=set(IDS)|set(standard_by_id)|{'neogeo','pgm','qsound_hle','kof97','kof2002','puckman','namco51','namco54','votrsc01a'}
    cached_candidates=DATA/'arcade-next-rom-candidates.json'
    if cached_candidates.exists():
        for candidate in json.loads(cached_candidates.read_text()).get('candidates',[]):
            wanted.update(d['romId'] for d in candidate.get('dependencies',[]))
    matches={}
    for name in proc.stdout.splitlines():
        p=Path(name)
        if p.suffix.lower()=='.zip'and p.stem in wanted and 'runtime' not in p.parts:
            matches.setdefault(p.stem,[]).append(zip_receipt(p))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:
        candidates=list(pool.map(lambda n:probe(n,top['games'][n-1]['name'],IDS[n-1]),PROBE_RANKS))
    candidates.sort(key=lambda r:r['rank'])
    for row in candidates:
        row['acquired']=any(a['zipCRCValid'] for a in matches.get(row['romId'],[]))
        row['localZIPs']=[a['path'] for a in matches.get(row['romId'],[]) if a['zipCRCValid']]
        row['acquisitionReceipt']='data/research/arcade-runtime-candidates-20261016/acquisition-receipt.json' if row['acquired'] else None
        if row['acquired']:
            row['status']='local-ZIP-CRC-verified-runtime-pending'
    candidate_map={r['rank']:r for r in candidates}
    candidate_doc={'schema':'arcade-ROM-static-candidates/v1','date':'2026-10-16',
        'source':'https://mdk.cab/','setVersion':'MAME 0.289',
        'policy':'Page-link probe plus separate ZIP acquisition inventory. acquired/localZIPs reflect actual later downloads; no executable launched and no promised core compatibility.',
        'candidates':candidates}
    acquisition_path=RESEARCH/'acquisition-receipt.json'
    candidate_doc['stages']={'discovery':{'requestedRanks':len(candidates),'observedROMPageLinks':sum(bool(r.get('downloadURL'))for r in candidates)},'acquisition':json.loads(acquisition_path.read_text()).get('summary',{})if acquisition_path.exists()else'not started','diskMedia':'CHD/Laserdisc links retained separately, no large disk media downloaded. ZIP presence alone does not establish complete media.','runtime':'Independent MAME/FBNeo boot/input evidence maintained by root; this static inventory never authorizes a runtime PASS.'}
    (DATA/'arcade-next-rom-candidates.json').write_text(json.dumps(candidate_doc,ensure_ascii=False,indent=2)+'\n')
    rows=[]
    for entry,shortname in zip(top['games'],IDS):
        rank,title=entry['rank'],entry['name']
        exact=matches.get(shortname,[])
        configured=standard_by_id.get(shortname)
        variant_ids=['sf2ce','ssf2t']if shortname=='sf2'else[]
        variants=[{'id':i,'relationship':'Related title/version, not exact sf2 base set',
            'localArchives':matches.get(i,[]),'configured':i in standard_by_id}for i in variant_ids]
        files=[r for r in exact if r['zipCRCValid']]
        related_projects=[]
        # Explicitly retain character-pack / source-study evidence separately from complete original game acquisition.
        evidence=[]
        if shortname=='kof98':
            evidence=['data/original-kof98-validation.json','data/research/standard-play-qa-20261016/kof98-initial.json']
            related_projects=[{'kind':'MUGEN-character-adaptations','countsAsOriginalGame':False}]
        if shortname=='sf2':
            related_projects=[{'id':'ssf2t','kind':'original-game-headless-RAM/frame-study','evidence':'data/research/ssf2t-runtime-study.json',
                'countsAsExactSf2BaseGame':False}]
        row={'rank':rank,'title':title,'name':title,'romIdProposal':shortname,
            'identityStatus':'exact-shortname-local-ZIP'if files else 'page-observed-shortname-candidate'if candidate_map.get(rank,{}).get('downloadURL')else'proposed-unverified',
            'acquired':bool(files),'bootVerified':False,'gameplayVerified':False,
            'reverseEngineering':{'status':'partial-related-evidence'if related_projects else'not-started',
                'complete':False,'evidence':related_projects},
            'localArchives':exact,'standardGameId':configured['id']if configured else None,
            'standardConfigured':bool(configured),'configuredCore':configured.get('core')if configured else None,
            'configuredRuntimeVerified':configured.get('runtimeVerified',False)if configured else False,
            'bios':configured.get('bios')if configured else None,
            'relatedVariants':variants,'evidence':evidence,
            'verificationReason':'Static inventory only. Registry false/pending is not replaced by screenshots or a different game version.',
            'nextAction':'Verify ROM/core set compatibility, then boot→coin→start→selection/level→input/gameplay with saved evidence.'if files else'Statically verify exact set/parent/BIOS before any deliberate acquisition.'}
        if shortname=='sf2':
            row['verificationReason']='SF2CE and SSF2T files exist and may run, but remain version variants; base sf2 acquisition/boot not claimed.'
        if shortname=='kof98':
            row['verificationReason']='Local archive acquired; stored first standard QA includes WASM table-index error. No boot/gameplay success inferred from running UI badge.'
        if rank in candidate_map:
            row['candidateEvidence']='data/arcade-next-rom-candidates.json#rank='+str(rank)
            row['observedDependencies']=[{**d,'localArchives':matches.get(d['romId'],[])} for d in candidate_map[rank].get('dependencies',[])]
            row['observedCHDDependencies']=candidate_map[rank].get('observedCHDDependencies',[])
            row['completeMediaVerified']=False
        rows.append(row)
    out={'schema':'arcade-local-runtime-progress/v1','date':'2026-10-16',
        'sourceRanking':{'file':'data/arcade-top100.json','sha256':SHA(DATA/'arcade-top100.json'),'count':len(rows)},
        'inventoryScope':[str(r)for r in roots],
        'standardRegistrySnapshot':{'path':'data/standard-games.json','sha256':SHA(DATA/'standard-games.json'),'games':[g['id']for g in standard['games']]},
        'countingPolicy':'Keep all100 exact ranks/titles. ZIP CRC/SHA proves acquisition only; no execution in this task. Variants, ports, MUGEN characters and AI reconstructions never silently count as original ranked game. False verification means not established by retained evidence, not necessarily unplayable.',
        'summary':{'rankedGames':len(rows),'exactAcquired':sum(r['acquired']for r in rows),
            'bootVerified':0,'gameplayVerified':0,'standardExactConfigured':sum(r['standardConfigured']for r in rows),
            'observedCandidateLinks':sum(bool(r.get('downloadURL'))for r in candidates)},
        'games':rows,
        'extraLocalOriginalSets':[{'romId':i,'archives':matches.get(i,[]),'standardConfigured':i in standard_by_id}
            for i in sorted(set(matches)-set(IDS))],
        'gameAssetStudioEvidence':{'catalog':'/Users/lemon/Desktop/game-asset-studio/data/catalog/floating-arcade-games.json',
            'scope':'Web/AI game catalog exists; no exact original ROM match counted solely from similarly named reconstructions.'},
    }
    (DATA/'arcade-local-runtime-progress.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(out['summary']))
    print(json.dumps({'candidates':len(candidates),'blocked':[r['romId']for r in candidates if not r.get('downloadURL')]}))
if __name__=='__main__':
    main()
