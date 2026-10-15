export function advancePlayback(index,count,loop=true){
 if(!Number.isInteger(count)||count<1)return {index:0,playing:false};
 if(index+1<count)return {index:index+1,playing:true};
 return loop?{index:0,playing:true}:{index:count-1,playing:false};
}
export function fixedCanvasTransform(sizes,target=512){
 if(!sizes.length)throw Error('没有完整序列帧');
 const [w,h]=sizes[0];
 if(!(w>0&&h>0)||sizes.some(([x,y])=>x!==w||y!==h))throw Error('帧画布尺寸不一致，先检查源图注册，禁止逐帧缩放');
 const scale=Math.min(target/w,target/h);
 return {scale,x:(target-w*scale)/2,y:(target-h*scale)/2,width:w*scale,height:h*scale};
}
export function manifestClip(manifest){
 return manifest.clips?.[0]??(Array.isArray(manifest.frames)?manifest:null);
}
export function modelAssetUrl(path){
 const base='/model-frame-assets/';
 const relative=path.startsWith(base)?path.slice(base.length):path;
 if(relative.startsWith('/')||relative.includes('://'))throw Error('素材必须使用本地资产路径');
 return base+relative.split('/').map(encodeURIComponent).join('/');
}
