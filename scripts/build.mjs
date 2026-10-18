import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import {spawnSync} from 'node:child_process'; import {performance} from 'node:perf_hooks'; import {gzipSync,brotliCompressSync} from 'node:zlib'; import {createHash} from 'node:crypto';
const experiment='build-'+new Date().toISOString().replaceAll(':','-');
const matrix=JSON.parse(fs.readFileSync('docs/versions.json')); const versions=(process.env.VERSIONS||'14,22').split(',').map(Number); const tracks=(process.env.TRACKS||'baseline,idiomatic').split(',');
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{stdio:'inherit',...options});if(r.status!==0)throw Error(`${cmd} ${args.join(' ')} failed (${r.status})`);}
fs.mkdirSync('benchmark/results/builds',{recursive:true});
for(const v of matrix.filter(v=>versions.includes(v.major))){
 const runtime=path.resolve(`.runtimes/${v.node}`), bin=path.join(runtime,'node_modules/.bin');
 const npmVersion=v.major===14?'8.19.4':v.major>=18?'11.6.2':'10.9.8';
 if(!fs.existsSync(path.join(bin,'node')))run('npm',['install','--prefix',runtime,'--no-audit','--no-fund',`node@${v.node}`,`npm@${npmVersion}`]);
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,NG_CLI_ANALYTICS:'false',NG_BUILD_MAX_WORKERS:'2'};
 const cwd=path.resolve(`apps/angular-${v.major}`);
 run(path.join(bin,'node'),['--version']);
 if(!process.env.SKIP_INSTALL)run(path.join(bin,'npm'),[fs.existsSync(path.join(cwd,'package-lock.json'))?'ci':'install','--no-audit','--no-fund'],{cwd,env});
 for(let rep=0;rep<Number(process.env.BUILD_REPS||1);rep++) for(const track of tracks){
 fs.rmSync(path.join(cwd,'dist',track),{recursive:true,force:true});fs.rmSync(path.join(cwd,'.angular'),{recursive:true,force:true});
 const start=performance.now();run(path.join(bin,'node'),['node_modules/@angular/cli/bin/ng.js','build',track,'--configuration','production'],{cwd,env});const durationMs=performance.now()-start;
 const dir=path.join(cwd,'dist',track);const assets=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).map(file=>{const b=fs.readFileSync(path.join(dir,file));return {file,bytes:b.length,gzip:gzipSync(b).length,brotli:brotliCompressSync(b).length,sha256:createHash('sha256').update(b).digest('hex')};});
 const result={kind:'cold-build',experiment,rep,version:v.major,track,durationMs,environment:{node:v.node,npm:npmVersion,angular:v.angular,cli:v.cli,typescript:v.typescript,os:os.release(),platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model,cores:os.cpus().length,memory:os.totalmem(),commit:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()||null},coldDefinition:'dist and Angular cache removed; dependencies installed; OS filesystem cache uncontrolled',configuration:JSON.parse(fs.readFileSync(path.join(cwd,'angular.json'))),lockfileSha256:createHash('sha256').update(fs.readFileSync(path.join(cwd,'package-lock.json'))).digest('hex'),builder:'@angular-devkit/build-angular:browser',assets,at:new Date().toISOString()};
 fs.writeFileSync(`benchmark/results/builds/${v.major}-${track}-${Date.now()}.json`,JSON.stringify(result,null,2));
 }
}
