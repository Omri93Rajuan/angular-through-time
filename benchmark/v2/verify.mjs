import fs from 'node:fs';import path from 'node:path';
import {chromium} from 'playwright';
import {serve} from '../../scripts/serve.mjs';
import {functional} from './functional.mjs';import {validateBuild,hash} from './provenance.mjs';
import assert from 'node:assert/strict';
const output=`benchmark/results-v2/verification/${new Date().toISOString().replaceAll(':','-')}`;fs.mkdirSync(output,{recursive:true});
const versions=(process.env.VERSIONS||'14,22').split(','),tracks=(process.env.NATIVE?'default-cli-v1':process.env.TRACKS||'idiomatic-v2').split(',');
const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});let failed=false;const verifierSources=['benchmark/v2/verify.mjs','benchmark/v2/functional.mjs','benchmark/v2/oracle.mjs','benchmark/harness/functional.mjs'].map(file=>({file,sha256:hash(file)}));
try{for(const version of versions)for(const track of tracks){
 let server,context;const errors=[];let record={schemaVersion:2,version:Number(version),track,kind:'functional-verification',verifierSources,browser:browser.version(),accepted:false};
 fs.writeFileSync(`${output}/${version}-${track}.json`,JSON.stringify({...record,status:'started'},null,2));
 try{
  let root=`v${version}/dist/${track}`;if(process.env.NATIVE){const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);root=path.dirname(walk(`native/v${version}/dist`).find(p=>p.endsWith('/index.html'))||'missing');record.track='default-cli-v1';record.recipe=JSON.parse(fs.readFileSync(`research/native/v${version}/recipe.json`));const batches=fs.readdirSync('benchmark/results-v2/native').sort().reverse();const file=batches.flatMap(b=>['project-warm','verification'].map(cache=>`benchmark/results-v2/native/${b}/${version}-${cache}.json`)).find(p=>fs.existsSync(p));record.build=JSON.parse(fs.readFileSync(file));assert.equal(record.build.accepted,true);for(const [p,digest] of record.build.inputs)assert.equal(hash(p),digest,p);for(const a of record.build.assets)assert.equal(hash(`native/v${version}/${a.file}`),a.sha256,a.file);}else record.build=validateBuild(root);
  const hosted=await serve(root);server=hosted.server;
  context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US',reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(hosted.url);await page.waitForFunction(()=>window.market);record.functional=await functional(page);assert.deepEqual(errors,[]);record.accepted=true;
 }catch(e){failed=true;record.error=e.stack;record.errors=errors;}finally{await context?.close();if(server)await new Promise(r=>server.close(r));}
 fs.writeFileSync(`${output}/${version}-${track}.json`,JSON.stringify(record,null,2));console.log(version,track,record.accepted?'PASS':'FAIL',record.error||'');
}}finally{await browser.close();}
console.log(output);if(failed)process.exitCode=1;
