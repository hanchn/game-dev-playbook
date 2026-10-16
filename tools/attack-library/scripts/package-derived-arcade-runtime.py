#!/usr/bin/env python3
"""Build derived merged study ROM ZIPs without changing original archives.
All listed dependencies must exist with valid ZIP CRC. Dependency members are
merged in observed-page order, then base-game members override by exact name.
No emulator, executable or game code is launched.
"""
import hashlib
import json
import zipfile
from pathlib import Path, PurePosixPath

LAB=Path(__file__).resolve().parents[1]
ACQUISITION=LAB/'data/research/arcade-runtime-candidates-20261016/acquisition-receipt.json'
CANDIDATES=LAB/'data/arcade-next-rom-candidates.json'
REPORT=LAB/'data/research/arcade-runtime-candidates-20261016/derived-merged-runtime-packages.json'
def sha(data):
    return hashlib.sha256(data).hexdigest()
def source_archive(path):
    with zipfile.ZipFile(path)as archive:
        bad=archive.testzip()
        if bad is not None:
            raise ValueError('CRC failed: '+str(path)+' member '+bad)
        for member in archive.infolist():
            if member.is_dir():continue
            logical=PurePosixPath(member.filename.replace('\\','/'))
            if logical.is_absolute()or '..'in logical.parts:
                raise ValueError('Unsafe ZIP member: '+member.filename)
        return archive.infolist()

def main():
    acquisition=json.loads(ACQUISITION.read_text())
    candidates={r['romId']:r for r in json.loads(CANDIDATES.read_text())['candidates']}
    by_file={r['file']:r for r in acquisition['archives']}
    by_game_id={(r['forGame'],r['romId']):r for r in acquisition['archives'] if r.get('acquired')}
    results=[]
    for shortname in acquisition['selectedGameIDs']:
        candidate=candidates[shortname]
        ordered=[(d['romId'],'dependency')for d in candidate.get('dependencies',[])]+[(shortname,'base-game')]
        result={'romId':shortname,'rank':candidate['rank'],'sourcePage':candidate['sourcePage'],
            'bootVerified':False,'gameplayVerified':False,'coreCompatibilityVerified':False}
        try:
            sources=[]
            for source_id,kind in ordered:
                acquired=by_game_id.get((shortname,source_id))
                if acquired is None:raise FileNotFoundError('No acquired receipt: '+shortname+'/'+source_id)
                relative=acquired['file']
                path=LAB/relative
                if not path.is_file():raise FileNotFoundError(relative)
                digest=sha(path.read_bytes())
                receipt=by_file.get(relative)
                if receipt is None or not receipt.get('acquired')or digest!=receipt['sha256']:
                    raise ValueError('Acquisition SHA mismatch or absent receipt: '+relative)
                source_archive(path)
                sources.append(dict(path=relative,romId=source_id,kind=kind,sha256=digest,
                    observedURL=receipt['url'],zipCRCValid=True))
            members={}
            overrides=[]
            for source in sources:
                with zipfile.ZipFile(LAB/source['path'])as archive:
                    for info in archive.infolist():
                        if info.is_dir():continue
                        data=archive.read(info)
                        provenance=dict(sourceZIP=source['path'],sourceZIPSHA256=source['sha256'],
                            sourceMember=info.filename,sourceKind=source['kind'],bytes=len(data),
                            crc32=format(info.CRC,'08x'),sha256=sha(data))
                        if info.filename in members:
                            old=members[info.filename][2]
                            overrides.append(dict(member=info.filename,previous=old,replacement=provenance,
                                identicalBytes=old['sha256']==provenance['sha256'],
                                rule='Later listed dependency then base-game exact-name override'))
                        members[info.filename]=(info,data,provenance)
            target=LAB/f'assets/original-games/{shortname}/runtime/{shortname}.zip'
            target.parent.mkdir(parents=True,exist_ok=True)
            temporary=target.with_suffix('.zip.building')
            with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,compresslevel=9)as archive:
                for name in sorted(members):
                    info,data,_=members[name]
                    written=zipfile.ZipInfo(filename=name,date_time=info.date_time)
                    written.compress_type=zipfile.ZIP_DEFLATED
                    written.external_attr=info.external_attr
                    archive.writestr(written,data)
            expected={name:record[2]for name,record in members.items()}
            with zipfile.ZipFile(temporary)as archive:
                if archive.testzip()is not None:raise ValueError('Derived ZIP CRC failed')
                assert set(archive.namelist())==set(expected)
                for name,record in expected.items():
                    observed=archive.read(name)
                    assert sha(observed)==record['sha256']
                    assert format(archive.getinfo(name).CRC,'08x')==record['crc32']
            if target.exists():
                if sha(target.read_bytes())!=sha(temporary.read_bytes()):
                    raise FileExistsError('Existing derived output differs, preserved: '+str(target))
                temporary.unlink()
                action='identical-existing-derived-retained'
            else:
                temporary.rename(target)
                action='new-derived-runtime-package'
            # Recheck every original after packaging: source bytes were not modified.
            assert all(sha((LAB/s['path']).read_bytes())==s['sha256']for s in sources)
            result.update(status='derived-merged-ZIP-byte-audit-passed-runtime-pending',
                output=str(target.relative_to(LAB)),outputBytes=target.stat().st_size,
                outputSHA256=sha(target.read_bytes()),zipCRCValid=True,
                originalsUnchanged=True,memberCount=len(members),sources=sources,
                members=expected,overrides=overrides,writeAction=action)
        except Exception as exc:
            result.update(status='blocked-derived-package',error=str(exc))
        results.append(result)
    report={'schema':'derived-merged-arcade-runtime/v1','date':'2026-10-16',
        'policy':'Derived archives only. Original dependency/game ZIPs unchanged. Preserve source bytes per member; dependencies first, base overrides exact-name collisions. No fabricated files.',
        'inputAcquisitionReceipt':str(ACQUISITION.relative_to(LAB)),
        'inputAcquisitionSHA256':sha(ACQUISITION.read_bytes()),
        'summary':{'selectedGames':len(results),'derivedPackages':sum(r['status'].startswith('derived-')for r in results),
            'blocked':sum(r['status'].startswith('blocked')for r in results)},
        'runtimeWarning':'Merged MAME0.289 split sets are packaging candidates, not FBNeo DAT compatibility or successful boot/input evidence.',
        'bootVerified':False,'gameplayVerified':False,'games':results}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report['summary']))
    print(REPORT)
    if report['summary']['blocked']:
        raise SystemExit(1)
if __name__=='__main__':
    main()
