import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeControls,biosFiles} from '../standard-runtime-config.mjs';
test('all four controller maps exist without mutating source bindings',()=>{
 const source={0:{2:{value:'5'},3:{value:'1'}}};
 const result=normalizeControls(source);
 assert.deepEqual(Object.keys(result),['0','1','2','3']);
 result[0][2].value=53;
 assert.equal(source[0][2].value,'5');
 for(let i=1;i<4;i++) assert.deepEqual(result[i],{});
});
test('BIOS uses decompressed container containing intact archive',()=>{
 const local=p=>'http://127.0.0.1:4321/'+p;
 assert.deepEqual(biosFiles({id:'sf2ce'},local),{});
 assert.throws(()=>biosFiles({id:'kov',bios:'pgm.zip'},local),/兼容 BIOS/);
 assert.deepEqual(biosFiles({id:'kov',bios:'pgm.zip',biosContainer:'kov/bios-runtime-wrapper.zip'},local),{'/':'http://127.0.0.1:4321/kov/bios-runtime-wrapper.zip'});
});
