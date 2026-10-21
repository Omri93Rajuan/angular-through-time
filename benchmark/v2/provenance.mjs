import fs from 'node:fs';import os from 'node:os';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function environment(chrome){return {commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),node:process.version,platform:os.platform(),os:os.release(),arch:os.arch(),cpu:os.cpus()[0].model,cores:os.cpus().length,memory:os.totalmem(),load:os.loadavg(),chromePath:chrome,chromeSha256:hash(chrome),playwright:JSON.parse(fs.readFileSync('node_modules/playwright/package.json')).version,rootLockSha256:hash('package-lock.json'),viewport:{width:1440,height:1000},locale:'en-US',power:'uncontrolled',thermal:'uncontrolled',governor:'uncontrolled',backgroundLoad:'uncontrolled',osCache:'uncontrolled',harnessHashes:['benchmark/v2/pilot.mjs','benchmark/v2/functional.mjs','benchmark/v2/oracle.mjs','benchmark/v2/statistics.mjs','research/v2/protocol.json'].map(file=>({file,sha256:hash(file)}))};}
export function validateBuild(root){
 const build=JSON.parse(fs.readFileSync(`${root}/research-build.json`));
 if(!build.accepted)throw Error('Build not accepted');
 for(const [file,digest] of build.inputs)if(hash(file)!==digest)throw Error(`Stale build source ${file}`);
 for(const asset of build.assets)if(hash(`${root}/${asset.file}`)!==asset.sha256)throw Error(`Stale artifact ${asset.file}`);
 return build;
}
