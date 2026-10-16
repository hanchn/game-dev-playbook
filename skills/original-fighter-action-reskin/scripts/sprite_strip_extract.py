"""Extract a horizontal sprite strip by alpha ownership, retaining source RGBA.
Rectangular cuts alone are unsafe when neighbouring silhouettes overlap in X.
"""
from collections import deque
from pathlib import Path
import argparse,hashlib,json
import numpy as np
from PIL import Image

def extract_strip(im,count,padding=16):
 rgba=np.array(im.convert('RGBA'));a=rgba[:,:,3];solid=a>=200;seen=np.zeros(a.shape,bool);components=[]
 for y,x in zip(*np.where(solid)):
  if seen[y,x]:continue
  todo=[(int(y),int(x))];seen[y,x]=True;pts=[]
  while todo:
   cy,cx=todo.pop();pts.append((cy,cx))
   for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
    if 0<=ny<a.shape[0] and 0<=nx<a.shape[1] and solid[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;todo.append((ny,nx))
  if len(pts)>500:
   yy,xx=zip(*pts);components.append({'points':pts,'bounds':(min(xx),min(yy),max(xx)+1,max(yy)+1)})
 if len(components)!=count:raise ValueError(f'Expected {count} connected figures, found {len(components)}; inspect rather than guessing.')
 
 for c in components:
  b=c['bounds']
  if b[0]<=0 or b[1]<=0 or b[2]>=im.width or b[3]>=im.height:raise ValueError('Opaque figure touches source border; inspect original clipping before padding.')
 components.sort(key=lambda c:c['bounds'][0]);owner=np.full(a.shape,-1,np.int16);queue=deque()
 for i,c in enumerate(components):
  for y,x in c['points']:owner[y,x]=i;queue.append((y,x))
 # Grow only through actual nonzero alpha. Never use bbox, hull or dilation.
 while queue:
  y,x=queue.popleft();ident=owner[y,x]
  for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
   if 0<=ny<a.shape[0] and 0<=nx<a.shape[1] and a[ny,nx]>0 and owner[ny,nx]<0:owner[ny,nx]=ident;queue.append((ny,nx))
 result=[]
 for i,c in enumerate(components):
  yy,xx=np.where(owner==i);left,right=int(xx.min()),int(xx.max())+1;top,bottom=int(yy.min()),int(yy.max())+1
  cell=np.zeros((im.height,right-left+padding*2,4),dtype=np.uint8);block=rgba[:,left:right].copy();block[owner[:,left:right]!=i]=0;cell[:,padding:padding+right-left]=block
  own=(owner[:,left:right]==i);assert np.array_equal(block[own],rgba[:,left:right][own])
  b=c['bounds'];result.append({'image':Image.fromarray(cell),'sourceBox':[left,0,right,im.height],'opaqueBounds':[b[0]-left+padding,b[1],b[2]-left+padding,b[3]],'alphaBounds':[padding,top,padding+right-left,bottom],'sourcePixelsRetained':int(len(xx)),'pixelSHA256':hashlib.sha256(rgba[owner==i].tobytes()).hexdigest(),'sourcePixelIdentityPassed':True})
 return result

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('count',type=int);p.add_argument('output');args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True);im=Image.open(args.input).convert('RGBA');result=extract_strip(im,args.count);records=[]
 for i,r in enumerate(result):
  target=out/f'{i:03}.png';r.pop('image').save(target);records.append({'file':str(target),**r})
 (out/'extraction.json').write_text(json.dumps({'source':args.input,'sha256':hashlib.sha256(Path(args.input).read_bytes()).hexdigest(),'frames':records},indent=2)+'\n')
