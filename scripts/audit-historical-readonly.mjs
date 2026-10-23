import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';
const root=process.cwd(),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'market-historical-audit-'));
try{
 fs.cpSync('benchmark/results',`${scratch}/benchmark/results`,{recursive:true});
 for(let v=14;v<=22;v++)fs.symlinkSync(`${root}/v${v}`,`${scratch}/v${v}`,'dir');
 const result=spawnSync(process.execPath,[`${root}/scripts/audit-results.mjs`],{cwd:scratch,encoding:'utf8'});
 fs.mkdirSync('benchmark/results-v2/audits',{recursive:true});
 fs.copyFileSync(`${scratch}/benchmark/results/audits/results.json`,'benchmark/results-v2/audits/historical-replay.json');
 fs.writeFileSync('benchmark/results-v2/verification-logs/historical-replay.txt',(result.stdout||'')+(result.stderr||''));console.log(result.stdout);process.exitCode=result.status||0;
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
