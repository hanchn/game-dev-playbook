// Read-only 8-bit, non-interlaced RGBA decoder, derived from the knowledge
// repository's sprite-animation-production check-sheet helper.
import fs from 'node:fs';
import zlib from 'node:zlib';
export function png(file) {
  const b=fs.readFileSync(file);
  if(b.length<33 || !b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Expected PNG signature');
  let w,h,p=8,ended=false;const parts=[];
  while(p+12<=b.length){
    const n=b.readUInt32BE(p), key=b.toString('ascii',p+4,p+8);
    if(p+n+12>b.length)throw Error('Truncated PNG chunk');
    const d=b.subarray(p+8,p+8+n);p+=n+12;
    if(key==='IHDR'){
      if(n!==13)throw Error('Invalid PNG header');
      w=d.readUInt32BE(0);h=d.readUInt32BE(4);
      if(d[8]!==8 || d[9]!==6 || d[10]!==0 || d[11]!==0 || d[12]!==0)throw Error('Expected non-interlaced 8-bit RGBA PNG');
      if(!w || !h || w*h>64_000_000)throw Error('PNG dimensions exceed checker budget');
    }
    if(key==='IDAT')parts.push(d);
    if(key==='IEND'){ended=true;break;}
  }
  if(!w || !h || !parts.length || !ended)throw Error('Incomplete PNG');
  const stride=w*4,raw=zlib.inflateSync(Buffer.concat(parts),{maxOutputLength:h*(stride+1)}),out=new Uint8Array(w*h*4);
  if(raw.length!==h*(stride+1))throw Error('Invalid PNG pixel data');
  for(let y=0;y<h;y++){
    const f=raw[y*(stride+1)];if(f>4)throw Error('Unsupported PNG filter');
    for(let x=0;x<stride;x++){
      const a=x>=4?out[y*stride+x-4]:0,up=y?out[(y-1)*stride+x]:0,ul=y&&x>=4?out[(y-1)*stride+x-4]:0;
      let v=0;if(f===1)v=a;if(f===2)v=up;if(f===3)v=(a+up)>>1;
      if(f===4){const t=a+up-ul,da=Math.abs(t-a),db=Math.abs(t-up),dc=Math.abs(t-ul);v=da<=db&&da<=dc?a:db<=dc?up:ul;}
      out[y*stride+x]=(raw[y*(stride+1)+x+1]+v)&255;
    }
  }
  return {w,h,pixels:out};
}
