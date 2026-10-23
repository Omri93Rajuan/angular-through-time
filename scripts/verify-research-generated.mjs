import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const root=process.cwd(),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'verify-market-v2-'));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
try{
 for(const dir of ['templates','docs'])fs.cpSync(dir,`${scratch}/${dir}`,{recursive:true});
 for(let v=14;v<=22;v++){fs.mkdirSync(`${scratch}/v${v}/src`,{recursive:true});fs.copyFileSync(`v${v}/src/index.html`,`${scratch}/v${v}/src/index.html`);fs.copyFileSync(`v${v}/angular.json`,`${scratch}/v${v}/angular.json`);}
 execFileSync(process.execPath,[`${root}/scripts/generate-research.mjs`],{cwd:scratch});
 const files=walk(scratch).filter(p=>p.includes('/src/research/')||p.includes('/research/v2/')||/research.angular.json$|tsconfig\.(idiomatic-v2|portable-default|m4-zone|idiomatic-v2-diagnostic)\.json$/.test(p));
 for(const file of files){const rel=path.relative(scratch,file);const a=fs.readFileSync(`${root}/${rel}`,'utf8'),b=fs.readFileSync(file,'utf8');if(file.endsWith('.json'))assert.deepEqual(JSON.parse(a),JSON.parse(b),rel);else assert.equal(a,b,rel);}
 console.log(`${files.length} research generated files agree; historical generator untouched.`);
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
