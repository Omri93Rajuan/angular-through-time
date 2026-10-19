import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'angular-through-time-generation-'));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
try{
 for(const p of ['templates','packages/market-fixtures'])fs.cpSync(path.join(root,p),path.join(scratch,p),{recursive:true});
 execFileSync(process.execPath,[path.join(root,'scripts/generate.mjs')],{cwd:scratch});
 const files=[...walk(path.join(scratch,'apps')),...walk(path.join(scratch,'docs'))];
 for(const file of files){const relative=path.relative(scratch,file),actual=fs.readFileSync(path.join(root,relative),'utf8'),expected=fs.readFileSync(file,'utf8');if(file.endsWith('.json'))assert.deepEqual(JSON.parse(actual),JSON.parse(expected),relative);else assert.equal(actual,expected,relative);}
 console.log(`${files.length} generated files match a fresh scratch generation; workspace untouched.`);
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
