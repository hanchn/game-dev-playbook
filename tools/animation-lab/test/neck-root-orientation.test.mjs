import test from 'node:test';import assert from 'node:assert/strict';import {warpSkinPoint} from '../human-soft-skin.mjs';
const base={head:{x:20,y:-50,angle:0},neck:{x:3,y:-10},body:{angle:0}},mask={start:.5,span:.2,maxU:1,fade:.1,anchorOrientation:'body'},context={rootAnchor:[0,10],neckMask:mask,u:0};
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8));
test('neck root cross-section stays with body during large independent head turns',()=>{
 for(const angle of [-120,-90,-30,0,70,120]){const nodes=structuredClone(base);nodes.head.angle=angle;close(warpSkinPoint('head-neck','head',[-8,10],1,nodes,context),[-5,-10]);close(warpSkinPoint('head-neck','head',[8,10],1,nodes,context),[11,-10]);}
 const nodes=structuredClone(base);nodes.body.angle=90;nodes.head.angle=-120;close(warpSkinPoint('head-neck','head',[8,10],1,nodes,context),[3,-2]);
});
test('skull remains rigid and legacy root orientation is preserved by default',()=>{
 const nodes=structuredClone(base);nodes.head.angle=90;
 close(warpSkinPoint('head-neck','head',[8,10],0,nodes,context),[10,-42]);
 close(warpSkinPoint('head-neck','head',[8,10],1,nodes,{...context,neckMask:{...mask,anchorOrientation:undefined}}),[3,-2]);
 close(warpSkinPoint('head-neck','head',[0,10],1,nodes,context),[3,-10]);
});
test('a diagonal source neck boundary anchors the nape before the throat without deforming the skull',()=>{
 const nodes=structuredClone(base);nodes.head.angle=90;
 const diagonal={...mask,start:.4,span:.2,startSlopeU:.5};
 close(warpSkinPoint('head-neck','head',[8,10],.65,nodes,{...context,u:.1,neckMask:diagonal}),[11,-10]);
 close(warpSkinPoint('head-neck','head',[8,10],.65,nodes,{...context,u:.5,neckMask:diagonal}),[10,-42]);
 close(warpSkinPoint('head-neck','head',[8,10],.85,nodes,{...context,u:.5,neckMask:diagonal}),[11,-10]);
 close(warpSkinPoint('head-neck','head',[8,10],0,nodes,{...context,u:.1,neckMask:diagonal}),[10,-42]);
});
