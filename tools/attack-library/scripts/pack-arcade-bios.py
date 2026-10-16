#!/usr/bin/env python3
"""Wrap an original BIOS ZIP without changing inner bytes for EmulatorJS4.2.3.

EJS_externalFiles={'/': wrapperURL} uses the decompressor's Uint8Array path,
unlike its direct ArrayBuffer write path which can create a zero-byte file.
"""
import argparse
import hashlib
import json
import pathlib
import zipfile


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bios',required=True,type=pathlib.Path)
    parser.add_argument('--output',required=True,type=pathlib.Path)
    parser.add_argument('--check-existing',action='store_true')
    args=parser.parse_args()
    original=args.bios.read_bytes()
    with zipfile.ZipFile(args.bios) as inner:
        if inner.testzip():
            raise ValueError('Original BIOS ZIP CRC failed')
    if not args.check_existing:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        entry=zipfile.ZipInfo(args.bios.name,date_time=(1980,1,1,0,0,0))
        entry.compress_type=zipfile.ZIP_STORED
        with zipfile.ZipFile(args.output,'w') as archive:
            archive.writestr(entry,original)
    with zipfile.ZipFile(args.output) as archive:
        names=archive.namelist()
        if names!=[args.bios.name] or archive.read(args.bios.name)!=original or archive.testzip():
            raise ValueError('Wrapper does not retain exactly one byte-identical original BIOS ZIP')
    sha=lambda b:hashlib.sha256(b).hexdigest()
    receipt={'kind':'derived-transport-wrapper-not-original-bios','original':{'file':str(args.bios),'bytes':len(original),'sha256':sha(original)},'container':{'file':str(args.output),'bytes':args.output.stat().st_size,'sha256':sha(args.output.read_bytes())},'nestedEntry':args.bios.name,'innerBytesIdentical':True,'runtimeVerified':False,'reason':'Use official decompressor typedarray writes; direct externalFiles ArrayBuffer path produced size0 in actual browser test','reproduction':'pack-arcade-bios.py --bios ORIGINAL.zip --output WRAPPER.zip; fixed1980/stored output deterministic; existing wrapper may use different compression metadata'}
    args.output.with_suffix('.receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt))


if __name__=='__main__':
    main()
