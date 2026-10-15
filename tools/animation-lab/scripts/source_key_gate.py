"""Validate a recorded four-keyframe review before interpolation; never infer art approval."""
import hashlib,json,pathlib
from PIL import Image

def validate_source_gate(directory,gate_file):
    root=pathlib.Path(directory);gate=json.loads(pathlib.Path(gate_file).read_text())
    if gate.get('sourceAccepted') is not True:raise ValueError('Four source keys have not passed visual/anchor review')
    records=gate.get('keys',[])
    if len(records)!=4:raise ValueError('Source gate must bind all four PNG hashes')
    sizes=[]
    for i,record in enumerate(records,1):
        f=root/f'{i:03d}.png'
        if hashlib.sha256(f.read_bytes()).hexdigest()!=record.get('sha256'):raise ValueError(f'Source key {i} changed after review')
        with Image.open(f) as im:sizes.append(im.size)
    if len(set(sizes))!=1:raise ValueError('Source key canvas sizes differ')
    if not gate.get('reviewedBy') or not gate.get('groundPolicy'):raise ValueError('Reviewer and fixed ground policy required')
    return gate
