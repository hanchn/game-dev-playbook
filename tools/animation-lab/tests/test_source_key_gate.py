import sys,pathlib,tempfile,hashlib,json,unittest
from PIL import Image
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from source_key_gate import validate_source_gate
class GateTests(unittest.TestCase):
 def test_bound_source_cannot_change_after_review(self):
  with tempfile.TemporaryDirectory() as td:
   p=pathlib.Path(td);keys=[]
   for i in range(1,5):
    f=p/f'{i:03}.png';Image.new('RGBA',(16,16),(255,0,0,255)).save(f);keys.append({'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
   g=p/'gate.json';g.write_text(json.dumps({'sourceAccepted':True,'reviewedBy':'test-fixture','keys':keys,'groundPolicy':{'floorY':15}}))
   self.assertTrue(validate_source_gate(p,g)['sourceAccepted'])
   Image.new('RGBA',(16,16),(0,255,0,255)).save(p/'002.png')
   with self.assertRaisesRegex(ValueError,'changed'):validate_source_gate(p,g)
 def test_pending_review_is_not_generation_permission(self):
  with tempfile.TemporaryDirectory() as td:
   p=pathlib.Path(td);g=p/'gate.json';g.write_text('{"sourceAccepted":false}')
   with self.assertRaisesRegex(ValueError,'not passed'):validate_source_gate(p,g)
if __name__=='__main__':unittest.main()
