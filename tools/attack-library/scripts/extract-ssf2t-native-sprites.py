"""Rebuild observed CPS2 player objects, retaining pen-15 alpha and renderer block geometry.
Read-only port of MAME 0.289 CPS2 tile/object formulas (BSD-3-Clause, Paul Leaman,
Andreas Naive, Nicola Salmoria). Pixel comparison gates export, not visual guesswork.
"""
import argparse,collections,csv,functools,hashlib,json,pathlib,zipfile
from PIL import Image
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('capture',type=pathlib.Path);p.add_argument('--name',default='ryu-native-motions');a=p.parse_args();source=a.capture
out=ROOT/'assets/research/ssf2t-native';out.mkdir(parents=True,exist_ok=True)
gfx=(source/'gfx-decoded-region.bin').read_bytes();assert len(gfx)==0x1000000
observed={int(r['frame']):r for r in csv.DictReader((source/'actions.csv').open())}
palettes=collections.defaultdict(dict)
for r in csv.DictReader((source/'sprite-palettes.csv').open()):palettes[int(r['frame'])][int(r['index'])]=int(r['argb'])
outputs={int(r['frame']):(int(r['xoffset']),int(r['yoffset'])) for r in csv.DictReader((source/'sprite-outputs.csv').open())}
objects=collections.defaultdict(list)
for r in csv.DictReader((source/'sprite-objects.csv').open()):objects[int(r['frame']),int(r['bank'])].append({k:int(r[k]) for k in ['index','x','y','code','attr']})
@functools.lru_cache(None)
def tile(code,palette):
 data=gfx[code*128:(code+1)*128];assert len(data)==128,code
 im=Image.new('RGBA',(16,16));pixels=[]
 for y in range(16):
  for x in range(16):
   start=y*8+(x//8)*4;shift=7-x%8;pen=sum(((data[start+i]>>shift)&1)<<i for i in range(4));color=palette[pen]
   pixels.append((color>>16&255,color>>8&255,color&255,0 if pen==15 else 255))
 im.putdata(pixels);return im

def reconstruct(frame,bank,color):
 ops=[];pal=tuple(palettes[frame][color*16+i] for i in range(16));xo,yo=outputs[frame]
 for o in sorted(objects[frame,bank],key=lambda x:x['index'],reverse=True):
  x,y,code,attr=(o[k] for k in ['x','y','code','attr'])
  if attr&31!=color:continue
  code+=(y&0x6000)<<3;fx,fy=bool(attr&32),bool(attr&64);nx,ny=((attr>>8)&15)+1,((attr>>12)&15)+1
  if attr&128:x+=xo;y+=yo
  for row in range(ny):
   for column in range(nx):
    if fx or fy:c=code+(nx-1-column if fx else column)+16*(ny-1-row if fy else row)
    else:c=(code&~15)+((code+column)&15)+16*row
    tx=((x+column*16+64-xo)&1023)-64;ty=((y+row*16+16-yo)&1023)-16
    im=tile(c,pal)
    if fx:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if fy:im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    ops.append((tx,ty,im))
 if not ops:return None
 left,top=min(x for x,y,im in ops),min(y for x,y,im in ops);right,bottom=max(x+16 for x,y,im in ops),max(y+16 for x,y,im in ops)
 assert right-left<512 and bottom-top<512,(frame,bank,color,left,top,right,bottom)
 body=Image.new('RGBA',(right-left,bottom-top))
 for x,y,im in ops:body.alpha_composite(im,(x-left,y-top))
 return body,(left,top,right,bottom)

frames=[];rejected=[];images=[]
for path in sorted((source/'snap').glob('*.png')):
 frame=int(path.name.split('-')[0]);r=observed[frame];native=np.asarray(Image.open(path).convert('RGB'))
 for player,color,char in [(1,1,'ryu'),(2,16,'ken')]:
  choices=[]
  for bank in (0,):
   result=reconstruct(frame,bank,color)
   if not result:continue
   body,bounds=result;left,top,right,bottom=bounds
   x0,y0,x1,y1=max(0,left),max(0,top),min(384,right),min(224,bottom)
   if x1<=x0 or y1<=y0:continue
   clip=np.asarray(body.crop((x0-left,y0-top,x1-left,y1-top)));mask=clip[:,:,3]>0;visible=int(mask.sum());matches=int(np.all(clip[:,:,:3]==native[y0:y1,x0:x1],axis=2)[mask].sum())
   choices.append((matches/max(1,visible),visible,bank,body,bounds))
  if not choices:rejected.append({'frame':frame,'character':char,'reason':'no visible player objects'});continue
  score,visible,bank,body,bounds=max(choices,key=lambda v:v[0])
  if score!=1 or visible<100:
   rejected.append({'frame':frame,'character':char,'bestBank':bank,'matchFraction':score,'visiblePixels':visible,'reason':'not all visible opaque pixels equal native screenshot; no accepted export'});continue
  left,top,right,bottom=bounds;posx,posy=int(r[f'p{player}x']),int(r[f'p{player}y']);ox=posx-int(r['cameraX']);oy=224-(posy-15)+int(r['cameraY'])
  meta={'frame':frame,'phase':r['phase'],'phaseTick':int(r['phaseTick']),'character':char,'player':player,'bank':bank,'paletteBase':color*16,'rendererBlockCanvas':[body.width,body.height],'screenBounds':list(bounds),'visibleBoundsInCanvas':list(body.getbbox()),'projectedRAMAnchorInCanvas':[ox-left,oy-top],'anchorVerification':'RAM projection; render-to-RAM delay not calibrated, not recovered authoring pivot','visiblePixelsCompared':visible,'matchFraction':score,'clippedByViewport':left<0 or top<0 or right>384 or bottom>224,'rgbaSHA256':hashlib.sha256(body.tobytes()).hexdigest()}
  frames.append(meta);images.append(body)
assert frames,'No source-validated player frames'
unique={}
for im,meta in zip(images,frames):
 key=(im.size,meta['rgbaSHA256'])
 if key not in unique:unique[key]=(len(unique),im)
w,h=max(i.width for i in images)+4,max(i.height for i in images)+4;cols=8;atlas=Image.new('RGBA',(w*cols,h*((len(unique)+cols-1)//cols)))
for n,im in unique.values():atlas.alpha_composite(im,(n%cols*w+2,n//cols*h+2))
for im,meta in zip(images,frames):
 n=unique[(im.size,meta['rgbaSHA256'])][0];meta['atlasRect']=[n%cols*w+2,n//cols*h+2,im.width,im.height]
atlas.save(out/(a.name+'.png'))
report={'set':'ssf2t World 940223','capture':str(source.resolve().relative_to(ROOT.parents[1])),'method':'MAME decoded gfx + actual latched render buffer + real palette; every visible opaque pixel equals native screenshot','gfxRegionSHA256':hashlib.sha256(gfx).hexdigest(),'sourceROMPackageSHA256':'359337a89e7ed65b63424dd3e90281db8b73db7add3d24278ec9918de449435e','sources':['https://github.com/mamedev/mame/blob/mame0289/src/mame/capcom/cps2.cpp','https://github.com/mamedev/mame/blob/mame0289/src/mame/capcom/cps1.cpp','https://docs.mamedev.org/luascript/ref-mem.html'],'atlas':a.name+'.png','frames':frames,'rejected':rejected,'accepted':len(frames),'uniqueRGBAFrames':len(set(f['rgbaSHA256'] for f in frames)),'limitations':['Only observed Ryu P1 actions and Ken P2 idle poses, not complete reactions or full roster.','Renderer block canvases and RAM anchors are not original authoring canvases or recovered bones.','No source timing decomposition or complete action animation claim.','Only visible opaque pixels are compared; clipped content is explicitly marked.','A sparse sample can miss changing poses when the original animation pointer is unchanged.'],'scripts':{x:hashlib.sha256((ROOT/x).read_bytes()).hexdigest() for x in ['scripts/mame/ssf2t-actions.lua','scripts/mame/ssf2t-sprites.lua','scripts/extract-ssf2t-native-sprites.py']}}
(out/(a.name+'.json')).write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n')
with zipfile.ZipFile(out/(a.name+'-objects.zip'),'w',zipfile.ZIP_DEFLATED) as z:
 for name in ['sprite-objects.csv','sprite-palettes.csv','sprite-outputs.csv','actions.csv','runtime.log']:z.write(source/name,name)
print('Accepted',len(frames),'unique RGBA',report['uniqueRGBAFrames'],'rejected',len(rejected),'by character',dict(collections.Counter(f['character'] for f in frames)))
