import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),matrix=JSON.parse(fs.readFileSync('docs/versions.json'));
const versions=(process.env.VERSIONS||'14,15,16,17,18,19,20,21,22').split(',').map(Number);
for(const v of matrix.filter(v=>versions.includes(v.major))){
 const target=`native/v${v.major}`;if(fs.existsSync(target))throw Error(`Refusing to overwrite ${target}`);
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'market-native-'));
 fs.cpSync(`v${v.major}/node_modules/@angular/cli`,`${scratch}/cli`,{recursive:true});
 fs.symlinkSync(path.resolve(`v${v.major}/node_modules`),`${scratch}/node_modules`,'dir');
 const node=path.resolve(`.runtimes/${v.node}/node_modules/.bin/node`),cli=`${scratch}/cli/bin/ng.js`;
 const args=[cli,'new','market-native','--directory','app','--skip-install','--skip-git','--routing=false','--style=css','--interactive=false',...(v.major>=17?['--ssr=false']:[])];
 const result=spawnSync(node,args,{cwd:scratch,encoding:'utf8',env:{...process.env,NG_CLI_ANALYTICS:'false',NG_DISABLE_VERSION_CHECK:'1',PATH:path.dirname(node)+path.delimiter+process.env.PATH}});
 const evidence=`research/native/v${v.major}`;fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(`${evidence}/generation.txt`,(result.stdout||'')+(result.stderr||''));
 fs.writeFileSync(`${evidence}/recipe.json`,JSON.stringify({schemaVersion:2,version:v,command:args,scopeChoices:{routing:false,style:'css',ssr:false,interactive:false},cliPackageSha256:createHash('sha256').update(fs.readFileSync(`v${v.major}/node_modules/@angular/cli/package.json`)).digest('hex'),exitCode:result.status},null,2));
 if(result.status!==0)throw Error(`Scaffold failed ${v.major}`);
 fs.cpSync(`${scratch}/app`,`${evidence}/scaffold`,{recursive:true});fs.cpSync(`${scratch}/app`,target,{recursive:true});
 // Keep every generated builder/configuration/cache/budget/target; change payload paths only.
 const config=JSON.parse(fs.readFileSync(`${target}/angular.json`));const project=config.projects['market-native'];const build=(project.architect||project.targets).build;
 const main=build.options.browser||build.options.main;
 const sourceDir=`${target}/src/research`;fs.cpSync(`v${v.major}/src/research/portable-default`,sourceDir,{recursive:true});
 let source=fs.readFileSync(`${sourceDir}/main.ts`,'utf8').replace("import 'zone.js';",'');
 if(v.major>=17){
  source=source.replace(/bootstrapApplication\(Shell,\{providers:.*?\}\);/,"bootstrapApplication(Shell,appConfig);");
  source="import {appConfig} from '../app/app.config';\n"+source;
 }
 fs.writeFileSync(`${sourceDir}/main.ts`,source);
 fs.writeFileSync(`${target}/${main}`,"import './research/main';\n");
 fs.copyFileSync('templates/styles.css',`${target}/src/styles.css`);
 const html=fs.readFileSync(`${target}/src/index.html`,'utf8').replace('<app-root></app-root>','<market-app></market-app>');fs.writeFileSync(`${target}/src/index.html`,html);
 fs.copyFileSync('packages/market-fixtures/engine.js',`${target}/src/engine.js`);build.options.scripts=[...(build.options.scripts||[]),'src/engine.js'];
 fs.writeFileSync(`${target}/angular.json`,JSON.stringify(config,null,2)+'\n');
 const pkg=JSON.parse(fs.readFileSync(`${target}/package.json`));
 for(const section of ['dependencies','devDependencies'])for(const key of Object.keys(pkg[section]||{})){
  if(key.startsWith('@angular/')&&key!=='@angular/build'&&key!=='@angular/cli')pkg[section][key]=v.angular;
  if(['@angular/build','@angular/cli','@angular-devkit/build-angular'].includes(key))pkg[section][key]=v.cli;
  if(key==='typescript')pkg[section][key]=v.typescript;
  if(key==='zone.js')pkg[section][key]=v.zone;
  if(key==='rxjs')pkg[section][key]='7.8.2';if(key==='tslib')pkg[section][key]='2.8.1';
 }
 pkg.engines={node:v.node};if(v.major===14)pkg.overrides={browserslist:'4.26.3','node-releases':'2.0.27'};
 fs.writeFileSync(`${target}/package.json`,JSON.stringify(pkg,null,2)+'\n');fs.writeFileSync(`${target}/.nvmrc`,v.node+'\n');
 fs.rmSync(scratch,{recursive:true,force:true});console.log(v.major,build.builder);
}
