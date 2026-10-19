import fs from 'node:fs';
const matrix=[
 [14,'14.2.12','14.2.13','4.8.4','16.20.2','0.11.8'],
 [15,'15.2.10','15.2.11','4.9.5','18.20.8','0.12.0'],
 [16,'16.2.12','16.2.16','5.1.6','18.20.8','0.13.3'],
 [17,'17.3.12','17.3.17','5.4.5','20.19.5','0.14.10'],
 [18,'18.2.14','18.2.21','5.5.4','22.23.2','0.14.10'],
 [19,'19.2.15','19.2.19','5.8.3','22.23.2','0.15.1'],
 [20,'20.3.0','20.3.0','5.9.3','22.23.2','0.15.1'],
 [21,'21.0.0','21.0.0','5.9.3','22.23.2','0.15.1'],
 [22,'22.0.0','22.0.0','6.0.3','22.23.2','0.16.0']
].map(([major,angular,cli,typescript,node,zone])=>({major,angular,cli,typescript,node,zone}));
const write=(p,s)=>{fs.mkdirSync(p.slice(0,p.lastIndexOf('/')),{recursive:true});fs.writeFileSync(p,typeof s==='string'?s:JSON.stringify(s,null,2)+'\n');};
write('docs/versions.json',matrix);
for(const v of matrix){
 const dir=`v${v.major}`;
 let dependencies={'rxjs':'7.8.2','tslib':'2.8.1','zone.js':v.zone};
 for(const name of ['common','compiler','core','platform-browser','platform-browser-dynamic'])dependencies[`@angular/${name}`]=v.angular;
 write(`${dir}/package.json`,{name:`market-angular-${v.major}`,version:'0.1.0',private:true,...(v.major===14?{overrides:{browserslist:'4.26.3','node-releases':'2.0.27'}}:{}),scripts:{build:'ng build --configuration production'},engines:{node:v.node},dependencies,devDependencies:{'@angular/cli':v.cli,'@angular-devkit/build-angular':v.cli,'@angular/compiler-cli':v.angular,typescript:v.typescript}});
 write(`${dir}/.nvmrc`,v.node+'\n');
 write(`${dir}/tsconfig.json`,{compilerOptions:{types:[],target:'ES2020',module:'ES2020',moduleResolution:'node',lib:['ES2020','DOM'],experimentalDecorators:true,emitDecoratorMetadata:true,skipLibCheck:true,strict:true,useDefineForClassFields:false,...(v.major===22?{ignoreDeprecations:'6.0'}:{})},angularCompilerOptions:{strictTemplates:true},files:['src/baseline.ts','src/idiomatic.ts']});
 write(`${dir}/src/styles.css`,fs.readFileSync('templates/styles.css','utf8'));
 write(`${dir}/src/engine.js`,fs.readFileSync('packages/market-fixtures/engine.js','utf8'));
 write(`${dir}/src/index.html`,'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Market Terminal · Angular Through Time</title><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"></head><body><market-app></market-app></body></html>');
 const projects={};
 for(const track of ['baseline','idiomatic']){
  const standalone=track==='idiomatic' && v.major>=15, signals=track==='idiomatic'&&v.major>=17, zoneless=track==='idiomatic'&&v.major>=21;
  let template=fs.readFileSync('templates/app.html','utf8');
  // Stable built-in flow from v18 onward. The baseline uses legacy directives throughout.
  if(track==='idiomatic'&&v.major>=18){
   template=template.replace('<option *ngFor="let s of sectors" [value]="s">{{s}}</option>','@for (s of sectors; track s) {<option [value]="s">{{s}}</option>}').replace('<option *ngFor="let n of workloads" [value]="n" [selected]="n === workload">{{n}}</option>','@for (n of workloads; track n) {<option [value]="n" [selected]="n === workload">{{n}}</option>}');
   template=template.replace('<tr *ngFor="let a of visible; trackBy: identify"','@for (a of visible; track a.id) {<tr').replace('</tr></tbody>','</tr>}</tbody>');
  }
  if(signals)template='<ng-container>{{revision() ? "" : ""}}</ng-container>'+template;
  write(`${dir}/src/${track}.html`,template);
  write(`${dir}/tsconfig.${track}.json`,{extends:'./tsconfig.json',files:[`src/${track}.ts`]});
  const body=fs.readFileSync('templates/body.ts','utf8').replaceAll('__VERSION__',String(v.major)).replaceAll('__TRACK__',track).replace('__NOTIFY__',signals?'this.revision.update(n => n + 1);':'this.cd.markForCheck();');
  const source=`${zoneless?'':"import 'zone.js';"}\nimport {Component, NgModule, NgZone, ChangeDetectorRef, ChangeDetectionStrategy${signals?', signal':''}${v.major>=21&&!zoneless?', provideZoneChangeDetection':''}} from '@angular/core';\nimport {CommonModule} from '@angular/common';\nimport {BrowserModule${standalone?', bootstrapApplication':''}} from '@angular/platform-browser';\nimport {platformBrowserDynamic} from '@angular/platform-browser-dynamic';\ndeclare const MarketEngine: any; const E = MarketEngine;\n@Component({selector:'market-app', changeDetection:ChangeDetectionStrategy.Default, standalone:${standalone}, ${standalone?'imports:[CommonModule],':''} templateUrl:'./${track}.html'})\nclass MarketApp {\n${signals?'revision = signal(0);':''}\n${body}\n}\n${standalone?`bootstrapApplication(MarketApp);`:`@NgModule({declarations:[MarketApp], imports:[BrowserModule], ${v.major>=21?'providers:[provideZoneChangeDetection()],':''} bootstrap:[MarketApp]}) class AppModule {}\nplatformBrowserDynamic().bootstrapModule(AppModule);`}\n`;
  write(`${dir}/src/${track}.ts`,source);
  projects[track]={projectType:'application',root:'',sourceRoot:'src',architect:{build:{builder:'@angular-devkit/build-angular:browser',options:{outputPath:`dist/${track}`,index:'src/index.html',main:`src/${track}.ts`,tsConfig:`tsconfig.${track}.json`,scripts:['src/engine.js'],styles:['src/styles.css'],assets:[]},configurations:{production:{optimization:true,outputHashing:'all',sourceMap:false,namedChunks:false,extractLicenses:true,aot:true}},defaultConfiguration:'production'}}};
 }
 write(`${dir}/angular.json`,{version:1,cli:{analytics:false,cache:{enabled:false}},projects});
}
console.log('Generated nine version-isolated applications and both tracks.');
