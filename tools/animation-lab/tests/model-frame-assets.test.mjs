import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolveModelAsset} from '../model-frame-assets.mjs';
test('private model media rejects traversal and symlink escapes',async()=>{const base=await fs.mkdtemp(path.join(os.tmpdir(),'model-frames-'));const outside=await fs.mkdtemp(path.join(os.tmpdir(),'outside-'));try{await fs.writeFile(path.join(base,'frame.png'),'fixture');await fs.writeFile(path.join(outside,'secret.png'),'private');await fs.symlink(path.join(outside,'secret.png'),path.join(base,'escape.png'));assert.equal(await resolveModelAsset('frame.png',base),await fs.realpath(path.join(base,'frame.png')));await assert.rejects(resolveModelAsset('../secret.png',base));await assert.rejects(resolveModelAsset('escape.png',base));await fs.writeFile(path.join(base,'source.blend'),'fixture');await assert.rejects(resolveModelAsset('source.blend',base));}finally{await fs.rm(base,{recursive:true});await fs.rm(outside,{recursive:true});}});
