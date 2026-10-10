import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
function crc(bytes){let c=0xffffffff;for(const byte of bytes){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const body=Buffer.concat([Buffer.from(type),data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc(body),out.length-4);return out;}
function makePNG(kind){const w=16,h=8,header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const pixels=Buffer.alloc(h*(w*4+1));for(let y=2;y<6;y++)for(let x=2;x<6;x++){const p=y*(w*4+1)+1+x*4;pixels[p]=255;pixels[p+3]=255;}if(kind==='valid')for(let y=2;y<6;y++)for(let x=10;x<14;x++)pixels[y*(w*4+1)+1+x*4+3]=255;if(kind==='edge')pixels[1+8*4+3]=255;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);}
for(const kind of ['valid','empty','edge'])test(`CLI rejects empty/edge frames and accepts safe frames: ${kind}`,()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sprite-check-'));
  try{
    fs.writeFileSync(path.join(root,'sample.png'),makePNG(kind));
    fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({characters:[{id:'sample',path:'sample.png',grid:{columns:2,rows:1,frameWidth:8,frameHeight:8},minMargin:2}]}));
    const run=spawnSync(process.execPath,['scripts/check-manifest.mjs',path.join(root,'manifest.json')],{encoding:'utf8'});
    assert.equal(run.status,kind==='valid'?0:1,run.stderr);const result=JSON.parse(run.stdout);assert.equal(result.passed,kind==='valid');
    if(kind==='empty')assert.equal(result.report[0].frames[1].empty,true);
    if(kind==='edge')assert.equal(result.report[0].frames[1].margin,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
