import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),matrix=JSON.parse(fs.readFileSync('docs/versions.json'));
const versions=(process.env.VERSIONS||'14,22').split(',').map(Number);
const tracks=(process.env.TRACKS||'idiomatic-v2').split(',');
const output=`benchmark/results-v2/builds/${new Date().toISOString().replaceAll(':','-')}`;fs.mkdirSync(output,{recursive:true});
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]).sort();
let failed=false;
for(const major of versions){
 const v=matrix.find(v=>v.major===major);if(!v)throw Error('Invalid version');
 const app=path.join(root,`v${major}`),node=path.join(root,`.runtimes/${v.node}/node_modules/.bin/node`);
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'market-research-build-'));
 try {
  fs.cpSync(path.join(app,'src'),path.join(scratch,'src'),{recursive:true});
  for(const f of fs.readdirSync(app).filter(f=>f.startsWith('tsconfig')))fs.copyFileSync(path.join(app,f),path.join(scratch,f));
  fs.symlinkSync(path.join(app,'node_modules'),path.join(scratch,'node_modules'),'dir');
  fs.copyFileSync(path.join(app,'package.json'),path.join(scratch,'package.json'));
  const config=JSON.parse(fs.readFileSync(path.join(app,'research.angular.json')));
  for(const track of tracks){
   if(!config.projects[track])throw Error(`Missing ${major}/${track}`);
   const dest=path.join(app,'dist',track);config.projects[track].architect.build.options.outputPath=dest;
   fs.writeFileSync(path.join(scratch,'angular.json'),JSON.stringify(config));
   const manifest=JSON.parse(fs.readFileSync(`research/v2/${major}-${track}.json`));
   const inputs=[...walk(path.join(app,'src/research',track)),path.join(app,'src/engine.js'),path.join(app,'src/styles.css'),path.join(app,'src/research/index.html'),path.join(app,'package-lock.json'),path.join(app,'research.angular.json'),path.join(app,`tsconfig.${track}.json`),path.join(app,'tsconfig.json')].map(p=>[path.relative(root,p),hash(p)]);
   const start=Date.now();
   const result=spawnSync(node,[path.join(app,'node_modules/@angular/cli/bin/ng.js'),'build',track,'--configuration','production'],{cwd:scratch,encoding:'utf8',maxBuffer:20*1024*1024,env:{...process.env,PATH:path.dirname(node)+path.delimiter+process.env.PATH,NG_CLI_ANALYTICS:'false',NG_BUILD_MAX_WORKERS:'2'}});
   fs.writeFileSync(`${output}/${major}-${track}.txt`,(result.stdout||'')+(result.stderr||'')+String(result.error||''));
   const record={schemaVersion:2,kind:'compilation-verification',manifest,inputs,command:[node,'ng','build',track,'--configuration','production'],exitCode:result.status,accepted:result.status===0,elapsedMs:Date.now()-start,at:new Date().toISOString(),assets:result.status===0?walk(dest).map(p=>({file:path.relative(dest,p),sha256:hash(p),bytes:fs.statSync(p).size})):[]};
   fs.writeFileSync(`${output}/${major}-${track}.json`,JSON.stringify(record,null,2));
   if(result.status===0)fs.writeFileSync(path.join(dest,'research-build.json'),JSON.stringify(record,null,2));
   else failed=true;
   console.log(major,track,result.status===0?'PASS':'FAIL',`${output}/${major}-${track}.txt`);
  }
 } finally {fs.rmSync(scratch,{recursive:true,force:true});}
}
if(failed)process.exitCode=1;
