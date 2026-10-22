import fs from 'node:fs';
const matrix=JSON.parse(fs.readFileSync('docs/versions.json'));
const write=(p,v)=>{fs.mkdirSync(p.slice(0,p.lastIndexOf('/')),{recursive:true});fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const original=fs.readFileSync('templates/app.html','utf8');
const between=(start,end)=>original.slice(original.indexOf(start),original.indexOf(end));
const summary=between('<section class="stats"','<div class="workspace">');
const toolbar=between('<div class="toolbar">','<div class="table-scroll">');
const table=between('<div class="table-scroll">','</section><aside>');
const chart=between('<section class="panel">','<section class="panel" id="details">');
const details=between('<section class="panel" id="details">','<section class="panel controls">');
const row=table.slice(table.indexOf('<td>'),table.indexOf('</tr></tbody>'));
const graph=['Shell','Toolbar','Table','AssetRow','Summary','Chart','Details'];
for(const v of matrix){
 write(`v${v.major}/src/research/index.html`,fs.readFileSync(`v${v.major}/src/index.html`,'utf8').replace('</head>','<link rel="icon" href="data:,"></head>')); 
 const variants=['idiomatic-v2','portable-default',...(v.major===22?['m4-zone','idiomatic-v2-diagnostic']:[])];
 for(const track of variants){
 const portable=track==='portable-default', signals=!portable&&v.major>=17, modern=!portable&&v.major>=18, standalone=portable?v.major>=17:v.major>=15, zoneless=(portable?v.major>=21:v.major>=20)&&track!=='m4-zone', diag=track.endsWith('diagnostic');
 let source=fs.readFileSync('templates/research/store.ts','utf8');
 const imperative={
 STATE:`entities:Asset[]=this.rows.map(a=>({...a})); watched=new Set<number>(); ui=initialUI(); tick=0; history=[100]; summary=aggregate(this.rows); chart=points(this.history); visible:number[]=[]; tablePublication={};`,
 INIT:`this.visible=this.ordered(this.ui,[],id=>this.entities[id]);`,
 GETTERS:`get uiValue(){return this.ui;} get tickValue(){return this.tick;} get watchValue(){return [...this.watched].sort((a,b)=>a-b);} get visibleValue(){return this.visible;} get summaryValue(){return this.summary;} get chartValue(){return this.chart;} get selectedValue(){return this.ui.selectedId===null?null:this.entities[this.ui.selectedId];}`,
 PUBLISH:`this.entities=this.entities.slice(); for(const id of mode==='array'?this.rows.map(a=>a.id):event.changes.map(c=>c.id))this.entities[id]={...this.rows[id]}; this.tick++;this.summary=aggregate(this.rows);this.history=this.history.concat(this.summary.index).slice(-60);this.chart=points(this.history);if(this.ui.sortKey==='price')this.visible=this.ordered(this.ui,this.watchValue,id=>this.entities[id]);this.tablePublication={};`,
 UI:`const reorder=Object.keys(patch).some(k=>k!=='selectedId');this.ui={...this.ui,...patch};if(reorder)this.visible=this.ordered(this.ui,this.watchValue,id=>this.entities[id]);this.tablePublication={};`,
 WATCH:`this.watched=new Set(this.watched);if(this.watched.has(id))this.watched.delete(id);else this.watched.add(id);if(this.ui.onlyWatch)this.visible=this.ordered(this.ui,this.watchValue,i=>this.entities[i]);this.tablePublication={};`,
 RESET:`this.entities=this.rows.map(a=>({...a}));this.watched=new Set();this.ui=initialUI();this.tick=0;this.history=[100];this.summary=aggregate(this.rows);this.chart=points(this.history);this.visible=this.ordered(this.ui,[],id=>this.entities[id]);this.tablePublication={};`
 };
 const reactive={
 STATE:`entities=this.rows.map(a=>signal<Asset>({...a})); memberships=this.rows.map(()=>signal(false)); selections=this.rows.map(()=>signal(false)); filters=signal(initialUI()); selectedId=signal<number|null>(null); tick=signal(0); history=signal([100]);
 summary=computed(()=>aggregate(this.entities.map(s=>s())));
 visible=computed(()=>{const ui=this.filters();return this.ordered(ui,ui.onlyWatch?this.memberships.flatMap((s,id)=>s()?[id]:[]):[],id=>this.entities[id]());});
 chart=computed(()=>points(this.history())); selected=computed(()=>{count('selected');const id=this.selectedId();return id===null?null:this.entities[id]();});`,
 INIT:``,
 GETTERS:`get uiValue(){return {...this.filters(),selectedId:this.selectedId()};} get tickValue(){return this.tick();} get watchValue(){return this.memberships.flatMap((s,id)=>s()?[id]:[]);} get visibleValue(){return this.visible();} get summaryValue(){return this.summary();} get chartValue(){return this.chart();} get selectedValue(){return this.selected();}`,
 PUBLISH:`for(const id of mode==='array'?this.rows.map(a=>a.id):event.changes.map(c=>c.id))this.entities[id].set({...this.rows[id]});this.tick.update(t=>t+1);this.history.update(h=>h.concat(this.summary().index).slice(-60));`,
 UI:`if('selectedId' in patch){const old=this.selectedId();if(old!==null)this.selections[old].set(false);this.selectedId.set(patch.selectedId!);if(patch.selectedId!==null)this.selections[patch.selectedId!].set(true);}else this.filters.update(ui=>({...ui,...patch}));`,
 WATCH:`this.memberships[id].update(v=>!v);`,
 RESET:`this.rows.forEach((a,id)=>{this.entities[id].set({...a});this.memberships[id].set(false);this.selections[id].set(false);});this.filters.set(initialUI());this.selectedId.set(null);this.tick.set(0);this.history.set([100]);`
 };
 for(const [key,value] of Object.entries(signals?reactive:imperative))source=source.replace(`__${key}__`,value);
 if(signals) for(const field of ['query','sector','onlyWatch'])source=source.replaceAll(`this.s.uiValue.${field}`,`this.s.filters().${field}`);
 if(signals)source=source.replaceAll('this.s.uiValue.selectedId','this.s.selectedId()');
 source=source.replaceAll('__DIAGNOSTIC__',String(diag)).replaceAll('__VERSION__',String(v.major)).replaceAll('__TRACK__',track);
 const imports=`${zoneless?'':"import 'zone.js';"}\nimport {Component,Directive,Injectable,Input,NgModule,NgZone,ChangeDetectorRef,ChangeDetectionStrategy${signals?',signal,computed':''}${zoneless&&v.major===20?',provideZonelessChangeDetection':''}${!zoneless&&v.major>=21?',provideZoneChangeDetection':''}} from '@angular/core';\nimport {CommonModule} from '@angular/common';\nimport {BrowserModule,bootstrapApplication} from '@angular/platform-browser';\n${standalone?'':"import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';"}\ndeclare const MarketEngine:any;const E=MarketEngine;\n`;
 let rowTemplate=row.replaceAll('watched.has(a.id)','isWatched');
 const rowCode=signals?`@Input() id!:number;get a(){return this.s.entities[this.id]();}get isWatched(){return this.s.memberships[this.id]();}get isSelected(){return this.s.selections[this.id]();}`:`@Input() a!:Asset;@Input() isWatched=false;@Input() isSelected=false;`;
 const rowHost=`host:{'[attr.data-id]':'${signals?'id':'a.id'}','[class.selected]':'isSelected'},`;
 const attrs=signals?'[id]="id"':'[a]="s.entities[id]" [isWatched]="s.watched.has(id)" [isSelected]="selectedId === id"';
 let tableTemplate=table.replace(/<tr \*ngFor[\s\S]*?<\/tr><\/tbody>/,`<tr market-row *ngFor="let id of visible; trackBy: identify" ${attrs}></tr></tbody>`);
 let shell=original.replace(summary,`<market-summary ${signals?'':'[publication]="s.summary" [logicalTick]="tick" [settings]="workload + \'/\' + hz"'}></market-summary>`).replace(toolbar,`<market-toolbar ${signals?'':'[publication]="s.ui"'}></market-toolbar>`).replace(table,`<market-table ${signals?'':'[publication]="s.tablePublication"'}></market-table>`).replace(chart,`<market-chart ${signals?'':'[publication]="s.history"'}></market-chart>`).replace(details,`<market-details ${signals?'':'[publication]="s.selectedValue"'}></market-details>`);
 const modernize=t=>!modern?t:t.replace('<option *ngFor="let s of sectors" [value]="s">{{s}}</option>','@for (s of sectors; track s) {<option [value]="s">{{s}}</option>}').replace('<option *ngFor="let n of workloads" [value]="n" [selected]="n === workload">{{n}}</option>','@for (n of workloads; track n) {<option [value]="n" [selected]="n === workload">{{n}}</option>}').replace(/<tr market-row \*ngFor="let id of visible; trackBy: identify" ([^]*?)><\/tr>/,'@for (id of visible; track id) {<tr market-row $1></tr>}').replace('<p *ngIf="visible.length === 0" class="empty">No assets match these filters.</p>','@if (visible.length === 0) {<p class="empty">No assets match these filters.</p>}').replace('<div *ngIf="selectedId !== null">','@if (selectedId !== null) {<div>').replace('</div><div *ngIf="selectedId === null">','</div>} @if (selectedId === null) {<div>').replace('Select an asset to inspect its live price and sector.</p></div></section>','Select an asset to inspect its live price and sector.</p></div>}</section>');
 // Non-null selection is guaranteed by the enclosing conditional, including legacy templates.
 const detailTemplate=details.replaceAll('selected.','selected!.');
 const definitions=[['AssetRow','tr[market-row]',rowTemplate,rowCode,rowHost,[]],['Toolbar','market-toolbar',toolbar,'','',[]],['Table','market-table',tableTemplate,'ngAfterViewChecked(){const el=this.s.restoreFocus;if(el?.isConnected){el.focus({preventScroll:true});this.s.restoreFocus=null;}}','',['AssetRow']],['Summary','market-summary',summary,'@Input() logicalTick=0; @Input() settings="";','',[]],['Chart','market-chart',chart,'','',[]],['Details','market-details',detailTemplate,'','',[]],['Shell','market-app',shell,`constructor(s:Store,cd:ChangeDetectorRef){super(s);s.shellChange=()=>cd.markForCheck();}`,'',['Toolbar','Table','Summary','Chart','Details']]];
 for(const [name,selector,template,body,host,deps] of definitions){
   write(`v${v.major}/src/research/${track}/${name}.html`,(diag?'{{checked()}}':'')+modernize(template));
   source+=`\n@Component({selector:'${selector}',standalone:${standalone},${portable?'':'changeDetection:ChangeDetectionStrategy.OnPush,'}${host}${standalone?`imports:[CommonModule,${deps.join(',')}],`:''}templateUrl:'./${name}.html'})\nclass ${name} extends View {${body}${diag?`ngDoCheck(){count('hook:${name}');}checked(){count('view:${name}');return '';}`:''}}\n`;
 }
 const providers=zoneless&&v.major===20?'[provideZonelessChangeDetection()]':!zoneless&&v.major>=21?'[provideZoneChangeDetection()]':'[]';
 source+=standalone?`bootstrapApplication(Shell,{providers:${providers}});\n`:`@NgModule({declarations:[${graph.join(',')}],imports:[BrowserModule],bootstrap:[Shell]}) class AppModule {}\nplatformBrowserDynamic().bootstrapModule(AppModule);\n`;
 write(`v${v.major}/src/research/${track}/main.ts`,imports+source);
 write(`v${v.major}/tsconfig.${track}.json`,{extends:'./tsconfig.json',files:[`src/research/${track}/main.ts`]});
 const legacy=JSON.parse(fs.readFileSync(`v${v.major}/angular.json`));
 const project=structuredClone(legacy.projects.baseline);project.architect.build.options={...project.architect.build.options,index:'src/research/index.html',main:`src/research/${track}/main.ts`,tsConfig:`tsconfig.${track}.json`,outputPath:`dist/${track}`};
 const configPath=`v${v.major}/research.angular.json`;
 const config=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath)):{version:1,cli:{analytics:false,cache:{enabled:false}},projects:{}};
 config.projects[track]=project;write(configPath,config);
 write(`research/v2/${v.major}-${track}.json`,{schemaVersion:2,track:portable?'default-cli-v1':track.startsWith('idiomatic')?'idiomatic-v2':'matched-v1',architectureRevision:signals?'market-components-2':'market-components-1',experiment:track==='m4-zone'?'M4':'B-runtime',treatment:track,version:v,componentGraph:graph,state:signals?'per-entity signal + computed':'immutable publications + dependency-aware imperative selectors',publication:'touched snapshots; all snapshots for array mode, including unchanged clones',equality:'Object.is; no custom comparator',selectors:'full aggregate once per tick; static filter/symbol order independent of prices',changeDetection:portable?'framework-default':'OnPush',flow:modern?'@for/@if':'ngFor/ngIf',scheduler:zoneless?'zoneless':'zone',builder:'@angular-devkit/build-angular:browser',recipe:'controlled-webpack-v1',delivery:'serial-lossless',diagnostic:diag,signalInputs:false});
 }
}
console.log('Generated research architectures independently of legacy sources/configuration.');
