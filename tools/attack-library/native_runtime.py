"""Loopback-only original MAME adapter. Handler calls handle(handler), returning bool."""
import json, pathlib, re, shutil, subprocess, threading, urllib.parse
ROOT=pathlib.Path(__file__).resolve().parent
class NativeRuntime:
 def __init__(self,root=ROOT,binary=None,runner=subprocess.run,popen=subprocess.Popen):
  self.root=pathlib.Path(root).resolve();self.binary=binary or shutil.which('mame');self.run=runner;self.popen=popen;self.lock=threading.RLock();self.process=None;self.game=None;self.log=None;self.verified={};self._json_cache={}
 def read_json(self,path):
  stat=path.stat();stamp=(stat.st_mtime_ns,stat.st_size)
  cached=self._json_cache.get(path)
  if not cached or cached[0]!=stamp:self._json_cache[path]=(stamp,json.loads(path.read_text()))
  return self._json_cache[path][1]
 def registry(self):
  return self.read_json(self.root/'data/arcade-local-runtime-progress.json')['games']
 def game_path(self,id):
  if not isinstance(id,str) or not re.fullmatch(r'[a-z0-9_]+',id) or id not in {g.get('romIdProposal') for g in self.registry()}:raise ValueError('未知原游戏ID')
  base=(self.root/'assets/original-games').resolve();p=(base/id).resolve()
  if not p.is_relative_to(base) or p==base:raise ValueError('资源目录越界')
  return p
 def rom_search_path(self,id):
  paths=[self.game_path(id)]
  standard=self.root/'data/standard-games.json'
  if standard.is_file():
   base=(self.root/'assets/original-games').resolve()
   for game in self.read_json(standard).get('games',[]):
    if game.get('id')==id and game.get('bios'):
     path=(self.root/game['bios']).resolve().parent
     if path.is_relative_to(base) and path not in paths:paths.append(path)
  return ';'.join(map(str,paths))
 def builtin_without_rom(self,id):
  path=self.root/'data/research/mame-top100-20261016/driver-metadata.json'
  if not path.is_file():return False
  entry=next((g for g in self.read_json(path).get('games',[]) if g.get('id')==id),None)
  return bool(entry and entry.get('driverFound') and not entry.get('ROMs') and not entry.get('disks'))
 def catalog(self):
  out=[]
  report=self.root/'data/research/mame-top100-20261016/set-verification.json'
  checks={e['id']:e for e in self.read_json(report).get('games',[])} if report.is_file() else {}
  for g in self.registry():
   id=g.get('romIdProposal');item={k:g.get(k) for k in ('rank','title','name','romIdProposal')}
   try:p=self.game_path(id);item['builtInNoROM']=self.builtin_without_rom(id);item['packagePresent']=(p/(id+'.zip')).is_file() or item['builtInNoROM']
   except ValueError:item['packagePresent']=False
   item['romVerified']=self.verified.get(id,{}).get('ok',checks.get(id,{}).get('setCompatible',False));item['gameplayVerified']=False;out.append(item)
  return out
 def status(self):
  with self.lock:
   active=self.process is not None and self.process.poll() is None
   return {'binaryAvailable':bool(self.binary),'running':active,'game':self.game if active else None,'pid':self.process.pid if active else None,'verification':self.verified,'launchIsGameplayQA':False}
 def verify(self,id):
  p=self.game_path(id)
  if not self.binary:raise ValueError('本地MAME未安装')
  if not (p/(id+'.zip')).is_file() and not self.builtin_without_rom(id):raise ValueError('缺少原ROM包')
  result=self.run([self.binary,id,'-rompath',self.rom_search_path(id),'-verifyroms','-noreadconfig'],capture_output=True,text=True,timeout=60,shell=False)
  record={'ok':result.returncode==0,'exitCode':result.returncode,'output':(result.stdout+result.stderr)[-16000:]};self.verified[id]=record;return record
 def launch(self,id):
  with self.lock:
   if self.process is not None and self.process.poll() is None:raise ValueError('已有本启动器的游戏窗口运行，请先停止')
   if not self.verify(id)['ok']:raise ValueError('原ROM校验未通过，未启动')
   p=self.game_path(id);out=(self.root.parent.parent/'output/native-arcade'/id).resolve();out.mkdir(parents=True,exist_ok=True)
   for folder in ('cfg','nvram','state','snapshot','diff'): (out/folder).mkdir(exist_ok=True)
   args=[self.binary,id,'-rompath',self.rom_search_path(id),'-window','-skip_gameinfo','-noreadconfig']
   for option,folder in [('cfg_directory','cfg'),('nvram_directory','nvram'),('state_directory','state'),('snapshot_directory','snapshot'),('diff_directory','diff')]:args.extend(['-'+option,str(out/folder)])
   self.log=(out/'runtime.log').open('ab');self.process=self.popen(args,cwd=str(out),stdout=self.log,stderr=subprocess.STDOUT,shell=False);self.game=id
   return self.status()
 def stop(self):
  with self.lock:
   if self.process is not None and self.process.poll() is None:
    self.process.terminate()
    try:self.process.wait(timeout=5)
    except subprocess.TimeoutExpired:self.process.kill();self.process.wait(timeout=5)
   if self.log:self.log.close();self.log=None
   return self.status()
RUNTIME=NativeRuntime()
def request_allowed(headers):
 host=headers.get('Host','')
 if not re.fullmatch(r'(127\.0\.0\.1|localhost)(:[0-9]{1,5})?',host):return False
 try:
  parsed=urllib.parse.urlsplit('http://'+host)
  if parsed.hostname not in ('127.0.0.1','localhost') or parsed.username or parsed.password or parsed.path:return False
  port=parsed.port or 80
 except ValueError:return False
 origin=headers.get('Origin')
 if origin:
  try:o=urllib.parse.urlsplit(origin);return o.scheme=='http' and o.hostname==parsed.hostname and (o.port or 80)==port and not o.username and not o.password and not o.path and not o.query and not o.fragment
  except ValueError:return False
 return headers.get('X-Arcade-Local')=='1'
def handle(handler,runtime=RUNTIME):
 path=urllib.parse.urlsplit(handler.path).path
 if not path.startswith('/api/native/'):return False
 def reply(code,data):
  body=json.dumps(data,ensure_ascii=False).encode();handler.send_response(code);handler.send_header('Content-Type','application/json; charset=utf-8');handler.send_header('Content-Length',str(len(body)));handler.end_headers();handler.wfile.write(body)
 if not request_allowed(handler.headers):reply(403,{'error':'仅允许本机同源请求'});return True
 try:
  method=handler.command
  if method=='GET' and path in ('/api/native/status','/api/native/catalog'):reply(200,runtime.status() if path.endswith('status') else {'games':runtime.catalog()});return True
  if method!='POST' or path not in ('/api/native/verify','/api/native/launch','/api/native/stop'):reply(404,{'error':'未知接口'});return True
  if handler.headers.get('Transfer-Encoding'):raise ValueError('不支持分块请求')
  length=int(handler.headers.get('Content-Length','0'))
  if length<1 or length>8192:raise ValueError('JSON请求大小需为1–8192字节')
  if handler.headers.get('Content-Type','').split(';')[0].strip()!='application/json':raise ValueError('需application/json')
  data=json.loads(handler.rfile.read(length))
  if not isinstance(data,dict) or set(data)-{'id'}:raise ValueError('仅支持id参数')
  result=runtime.stop() if path.endswith('stop') else getattr(runtime,path.rsplit('/',1)[1])(data.get('id'))
  reply(200,result)
 except (ValueError,OSError,subprocess.SubprocessError) as e:reply(400,{'error':str(e)})
 return True
