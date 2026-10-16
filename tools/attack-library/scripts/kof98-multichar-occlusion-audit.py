#!/usr/bin/env python3
"""Read-only sprite-layer audit. Identify palette groups from observed entity anchors.
Do not infer full move success, original artist canvases, or bones from sprite pixels.
"""
from pathlib import Path
import argparse,csv,json,hashlib,functools,collections
import numpy as np
from PIL import Image
ap=argparse.ArgumentParser();ap.add_argument('character');args=ap.parse_args();B=Path(__file__).resolve().parents[1]/'data/research/kof98-multichar-20261016';D=B/args.character;gfx=(B/'kyo/sprites-region.bin').read_bytes();rows=list(csv.DictReader((D/'trace.csv').open()))
@functools.lru_cache(maxsize=10000)
def tile(code):
 a=np.zeros((16,16),np.uint8);start=(code*128)%len(gfx)
 for y in range(16):
  for x in range(16):
   q=start+(64 if x<8 else 0)+(y<<2);b=x%8;a[y,x]=((gfx[q+3]>>b&1)<<3)|((gfx[q+1]>>b&1)<<2)|((gfx[q+2]>>b&1)<<1)|(gfx[q]>>b&1)
 return a

def objects(v,auto):
 x=y=zx=zy=n=0
 for i in range(381):
  c=int(v[0x8200+i]);z=int(v[0x8000+i])
  if c&64:x=(x+zx+1)&511;zx=z>>8&15
  else:x=int(v[0x8400+i])>>7;y=(512-(c>>7))&511;n=c&63;zy=z&255;zx=z>>8&15
  if not n or n>32:continue
  for k in range(n):
   code=int(v[i*64+k*2]);attr=int(v[i*64+k*2+1]);code|=(attr<<12)&0xf0000
   if attr&8:code=code&~7|auto&7
   elif attr&4:code=code&~3|auto&3
   yield i,(x if x<496 else x-512),(y+k*16)&511,code,attr,zx,zy,y

def render(v,p,auto,palettes,layerpal=None):
 rgba=np.zeros((256,512,4),np.uint8);owner=np.zeros((256,512),np.uint16);layers={k:np.zeros_like(rgba) for k in (layerpal if layerpal is not None else palettes)};obj=[];unsupported=[]
 for i,x,y,code,attr,zx,zy,originY in objects(v,auto):
  pal=attr>>8
  if pal not in palettes or originY>=256:continue
  if zx!=15 or zy!=255:unsupported.append([i,zx,zy]);continue
  a=tile(code)
  if attr&1:a=a[:,::-1]
  if attr&2:a=a[::-1]
  if y>=256 or x>=512 or x+16<=0:continue
  ys=slice(y,min(y+16,256));xs=slice(max(x,0),min(x+16,512));a=a[:ys.stop-ys.start,max(0,-x):max(0,-x)+(xs.stop-xs.start)];mask=a>0;col=p[pal*16+a];block=np.stack([col>>16&255,col>>8&255,col&255,np.where(mask,255,0)],axis=-1).astype(np.uint8)
  rgba[ys,xs][mask]=block[mask];owner[ys,xs][mask]=pal;
  if pal in layers and 32<=originY<=184:layers[pal][ys,xs][mask]=block[mask]
  obj.append([i,x,y,code,attr])
 return rgba,owner,layers,obj,unsupported
# Discover primary palette independently for this character from first native frame.
r=rows[0];v=np.frombuffer((D/'vram'/f"{r['tick']}.bin").read_bytes(),dtype='<u2');p=np.frombuffer((D/'palette'/f"{r['tick']}.bin").read_bytes(),dtype='<u4');native=np.array(Image.open(D/'snap'/f"{r['tick']}.png").convert('RGB'))
possible=sorted({a>>8 for _,x,y,_,a,zx,zy,originY in objects(v,int(r['auto'])) if 0<a>>8<128 and 32<=y<=184 and zx==15 and zy==255});discovery=[]
for pal in possible:
 im,_,_,_,_=render(v,p,int(r['auto']),[pal]);im=im[16:240,:320];m=im[:,:,3]>0
 for player in [1,2]:
  x=int(r[f'p{player}x'])-int(r['cameraX']);y=int(r[f'p{player}y'])-16;roi=np.zeros((224,320),bool);roi[max(0,y-140):min(224,y+5),max(0,x-75):min(320,x+75)]=True;roi[184:,:141]=False;roi[184:,180:]=False;mm=m&roi;cnt=int(mm.sum());match=int(np.sum(np.all(im[:,:,:3]==native,axis=2)&mm));discovery.append({'palette':pal,'player':player,'opaqueNearEntity':cnt,'nativeMatching':match,'ratio':match/cnt if cnt else 0})
def choose(player):
 candidates=[q for q in discovery if q['player']==player and q['ratio']>.99 and q['opaqueNearEntity']>100];return max(candidates,key=lambda q:q['opaqueNearEntity'])['palette']
p1=choose(1);p2=choose(2);assert p1!=p2,(p1,p2)
out=D/'occlusion-render-v5';(out/'frames').mkdir(parents=True,exist_ok=True);frames=[];unique={};errors=[]
for r in rows:
 t=int(r['tick']);v=np.frombuffer((D/'vram'/f'{t}.bin').read_bytes(),dtype='<u2');p=np.frombuffer((D/'palette'/f'{t}.bin').read_bytes(),dtype='<u4');im,owner,layers,obj,unsupported=render(v,p,int(r['auto']),list(range(128))+[239],[p1]);body=layers[p1][16:240,:320];combined=im[16:240,:320];own=owner[16:240,:320];snap=np.array(Image.open(D/'snap'/f'{t}.png').convert('RGB'));full=body[:,:,3]>0;occ=full&(own!=p1);hud=np.zeros_like(full);hud[184:,:141]=True;hud[184:,180:]=True;occ &= ~hud;mask=full&~occ&~hud;mis=mask&np.any(body[:,:,:3]!=snap,axis=2);occmatch=occ&np.all(combined[:,:,:3]==snap,axis=2)
 originx=int(r['p1x'])-int(r['cameraX']);originy=int(r['p1y'])-16;canvas=Image.new('RGBA',(256,256));src=Image.fromarray(body);canvas.paste(src,(128-originx,224-originy));h=hashlib.sha256(canvas.tobytes()).hexdigest();name=unique.setdefault(h,f'{len(unique):03d}.png')
 if not (out/'frames'/name).exists():canvas.save(out/'frames'/name)
 e={'tick':t,'phase':r['phase'],'phaseTick':int(r['phaseTick']),'image':'frames/'+name,'pixelSHA256':h,'visibleOwnPixels':int(mask.sum()),'nativeMismatches':int(mis.sum()),'laterSpriteOccludedPixels':int(occ.sum()),'occlusionCompositeMatching':int(occmatch.sum()),'occlusionCompositeMismatches':int(occ.sum()-occmatch.sum()),'hudExcludedPixels':int((full&hud).sum()),'entityNativeScreen':[originx,originy],'canvas':[256,256],'pivot':[128,224],'alphaBounds':canvas.getbbox(),'unsupportedZoomObjects':unsupported};frames.append(e)
 if e['nativeMismatches'] or e['occlusionCompositeMismatches'] or unsupported or not e['visibleOwnPixels']:errors.append({'tick':t,'mismatches':e['nativeMismatches'],'occlusionCompositeMismatches':e['occlusionCompositeMismatches'],'unsupported':unsupported,'visible':e['visibleOwnPixels']})
report={'characterIntended':args.character,'kind':'original-runtime-sprite-reconstruction-candidate','allMovesComplete':False,'artAccepted':False,'paletteDiscovery':discovery,'selectedBodyPalettes':{'p1':p1,'p2':p2},'samples':len(frames),'uniqueDrawings':len(unique),'nativePixelErrors':errors,'occlusionPolicy':'P1 original body recovered independently; observed character/effect palettes0..127 plus observed hit/dust palette239 drawn later in actual VRAM order exclude occluded P1 pixels. Every excluded pixel must separately match the native composite; sprite occlusion is not a blanket pixel-error waiver. Composite match count explicitly reported; HUD coarse regions retained as limitation.','limitations':['Not original authoring canvas or recovered bones.','Palette discovery is per character/first frame, effects or later body palette switches require separate audit.','Body extraction does not include magic FX/shadows/reflections.','Input attempt names are not verified move identities.','Occluded body pixels are from original VRAM, not directly visible screenshot proof.'],'frames':frames}
(out/'manifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'character':args.character,'palettes':report['selectedBodyPalettes'],'frames':len(frames),'unique':len(unique),'errorFrames':len(errors),'occludedFrames':sum(f['laterSpriteOccludedPixels']>0 for f in frames)}))
