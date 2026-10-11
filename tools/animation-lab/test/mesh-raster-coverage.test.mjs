import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {rasterPolygon} from '../human-soft-skin.mjs';
const require=createRequire(process.env.ANIMATION_LAB_TEST_NODE_MODULES?path.join(process.env.ANIMATION_LAB_TEST_NODE_MODULES,'mesh-test.cjs'):import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
test('opaque continuous skin has no antialiased row grid between thin triangles',()=>{
 const canvas=createCanvas(440,300),ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#a45c3d';
 for(let j=0;j<20;j++)for(let i=0;i<8;i++){
  const x=10.3+i*24,y=10.2+j*6.2;
  for(const tri of [[[x,y],[x+24,y],[x+24,y+6.2]],[[x,y],[x+24,y+6.2],[x,y+6.2]]]){
   ctx.beginPath();rasterPolygon(tri).forEach(([px,py],n)=>n?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.fill();
  }
 }
 const pixels=ctx.getImageData(40,40,340,208).data;
 let minimum=255;for(let i=3;i<pixels.length;i+=4)minimum=Math.min(minimum,pixels[i]);
 assert.ok(minimum>=245,`mesh internal coverage ${minimum}/255 leaves visible background grid`);
 assert.equal(ctx.getImageData(0,0,1,1).data[3],0,'overlap must not paint distant outside pixels');
});
