import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import E from '../../packages/market-fixtures/engine.js';
import {serve} from '../../scripts/serve.mjs';
import {frames,reset} from '../harness/functional.mjs';
import {checkDOM} from '../v2/functional.mjs';
import {Oracle} from '../v2/oracle.mjs';
import {validateBuild,hash} from '../v2/provenance.mjs';
import {runStatistics} from '../v2/statistics.mjs';
import {read} from './core.mjs';
export function preflight(variants){
 const builds={};
 for(const variant of variants){
  const [version,track]=variant.split('/'),root=`v${version}/dist/${track}`,build=validateBuild(root);
  assert.equal(build.manifest.diagnostic,false);assert.equal(build.manifest.version.major,Number(version));assert.equal(build.manifest.treatment,track);
  let gate;
  for(const batch of fs.readdirSync('benchmark/results-v2/verification').sort().reverse()){
   const file=`benchmark/results-v2/verification/${batch}/${version}-${track}.json`;
   if(!fs.existsSync(file))continue;
   const candidate=read(file);if(!candidate.accepted||candidate.functional?.passed!==true||candidate.functional?.oracle!=='fixture-independent-v2')continue;
   try{assert.deepEqual(candidate.build.manifest,build.manifest);assert.deepEqual(candidate.build.inputs,build.inputs);assert.deepEqual(candidate.build.assets,build.assets);gate={file,sha256:hash(file),record:candidate};break;}catch{}
  }
  assert.ok(gate,`No exact-source/artifact functional gate: ${variant}`);
  builds[variant]={root,build,gate};
 }
 return builds;
}
export function browserAttempt(p,chrome,builds,assertIdentity=()=>{}){
 return async(job,emit)=>{
  const frozen=builds[job.variant];assertIdentity();assert.deepEqual(validateBuild(frozen.root),frozen.build);assert.equal(hash(frozen.gate.file),frozen.gate.sha256);
  emit({type:'provenance',build:frozen.build,gate:frozen.gate});
  let browser,server,timer;
  try{
   const hosted=await serve(frozen.root);server=hosted.server;
   browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
   const work=async()=>{
    assert.equal(browser.version(),frozen.gate.record.browser,'Functional gate browser changed');
    const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>{errors.push(e.message);emit({type:'browser-error',message:e.message});});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());emit({type:'browser-error',message:m.text()});}});
    await page.goto(hosted.url);await page.waitForFunction(()=>window.market);await frames(page);await checkDOM(page,new Oracle());
    const {hz,count,mode,warmupSeconds,measurementSeconds}=p.workload;
    await page.evaluate(({count,hz,mode})=>window.market.configure(count,hz,mode),{count,hz,mode});await frames(page);
    const step=async(event,due)=>page.evaluate(async({event,due,mode})=>{
     await new Promise(r=>setTimeout(r,Math.max(0,due-performance.now())));
     const begin=performance.now();window.market.apply(event,mode);const applied=performance.now();
     await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
     if(+document.querySelector('#tick').textContent!==event.tick+1)throw Error('Tick not presented');
     return {tick:event.tick,due,begin,synchronousApplyMs:applied-begin,presentationMs:performance.now()-begin,lateMs:Math.max(0,begin-due)};
    },{event,due,mode});
    const warmStart=await page.evaluate(()=>performance.now());
    for(let tick=0;tick<warmupSeconds*hz;tick++){
     const event=E.event(tick,count);emit({type:'warmup-request',event});
     emit({type:'warmup',timing:await step(event,warmStart+tick*1000/hz)});
    }
    // Complete the nominal warm-up window even if the last event finished early.
    await page.evaluate(async end=>{await new Promise(r=>setTimeout(r,Math.max(0,end-performance.now())));},warmStart+warmupSeconds*1000);
    await reset(page);const start=await page.evaluate(()=>performance.now()),timings=[];
    for(let tick=0;tick<measurementSeconds*hz;tick++){
     const event=E.event(tick,count);emit({type:'request',event});
     const timing=await step(event,start+tick*1000/hz);timings.push(timing);emit({type:'timing',timing});
    }
    const elapsedMs=(await page.evaluate(()=>performance.now()))-start;
    const oracle=new Oracle();for(let tick=0;tick<timings.length;tick++)oracle.apply(E.event(tick,count));
    const finalRows=await page.evaluate(()=>window.market.rows());emit({type:'final-state',finalRows,elapsedMs});await checkDOM(page,oracle);assert.deepEqual(finalRows,oracle.rows);assert.deepEqual(errors,[]);
    assertIdentity();assert.deepEqual(validateBuild(frozen.root),frozen.build);assert.equal(hash(frozen.gate.file),frozen.gate.sha256);
    return {statistics:runStatistics(timings),elapsedMs,lateUpdates:timings.filter(t=>t.lateMs>1000/hz).length,finalRows,browser:browser.version(),functional:true};
   };
   // Fixed operational safety bound, never a fast-sample exclusion rule.
   return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Fixed 15-minute attempt safety timeout')),900000);})]);
  }finally{clearTimeout(timer);await browser?.close();if(server)await new Promise(r=>server.close(r));}
 };
}
