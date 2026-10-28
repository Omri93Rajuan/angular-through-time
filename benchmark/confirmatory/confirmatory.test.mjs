import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {protocol,plan,fingerprint,authorize,attest,collect,verifySeal} from './core.mjs';
import {estimate,analyze} from './analysis.mjs';
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'confirmatory-test-'));

test('authorization binds every decision to exact protocol and identity',()=>{
 const p=protocol(),id={sourceCommit:'test'},a={approved:true,campaignId:'validation-only',researcher:'Test only',approvedAt:'2026-10-25T00:00:00Z',protocolHash:fingerprint(p),identity:id,acceptedDecisions:p.approvalRequired};
 assert.doesNotThrow(()=>authorize(p,a,id,'validation-only'));
 for(const change of [{approved:false},{approved:undefined},{researcher:''},{protocolHash:'wrong'},{acceptedDecisions:[]},{identity:{sourceCommit:'changed'}}])assert.throws(()=>authorize(p,{...a,...change},id,'validation-only'));
 assert.throws(()=>authorize({...p,blocks:72},a,id,'validation-only'));
 assert.throws(()=>authorize(p,a,id,'another-campaign'),/bind this campaign ID/);
 assert.throws(()=>authorize(p,a,id),/campaign ID/);
});
test('all positions balanced within separate experiments, no repeated job identities',()=>{
 const p=protocol(),order=plan(p);assert.equal(order.length,396);assert.equal(new Set(order.map(j=>`${j.experiment}/${j.rep}/${j.variant}`)).size,396);
 for(const e of p.experiments){const jobs=order.filter(j=>j.experiment===e.id);for(const v of e.variants)for(let position=0;position<e.variants.length;position++)assert.equal(jobs.filter((j,i)=>j.variant===v&&i%e.variants.length===position).length,p.blocks/e.variants.length);}
});
test('paired analysis known constant effect, order invariance and invalid input',()=>{
 const u=protocol().uncertainty,pairs=Array.from({length:36},(_,i)=>[i+10,(i+10)*1.2]);
 const result=estimate(pairs,u);assert.ok(Math.abs(result.ratio-1.2)<1e-12);assert.ok(result.interval.every(n=>Math.abs(n-1.2)<1e-12));assert.equal(result.n,36);
 assert.ok(Math.abs(estimate([...pairs].reverse(),u).differenceMs-result.differenceMs)<1e-12);assert.throws(()=>estimate([[0,1],[2,3]],u));
});
test('environment attestation rejects stale or unaccepted conditions',()=>{
 const id={host:'test'},a={identityHash:fingerprint(id),operator:'Test',checkedAt:new Date().toISOString(),acPower:true,fixedPerformancePolicy:true,noHeavyWorkloads:true,noThermalThrottling:true};
 assert.doesNotThrow(()=>attest(a,id));assert.throws(()=>attest({...a,acPower:false},id));assert.throws(()=>attest({...a,checkedAt:'2000-01-01'},id));assert.throws(()=>attest(a,{host:'other'}));
});
test('failed slots are preserved, resume skips them, tampering and concurrent writers fail',async()=>{
 const root=temporary(),dir=path.join(root,'campaign'),metadata={evidenceVersion:2,kind:'synthetic-validation',order:[{index:0},{index:1}]};let calls=0;
 try{
  await assert.rejects(collect(dir,metadata,async(job,emit)=>{calls++;emit({started:true});throw Error('injected');}),/failed; retained/);
  const failed=fs.readFileSync(path.join(dir,'0000/result.json'),'utf8');
  await collect(dir,metadata,async()=>{calls++;return{};},{resume:true});assert.equal(calls,2);assert.equal(fs.readFileSync(path.join(dir,'0000/result.json'),'utf8'),failed);
  verifySeal(path.join(dir,'0000'));
  await assert.rejects(collect(dir,{...metadata,kind:'changed'},async()=>({}),{resume:true}),/identity/);
  fs.appendFileSync(path.join(dir,'0000/events.jsonl'),'tamper');assert.throws(()=>verifySeal(path.join(dir,'0000')),/Evidence changed/);
  fs.writeFileSync(path.join(dir,'.lock'),'occupied');await assert.rejects(collect(dir,metadata,async()=>({}),{resume:true}),/EEXIST/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('analysis rejects unsealed attempts rather than treating them as accepted',()=>{
 const dir=temporary(),p=protocol();try{fs.writeFileSync(path.join(dir,'metadata.json'),JSON.stringify({kind:'synthetic-validation',protocol:p,order:plan(p)}));fs.mkdirSync(path.join(dir,'0000'));assert.throws(()=>analyze(dir),/seal.json/);}finally{fs.rmSync(dir,{recursive:true,force:true});}

});

test('stale source and stale artifact are rejected by reused provenance gate',async()=>{
 const {validateBuild}=await import('../v2/provenance.mjs');const root=temporary();
 try{
  const manifest=JSON.parse(fs.readFileSync('research/v2/22-idiomatic-v2.json'));
  fs.writeFileSync(path.join(root,'research-build.json'),JSON.stringify({accepted:true,manifest,inputs:[['package.json','wrong']],assets:[]}));assert.throws(()=>validateBuild(root),/Stale build source/);
  fs.writeFileSync(path.join(root,'app.js'),'changed');fs.writeFileSync(path.join(root,'research-build.json'),JSON.stringify({accepted:true,manifest,inputs:[],assets:[{file:'app.js',sha256:'wrong'}]}));assert.throws(()=>validateBuild(root),/Stale artifact/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('real CLI refuses missing authorization before creating output',async()=>{
 const {spawnSync}=await import('node:child_process');const root=path.resolve('benchmark/results-confirmatory/unauthorized-test');assert.ok(!fs.existsSync(root));
 const r=spawnSync(process.execPath,['benchmark/confirmatory/run.mjs','--output',root],{encoding:'utf8',env:{...process.env,CHROME:process.execPath}});
 assert.equal(r.status,1);assert.match(r.stderr,/--approval and --session required/);assert.ok(!fs.existsSync(root));
});
test('nonempty new output directory fails before collection',async()=>{
 const dir=temporary();let called=false;try{fs.writeFileSync(path.join(dir,'unrelated.json'),'{}');await assert.rejects(collect(dir,{evidenceVersion:2,order:[]},async()=>{called=true;}),/must be empty/);assert.equal(called,false);assert.equal(fs.readFileSync(path.join(dir,'unrelated.json'),'utf8'),'{}');assert.ok(!fs.existsSync(path.join(dir,'metadata.json')));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('a lost sealed attempt cannot be silently replaced on resume',async()=>{
 const dir=temporary(),metadata={evidenceVersion:2,kind:'synthetic-validation',order:[{index:0},{index:1}]},calls=[];
 try{
  await collect(dir,metadata,async job=>{calls.push(job.index);return {validationOnly:true};});
  fs.rmSync(path.join(dir,'0000'),{recursive:true});
  await collect(dir,metadata,async job=>{calls.push(job.index);return {validationOnly:true};},{resume:true});
  assert.deepEqual(calls,[0,1]);assert.match(JSON.parse(fs.readFileSync(path.join(dir,'0000/interrupted.json'))).reason,/cannot be replaced/);verifySeal(path.join(dir,'0000'));
  fs.unlinkSync(path.join(dir,'attempt-claims/0001'));
  await assert.rejects(collect(dir,metadata,async()=>assert.fail('must not execute'),{resume:true}),/lost its claim/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('validation destinations exclude all evidence roots, descendants and symlink aliases',async()=>{
 const {validateOutputPath}=await import('./core.mjs');const dir=temporary();
 try{
  for(const tree of ['results','results-v2','results-confirmatory'])for(const suffix of ['', '/disposable'])assert.throws(()=>validateOutputPath(`benchmark/${tree}${suffix}`,true),/outside all research evidence/);
  fs.symlinkSync(path.resolve('benchmark'),path.join(dir,'alias'),'dir');assert.throws(()=>validateOutputPath(path.join(dir,'alias/results-confirmatory/disposable'),true),/outside all research evidence/);
  assert.doesNotThrow(()=>validateOutputPath(path.join(dir,'safe'),true));assert.doesNotThrow(()=>validateOutputPath('benchmark/results-confirmatory/new-id',false));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('independent numerical checks for interpolated p95 and nonconstant paired log ratios',async()=>{
 const {runStatistics}=await import('../v2/statistics.mjs');
 assert.ok(Math.abs(runStatistics(Array.from({length:300},(_,i)=>({presentationMs:i+1}))).p95-285.05)<1e-10);
 const result=estimate([[10,20],[10,40]],protocol().uncertainty);
 assert.ok(Math.abs(result.ratio-Math.sqrt(8))<1e-12);assert.equal(result.differenceMs,20);
 // Exact two-block bootstrap distribution: 2 (1/4), sqrt(8) (1/2), 4 (1/4).
 assert.ok(Math.abs(result.interval[0]-2)<1e-12);assert.ok(Math.abs(result.interval[1]-4)<1e-12);
});

test('timeline verifier rejects corrupted warmup ticks, cadence and non-finite timings',async()=>{
 const {validateTimeline}=await import('./analysis.mjs');
 const timings=[0,1].map(tick=>({tick,due:tick*200,begin:tick*200,presentationMs:10,synchronousApplyMs:1,lateMs:0}));
 assert.doesNotThrow(()=>validateTimeline(timings,5));
 for(const change of [{tick:99},{due:250},{presentationMs:NaN}])assert.throws(()=>validateTimeline([timings[0],{...timings[1],...change}],5));
});
test('environment invalidation removes the whole session and no incomplete block is retained',async()=>{
 const {Oracle}=await import('../v2/oracle.mjs'),{default:E}=await import('../../packages/market-fixtures/engine.js'),{spawnSync}=await import('node:child_process');
 const dir=temporary(),p=protocol();p.blocks=2;p.experiments=[{id:'B-runtime',variants:['14/idiomatic-v2','22/idiomatic-v2'],reference:'14/idiomatic-v2'}];p.workload.measurementSeconds=.2;
 const metadata={evidenceVersion:2,kind:'synthetic-validation',protocol:p,order:plan(p)},event=E.event(0,100),o=new Oracle();o.apply(event);
 try{
  await collect(dir,metadata,async(job,emit)=>{
   emit({type:'request',event});emit({type:'timing',timing:{tick:0,due:0,begin:0,presentationMs:10,synchronousApplyMs:1,lateMs:0}});
   return {functional:true,finalRowsHash:fingerprint(o.rows),statistics:{p50:10,p95:10},elapsedMs:10,lateUpdates:0};
  });
  assert.equal(analyze(dir).contrasts[0].completeBlocks,2);
  const session=fs.readdirSync(dir).find(f=>f.startsWith('session-'));
  const result=spawnSync(process.execPath,['benchmark/confirmatory/invalidate-session.mjs',dir,session,'noThermalThrottling','Validation-only','Injected environmental failure'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const after=analyze(dir);assert.equal(after.rows.filter(r=>r.accepted).length,0);assert.equal(after.contrasts[0].completeBlocks,0);assert.equal(after.contrasts[0].inferenceEligible,false);
  for(const job of metadata.order)verifySeal(path.join(dir,String(job.index).padStart(4,'0')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
