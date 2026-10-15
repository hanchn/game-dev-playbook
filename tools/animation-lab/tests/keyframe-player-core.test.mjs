import {test} from 'node:test';import assert from 'node:assert/strict';
import {advancePlayback,fixedCanvasTransform,manifestClip,modelAssetUrl}from'../public/keyframe-player-core.mjs';
test('terminal knockdown never loops back to standing',()=>{assert.deepEqual(advancePlayback(11,12,false),{index:11,playing:false});assert.deepEqual(advancePlayback(11,12,true),{index:0,playing:true});});
test('one transform for a clip, reject source canvas drift',()=>{assert.throws(()=>fixedCanvasTransform([[768,768],[640,640]]),/尺寸不一致/);assert.deepEqual(fixedCanvasTransform([[768,768],[768,768]]),{scale:2/3,x:0,y:0,width:512,height:512});});

test('both generated manifest schemas load and asset route is prefixed once',()=>{
 const frames=['/model-frame-assets/run/frames/001.png'];
 assert.deepEqual(manifestClip({frames,fps:12}).frames,frames);
 assert.deepEqual(manifestClip({clips:[{frames}]}).frames,frames);
 assert.equal(modelAssetUrl(frames[0]),'/model-frame-assets/run/frames/001.png');
 assert.equal(modelAssetUrl('run/frames/001.png'),modelAssetUrl(frames[0]));
 assert.throws(()=>modelAssetUrl('https://example.com/frame.png'),/本地/);
});
