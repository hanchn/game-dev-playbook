import importlib.util,json,pathlib,tempfile,unittest,io
from unittest.mock import Mock
spec=importlib.util.spec_from_file_location('native_runtime',pathlib.Path(__file__).resolve().parents[1]/'native_runtime.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name)/'tools'/'attack';(self.root/'data').mkdir(parents=True);(self.root/'data/arcade-local-runtime-progress.json').write_text(json.dumps({'games':[{'rank':1,'romIdProposal':'pacman','title':'Pac-Man'}]}));p=self.root/'assets/original-games/pacman';p.mkdir(parents=True);(p/'pacman.zip').write_bytes(b'original');self.runner=Mock(return_value=Mock(returncode=0,stdout='good',stderr=''));self.proc=Mock(pid=123);self.proc.poll.return_value=None;self.pop=Mock(return_value=self.proc);self.r=m.NativeRuntime(self.root,'/official/mame',self.runner,self.pop)
 def tearDown(self):
  if self.r.log:self.r.log.close()
  self.tmp.cleanup()
 def test_unknown_and_injection(self):
  for id in ['unknown','pacman;touch /tmp/x','../pacman','pacman -debug',None]:
   with self.assertRaises(ValueError):self.r.verify(id)
  self.runner.assert_not_called()
 def test_symlink_escape(self):
  p=self.root/'assets/original-games/pacman';(p/'pacman.zip').unlink();p.rmdir();p.symlink_to(self.root/'data')
  with self.assertRaises(ValueError):self.r.verify('pacman')
 def test_origin(self):
  self.assertTrue(m.request_allowed({'Host':'127.0.0.1:4321','Origin':'http://127.0.0.1:4321'}))
  self.assertTrue(m.request_allowed({'Host':'localhost:4321','X-Arcade-Local':'1'}))
  for h in [{'Host':'evil','X-Arcade-Local':'1'},{'Host':'localhost:4321','Origin':'http://evil:4321'},{'Host':'localhost:4321','Origin':'http://localhost:4322'},{'Host':'localhost:4321'},{'Host':'localhost?bad','X-Arcade-Local':'1'},{'Host':'localhost:4321','Origin':'null','X-Arcade-Local':'1'}]:self.assertFalse(m.request_allowed(h))
 def test_api_rejects_oversized_and_extra_parameters(self):
  for body,length in [(b'{}','8193'),(b'{"id":"pacman","args":["-debug"]}',None)]:
   h=Mock();h.path='/api/native/launch';h.command='POST';h.headers={'Host':'localhost:4321','X-Arcade-Local':'1','Content-Type':'application/json','Content-Length':length or str(len(body))};h.rfile=io.BytesIO(body);h.wfile=io.BytesIO()
   self.assertTrue(m.handle(h,self.r));h.send_response.assert_called_with(400)
  self.pop.assert_not_called()
 def test_launch_fixed_argv_and_owned_stop(self):
  self.r.launch('pacman');args,kwargs=self.pop.call_args;self.assertEqual(args[0][0:2],['/official/mame','pacman']);self.assertIn('-noreadconfig',args[0]);self.assertFalse(kwargs['shell']);self.assertTrue(self.runner.called)
  with self.assertRaises(ValueError):self.r.launch('pacman')
  self.r.stop();self.proc.terminate.assert_called_once()
 def test_failed_verification_never_launch(self):
  self.runner.return_value.returncode=1
  with self.assertRaises(ValueError):self.r.launch('pacman')
  self.pop.assert_not_called()
if __name__=='__main__':unittest.main()
