import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {validateManifest} from './manifest.mjs';
import E from '../../packages/market-fixtures/engine.js';
import {Oracle} from './oracle.mjs';import {runStatistics} from './statistics.mjs';
import {buildPairs,assertSummaryCurrent} from './audit-core.mjs';
import {EVIDENCE_CATALOG,posixPath,verifyEvidenceCatalog,verifyHistoricalEvidence,walkFiles} from './evidence.mjs';

export function buildAuditSummary(root='benchmark/results-v2') {
 const historical=verifyHistoricalEvidence(),catalog=JSON.parse(fs.readFileSync(EVIDENCE_CATALOG));verifyEvidenceCatalog(catalog);
 const rows=[],errors=[],pilotRoot=`${root}/pilots`;
 for(const file of walkFiles(pilotRoot).filter(file=>file.endsWith('.json')&&!file.endsWith('metadata.json'))){
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
    const oracle=new Oracle();sample.events.forEach((event,index)=>{assert.deepEqual(event,E.event(index,sample.workload.count));oracle.apply(event);});assert.deepEqual(sample.finalRows,oracle.rows);
    sample.timings.forEach((timing,index)=>{assert.equal(timing.tick,index);assert.ok(timing.synchronousApplyMs>=0&&timing.presentationMs>=timing.synchronousApplyMs);assert.ok(Math.abs(timing.lateMs-Math.max(0,timing.begin-timing.due))<1e-8);});
    assert.deepEqual(sample.statistics,runStatistics(sample.timings));assert.equal(sample.lateUpdates,sample.timings.filter(timing=>timing.lateMs>1000/sample.workload.hz).length);
   }else assert.ok(sample.error||sample.status==='started','Failure reason missing');
  }catch(error){errors.push({file:posixPath(file),error:error.message});}
  rows.push({file:posixPath(file),kind:sample.kind,experiment:sample.experiment,version:sample.version,track:sample.track,rep:sample.rep,accepted:sample.accepted,status:sample.status,error:sample.error||null,manifest:sample.manifest||null,workload:sample.workload||null,statistics:sample.accepted?sample.statistics:null,lateUpdates:sample.accepted?sample.lateUpdates:null});
 }
 const batches=fs.readdirSync(pilotRoot,{withFileTypes:true}).sort((a,b)=>a.name===b.name?0:a.name<b.name?-1:1);assert.ok(batches.length,'No pilot evidence batches found');
 for(const batch of batches){assert.ok(batch.isDirectory(),`Unexpected pilot entry: ${batch.name}`);const metadata=JSON.parse(fs.readFileSync(`${pilotRoot}/${batch.name}/metadata.json`));for(let i=0;i<metadata.order.length;i++)if(!fs.existsSync(`${pilotRoot}/${batch.name}/${i}.json`))errors.push({file:batch.name,error:`Planned attempt ${i} missing`});}
 const pairs=buildPairs(rows),nativeRoot=`${root}/native`;
 const nativeBuilds=walkFiles(nativeRoot).filter(file=>file.endsWith('.json')).map(file=>({file:posixPath(file),...JSON.parse(fs.readFileSync(file))})).filter(sample=>sample.kind==='native-build-pilot').map(sample=>({file:sample.file,version:sample.version.major,cache:sample.cache,builder:sample.builder,accepted:sample.accepted,durationMs:sample.accepted?sample.durationMs:null,emittedJSBytes:sample.accepted?sample.assets.filter(asset=>asset.file.endsWith('.js')).reduce((total,asset)=>total+asset.bytes,0):null,sourceCommit:sample.provenance?.commit||null,timingEligible:!!sample.provenance&&sample.driverUnchanged===true&&sample.inputsUnchanged===true&&!fs.existsSync(path.join(path.dirname(sample.file),'deviations.json'))}));
 return {schemaVersion:2,nativeBuilds,kind:'pilot-summary',historicalFilesVerified:historical.files,rows,pairs,errors,policy:'Pilots only; no pooling with historical data; rejected attempts retained; no performance ranking'};
}

export function main(args=process.argv.slice(2)) {
 const unknown=args.filter(arg=>arg!=='--check'&&arg!=='--write');assert.deepEqual(unknown,[],`Unknown audit arguments: ${unknown.join(', ')}`);assert.ok(!(args.includes('--check')&&args.includes('--write')),'Choose --check or --write');
 const summary=buildAuditSummary(),target='benchmark/results-v2/summary.json';
 if(args.includes('--write'))fs.writeFileSync(target,JSON.stringify(summary,null,2)+'\n');
 else {assert.ok(fs.existsSync(target),'Committed research summary is missing');assertSummaryCurrent(JSON.parse(fs.readFileSync(target)),summary);}
 console.log(JSON.stringify({mode:args.includes('--write')?'write':'check',historicalFilesVerified:summary.historicalFilesVerified,pilotAttempts:summary.rows.length,errors:summary.errors},null,2));if(summary.errors.length)process.exitCode=1;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href)main();
