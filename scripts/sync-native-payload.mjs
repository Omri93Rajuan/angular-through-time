import fs from 'node:fs';
// Explicit source adaptation only; never rewrites scaffold evidence, CLI configs or locks.
for(let v=14;v<=22;v++){
 const source=`v${v}/src/research/portable-default`,target=`native/v${v}/src/research`;
 fs.cpSync(source,target,{recursive:true});let text=fs.readFileSync(`${target}/main.ts`,'utf8').replace("import 'zone.js';",'');
 if(v>=17)text="import {appConfig} from '../app/app.config';\n"+text.replace(/bootstrapApplication\(Shell,\{providers:.*?\}\);/,"bootstrapApplication(Shell,appConfig);");
 fs.writeFileSync(`${target}/main.ts`,text);
}
