import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const tracked=(...paths)=>execFileSync('git',['ls-files','-z','--',...paths],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).sort();
export const pointer=(value,p)=>p.split('/').slice(1).reduce((o,k)=>o?.[k.replaceAll('~1','/').replaceAll('~0','~')],value);
const units={durationMs:'ms',elapsedMs:'ms',renderReadyMs:'ms',throughputRecordsPerSecond:'records/s',lateUpdates:'count',dropped:'count',processedRecords:'count',p50:'ms',p95:'ms',processingMs:'ms',presentationMs:'ms',synchronousApplyMs:'ms',lateMs:'ms',heapBefore:'bytes',heapPeak:'bytes'};
function measures(d){
 const out=[];const add=(p,unit)=>{const value=pointer(d,p);if(typeof value==='number'&&Number.isFinite(value))out.push({pointer:p,value,unit});};
 for(const k of ['durationMs','elapsedMs','renderReadyMs','throughputRecordsPerSecond','lateUpdates','dropped','processedRecords'])add('/'+k,units[k]);
 for(const k of ['p50','p95'])add('/statistics/'+k,'ms');
 for(const k of ['heapBefore','heapPeak'])add('/memory/'+k,'bytes');
 for(const key of ['timings','latencies'])if(Array.isArray(d[key]))d[key].forEach((t,i)=>{for(const k of ['processingMs','synchronousApplyMs','presentationMs','lateMs'])add(`/${key}/${i}/${k}`,'ms');});
 if(d.lhr){add('/lhr/categories/performance/score','score-0-1');for(const [id,a] of Object.entries(d.lhr.audits||{}))if(typeof a.numericValue==='number')add('/lhr/audits/'+id+'/numericValue',a.numericUnit||'unspecified');}
 if(Array.isArray(d.assets))d.assets.forEach((a,i)=>{for(const k of ['bytes','gzipBytes','brotliBytes'])add(`/assets/${i}/${k}`,'bytes');});
 return out;
}
export function buildInventory(){
 const paths=tracked('benchmark/results','benchmark/results-v2','benchmark/results-confirmatory');
 if(paths.some(p=>p.startsWith('benchmark/results-confirmatory/')))throw Error('A new confirmatory archive requires a separately versioned, reviewed import; v1 cannot reclassify it as exploratory evidence. See docs/ANGULAR_EVOLUTION.md.');
 const definitions={
  'benchmark/results/runtime':['historical-runtime','Legacy controlled/limited-idiomatic tracks; preserve original labels. Short and mixed workloads, failures and per-run provenance vary; no v2 equivalence or confirmatory inference.'],
  'benchmark/results/builds':['historical-build','Historical controlled toolchain; project cache labels do not imply cold OS cache; not native-default across every version.'],
  'benchmark/results/lighthouse':['historical-lighthouse','Navigation audit on one host/browser; not runtime update latency. Preserve original Lighthouse report and failure records.'],
  'benchmark/results-v2/pilots':['exploratory-runtime-pilot','Two endpoint pairs for B and two pairs for M4; six measured ticks. Retrospective seals, no power/precision guarantee, no primary inference.'],
  'benchmark/results-v2/native':['native-toolchain-feasibility','Installation/verification and project-cold/warm timings coexist. Only records explicitly timingEligible in the existing audit may be considered exploratory timing evidence. Early provenance is incomplete; cache and order effects remain.'],
  'benchmark/results-v2/builds':['compilation-verification','Elapsed times are incidental verification durations on uncontrolled hosts, not balanced build-performance evidence.'],
  'benchmark/results-v2/feedback':['diagnostic-workflow','Compiler error/recovery diagnostics, not HMR or production runtime measurements.'],
  'benchmark/results-v2/diagnostics':['instrumented-diagnostic','Consumer instrumentation changes execution; do not pool with uninstrumented runtime timings.']
 };
 const summary=JSON.parse(fs.readFileSync(path.join(root,'benchmark/results-v2/summary.json')));const native=new Map(summary.nativeBuilds.map(r=>[r.file,r]));
 const groups=new Map(),files=[],records=[];
 for(const file of paths){
  const parts=file.split('/'),prefix=parts.slice(0,3).join('/');
  const batch=parts.length>4?parts[3]:null;const id=prefix+(batch?'/'+batch:'');
  const [classification,limitation]=definitions[prefix]||['supporting-or-derived','Metadata, logs, functional acceptance or derived summaries; not an independent performance sample. Inspect original record; do not count derived copies twice.'];
  if(!groups.has(id))groups.set(id,{id,classification,originalBatchId:batch,root:id,limitations:[limitation],confirmatoryEligible:false});
  const bytes=fs.readFileSync(path.join(root,file));files.push({path:file,sha256:sha(bytes),bytes:bytes.length,datasetId:id});
  if(!file.endsWith('.json'))continue;const d=JSON.parse(bytes);if(Array.isArray(d)||!d||typeof d!=='object')continue;
  const measurements=measures(d);if(!measurements.length)continue;
  let metadataPath=path.posix.join(path.posix.dirname(file),'metadata.json');if(!paths.includes(metadataPath))metadataPath=null;
  const metadata=metadataPath?JSON.parse(fs.readFileSync(path.join(root,metadataPath))):{};
  const environment=d.environment||metadata.environment||metadata;
  const sourceCommit=d.provenance?.commit||d.sourceCommit||environment.commit||null;
  const missing=[];if(!sourceCommit)missing.push('sourceCommit');if(!metadataPath&&!d.environment&&!d.provenance)missing.push('environmentMetadata');
  const timing=native.get(file)?.timingEligible??null;
  records.push({id:file,file,datasetId:id,claimType:'recorded-observation',kind:d.kind||null,experiment:d.experiment||null,version:typeof d.version==='number'?d.version:d.version?.major??null,track:d.track??null,scenario:d.scenario??d.workload?.scenario??null,rep:d.rep??null,accepted:d.accepted??null,status:d.status??null,sourceCommit,sourceDirty:environment.sourceDirty??environment.dirty??d.provenance?.dirty??null,metadataPath,artifactIdentityPointers:['/artifactSha256','/build/assets','/assets','/inputs','/build/inputs'].filter(p=>pointer(d,p)!==undefined),missingProvenance:missing,timingEligibleAsRecorded:timing,usage:classification==='compilation-verification'||classification==='supporting-or-derived'?'verification-only':'descriptive-only',confirmatoryEligible:false,measurements});
 }
 return {schemaVersion:1,datasetVersion:'1.0.0',asOf:'2026-10-29',claimType:'performance-evidence-inventory',inventoryBaseCommit:'a6043de92d675d7bb7d76140f64a2dad0dd9df03',scope:'All Git-tracked files in benchmark/results, results-v2 and results-confirmatory; local external preparation packages and temporary validation artifacts are not public evidence.',datasets:[...groups.values()],files,records,confirmatory:{available:false,attempts:0,reason:'No tracked real campaign exists. Frozen protocol and human approval remain separate; this inventory grants no authorization.'},missing:['No real confirmatory campaign or primary conclusions.','No long-window paired runtime evidence across all nine v2 B treatments.','Pilot p95 uses six events, insufficient for stable tail inference.','No cross-host replication or automatically certified thermal/power stability.','No complete balanced native build campaign or reliable HMR latency campaign.','External preparation artifacts and disposable CI validation are excluded; their absence here is not absence of verification.'],conclusions:[]};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv[2]!=='--write')throw Error('Use --write to regenerate only research/evolution/v1/evidence.json; never raw evidence.');
 const data=buildInventory();fs.writeFileSync(path.join(root,'research/evolution/v1/evidence.json'),JSON.stringify(data,null,2)+'\n');console.log(`${data.files.length} files; ${data.datasets.length} groups; ${data.records.length} records with numeric observations`);
}
