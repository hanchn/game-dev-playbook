#!/usr/bin/env python3
"""Local dependency/hash/ZIP/WASM preflight, explicitly not game-play evidence."""
import hashlib
import json
import pathlib
import subprocess
import zipfile


def main():
    root = pathlib.Path(__file__).resolve().parents[1]
    config = json.loads((root/'data/standard-games.json').read_text())
    receipt = json.loads((root/config['runtime']['receipt']).read_text())
    vendor = (root/config['runtime']['receipt']).parent
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    files = []
    for item in receipt['files']:
        path = vendor/item['file']
        files.append({'file': str(path.relative_to(root)), 'exists': path.is_file(), 'shaMatches': path.is_file() and sha(path) == item['sha256']})
    cores = []
    for name in receipt['cores']:
        for variant in ['', '-legacy']:
            path = vendor/'data/cores'/(name+variant+'-wasm.data')
            members = subprocess.check_output(['/usr/bin/tar','-tf',str(path)],text=True).splitlines()
            wasm = next(x for x in members if x.endswith('.wasm'))
            javascript = next(x for x in members if x.endswith('.js'))
            data = subprocess.check_output(['/usr/bin/tar','-xOf',str(path),wasm])
            cores.append({'core':name,'variant':variant or 'modern','archive':str(path.relative_to(root)),'members':members,'wasmBytes':len(data),'wasmSHA256':hashlib.sha256(data).hexdigest(),'wasmMagicValid':data[:8]==b'\0asm\x01\0\0\0','javascriptMember':javascript})
    games = []
    for game in config['games']:
        checks=[]
        for field in ['rom','bios','biosContainer']:
            if not game.get(field):
                continue
            path=root/game[field]
            row={'kind':field,'file':game[field],'sha256':sha(path),'shaMatches':sha(path)==game.get(field+'Sha256')}
            with zipfile.ZipFile(path) as archive:
                row['zipCRCValid']=archive.testzip() is None
                row['files']=len([i for i in archive.infolist() if not i.is_dir()])
            checks.append(row)
        if game.get('biosContainer'):
            with zipfile.ZipFile(root/game['biosContainer']) as outer:
                nested=pathlib.Path(game['bios']).name
                checks.append({'kind':'nested-bios-original-byte-identity','shaMatches':outer.read(nested)==(root/game['bios']).read_bytes(),'zipCRCValid':outer.testzip() is None})
        games.append({'game':game['id'],'core':game['core'],'dependencies':checks,'runtimeVerified':False})
    passed=all(f['exists'] and f['shaMatches'] for f in files) and all(c['wasmMagicValid'] for c in cores) and all(x['shaMatches'] and x['zipCRCValid'] for g in games for x in g['dependencies'])
    report={'schema':'original-arcade-preflight/v1','dependenciesPassed':passed,'runtimeVerified':False,'scope':'Local SHA, ZIP CRC, embedded WASM binary/header and required runtime members only; not ROM-set compatibility, boot, input, selection or actual match verification','runtimeFiles':files,'cores':cores,'games':games}
    target=root/'data/research/standard-runtime-preflight-20261016.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'dependenciesPassed':passed,'runtimeFiles':len(files),'coreVariants':len(cores),'games':[g['game'] for g in games],'runtimeVerified':False}))
    return 0 if passed else 1


if __name__=='__main__':
    raise SystemExit(main())
