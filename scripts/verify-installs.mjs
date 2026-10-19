import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import semver from '../.runtimes/16.20.2/node_modules/npm/node_modules/semver/index.js';
const matrix=JSON.parse(fs.readFileSync('docs/versions.json'));
const selected=(process.env.VERSIONS||matrix.map(v=>v.major).join(',')).split(',').map(Number);
const reports=[];
fs.mkdirSync('benchmark/results/verification-logs',{recursive:true});
for(const v of matrix.filter(v=>selected.includes(v.major))){
 const cwd=path.resolve(`v${v.major}`),bin=path.resolve(`.runtimes/${v.node}/node_modules/.bin`);
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH};
 const node=spawnSync(path.join(bin,'node'),['-v'],{env,encoding:'utf8'}).stdout.trim();
 if(node!=='v'+v.node)throw Error('Wrong Node runtime');
 const before=fs.readFileSync(path.join(cwd,'package-lock.json'));
 const command=['ci','--engine-strict','--no-audit','--no-fund'];
 const result=spawnSync(path.join(bin,'npm'),command,{cwd,env,encoding:'utf8',maxBuffer:20*1024*1024});
 const log=`benchmark/results/verification-logs/npm-ci-${v.major}.txt`;
 fs.writeFileSync(log,`${bin}/npm ${command.join(' ')}\nNode ${node}\n${result.stdout}${result.stderr}`);
 const lock=JSON.parse(before),unsupported=[];
 for(const [p,pkg]of Object.entries(lock.packages))if(pkg.engines?.node&&!semver.satisfies(v.node,pkg.engines.node))unsupported.push({path:p,version:pkg.version,node:pkg.engines.node,optional:!!pkg.optional,installed:fs.existsSync(path.join(cwd,p,'package.json'))});
 const record={version:v.major,node,exitCode:result.status,log,lockUnchanged:before.equals(fs.readFileSync(path.join(cwd,'package-lock.json'))),lockSha256:createHash('sha256').update(before).digest('hex'),unsupported};reports.push(record);console.log(JSON.stringify(record));
}
fs.writeFileSync('benchmark/results/audits/installs.json',JSON.stringify(reports,null,2));
if(reports.some(r=>r.exitCode!==0||!r.lockUnchanged||r.unsupported.some(p=>p.installed)))process.exitCode=1;
