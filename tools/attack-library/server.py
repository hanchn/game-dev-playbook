#!/usr/bin/env python3
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import pathlib,json,io,zipfile,urllib.parse,gzip
from native_runtime import handle as handle_native
ROOT=pathlib.Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def end_headers(self):
  self.send_header("Cache-Control","no-store")
  super().end_headers()
 def do_GET(self):
  if handle_native(self):return
  u=urllib.parse.urlsplit(self.path)
  if u.path=='/export':
   key=urllib.parse.parse_qs(u.query).get('character',[''])[0];c=next((c for c in json.loads((ROOT/'data/characters.json').read_text()) if c['id']==key),None)
   if not c:return self.send_error(404)
   assets=set()
   for clip in c['clips'].values():
    if isinstance(clip,list):assets.update(f['image'] for f in clip)
    else:
     for direction in clip.values():
      if isinstance(direction,list):assets.update(f['image'] for f in direction)
      else:assets.add(direction['image'])
   data=io.BytesIO()
   with zipfile.ZipFile(data,'w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('character.json',json.dumps(c,ensure_ascii=False,indent=2));z.writestr('README.txt','PNG sheets / individual frames + character.json.\nFrame coordinates are pixels. Duration is seconds. Anchors are ground pivots.\nEach action preserves its available directions. Source and authors are in character.json.\nSee the library README for grid-clips and clips layouts.\n')
    for asset in sorted(assets):
     p=(ROOT/asset).resolve()
     if not p.is_relative_to(ROOT/'assets'):return self.send_error(403)
     z.write(p,asset)
   body=data.getvalue();self.send_response(200);self.send_header('Content-Type','application/zip');self.send_header('Content-Disposition',f'attachment; filename="{key}.zip"');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  if u.path.startswith('/data/') and u.path.endswith('.json') and 'gzip' in self.headers.get('Accept-Encoding',''):
   p=(ROOT/u.path.lstrip('/')).resolve()
   if p.is_relative_to(ROOT/'data') and p.is_file():
    data=gzip.compress(p.read_bytes(),compresslevel=3);self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Encoding','gzip');self.send_header('Content-Length',str(len(data)));self.send_header('Vary','Accept-Encoding');self.end_headers();self.wfile.write(data);return
  super().do_GET()
 def do_POST(self):
  if not handle_native(self):self.send_error(404)
 def log_message(self,*args):pass
if __name__=='__main__':
 import os
 port=int(os.environ.get('PORT','4321'));print(f'Asset library: http://127.0.0.1:{port}',flush=True);ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
