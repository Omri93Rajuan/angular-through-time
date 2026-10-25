import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import E from '../../packages/market-fixtures/engine.js';
import {Oracle} from '../v2/oracle.mjs';
import {runStatistics} from '../v2/statistics.mjs';
import {protocol,plan,collect,fingerprint} from './core.mjs';
import {analyze} from './analysis.mjs';
export async function synthetic(directory,{failAt,interruptAt}={}){
 const p=protocol();p.workload.warmupSeconds=0;p.workload.measurementSeconds=.6;
 const metadata={kind:'synthetic-validation',protocol:p,order:plan(p)};
 const oracle=new Oracle();for(let i=0;i<3;i++)oracle.apply(E.event(i,p.workload.count));
 const finalRowsHash=fingerprint(oracle.rows);
 const run=async(job,emit)=>{
  if(job.index===failAt){emit({type:'injected-failure'});throw Error('Injected synthetic failure');}
  const timings=[];
  for(let tick=0;tick<3;tick++){
   emit({type:'request',event:E.event(tick,p.workload.count)});
   const timing={tick,due:tick*200,begin:tick*200,synchronousApplyMs:1,presentationMs:10+job.rep%3+(job.variant==='22/m4-zone'?5:Number(job.variant.split('/')[0])-14),lateMs:0};
   emit({type:'timing',timing});timings.push(timing);
  }
  return {functional:true,finalRowsHash,statistics:runStatistics(timings),lateUpdates:0,elapsedMs:420};
 };
 if(interruptAt!==undefined){
  fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'metadata.json'),JSON.stringify(metadata));
  const dir=path.join(directory,String(interruptAt).padStart(4,'0'));fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'start.json'),JSON.stringify({job:metadata.order[interruptAt],kind:metadata.kind,sessionFile:'session-0-0.json'}));fs.writeFileSync(path.join(directory,'session-0-0.json'),'{}');fs.writeFileSync(path.join(dir,'events.jsonl'),'partial interrupted journal');
 }
 try{await collect(directory,metadata,run,{resume:interruptAt!==undefined,session:{kind:'synthetic-validation'}});}catch(error){if(failAt===undefined)throw error;assert.match(String(error),/failed; retained/);await collect(directory,metadata,run,{resume:true,session:{kind:'synthetic-validation',recovery:true}});}
 const result=analyze(directory);assert.equal(result.rows.length,396);assert.equal(result.contrasts.length,9);assert.ok(result.contrasts.every(c=>!c.inferenceEligible));
 assert.deepEqual(analyze(directory),result,'Analysis must be deterministic');
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'angular-confirmatory-validation-'));
 const result=await synthetic(path.join(root,'complete'));
 assert.ok(result.complete);
 const failed=await synthetic(path.join(root,'failed'),{failAt:1});assert.equal(failed.rows.filter(r=>!r.accepted).length,1);
 const interrupted=await synthetic(path.join(root,'interrupted'),{interruptAt:0});assert.equal(interrupted.rows.filter(r=>!r.accepted).length,1);
 fs.writeFileSync(path.join(root,'analysis.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({kind:'synthetic-validation',root,attempts:result.rows.length,contrasts:result.contrasts.length,complete:true,failureRecovery:true,interruptionRecovery:true}));
}
