import assert from 'node:assert/strict';
import fs from 'node:fs';
import {balancedOrder} from '../harness/order.mjs';
import {digest,walkFiles,posixPath} from '../v2/evidence.mjs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const read=file=>JSON.parse(fs.readFileSync(file));
export const fingerprint=value=>digest(Buffer.from(JSON.stringify(value)));
export const protocol=()=>read(new URL('../../research/v2/confirmatory-protocol.json',import.meta.url));
export function plan(p){return p.experiments.flatMap(e=>balancedOrder(e.variants.map(variant=>({experiment:e.id,variant})),p.blocks)).map((job,index)=>({...job,index}));}
export function authorize(p,approval,identity){
 assert.equal(approval.approved,true,'Explicit researcher approval required');
 assert.ok(typeof approval.researcher==='string'&&approval.researcher.trim().length>0,'Named researcher required');
 assert.ok(Number.isFinite(Date.parse(approval.approvedAt)),'Approval timestamp required');
 assert.equal(approval.protocolHash,fingerprint(p),'Approval must bind exact protocol');
 assert.deepEqual(approval.identity,identity,'Approval must bind source, browser and host');
 assert.deepEqual(approval.acceptedDecisions,p.approvalRequired,'All proposed decisions require approval');
}
export function attest(a,identity){
 assert.equal(a.identityHash,fingerprint(identity),'Session host/source identity changed');
 assert.ok(typeof a.operator==='string'&&a.operator.trim());
 const age=Date.now()-Date.parse(a.checkedAt);assert.ok(age>=0&&age<3600000,'Session attestation must be less than one hour old');
 for(const key of ['acPower','fixedPerformancePolicy','noHeavyWorkloads','noThermalThrottling'])assert.equal(a[key],true,`Environment not accepted: ${key}`);
}
export function exclusiveJSON(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
export function seal(directory){
 const files=walkFiles(directory).filter(f=>path.basename(f)!=='seal.json').map(f=>({path:posixPath(path.relative(directory,f)),sha256:digest(fs.readFileSync(f))}));
 exclusiveJSON(path.join(directory,'seal.json'),{files});
}
export function verifySeal(directory){
 const expected=read(path.join(directory,'seal.json')).files;
 const actual=walkFiles(directory).filter(f=>path.basename(f)!=='seal.json').map(f=>({path:posixPath(path.relative(directory,f)),sha256:digest(fs.readFileSync(f))}));
 assert.deepEqual(actual,expected,`Evidence changed: ${directory}`);
}
// Started slots are never replayed. An interruption gets a separate terminal record.
export async function collect(directory,metadata,run,{resume=false,session={}}={}){
 if(!fs.existsSync(directory))fs.mkdirSync(directory,{recursive:true});
 const lock=path.join(directory,'.lock');const fd=fs.openSync(lock,'wx');fs.writeSync(fd,JSON.stringify({pid:process.pid,host:metadata.identity?.host}));
 try{
  const meta=path.join(directory,'metadata.json');
  if(fs.existsSync(meta)){assert.ok(resume,'Existing campaign requires --resume');assert.deepEqual(read(meta),metadata,'Campaign identity/protocol changed');}
  else {assert.ok(!resume,'Cannot resume nonexistent campaign');assert.deepEqual(fs.readdirSync(directory),['.lock'],'New campaign directory must be empty');exclusiveJSON(meta,metadata);}
  const expected=new Set(['.lock','metadata.json',...metadata.order.map(j=>String(j.index).padStart(4,'0'))]);
  for(const name of fs.readdirSync(directory))assert.ok(expected.has(name)||/^(invalid-)?session-[\w-]+\.json$/.test(name),`Unexpected campaign entry: ${name}`);
  // Check all already sealed attempts before allowing any new collection.
  for(const job of metadata.order){const dir=path.join(directory,String(job.index).padStart(4,'0'));if(fs.existsSync(path.join(dir,'seal.json')))verifySeal(dir);}
  const sessionFile=`session-${Date.now()}-${process.pid}-${randomUUID()}.json`;exclusiveJSON(path.join(directory,sessionFile),session);
  const sessionHash=fingerprint(session);
  for(const job of metadata.order){
   const dir=path.join(directory,String(job.index).padStart(4,'0'));
   if(fs.existsSync(dir)){
    if(fs.existsSync(path.join(dir,'seal.json'))){verifySeal(dir);if(!fs.existsSync(path.join(dir,'interrupted.json')))assert.deepEqual(read(path.join(dir,'start.json')).job,job);}
    else {
     // A terminal record lacking a seal is not trusted after interruption.
     if(!fs.existsSync(path.join(dir,'interrupted.json')))exclusiveJSON(path.join(dir,'interrupted.json'),{job,reason:'Previous process ended before sealing; no replacement',sessionFile,sessionHash});
     seal(dir);
    }
    continue;
   }
   fs.mkdirSync(dir);exclusiveJSON(path.join(dir,'start.json'),{job,sessionFile,sessionHash,metadataHash:fingerprint(metadata),kind:metadata.kind});
   const journal=fs.openSync(path.join(dir,'events.jsonl'),'wx');
   const emit=event=>{fs.writeSync(journal,JSON.stringify(event)+'\n');fs.fsyncSync(journal);};
   let failed=false;
   try{const result=await run(job,emit);exclusiveJSON(path.join(dir,'result.json'),{...result,accepted:true});}
   catch(error){exclusiveJSON(path.join(dir,'result.json'),{accepted:false,error:String(error.stack||error)});failed=true;}
   finally{fs.closeSync(journal);seal(dir);}
   if(failed)throw Error(`Attempt ${job.index} failed; retained. Resume continues at next unattempted slot.`);
  }
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
