#!/usr/bin/env python3
"""Pin official EmulatorJS release; retain archive locally and deploy selected cores."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import urllib.request


def main():
    root = pathlib.Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', default='4.2.3')
    parser.add_argument('--archive', type=pathlib.Path)
    args = parser.parse_args()
    vendor = root/'vendor'/('emulatorjs-'+args.version)
    vendor.mkdir(parents=True, exist_ok=True)
    archive = args.archive or vendor/'source.7z'
    url = f'https://github.com/EmulatorJS/EmulatorJS/releases/download/v{args.version}/{args.version}.7z'
    if not archive.exists():
        urllib.request.urlretrieve(url, archive)
    expected={'4.2.3':'07d451bc06fa3ad04ab30d9b94eb63ac34ad0babee52d60357b002bde8f3850b'}
    if args.version not in expected or hashlib.sha256(archive.read_bytes()).hexdigest()!=expected[args.version]:
        raise ValueError('Unsupported or mismatched pinned release archive; preserved without executing')
    entries = subprocess.check_output(['/usr/bin/tar', '-tf', str(archive)], text=True).splitlines()
    cores = ['fbalpha2012_cps1', 'fbalpha2012_cps2', 'fbneo']
    selected = []
    for name in entries:
        if name.endswith('/'):
            continue
        path = pathlib.PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('Unsafe original archive path')
        if name.startswith('data/') and (not name.startswith('data/cores/') or name in ['data/cores/cores.json','data/cores/core-README.md'] or any(path.name.startswith(c+'-') or name == 'data/cores/reports/'+c+'.json' for c in cores)):
            selected.append(name)
    subprocess.run(['/usr/bin/tar', '-xf', str(archive), '-C', str(vendor), *selected], check=True)
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    files = [{'file': p.relative_to(vendor).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted((vendor/'data').rglob('*')) if p.is_file()]
    missing = [name for name in ['data/loader.js','data/emulator.min.js','data/emulator.min.css','data/compression/extract7z.js','data/compression/extractzip.js',*[f'data/cores/{c}{suffix}-wasm.data' for c in cores for suffix in ['', '-legacy']]] if not (vendor/name).is_file()]
    receipt = {'runtime':'EmulatorJS','version':args.version,'sourceURL':url,'archive':{'file':archive.name,'bytes':archive.stat().st_size,'sha256':sha(archive)},'officialCoreDocumentation':'https://emulatorjs.org/docs4devs/cores/','cores':cores,'files':files,'missingRequiredFiles':missing,'runtimeVerified':False,'verificationScope':'Official fixed release extracted; selected original core/runtime files local and SHA recorded. Actual coin/start/select/match browser verification is separate.'}
    license_url=f'https://raw.githubusercontent.com/EmulatorJS/EmulatorJS/v{args.version}/LICENSE'
    license_path=vendor/'LICENSE'
    if not license_path.exists():urllib.request.urlretrieve(license_url,license_path)
    receipt['license']={'file':'LICENSE','sourceURL':license_url,'sha256':sha(license_path),'bytes':license_path.stat().st_size}
    (vendor/'source-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
    if missing:
        raise ValueError('Missing required runtime files: '+repr(missing))
    print(json.dumps({'vendor':str(vendor),'localFiles':len(files),'archiveSHA256':receipt['archive']['sha256'],'runtimeVerified':False}))


if __name__ == '__main__':
    main()
