import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {serve} from '../../scripts/serve.mjs';import {validateBuild} from './provenance.mjs';
const out=`benchmark/results-v2/features/${new Date().toISOString().replaceAll(':','-')}.json`;fs.mkdirSync('benchmark/results-v2/features',{recursive:true});const records=[];
const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
try{for(let v=14;v<=22;v++){
 const record={version:v,accepted:false};let server,context;
 try{const root=`v${v}/dist/idiomatic-v2`,build=validateBuild(root);record.manifest=build.manifest;
 const source=fs.readFileSync(`v${v}/src/research/idiomatic-v2/main.ts`,'utf8');assert.ok(!source.includes('revision'));assert.equal(source.includes('entities=this.rows.map(a=>signal<Asset>'),v>=17);assert.equal(source.includes('summary=computed'),v>=17);assert.equal((source.match(/changeDetection:ChangeDetectionStrategy.OnPush/g)||[]).length,7);
 const table=fs.readFileSync(`v${v}/src/research/idiomatic-v2/Table.html`,'utf8');assert.equal(table.includes('@for'),v>=18);
 const hosted=await serve(root);server=hosted.server;context=await browser.newContext();const page=await context.newPage();await page.goto(hosted.url);await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===5000);
 record.runtime=await page.evaluate(()=>({zonePresent:typeof window.Zone!=='undefined',rows:document.querySelectorAll('tr[market-row]').length,track:window.market.track}));assert.equal(record.runtime.zonePresent,v<20);assert.equal(record.runtime.rows,5000);record.accepted=true;
 }catch(e){record.error=e.stack;process.exitCode=1;}finally{await context?.close();if(server)await new Promise(r=>server.close(r));}records.push(record);console.log(v,record.accepted?'PASS':record.error);
}}finally{await browser.close();fs.writeFileSync(out,JSON.stringify({schemaVersion:2,kind:'feature-verification',records},null,2));}
