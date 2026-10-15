import struct,io
from PIL import Image
def lz5(data,size):
 i=0;out=bytearray();ct=data[i];i+=1;bits=0;rb=0;rbc=0
 def read():
  nonlocal i
  v=data[i];i+=1;return v
 while len(out)<size:
  d=read()
  if ct&(1<<bits):
   if d&63==0:distance=(d<<2|read())+1;n=read()+2
   else:
    rb|=(d&192)>>rbc;rbc+=2;n=d&63
    if rbc<8:distance=read()+1
    else:distance=rb+1;rb=rbc=0
   if distance>len(out):raise ValueError('Invalid LZ5 back reference')
   for _ in range(n+1):out.append(out[-distance])
  else:
   if d&224==0:n=read()+8
   else:n=d>>5;d&=31
   out.extend([d]*n)
  bits+=1
  if bits==8 and len(out)<size:ct=read();bits=0
 return bytes(out[:size])
def load_sff(path):
 b=path.read_bytes()
 assert b[:12]==b'ElecbyteSpr\x00','Invalid SFF signature'
 if b[15]==1:
  n,start=struct.unpack_from('<2I',b,20);lookup={};records=[];palette=None
  for _ in range(n):
   nxt,size,ax,ay,g,num,link=struct.unpack_from('<IIhhHHH',b,start);shared=b[start+18]
   if size:
    payload=b[start+32:nxt if nxt else start+32+size]
    if not shared or palette is None:
     assert len(payload)>=769 and payload[-769]==12,'Missing PCX palette'
     palette=payload[-768:]
    else:payload=payload+bytes([12])+palette
    xmin,ymin,xmax,ymax=struct.unpack_from('<4H',payload,4);w=xmax-xmin+1;h=ymax-ymin+1;bpl=struct.unpack_from('<H',payload,66)[0];assert payload[3]==8 and payload[65]==1,'Only 8-bit PCX supported'
    pixels=bytearray();k=128
    while len(pixels)<bpl*h:
     v=payload[k];k+=1;count=1
     if payload[2]==1 and v&192==192:count=v&63;v=payload[k];k+=1
     pixels.extend([v]*count)
    pixels=b''.join(pixels[y*bpl:y*bpl+w] for y in range(h));im=Image.frombytes('P',(w,h),pixels);im.putpalette(palette);im.info['transparency']=0;im=im.convert('RGBA')
   else:im=records[link][0].copy()
   records.append((im,ax,ay));lookup.setdefault((g,num),(im,ax,ay));start=nxt
  return lookup
 assert b[15]==2,'Unsupported SFF version'
 start,n,pstart,pn,lo,_,to=struct.unpack_from('<7I',b,36)
 pals=[]
 for i in range(pn):
  g,num,colors,link,off,size=struct.unpack_from('<4H2I',b,pstart+i*16)
  pals.append(b[lo+off:lo+off+size] if size else pals[link])
 sprites=[];lookup={}
 for i in range(n):
  g,num,w,h,ax,ay,link,fmt,depth,off,size,pal,flags=struct.unpack_from('<4H2hHBBIIHH',b,start+i*28)
  payload=b[(to if flags&1 else lo)+off:][:size]
  if not size:im=sprites[link][0].copy()
  else:
   if fmt==4:px=lz5(payload[4:],w*h)
   elif fmt==0:px=payload
   elif fmt==2:
    out=bytearray();k=4
    while len(out)<w*h:
     d=payload[k];k+=1;count=1
     if d&192==64:count=d&63;d=payload[k];k+=1
     out.extend([d]*count)
    px=bytes(out[:w*h])
   elif fmt in (10,11,12):
    im=Image.open(io.BytesIO(payload[4:]));px=im.tobytes() if fmt==10 else None
   else:raise ValueError(f'Unsupported SFF encoding {fmt}')
   if fmt in (0,2,4,10):
    im=Image.frombytes('P',(w,h),px);p=pals[pal];rgb=[]
    for j in range(0,len(p),4):rgb.extend(p[j:j+3])
    im.putpalette((rgb+[0]*768)[:768]);im.info['transparency']=0;im=im.convert('RGBA')
   else:im=im.convert('RGBA')
  sprites.append((im,ax,ay));lookup[(g,num)]=(im,ax,ay)
 return lookup
