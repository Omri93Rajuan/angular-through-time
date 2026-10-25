import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {quantile} from '../harness/statistics.mjs';
import {runStatistics} from '../v2/statistics.mjs';
import {Oracle} from '../v2/oracle.mjs';
import E from '../../packages/market-fixtures/engine.js';
import {read,plan,verifySeal,fingerprint,authorize} from './core.mjs';
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
export function estimate(pairs,u){
 assert.ok(pairs.length>=2);assert.ok(pairs.every(p=>p.length===2&&p.every(x=>Number.isFinite(x)&&x>0)));
 const logs=pairs.map(([a,b])=>Math.log(b/a)),diffs=pairs.map(([a,b])=>b-a);let seed=u.seed;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const draws=[];for(let draw=0;draw<u.draws;draw++){let sum=0;for(let i=0;i<logs.length;i++)sum+=logs[Math.floor(random()*logs.length)];draws.push(Math.exp(sum/logs.length));}
 const tail=u.familyAlpha/(2*u.contrasts);
 const interval=[quantile(draws,tail),quantile(draws,1-tail)];
 return {n:pairs.length,ratio:Math.exp(mean(logs)),differenceMs:mean(diffs),interval,relativeHalfWidth:(interval[1]-interval[0])/(2*Math.exp(mean(logs))),method:'paired-block percentile bootstrap; Bonferroni across nine contrasts; approximate coverage'};
}
export function analyze(directory){
 assert.ok(!fs.existsSync(path.join(directory,'.lock')),'Cannot analyze a running campaign');
 const m=read(path.join(directory,'metadata.json')),p=m.protocol;
 assert.ok(['confirmatory','synthetic-validation','browser-validation'].includes(m.kind));
 assert.deepEqual(m.order,plan(p));
 if(m.kind==='confirmatory')authorize(p,m.approval,m.identity);
 const expected=new Set(['metadata.json',...m.order.map(j=>String(j.index).padStart(4,'0'))]);
 for(const name of fs.readdirSync(directory))assert.ok(expected.has(name)||/^(invalid-)?session-[\w-]+\.json$/.test(name),`Unexpected campaign entry: ${name}`);
 const rows=[];
 for(const job of m.order){
  const dir=path.join(directory,String(job.index).padStart(4,'0'));
  if(!fs.existsSync(dir)){rows.push({...job,accepted:false,reason:'not attempted'});continue;}
  verifySeal(dir);
  if(fs.existsSync(path.join(dir,'interrupted.json'))){assert.deepEqual(read(path.join(dir,'interrupted.json')).job,job);rows.push({...job,accepted:false,reason:'interrupted'});continue;}
  const started=read(path.join(dir,'start.json'));assert.deepEqual(started.job,job);assert.equal(started.kind,m.kind);assert.equal(started.metadataHash,fingerprint(m),'Campaign metadata changed');
  assert.equal(started.sessionHash,fingerprint(read(path.join(directory,started.sessionFile))),'Session evidence changed');
  assert.ok(fs.existsSync(path.join(directory,started.sessionFile)),'Missing session record');
  const invalidation=path.join(directory,`invalid-${started.sessionFile}`);
  if(fs.existsSync(invalidation)){
   const invalid=read(invalidation);assert.equal(invalid.sessionFile,started.sessionFile);assert.ok(['acPower','fixedPerformancePolicy','noHeavyWorkloads','noThermalThrottling'].includes(invalid.condition));assert.ok(invalid.operator&&invalid.details&&Number.isFinite(Date.parse(invalid.recordedAt)));
   rows.push({...job,accepted:false,reason:'declared environment violation',invalidation:invalid});continue;
  }
  const r=read(path.join(dir,'result.json'));
  if(!r.accepted){rows.push({...job,accepted:false,reason:r.error});continue;}
  const entries=fs.readFileSync(path.join(dir,'events.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
  const timings=entries.filter(e=>e.type==='timing').map(e=>e.timing),events=entries.filter(e=>e.type==='request').map(e=>e.event);
  assert.equal(timings.length,p.workload.hz*p.workload.measurementSeconds);assert.equal(events.length,timings.length);
  const oracle=new Oracle();
  for(let i=0;i<timings.length;i++){
   assert.deepEqual(events[i],E.event(i,p.workload.count));oracle.apply(events[i]);const t=timings[i];
   assert.equal(t.tick,i);for(const key of ['due','begin','synchronousApplyMs','presentationMs','lateMs'])assert.ok(Number.isFinite(t[key]));
   assert.ok(t.synchronousApplyMs>=0&&t.presentationMs>=t.synchronousApplyMs);assert.ok(t.begin>=t.due-2);
   assert.ok(Math.abs(t.lateMs-Math.max(0,t.begin-t.due))<1e-6);
   if(i){assert.ok(Math.abs(t.due-timings[0].due-i*1000/p.workload.hz)<1e-6);assert.ok(t.begin>=timings[i-1].begin+timings[i-1].presentationMs-2);}
  }
  if(m.kind==='synthetic-validation')assert.equal(r.finalRowsHash,fingerprint(oracle.rows));else assert.deepEqual(r.finalRows,oracle.rows);assert.deepEqual(r.statistics,runStatistics(timings));assert.equal(r.functional,true);assert.ok(Number.isFinite(r.elapsedMs)&&r.elapsedMs>=timings.at(-1).begin+timings.at(-1).presentationMs-timings[0].due-2);
  assert.equal(r.lateUpdates,timings.filter(t=>t.lateMs>1000/p.workload.hz).length);
  if(m.kind!=='synthetic-validation'){
   const provenance=entries.filter(e=>e.type==='provenance');assert.equal(provenance.length,1);
   const expectedBuild=m.builds[job.variant];assert.deepEqual(provenance[0].build,expectedBuild.build);assert.deepEqual(provenance[0].gate,expectedBuild.gate);
   assert.equal(r.browser,expectedBuild.gate.record.browser);
   assert.equal(entries.filter(e=>e.type==='warmup').length,p.workload.warmupSeconds*p.workload.hz);
  }
  rows.push({...job,accepted:true,statistics:r.statistics,elapsedMs:r.elapsedMs,lateUpdates:r.lateUpdates,synchronousApplyMs:mean(timings.map(t=>t.synchronousApplyMs))});
 }
 const contrasts=[];
 for(const experiment of p.experiments){
  const group=rows.filter(r=>r.experiment===experiment.id),complete=[];
  for(let rep=0;rep<p.blocks;rep++){const block=group.filter(r=>r.rep===rep);if(block.length===experiment.variants.length&&block.every(r=>r.accepted))complete.push(block);}
  for(const variant of experiment.variants.filter(v=>v!==experiment.reference)){
   const pairs=complete.map(b=>[b.find(r=>r.variant===experiment.reference).statistics.p95,b.find(r=>r.variant===variant).statistics.p95]);
   const eligible=complete.length===p.blocks&&m.kind==='confirmatory';
   const result=pairs.length>=2?estimate(pairs,p.uncertainty):null;
   contrasts.push({experiment:experiment.id,reference:experiment.reference,variant,completeBlocks:complete.length,inferenceEligible:eligible,descriptive:result,practicalConclusion:eligible?(result.interval[1]<1-p.practicalDifference?'lower by more than 10%':result.interval[0]>1+p.practicalDifference?'higher by more than 10%':'inconclusive at 10%'):null});
  }
 }
 return {kind:m.kind,protocolHash:fingerprint(p),rows,contrasts,complete:rows.every(r=>r.accepted),warning:'Synthetic/browser validation is never confirmatory evidence. B is a cross-version architecture comparison; time measures presentation opportunity, not physical presentation. Incomplete experiments have no primary inference.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const directory=process.argv[2];assert.ok(directory,'Usage: node benchmark/confirmatory/analysis.mjs DIRECTORY');const result=analyze(directory);console.log(JSON.stringify(result,null,2));if(result.kind==='confirmatory'&&!result.complete)process.exitCode=2;
}
