import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {protocol,plan,fingerprint,authorize,attest,collect,verifySeal} from './core.mjs';
import {estimate,analyze} from './analysis.mjs';
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'confirmatory-test-'));

test('authorization binds every decision to exact protocol and identity',()=>{
 const p=protocol(),id={sourceCommit:'test'},a={approved:true,researcher:'Test only',approvedAt:'2026-10-25T00:00:00Z',protocolHash:fingerprint(p),identity:id,acceptedDecisions:p.approvalRequired};
 assert.doesNotThrow(()=>authorize(p,a,id));
 for(const change of [{approved:false},{approved:undefined},{researcher:''},{protocolHash:'wrong'},{acceptedDecisions:[]},{identity:{sourceCommit:'changed'}}])assert.throws(()=>authorize(p,{...a,...change},id));
 assert.throws(()=>authorize({...p,blocks:72},a,id));
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
 const root=temporary(),dir=path.join(root,'campaign'),metadata={kind:'synthetic-validation',order:[{index:0},{index:1}]};let calls=0;
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
 const dir=temporary();let called=false;try{fs.writeFileSync(path.join(dir,'unrelated.json'),'{}');await assert.rejects(collect(dir,{order:[]},async()=>{called=true;}),/must be empty/);assert.equal(called,false);assert.equal(fs.readFileSync(path.join(dir,'unrelated.json'),'utf8'),'{}');assert.ok(!fs.existsSync(path.join(dir,'metadata.json')));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
