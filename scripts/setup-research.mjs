import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const versions=(process.env.VERSIONS||'14,22').split(',').map(Number),matrix=JSON.parse(fs.readFileSync('docs/versions.json'));
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{stdio:'inherit',...options});if(r.status!==0)throw Error(`${cmd} exited ${r.status}`);}
for(const v of matrix.filter(v=>versions.includes(v.major))){
 const runtime=path.resolve(`.runtimes/${v.node}`),bin=path.join(runtime,'node_modules/.bin'),npm=v.major===14?'8.19.4':v.major<18?'10.9.8':'11.6.2';
 if(!fs.existsSync(`${bin}/node`)||!fs.existsSync(`${runtime}/node_modules/npm/package.json`)||JSON.parse(fs.readFileSync(`${runtime}/node_modules/npm/package.json`)).version!==npm)run('npm',['install','--prefix',runtime,'--no-audit','--no-fund',`node@${v.node}`,`npm@${npm}`]);
 if(!process.env.RUNTIME_ONLY)run(`${bin}/npm`,['ci','--engine-strict','--no-audit','--no-fund'],{cwd:`v${v.major}`,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
}
