import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).filter(e=>!['node_modules','dist','.angular'].includes(e.name)).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]).sort();
for(let v=14;v<=22;v++){
 const original=`research/native/v${v}/scaffold`,adapted=`native/v${v}`,config=JSON.parse(fs.readFileSync(`${adapted}/angular.json`));
 const before=new Map(walk(original).map(p=>[path.relative(original,p),hash(p)])),after=new Map(walk(adapted).map(p=>[path.relative(adapted,p),hash(p)]));
 const changes=[...new Set([...before.keys(),...after.keys()])].filter(f=>before.get(f)!==after.get(f)).map(file=>({file,scaffoldSha256:before.get(file)||null,adaptedSha256:after.get(file)||null}));
 fs.writeFileSync(`research/native/v${v}/adaptation.json`,JSON.stringify({schemaVersion:2,track:'default-cli-v1',architectureRevision:'portable-components-1',version:v,recipe:'exact-cli-generated-csr-css-no-routing',builder:config.projects['market-native'].architect.build.builder,changes,policy:'Preserve CLI builder/configurations/budgets/cache and bootstrap providers; replace payload, pin direct framework/toolchain dependencies, resolve a dedicated lock; Angular 14 compatibility overrides documented in root version matrix.'},null,2)+'\n');
}
