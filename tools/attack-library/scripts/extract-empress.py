import struct,json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[3];base=root/'output/attack-library/empress';b=(base/'app.asar').read_bytes();hs=struct.unpack_from('<I',b,12)[0];head=json.loads(b[16:16+hs]);offset=8+struct.unpack_from('<I',b,4)[0];manifest=[]
def walk(node,p=''):
 for k,v in node.get('files',{}).items():
  name=p+k
  if 'files' in v:walk(v,name+'/');continue
  if name.startswith('node_modules/'):continue
  target=(base/'extracted'/name).resolve()
  if not target.is_relative_to((base/'extracted').resolve()):raise ValueError(name)
  data=b[offset+int(v['offset']):offset+int(v['offset'])+v['size']];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);manifest.append({'path':name,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
walk(head);(base/'files.json').write_text(json.dumps(manifest));print(len(manifest),'files extracted without running downloaded executable')
