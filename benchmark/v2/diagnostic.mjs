import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {serve} from '../../scripts/serve.mjs';import {frames,reset} from '../harness/functional.mjs';import {functional} from './functional.mjs';import {validateBuild} from './provenance.mjs';
const root='v22/dist/idiomatic-v2-diagnostic',out=`benchmark/results-v2/diagnostics/${new Date().toISOString().replaceAll(':','-')}.json`;
fs.mkdirSync('benchmark/results-v2/diagnostics',{recursive:true});const record={schemaVersion:2,kind:'consumer-diagnostic',accepted:false};let browser,server;
try{
 record.build=validateBuild(root);const host=await serve(root);server=host.server;
 browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'en-US'});await page.goto(host.url);await page.waitForFunction(()=>window.market);record.functional=await functional(page);await reset(page);
 await page.evaluate(()=>{window.market.clearDiagnostics();window.domMutations=0;window.observer=new MutationObserver(records=>window.domMutations+=records.length);window.observer.observe(document.querySelector('main'),{childList:true,subtree:true,characterData:true,attributes:true});window.market.apply({tick:0,changes:[{id:42,delta:10}]},'mutation');});await frames(page);
 record.sparse=await page.evaluate(()=>({counts:window.market.diagnostics(),domMutations:window.domMutations}));assert.equal(record.sparse.counts['view:AssetRow'],1);assert.equal(record.sparse.counts.order||0,0);assert.equal(record.sparse.counts.aggregate,1);
 await page.evaluate(()=>window.market.clearDiagnostics());await page.getByRole('button',{name:'Watch M0042',exact:true}).click();await frames(page);record.watch=await page.evaluate(()=>window.market.diagnostics());assert.equal(record.watch['view:AssetRow'],1);assert.equal(record.watch.aggregate||0,0);assert.equal(record.watch.order||0,0);
 record.accepted=true;
}catch(e){record.error=e.stack;process.exitCode=1;}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));fs.writeFileSync(out,JSON.stringify(record,null,2));console.log(out,record.accepted?'PASS':record.error);}
