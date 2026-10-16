"""Check that the archive audit actually rejects damaged native frame files."""
import importlib.util,struct,unittest,zlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('capture_audit',Path(__file__).parents[1]/'scripts/audit-kof98-expanded.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def chunk(kind,payload):return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
def native(width=320):return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,224,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\0'*width*3)*224))+chunk(b'IEND',b'')
class NativeFrameAudit(unittest.TestCase):
 def test_valid_native_frame(self):self.assertTrue(module.png_valid(native()))
 def test_corrupt_compressed_payload_is_rejected(self):
  damaged=bytearray(native());damaged[45]^=1;self.assertFalse(module.png_valid(damaged))
 def test_truncation_and_trailing_garbage_are_rejected(self):
  self.assertFalse(module.png_valid(native()[:-5]));self.assertFalse(module.png_valid(native()+b'garbage'))
 def test_valid_png_of_wrong_native_geometry_is_rejected(self):self.assertFalse(module.png_valid(native(319)))
if __name__=='__main__':unittest.main()
