import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {validateManifest} from './manifest.mjs';
import {hash} from './provenance.mjs';import E from '../../packages/market-fixtures/engine.js';
import {Oracle} from './oracle.mjs';import {runStatistics,pairedInterval} from './statistics.mjs';
const historical=JSON.parse(fs.readFileSync('research/v2/historical-catalog.json'));
for(const item of historical.files)assert.equal(hash(item.file),item.sha256,`Historical bytes changed: ${item.file}`);
const root='benchmark/results-v2',rows=[],errors=[];
const walk=p=>fs.existsSync(p)?fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]):[];
for(const file of walk(`${root}/pilots`).filter(f=>f.endsWith('.json')&&!f.endsWith('metadata.json'))){
 const sample=JSON.parse(fs.readFileSync(file));
 try{
  assert.equal(path.basename(file),`${sample.orderIndex}.json`);assert.equal(path.basename(path.dirname(file)),sample.experiment);assert.equal(sample.schemaVersion,2);assert.equal(sample.kind,'pilot');assert.equal(typeof sample.accepted,'boolean');
  const metadata=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'metadata.json')));
  assert.deepEqual(metadata.order[sample.orderIndex],{version:sample.version,track:sample.track,rep:sample.rep});
  assert.equal(sample.protocolId,metadata.protocol.id);assert.equal(metadata.protocol.confirmatoryApproved,false);
  if(sample.accepted){
   validateManifest(sample.manifest);assert.equal(sample.functional.passed,true);const gate=JSON.parse(fs.readFileSync(sample.functional.evidence));assert.equal(gate.accepted,true);assert.deepEqual(gate.build.assets,sample.build.assets);assert.deepEqual(gate.build.inputs,sample.build.inputs);assert.equal(sample.manifest.diagnostic,false);
   assert.deepEqual(sample.manifest,sample.build.manifest);
   assert.equal(sample.events.length,sample.workload.ticks);assert.equal(sample.timings.length,sample.events.length);
   const oracle=new Oracle();sample.events.forEach((e,i)=>{assert.deepEqual(e,E.event(i,sample.workload.count));oracle.apply(e);});assert.deepEqual(sample.finalRows,oracle.rows);
   sample.timings.forEach((t,i)=>{assert.equal(t.tick,i);assert.ok(t.synchronousApplyMs>=0&&t.presentationMs>=t.synchronousApplyMs);assert.ok(Math.abs(t.lateMs-Math.max(0,t.begin-t.due))<1e-8);});
   assert.deepEqual(sample.statistics,runStatistics(sample.timings));assert.equal(sample.lateUpdates,sample.timings.filter(t=>t.lateMs>1000/sample.workload.hz).length);
  }else assert.ok(sample.error||sample.status==='started','Failure reason missing');
 }catch(e){errors.push({file,error:e.message});}
 rows.push({file,kind:sample.kind,experiment:sample.experiment,version:sample.version,track:sample.track,rep:sample.rep,accepted:sample.accepted,status:sample.status,error:sample.error||null,manifest:sample.manifest||null,workload:sample.workload||null,statistics:sample.accepted?sample.statistics:null,lateUpdates:sample.accepted?sample.lateUpdates:null});
}
for(const batch of fs.existsSync(`${root}/pilots`)?fs.readdirSync(`${root}/pilots`):[]){const metadata=JSON.parse(fs.readFileSync(`${root}/pilots/${batch}/metadata.json`));for(let i=0;i<metadata.order.length;i++)if(!fs.existsSync(`${root}/pilots/${batch}/${i}.json`))errors.push({file:batch,error:`Planned attempt ${i} missing`});}
const pairs=[];
for(const experiment of new Set(rows.map(r=>r.experiment))){
 const group=rows.filter(r=>r.experiment===experiment),variants=[...new Set(group.map(r=>`${r.version}/${r.track}`))];
 if(variants.length!==2)continue;
 const complete=[];
 for(const rep of new Set(group.map(r=>r.rep))){const block=variants.map(v=>group.find(r=>`${r.version}/${r.track}`===v&&r.rep===rep&&r.accepted));if(block.every(Boolean))complete.push(block.map(r=>r.statistics.p95));}
 pairs.push({experiment,variants,outcome:'run p95 presentationMs',...pairedInterval(complete),missingBlocks:new Set(group.map(r=>r.rep)).size-complete.length});
}
const nativeBuilds=walk(`${root}/native`).filter(f=>f.endsWith('.json')).map(file=>({file,...JSON.parse(fs.readFileSync(file))})).filter(s=>s.kind==='native-build-pilot').map(s=>({file:s.file,version:s.version.major,cache:s.cache,builder:s.builder,accepted:s.accepted,durationMs:s.accepted?s.durationMs:null,emittedJSBytes:s.accepted?s.assets.filter(a=>a.file.endsWith('.js')).reduce((n,a)=>n+a.bytes,0):null,sourceCommit:s.provenance?.commit||null,timingEligible:!!s.provenance&&s.driverUnchanged===true&&s.inputsUnchanged===true&&!fs.existsSync(path.join(path.dirname(s.file),'deviations.json'))}));
const summary={schemaVersion:2,nativeBuilds,kind:'pilot-summary',historicalFilesVerified:historical.files.length,rows,pairs,errors,policy:'Pilots only; no pooling with historical data; rejected attempts retained; no performance ranking'};
fs.writeFileSync(`${root}/summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({historicalFilesVerified:historical.files.length,pilotAttempts:rows.length,errors},null,2));if(errors.length)process.exitCode=1;
