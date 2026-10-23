import os from 'node:os';import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {gzipSync,brotliCompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
const matrix=JSON.parse(fs.readFileSync('docs/versions.json')),versions=(process.env.VERSIONS||'14,15,16,17,18,19,20,21,22').split(',').map(Number),action=process.argv[2]||'install';
if(!['install','build'].includes(action))throw Error('Use install or build');
const out=`benchmark/results-v2/native/${new Date().toISOString().replaceAll(':','-')}`;fs.mkdirSync(out,{recursive:true});
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]).sort();
const provenance={commit:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),dirty:!!spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout.trim(),scriptSha256:hash('scripts/native-toolchain.mjs')};
let failed=false;
for(const v of matrix.filter(v=>versions.includes(v.major))){
 const cwd=path.resolve(`native/v${v.major}`),bin=path.resolve(`.runtimes/${v.node}/node_modules/.bin`),env={...process.env,PATH:bin+path.delimiter+process.env.PATH,NG_CLI_ANALYTICS:'false'};
 for(const cache of action==='build'?(process.env.VERIFY_ONLY?['verification']:['project-cold','project-warm']):['install']){
  const config=JSON.parse(fs.readFileSync(`${cwd}/angular.json`)),build=config.projects['market-native'].architect.build;
  if(cache==='project-cold'){fs.rmSync(`${cwd}/.angular`,{recursive:true,force:true});fs.rmSync(`${cwd}/dist`,{recursive:true,force:true});}
  const args=action==='install'?[fs.existsSync(`${cwd}/package-lock.json`)?'ci':'install','--engine-strict','--no-audit','--no-fund']:['node_modules/@angular/cli/bin/ng.js','build','--configuration','production'];
  const inputFiles=[...walk(`${cwd}/src`),...fs.readdirSync(cwd).filter(f=>f.endsWith('.json')).map(f=>`${cwd}/${f}`)];const inputs=inputFiles.map(p=>[path.relative(process.cwd(),p),hash(p)]);
  if(hash('scripts/native-toolchain.mjs')!==provenance.scriptSha256)throw Error('Native driver changed during campaign');
  const start=performance.now(),result=spawnSync(`${bin}/${action==='install'?'npm':'node'}`,args,{cwd,env,encoding:'utf8',maxBuffer:30*1024*1024});
  const durationMs=performance.now()-start;
  const inputsUnchanged=action==='install'||inputs.every(([p,digest])=>hash(p)===digest);
  const driverUnchanged=hash('scripts/native-toolchain.mjs')===provenance.scriptSha256;
  const record={schemaVersion:2,provenance,inputsUnchanged,driverUnchanged,kind:action==='build'?(process.env.VERIFY_ONLY?'compilation-verification':'native-build-pilot'):'native-install',version:v,inputs,environment:{node:spawnSync(`${bin}/node`,['--version'],{encoding:'utf8'}).stdout.trim(),npm:spawnSync(`${bin}/npm`,['--version'],{env,encoding:'utf8'}).stdout.trim(),os:os.release(),cpu:os.cpus()[0].model,load:os.loadavg(),power:'uncontrolled',thermal:'uncontrolled',backgroundLoad:'uncontrolled'},cache,accepted:result.status===0&&inputsUnchanged&&driverUnchanged,exitCode:result.status,durationMs:process.env.VERIFY_ONLY?null:durationMs,command:args,builder:build.builder,configuration:config,osCache:'uncontrolled',workers:process.env.NG_BUILD_MAX_WORKERS||'CLI default; no worker override',lockSha256:fs.existsSync(`${cwd}/package-lock.json`)?hash(`${cwd}/package-lock.json`):null};
  if(result.status===0&&action==='build'){
   record.assets=walk(`${cwd}/dist`).map(file=>{const bytes=fs.readFileSync(file);return {file:path.relative(cwd,file),bytes:bytes.length,sha256:hash(file),...(file.endsWith('.js')?{gzip:gzipSync(bytes).length,brotli:brotliCompressSync(bytes).length}:{})};});
   record.scope='All emitted artifacts recursively; compressed sizes per JS file; initial requested JS not measured';
  }
  fs.writeFileSync(`${out}/${v.major}-${cache}.txt`,(result.stdout||'')+(result.stderr||'')+String(result.error||''));fs.writeFileSync(`${out}/${v.major}-${cache}.json`,JSON.stringify(record,null,2));
  console.log(v.major,cache,record.accepted?'PASS':'FAIL',`${out}/${v.major}-${cache}.txt`);if(!record.accepted)failed=true;
 }
}
if(failed)process.exitCode=1;
