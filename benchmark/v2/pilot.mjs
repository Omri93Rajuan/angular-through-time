import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
import E from '../../packages/market-fixtures/engine.js';import {serve} from '../../scripts/serve.mjs';
import {balancedOrder} from '../harness/order.mjs';import {frames,reset} from '../harness/functional.mjs';
import {checkDOM} from './functional.mjs';import {Oracle} from './oracle.mjs';import {runStatistics} from './statistics.mjs';import {environment,validateBuild,hash} from './provenance.mjs';
const protocol=JSON.parse(fs.readFileSync('research/v2/protocol.json'));
if(process.env.CAMPAIGN&&process.env.CAMPAIGN!=='pilot')throw Error('Only pilots are implemented. Confirmatory campaign requires researcher-approved protocol.');
const versions=(process.env.VERSIONS||'14,22').split(',').map(Number),tracks=(process.env.TRACKS||'idiomatic-v2').split(',');
const base=versions.flatMap(version=>tracks.map(track=>({version,track}))),reps=Number(process.env.REPS||base.length);
if(!Number.isInteger(reps)||reps<base.length||reps%base.length)throw Error('Pilot requires complete balanced cycles');
const chrome=process.env.CHROME||'/opt/google/chrome/chrome',stamp=new Date().toISOString().replaceAll(':','-'),out=`benchmark/results-v2/pilots/${stamp}`;
const order=balancedOrder(base,reps),metadata={schemaVersion:2,kind:'pilot',protocol,environment:environment(chrome),order};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/metadata.json`,JSON.stringify(metadata,null,2));
let failed=false;const frozenBuilds=new Map();
for(const [orderIndex,job] of order.entries()){
 const record={schemaVersion:2,kind:'pilot',experiment:stamp,protocolId:protocol.id,...job,orderIndex,accepted:false,timings:[],events:[]};
 const file=`${out}/${orderIndex}.json`;fs.writeFileSync(file,JSON.stringify({...record,status:'started'},null,2));
 let server,browser;
 try{
  const root=`v${job.version}/dist/${job.track}`;record.build=validateBuild(root);record.manifest=record.build.manifest;const key=`${job.version}/${job.track}`;if(frozenBuilds.has(key))assert.deepEqual(record.build,frozenBuilds.get(key),'Build changed between blocks');else frozenBuilds.set(key,record.build);for(const item of metadata.environment.harnessHashes)assert.equal(hash(item.file),item.sha256,'Harness changed during pilot');assert.equal(hash(chrome),metadata.environment.chromeSha256);
  if(record.manifest.diagnostic)throw Error('Instrumented replicas cannot enter timing pilots');
  const hosted=await serve(root);server=hosted.server;
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});record.browser=browser.version();
  const context=await browser.newContext({viewport:metadata.environment.viewport,locale:'en-US',reducedMotion:'reduce'}),page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(hosted.url);await page.waitForFunction(()=>window.market);await frames(page);
  let gate;
  for(const batch of fs.readdirSync('benchmark/results-v2/verification').sort().reverse()){
   const file=`benchmark/results-v2/verification/${batch}/${job.version}-${job.track}.json`;if(!fs.existsSync(file))continue;
   const candidate=JSON.parse(fs.readFileSync(file));if(!candidate.accepted)continue;
   try{assert.deepEqual(candidate.build.inputs,record.build.inputs);assert.deepEqual(candidate.build.assets,record.build.assets);gate={file,record:candidate};break;}catch{}
  }
  if(!gate)throw Error('No expanded functional acceptance for these exact source/artifact hashes');assert.equal(record.browser,gate.record.browser,'Browser differs from functional gate');
  await checkDOM(page,new Oracle());record.functional={passed:true,oracle:gate.record.functional.oracle,evidence:gate.file,policy:'Reuse exact artifact full gate; fresh-process initial and final full numeric oracle'};
  const {warmupTicks,ticks,hz,count,mode}=protocol.pilot;record.workload={ticks,hz,count,mode,scenario:'B',delivery:'serial-lossless'};await page.evaluate(({count,hz,mode})=>window.market.configure(count,hz,mode),{count,hz,mode});await frames(page);
  for(let i=0;i<warmupTicks;i++){await page.evaluate(e=>window.market.apply(e,'mutation'),E.event(i,count));await frames(page);}await reset(page);
  const oracle=new Oracle(),start=await page.evaluate(()=>performance.now());
  for(let tick=0;tick<ticks;tick++){
   const due=start+tick*1000/hz,event=E.event(tick,count);record.events.push(event);
   const timing=await page.evaluate(async({event,due,mode})=>{await new Promise(r=>setTimeout(r,Math.max(0,due-performance.now())));const begin=performance.now();window.market.apply(event,mode);const applied=performance.now();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(+document.querySelector('#tick').textContent!==event.tick+1)throw Error('Tick not presented');return {tick:event.tick,due,begin,synchronousApplyMs:applied-begin,presentationMs:performance.now()-begin,lateMs:Math.max(0,begin-due)};},{event,due,mode});
   record.timings.push(timing);oracle.apply(event);
  }
  record.elapsedMs=(await page.evaluate(()=>performance.now()))-start;
  // Untimed full visual oracle; no per-step inspection overhead in primary timing interval.
  await checkDOM(page,oracle);assert.deepEqual(errors,[]);record.finalRows=await page.evaluate(()=>window.market.rows());assert.deepEqual(record.finalRows,oracle.rows);
  for(const item of metadata.environment.harnessHashes)assert.equal(hash(item.file),item.sha256,'Harness changed during run');assert.equal(hash(chrome),metadata.environment.chromeSha256);record.statistics=runStatistics(record.timings);record.lateUpdates=record.timings.filter(t=>t.lateMs>1000/hz).length;record.accepted=true;
 }catch(e){record.error=e.stack;failed=true;}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
 record.status=record.accepted?'completed':'failed';fs.writeFileSync(file,JSON.stringify(record,null,2));console.log(orderIndex,job,record.status,record.error||record.statistics);
}
console.log(out);if(failed)process.exitCode=1;
