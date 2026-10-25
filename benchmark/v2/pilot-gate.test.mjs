import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const runner=fileURLToPath(new URL('./pilot.mjs',import.meta.url));
const protocol=JSON.parse(fs.readFileSync(new URL('../../research/v2/protocol.json',import.meta.url)));
for(const [name,change,campaign,message] of [
 ['explicit confirmatory request',{},'confirmatory',/Only pilots are implemented/],
 ['approved protocol with default campaign',{confirmatoryApproved:true},undefined,/cannot collect a confirmatory-approved protocol/],
 ['non-pilot protocol with explicit pilot campaign',{status:'confirmatory'},'pilot',/requires a pilot-only protocol/],
 ['missing approval field',{confirmatoryApproved:undefined},undefined,/cannot collect a confirmatory-approved protocol/]
])test(`pilot rejects ${name} before creating evidence`,()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'angular-pilot-gate-'));
 try{
  fs.mkdirSync(path.join(cwd,'research/v2'),{recursive:true});
  fs.writeFileSync(path.join(cwd,'research/v2/protocol.json'),JSON.stringify({...protocol,...change}));
  const env={...process.env};delete env.CAMPAIGN;if(campaign)env.CAMPAIGN=campaign;
  const result=spawnSync(process.execPath,[runner],{cwd,env,encoding:'utf8',timeout:10000});
  assert.equal(result.error,undefined);assert.equal(result.status,1);assert.match(result.stderr,message);
  assert.deepEqual(fs.readdirSync(cwd),['research'],'Rejected request must not create result directories');
 }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});
