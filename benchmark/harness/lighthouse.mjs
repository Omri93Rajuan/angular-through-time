import fs from 'node:fs';import os from 'node:os';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright';import lighthouse from 'lighthouse';import {launch} from 'chrome-launcher';import {serve} from '../../scripts/serve.mjs';import {parity} from './functional.mjs';
const experiment='lighthouse-'+new Date().toISOString().replaceAll(':','-');
const chromePath=process.env.CHROME||'/opt/google/chrome/chrome';fs.mkdirSync('benchmark/results/lighthouse',{recursive:true});
for(const version of (process.env.VERSIONS||'14,22').split(','))for(const track of (process.env.TRACKS||'baseline,idiomatic').split(',')){
const {server,url}=await serve(`apps/angular-${version}/dist/${track}`);let chrome;
try{
 const browser=await chromium.launch({executablePath:chromePath,headless:true,args:['--no-sandbox']});try{const page=await browser.newPage({locale:'en-US'});await page.goto(url);await page.waitForFunction(()=>window.market);await parity(page);}finally{await browser.close();}
 chrome=await launch({chromePath,chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage']});
 for(let rep=0;rep<Number(process.env.REPS||3);rep++){
 const result=await lighthouse(url,{port:chrome.port,output:'json',logLevel:'error',onlyCategories:['performance'],formFactor:'desktop',screenEmulation:{mobile:false,width:1440,height:1000,deviceScaleFactor:1,disabled:false},throttlingMethod:'provided'});
 if(result.lhr.runtimeError)throw Error(JSON.stringify(result.lhr.runtimeError));
 let commit=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 const prefix=`benchmark/results/lighthouse/${version}-${track}-${rep}-${Date.now()}`;fs.writeFileSync(prefix+'.json',JSON.stringify({experiment,version:Number(version),track,rep,functionalPassed:true,environment:{chromePath,chromeSha256:createHash('sha256').update(fs.readFileSync(chromePath)).digest('hex'),os:os.release(),cpu:os.cpus()[0].model,node:process.version,commit},lhr:result.lhr},null,2));console.log(version,track,rep,'Lighthouse saved');
 }
}finally{if(chrome)await chrome.kill();await new Promise(r=>server.close(r));}}
