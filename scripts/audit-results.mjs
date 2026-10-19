import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import E from '../packages/market-fixtures/engine.js';
import {describe,quantile} from '../benchmark/harness/statistics.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const files=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const signature=a=>a.map(x=>x.file+':'+x.sha256).sort().join('|');
const report={batches:[],failures:[],integrityErrors:[],outliers:[],warnings:[],buildBatches:[],lighthouse:[]};
const metricGroups=new Map();
function collect(key,file,value){if(!metricGroups.has(key))metricGroups.set(key,[]);metricGroups.get(key).push({file,value});}
for(const dir of fs.readdirSync('benchmark/results/runtime')){
 const root='benchmark/results/runtime/'+dir,m=read(root+'/metadata.json'),order=read(root+'/order.json');
 const batch={experiment:dir,label:m.label||'historical',commit:m.commit,sourceDirty:m.sourceDirty??null,accepted:0,rejected:0,runtimeSamples:0,ticks:0,lateUpdates:0,droppedUpdates:0,maximumLatenessMs:0,filesWithLateUpdates:[],profiles:[],checksumsByScenario:{}};
 const profiles=new Set(),seen=new Set();
 for(const f of files(root).filter(f=>!/(metadata|order)\.json$/.test(f))){const s=read(f);if(!s.accepted){batch.rejected++;report.failures.push({file:f,...s});continue;}
  batch.accepted++;
  try{
   const key=[s.version,s.track,s.rep,s.scenario].join('|');assert.ok(!seen.has(key),'Duplicate accepted sample');seen.add(key);
   assert.ok(order.some(o=>o.version===s.version&&o.track===s.track&&o.rep===s.rep),'Sample not in execution plan');assert.equal(s.functional.passed,true);
   if(s.kind==='runtime'){
    batch.runtimeSamples++;batch.ticks+=s.ticks;assert.equal(s.eventLog.length,s.ticks);assert.equal(s.latencies.length,s.ticks);
    let rows=E.initial();for(let tick=0;tick<s.ticks;tick++){assert.deepEqual(s.eventLog[tick],E.event(tick,s.count));rows=E.apply(rows,s.eventLog[tick],s.mode);const l=s.latencies[tick];assert.equal(l.tick,tick);assert.ok(l.processingMs>=0&&l.presentationMs>=l.processingMs);assert.ok(Math.abs(l.lateMs-Math.max(0,l.begin-l.due))<1e-5);}
    assert.equal(s.checksum,E.checksum(rows));assert.equal(s.processedRecords,s.ticks*s.count);assert.equal(s.throughputRecordsPerSecond,s.processedRecords/(s.elapsedMs/1000));assert.equal(s.lateUpdates,s.latencies.filter(l=>l.lateMs>1000/s.hz).length);assert.equal(s.dropped,0);
    batch.lateUpdates+=s.lateUpdates;batch.droppedUpdates+=s.dropped;batch.maximumLatenessMs=Math.max(batch.maximumLatenessMs,...s.latencies.map(l=>l.lateMs));if(s.lateUpdates)batch.filesWithLateUpdates.push(f);
    profiles.add(`${s.count} records / ${s.hz} Hz / ${s.mode} / ${s.ticks} ticks`);
    for(const [metric,value]of Object.entries({presentationMs:quantile(s.latencies.map(l=>l.presentationMs),.5),processingMs:quantile(s.latencies.map(l=>l.processingMs),.5),throughput:s.throughputRecordsPerSecond,maximumLatenessMs:Math.max(...s.latencies.map(l=>l.lateMs))}))collect([dir,s.version,s.track,s.scenario,s.count,s.hz,s.mode,s.ticks,metric].join('|'),f,value);
    if(s.artifactSha256)for(const a of s.artifactSha256){const p=`v${s.version}/dist/${s.track}/${a.file}`;if(!fs.existsSync(p)||digest(p)!==a.sha256){report.warnings.push({file:f,reason:'Historical artifact differs from current dist; retain its recorded hash'});break;}}
   }else{assert.equal(s.checksum,E.checksum(E.initial()));assert.ok(Number.isFinite(s.renderReadyMs)&&s.renderReadyMs>0);}
   batch.checksumsByScenario[s.scenario]??=[];if(!batch.checksumsByScenario[s.scenario].includes(s.checksum))batch.checksumsByScenario[s.scenario].push(s.checksum);
  }catch(error){report.integrityErrors.push({file:f,error:String(error)});}
 }
 batch.profiles=[...profiles];if(!m.commit)report.warnings.push({experiment:dir,reason:'Unversioned historical smoke evidence'});report.batches.push(batch);
}
const builds=new Map();
for(const f of files('benchmark/results/builds')){const s=read(f);if(!s.experiment)continue;const key=s.experiment+'|'+s.version+'|'+s.track;if(!builds.has(key))builds.set(key,[]);builds.get(key).push({file:f,...s});}
for(const [key,rows]of builds){const entry={key,n:rows.length,repetitions:rows.map(s=>s.rep).sort(),lockHashes:[...new Set(rows.map(s=>s.lockfileSha256))],artifactSignatures:[...new Set(rows.map(s=>signature(s.assets)))],commits:[...new Set(rows.map(s=>s.environment.commit))],durationMs:describe(rows.map(s=>s.durationMs))};report.buildBatches.push(entry);if(entry.lockHashes.length!==1||entry.artifactSignatures.length!==1)report.integrityErrors.push({key,error:'Build batch has mixed inputs or outputs'});for(const s of rows)collect(key+'|coldBuildMs',s.file,s.durationMs);}
for(const experiment of new Set(report.buildBatches.map(b=>b.key.split('|')[0]))){
 const orderFile='benchmark/results/build-orders/'+experiment+'.json';
 if(!fs.existsSync(orderFile)){report.warnings.push({experiment,reason:'Historical build batch has no saved order; balance cannot be verified'});continue;}
 const order=read(orderFile);
 const actual=[...builds.values()].flat().filter(s=>s.experiment===experiment);
 try{assert.equal(actual.length,order.length);for(const s of actual)assert.deepEqual({version:s.version,track:s.track,rep:s.rep},order[s.orderIndex]);
  const variants=new Set(order.map(s=>s.version+'|'+s.track)).size;
  if(order.length===variants*variants)for(const variant of new Set(order.map(s=>s.version+'|'+s.track))){const positions=order.flatMap((s,i)=>s.version+'|'+s.track===variant?[i%variants]:[]);assert.equal(new Set(positions).size,variants);}
 }catch(error){report.integrityErrors.push({experiment,error:String(error)});}
}
for(const [key,values]of metricGroups){if(values.length<4)continue;const stats=describe(values.map(x=>x.value)),low=stats.q1-1.5*stats.iqr,high=stats.q3+1.5*stats.iqr;for(const s of values)if(s.value<low||s.value>high)report.outliers.push({key,...s,lowFence:low,highFence:high,n:values.length,handling:'Retained; small-n descriptive flag, not a rejection or significance test'});}
for(const f of files('benchmark/results/lighthouse')){const s=read(f);try{assert.equal(s.functionalPassed,true);assert.ok(!s.lhr.runtimeError);assert.equal(s.finalState.tick,0);assert.equal(s.finalState.checksum,E.checksum(E.initial()));for(const metric of ['largest-contentful-paint','cumulative-layout-shift','total-blocking-time'])assert.ok(Number.isFinite(s.lhr.audits[metric].numericValue));report.lighthouse.push({file:f,experiment:s.experiment,version:s.version,track:s.track,rep:s.rep,lcpMs:s.lhr.audits['largest-contentful-paint'].numericValue,cls:s.lhr.audits['cumulative-layout-shift'].numericValue,tbtMs:s.lhr.audits['total-blocking-time'].numericValue,warnings:s.lhr.runWarnings||[]});}catch(error){report.integrityErrors.push({file:f,error:String(error)});}}
for(const experiment of new Set(report.lighthouse.map(s=>s.experiment))){
 const rows=report.lighthouse.filter(s=>s.experiment===experiment).map(s=>read(s.file));
 try{const order=read('benchmark/results/lighthouse-orders/'+experiment+'.json');assert.equal(rows.length,order.length);assert.equal(new Set(rows.map(s=>s.orderIndex)).size,rows.length);
  assert.equal(new Set(rows.map(s=>s.environment.chromeSha256)).size,1);assert.equal(new Set(rows.map(s=>JSON.stringify(s.provenance))).size,1);
  for(const s of rows)assert.deepEqual({version:s.version,track:s.track,rep:s.rep},order[s.orderIndex]);
 }catch(error){report.integrityErrors.push({experiment,error:String(error)});}
}
for(const f of files('benchmark/results/diagnostic-failures'))report.failures.push({file:f,...read(f)});
report.totals={accepted:report.batches.reduce((n,b)=>n+b.accepted,0),rejected:report.failures.length,ticks:report.batches.reduce((n,b)=>n+b.ticks,0),lateUpdates:report.batches.reduce((n,b)=>n+b.lateUpdates,0),droppedUpdates:report.batches.reduce((n,b)=>n+b.droppedUpdates,0),integrityErrors:report.integrityErrors.length,outlierFlags:report.outliers.length,lighthouseReports:report.lighthouse.length};
fs.mkdirSync('benchmark/results/audits',{recursive:true});fs.writeFileSync('benchmark/results/audits/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.totals));if(report.integrityErrors.length)process.exitCode=1;
