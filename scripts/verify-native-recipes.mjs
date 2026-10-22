import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(let v=14;v<=22;v++){
 const original=`research/native/v${v}/scaffold`,adapted=`native/v${v}`;
 const a=JSON.parse(fs.readFileSync(`${original}/angular.json`)),b=JSON.parse(fs.readFileSync(`${adapted}/angular.json`));
 const scripts=b.projects['market-native'].architect.build.options.scripts;assert.deepEqual(scripts,[...(a.projects['market-native'].architect.build.options.scripts||[]),'src/engine.js']);
 if(a.projects['market-native'].architect.build.options.scripts)b.projects['market-native'].architect.build.options.scripts=a.projects['market-native'].architect.build.options.scripts;else delete b.projects['market-native'].architect.build.options.scripts;
 assert.deepEqual(a,b,`CLI configuration changed beyond engine script ${v}`);
 for(const file of ['tsconfig.json','tsconfig.app.json','tsconfig.spec.json'])assert.equal(hash(`${original}/${file}`),hash(`${adapted}/${file}`),file);
 if(v>=17)assert.equal(hash(`${original}/src/app/app.config.ts`),hash(`${adapted}/src/app/app.config.ts`));
 const manifest=JSON.parse(fs.readFileSync(`research/native/v${v}/adaptation.json`));for(const item of manifest.changes)if(item.adaptedSha256)assert.equal(hash(`${adapted}/${item.file}`),item.adaptedSha256,`${v}/${item.file}`);
 console.log(v,'native defaults, source adaptations and configuration PASS');
}
