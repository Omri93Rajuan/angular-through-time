import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';
const major=Number(process.env.VERSION||22),version=JSON.parse(fs.readFileSync('docs/versions.json')).find(v=>v.major===major);if(!version)throw Error('Unknown version');
const app=path.resolve(`native/v${major}`),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'market-feedback-')),bin=path.resolve(`.runtimes/${version.node}/node_modules/.bin`),output=`benchmark/results-v2/feedback/${new Date().toISOString().replaceAll(':','-')}`;
fs.mkdirSync(output,{recursive:true});
try{
 fs.cpSync(app,scratch,{recursive:true,filter:p=>!['node_modules','dist','.angular'].includes(path.basename(p))});fs.symlinkSync(`${app}/node_modules`,`${scratch}/node_modules`,'dir');
 const row=`${scratch}/src/research/AssetRow.html`,source=`${scratch}/src/research/main.ts`,css=`${scratch}/src/styles.css`,original=new Map([row,source,css].map(p=>[p,fs.readFileSync(p,'utf8')]));
 const cases=[['baseline',null,null,true],['typescript-error',source,'\nconst invalidResearchType: string = 42;\n',false],['template-error',row,'\n{{a.nonexistentResearchProperty}}\n',false],['css-change',css,'\n:root { --research-feedback-probe: 12345; }\n',true],['recovery',null,null,true]];
 let failed=false;
 for(const [name,file,edit,expected] of cases){for(const [p,text] of original)fs.writeFileSync(p,text);if(file)fs.appendFileSync(file,edit);
 const begin=performance.now(),result=spawnSync(`${bin}/node`,['node_modules/@angular/cli/bin/ng.js','build','--configuration','development'],{cwd:scratch,encoding:'utf8',maxBuffer:20*1024*1024,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,NG_CLI_ANALYTICS:'false'}});
 const text=(result.stdout||'')+(result.stderr||''),record={schemaVersion:2,kind:'development-diagnostic',version,case:name,expectedSuccess:expected,exitCode:result.status,durationMs:performance.now()-begin,policy:'sequential development rebuild processes; project cache retained; not watch/HMR latency',accepted:(result.status===0)===expected};
 if(!expected)record.accepted=record.accepted&&(name==='typescript-error'?/not assignable to type/.test(text):/nonexistentResearchProperty/.test(text));
 if(name==='css-change'&&record.accepted){const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);record.accepted=walk(`${scratch}/dist`).filter(p=>p.endsWith('.css')).some(p=>fs.readFileSync(p,'utf8').includes('--research-feedback-probe'));}
 fs.writeFileSync(`${output}/${name}.txt`,text);fs.writeFileSync(`${output}/${name}.json`,JSON.stringify(record,null,2));console.log(name,record.accepted?'PASS':'FAIL');if(!record.accepted)failed=true;
 }
 if(failed)process.exitCode=1;
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
