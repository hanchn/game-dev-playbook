#!/usr/bin/env python3
"""Acquire explicitly selected, observed MDK ZIP links. No executables launched.
Default prints candidates only; --acquire id,id is required for network downloads.
"""
import argparse
import concurrent.futures
import hashlib
import json
import urllib.request
import zipfile
from pathlib import Path

LAB=Path(__file__).resolve().parents[1]
CANDIDATES=LAB/'data/arcade-next-rom-candidates.json'
OUT=LAB/'data/research/arcade-runtime-candidates-20261016/acquisition-receipt.json'
def acquire(job):
    target=LAB/job['file']
    target.parent.mkdir(parents=True,exist_ok=True)
    result={**job,'bootVerified':False,'gameplayVerified':False,'executed':False}
    try:
        if target.exists():
            result['downloadAction']='retained-existing-never-overwritten'
        else:
            part=target.with_suffix('.zip.part')
            request=urllib.request.Request(job['url'],headers={'User-Agent':'Codex-observed-ROM-study/1.0'})
            with urllib.request.urlopen(request,timeout=90) as response:
                with part.open('wb')as out:
                    while True:
                        data=response.read(1024*1024)
                        if not data:break
                        out.write(data)
            with zipfile.ZipFile(part)as archive:
                if archive.testzip() is not None:
                    raise ValueError('ZIP CRC failed')
            part.rename(target)
            result['downloadAction']='downloaded-observed-link'
        with zipfile.ZipFile(target)as archive:
            result['zipCRCValid']=archive.testzip() is None
            result['members']=[dict(name=i.filename,bytes=i.file_size,crc32=format(i.CRC,'08x'))
                for i in archive.infolist()if not i.is_dir()]
        result['bytes']=target.stat().st_size
        result['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
        result['acquired']=result['zipCRCValid']
    except Exception as exc:
        result['acquired']=False
        result['error']=str(exc)
    return result
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--acquire',default='',help='Explicit comma-separated candidate ROM IDs; no default bulk download')
    ap.add_argument('--workers',type=int,default=3)
    args=ap.parse_args()
    doc=json.loads(CANDIDATES.read_text())
    ids=[s for s in args.acquire.split(',')if s]
    if not ids:
        print(json.dumps([dict(rank=r['rank'],id=r['romId'],url=r.get('downloadURL'),dependencies=r.get('dependencies'))for r in doc['candidates']],indent=2))
        return
    lookup={r['romId']:r for r in doc['candidates']}
    if len(set(ids))!=len(ids)or any(i not in lookup for i in ids):
        raise ValueError('Unknown or duplicate candidate ID')
    jobs=[]
    prior_by_file={r['file']:r for r in json.loads(OUT.read_text()).get('archives',[])} if OUT.exists() else {}
    for shortname in ids:
        row=lookup[shortname]
        if not row.get('downloadURL'):
            raise ValueError('No observed download URL: '+shortname)
        assets=[dict(romId=shortname,url=row['downloadURL'],kind='selected-game')]+[
            dict(romId=d['romId'],url=d['observedURL'],kind='page-listed-dependency')for d in row['dependencies']]
        for asset in assets:
            relative=f"assets/original-games/{shortname}/{asset['romId']}.zip"
            existing=LAB/relative
            previous=prior_by_file.get(relative,{})
            known_same_source=previous.get('url')==asset['url'] and previous.get('acquired') and existing.is_file() and hashlib.sha256(existing.read_bytes()).hexdigest()==previous.get('sha256')
            if existing.exists() and not known_same_source:
                # Keep older Kawaks/FBNeo sets; do not attribute existing bytes to a new MDK URL.
                relative=f"assets/original-games/{shortname}/mdk-0289/{asset['romId']}.zip"
            jobs.append({**asset,'forGame':shortname,'rank':row['rank'],'sourcePage':row['sourcePage'],
                'pageSHA256':row['pageSHA256'],'file':relative})
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(args.workers,4)))as pool:
        results=list(pool.map(acquire,jobs))
    if OUT.exists():
        previous=json.loads(OUT.read_text())
        old={r['file']:r for r in previous.get('archives',[])}
        for row in results:
            if row['file'] in old and old[row['file']].get('error'):
                row['priorAttempts']=old[row['file']].get('priorAttempts',[])+[old[row['file']]]
            old[row['file']]=row
        results=list(old.values())
        ids=list(dict.fromkeys(previous.get('selectedGameIDs',[])+ids))
    report={'schema':'observed-ROM-acquisition/v1','date':'2026-10-16',
        'candidateSource':str(CANDIDATES.relative_to(LAB)),
        'selectedGameIDs':ids,'selectedGameCount':len(ids),'archives':results,
        'summary':{'acquiredGameROMs':sum(r['acquired']and r['kind']=='selected-game'for r in results),
            'acquiredDependencies':sum(r['acquired']and r['kind']=='page-listed-dependency'for r in results),
            'failedArchives':sum(not r['acquired']for r in results)},
        'bootVerified':False,'gameplayVerified':False,
        'scope':'Real ZIP acquisition+CRC/SHA/members only. No extraction/execution, no set/core compatibility or input/gameplay claimed.'}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report['summary']))
    print(OUT)
if __name__=='__main__':
    main()
