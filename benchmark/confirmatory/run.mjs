import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {protocol,plan,fingerprint,authorize,attest,collect,read} from './core.mjs';
import {browserAttempt,preflight} from './browser.mjs';
import {hash} from '../v2/provenance.mjs';
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
for(let i=0;i<args.length;i++){assert.ok(['--prepare','--browser-validation','--resume','--approval','--session','--output'].includes(args[i]),`Unknown option ${args[i]}`);if(['--approval','--session','--output'].includes(args[i])){assert.ok(args[i+1]&&!args[i+1].startsWith('--'));i++;}}
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const chrome=process.env.CHROME||'/opt/google/chrome/chrome';
const identity=()=>({sourceCommit:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD^{tree}'),chromeSha256:hash(chrome),rootLockSha256:hash('package-lock.json'),node:process.version,host:os.hostname(),platform:process.platform,release:os.release(),arch:os.arch(),cpu:os.cpus()[0].model,cores:os.cpus().length,memory:os.totalmem()});
const p=protocol(),id=identity();
if(args.includes('--prepare')){
 assert.equal(args.length,1);
 console.log(JSON.stringify({approval:{approved:false,researcher:'',approvedAt:'',protocolHash:fingerprint(p),identity:id,acceptedDecisions:p.approvalRequired},session:{operator:'',checkedAt:'',identityHash:fingerprint(id),acPower:false,fixedPerformancePolicy:false,noHeavyWorkloads:false,noThermalThrottling:false}},null,2));
}else{
 const validation=args.includes('--browser-validation'),directory=get('--output');assert.ok(directory,'--output required');
 const root=path.resolve(directory);
 if(validation){assert.ok(!root.startsWith(path.resolve('benchmark/results')+path.sep)&&!root.startsWith(path.resolve('benchmark/results-v2')+path.sep),'Validation must be outside research evidence trees');p.blocks=1;p.workload.warmupSeconds=.2;p.workload.measurementSeconds=.6;
  if(process.env.VERSIONS){const versions=process.env.VERSIONS.split(',');p.experiments=p.experiments.map(e=>({...e,variants:e.variants.filter(v=>versions.includes(v.split('/')[0]))})).filter(e=>e.variants.length).map(e=>({...e,reference:e.variants[0]}));assert.ok(p.experiments.length);}}
 else{
  assert.ok(root.startsWith(path.resolve('benchmark/results-confirmatory')+path.sep),'Real campaigns must use benchmark/results-confirmatory/ID');
  assert.ok(get('--approval')&&get('--session'),'--approval and --session required');
  assert.equal(id.node,'v22.23.2');assert.equal(id.platform,'linux');
  assert.equal(git('status','--porcelain','--untracked-files=no'),'','Tracked workspace must be clean');
  assert.ok(!process.env.VERSIONS&&!process.env.TRACKS&&!process.env.REPS&&!process.env.CAMPAIGN,'Pilot/matrix overrides are forbidden for real campaigns');
 }
 const approval=validation?null:read(get('--approval')),session=validation?{kind:'browser-validation'}:read(get('--session'));
 if(!validation){authorize(p,approval,id);attest(session,id);}
 const builds=preflight([...new Set(p.experiments.flatMap(e=>e.variants))]);
 const metadata={kind:validation?'browser-validation':'confirmatory',protocol:p,identity:id,approval,builds,order:plan(p)};
 const checkIdentity=()=>{assert.deepEqual(identity(),id,'Host, browser or source changed during execution');if(!validation)assert.equal(git('status','--porcelain','--untracked-files=no'),'','Tracked workspace changed');};
 await collect(directory,metadata,browserAttempt(p,chrome,builds,checkIdentity),{resume:args.includes('--resume'),session});
 console.log(`${metadata.kind} collection finished: ${directory}`);
}
