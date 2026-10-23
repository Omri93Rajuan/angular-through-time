import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {serve} from '../../scripts/serve.mjs';import {Oracle} from './oracle.mjs';import {checkDOM} from './functional.mjs';import {frames} from '../harness/functional.mjs';import {validateBuild} from './provenance.mjs';
const output=`benchmark/results-v2/history/${new Date().toISOString().replaceAll(':','-')}.json`;fs.mkdirSync('benchmark/results-v2/history',{recursive:true});const records=[];
const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
try{for(let version=14;version<=22;version++){
 const record={schemaVersion:2,kind:'history-boundary-verification',version,accepted:false};let server,context;
 try{const root=`v${version}/dist/idiomatic-v2`;record.build=validateBuild(root);const host=await serve(root);server=host.server;context=await browser.newContext({locale:'en-US'});const page=await context.newPage();await page.goto(host.url);await page.waitForFunction(()=>window.market);const oracle=new Oracle();
 for(let tick=0;tick<65;tick++)oracle.apply({tick,changes:[]});
 await page.evaluate(()=>{for(let tick=0;tick<65;tick++)window.market.apply({tick,changes:[]},'mutation');});await frames(page);await checkDOM(page,oracle);assert.equal(oracle.history.length,60);record.accepted=true;
 }catch(e){record.error=e.stack;process.exitCode=1;}finally{await context?.close();if(server)await new Promise(r=>server.close(r));}records.push(record);console.log(version,record.accepted?'PASS':record.error);
}}finally{await browser.close();fs.writeFileSync(output,JSON.stringify(records,null,2));}
