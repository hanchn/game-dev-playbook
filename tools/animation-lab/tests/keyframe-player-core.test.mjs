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

test('repaired contact sheet cannot silently play an older RIFE sequence',()=>{
 const frames=['knockdown/clear-v2/frames/005.png'];
 assert.throws(()=>manifestClip({frames,sheet:'knockdown/clear-v2/sheet.png',clips:[{frames:['knockdown/rife-v1/frames/005.png']}]}),/版本不一致/);
 assert.throws(()=>manifestClip({frames,video:'knockdown/clear-v2/preview.mp4',clips:[{frames,video:'knockdown/rife-v1/preview.mp4'}]}),/video/);
 const clip={frames:['/model-frame-assets/'+frames[0]],sheet:'knockdown/clear-v2/sheet.png'};
 assert.equal(manifestClip({frames,sheet:'/model-frame-assets/'+clip.sheet,clips:[clip]}),clip);
});
