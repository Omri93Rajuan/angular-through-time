import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {test} from 'node:test';import assert from 'node:assert/strict';
import {assertCatalogAppendOnly,digest,verifyEvidenceEntry} from './evidence.mjs';

test('raw evidence tampering and missing inputs are detected',()=>{
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'evidence-test-'));
 try{const file=path.join(scratch,'sample.json');fs.writeFileSync(file,'original\n');const entry={id:'x',root:'x',files:[{path:'sample.json',sha256:digest(fs.readFileSync(file))}]};const verify=()=>verifyEvidenceEntry(entry,{listPaths:fs.readdirSync(scratch),readBytes:name=>fs.readFileSync(path.join(scratch,name))});assert.doesNotThrow(verify);fs.writeFileSync(file,'tampered\n');assert.throws(verify,/bytes changed/);fs.rmSync(file);assert.throws(verify,/file set changed/);}finally{fs.rmSync(scratch,{recursive:true,force:true});}
});
test('catalog entries are append-only',()=>{const base={schemaVersion:1,policy:'retrospective records stay retrospective',entries:[]};const first={...base,entries:[{id:'b',root:'benchmark/results-v2/pilots/b',classification:'retrospective-baseline',acquisitionSealed:false,sourceCommit:'a'.repeat(40),files:[{path:'0.json',sha256:'b'.repeat(64)}]}]};assert.doesNotThrow(()=>assertCatalogAppendOnly(first,base));assert.throws(()=>assertCatalogAppendOnly({...first,entries:[]},first),/removed/);const changed=structuredClone(first);changed.entries[0].files[0].sha256='c'.repeat(64);assert.throws(()=>assertCatalogAppendOnly(changed,first),/changed or reordered/);});
