import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from './serve.mjs';
import {describe,quantile,cls} from '../benchmark/harness/statistics.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const data=read('benchmark/results/summary.json'),audit=read('benchmark/results/audits/results.json');
assert.equal(data.sampleCount,audit.totals.accepted);
assert.equal(data.failures.length,audit.totals.rejected);
const rejected=new Set(data.failures.map(s=>s.file));
function value(s,metric){
 const metrics={coldBuildMs:()=>s.durationMs,jsBytes:()=>s.assets.reduce((n,a)=>n+a.bytes,0),gzipBytes:()=>s.assets.reduce((n,a)=>n+a.gzip,0),brotliBytes:()=>s.assets.reduce((n,a)=>n+a.brotli,0),lighthouseLcpMs:()=>s.lhr.audits['largest-contentful-paint'].numericValue,lighthouseCls:()=>s.lhr.audits['cumulative-layout-shift'].numericValue,lighthouseTbtMs:()=>s.lhr.audits['total-blocking-time'].numericValue,renderReadyMs:()=>s.renderReadyMs,lcpMs:()=>s.observations.lcp.at(-1).start,cls:()=>cls(s.observations.cls),processingMs:()=>quantile(s.latencies.map(l=>l.processingMs),.5),presentationMs:()=>quantile(s.latencies.map(l=>l.presentationMs),.5),interactionMs:()=>quantile(s.interactions.map(l=>l.durationMs),.5),throughput:()=>s.throughputRecordsPerSecond,lateUpdates:()=>s.lateUpdates,longTaskMs:()=>s.observations.longTasks.reduce((n,l)=>n+l.duration,0),blockingMs:()=>s.observations.longTasks.reduce((n,l)=>n+Math.max(0,l.duration-50),0),heapPeakBytes:()=>s.memory.heapPeak,heapSteadyBytes:()=>quantile(s.memory.heapSamples.slice(Math.floor(s.memory.heapSamples.length/2)),.5),frameIntervalMs:()=>quantile(s.observations.frames.slice(1).map((v,i)=>v-s.observations.frames[i]),.5)};
 return metrics[metric]();
}
for(const g of data.summaries){
 assert.equal(g.n,g.files.length);assert.equal(g.n,g.values.length);assert.equal(new Set(g.files).size,g.n);
 const stats=describe(g.values);for(const k of ['median','q1','q3','iqr','min','max'])assert.equal(g[k],stats[k]);
 for(let i=0;i<g.files.length;i++){
  const file=g.files[i],s=read(file);assert.ok(!rejected.has(file));assert.equal(s.version,g.version);assert.equal(s.track,g.track);assert.equal(value(s,g.metric),g.values[i]);
  if(g.scenario==='BUILD'||g.scenario==='LIGHTHOUSE')assert.equal(s.experiment,g.experiment);
  else{const m=read(path.dirname(file)+'/metadata.json');assert.equal(path.basename(path.dirname(file)),g.experiment);assert.equal(s.accepted,true);assert.equal(s.scenario,g.scenario);assert.equal(s.count||0,g.count);assert.equal(m.hz,g.hz);assert.equal(s.mode||m.mode,g.mode);assert.equal(m.ticks,g.ticks);}
 }
}
const profile=s=>s.hz===0?'Separate diagnostic measurement':s.scenario==='A'?'Navigation / paused stream':`${s.count} records / ${s.hz} Hz / ${s.mode} / ${s.ticks} ticks`;
const format=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
const {server,url}=await serve('.');let browser;let selections=0;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(String(e)));await page.goto(url+'/dashboard/');await page.waitForSelector('#experiment option',{state:'attached'});
 const combinations=[...new Map(data.summaries.map(g=>[[g.experiment,g.scenario,g.metric,profile(g)].join('|'),g])).values()];
 for(const g of combinations){
  await page.selectOption('#experiment',g.experiment);await page.selectOption('#scenario',g.scenario);await page.selectOption('#metric',g.metric);await page.selectOption('#profile',profile(g));
  for(const track of ['all','baseline','idiomatic']){
   await page.selectOption('#track',track);
   const expected=data.summaries.filter(s=>s.experiment===g.experiment&&s.scenario===g.scenario&&s.metric===g.metric&&profile(s)===profile(g)&&(track==='all'||s.track===track)).sort((a,b)=>a.version-b.version||a.track.localeCompare(b.track));
   const rows=await page.locator('#rows tr').evaluateAll(rows=>rows.map(r=>({cells:[...r.cells].slice(0,6).map(c=>c.textContent),files:[...r.querySelectorAll('a')].map(a=>a.getAttribute('href').slice(1))})));
   assert.deepEqual(rows,expected.map(s=>({cells:[String(s.version),s.track,format(s.median),format(s.iqr),`${format(s.min)} – ${format(s.max)}`,String(s.n)],files:s.files})));selections++;
  }
 }
 for(const file of new Set(data.summaries.flatMap(g=>g.files))){const response=await page.request.get(url+'/'+file);assert.equal(response.status(),200);}
 await page.selectOption('#track','all');await page.selectOption('#experiment','build-2026-10-19T08-27-42.151Z');
 fs.mkdirSync('docs/previews',{recursive:true});await page.screenshot({path:'docs/previews/dashboard-verified-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/previews/dashboard-verified-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 const report={passed:true,summaryRows:data.summaries.length,selections,rawFiles:new Set(data.summaries.flatMap(g=>g.files)).size,acceptedRuntimeSamples:data.sampleCount,rejectedSamples:data.failures.length,pageErrors:errors};fs.writeFileSync('benchmark/results/audits/dashboard.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
