import 'zone.js';
import {Component,Directive,Injectable,Input,NgModule,NgZone,ChangeDetectorRef,ChangeDetectionStrategy,signal,computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BrowserModule,bootstrapApplication} from '@angular/platform-browser';

declare const MarketEngine:any;const E=MarketEngine;
interface Asset { id:number; symbol:string; name:string; sector:string; price:number; base:number; volume:number; }
interface MarketEvent { tick:number; changes:{id:number;delta:number}[]; }
type Mode = 'mutation' | 'records' | 'array';
interface UI { query:string; sector:string; onlyWatch:boolean; selectedId:number|null; sortKey:'symbol'|'price'; ascending:boolean; }
const initialUI = ():UI => ({query:'',sector:'',onlyWatch:false,selectedId:null,sortKey:'symbol',ascending:true});
const diagnostic = false;
const counts:Record<string,number> = {};
function count(key:string):void { if(diagnostic) counts[key]=(counts[key]||0)+1; }
function aggregate(rows:Asset[]):{index:number;advancing:number} {
  count('aggregate'); let sum=0, advancing=0;
  for(const a of rows){sum+=a.price/a.base;if(a.price>a.base)advancing++;}
  return {index:sum/50,advancing};
}
function points(history:number[]):string {
  count('chart'); const lo=Math.min(...history)-.01, hi=Math.max(...history)+.01;
  return history.map((v,i)=>`${i*300/Math.max(1,history.length-1)},${110-(v-lo)/(hi-lo)*100}`).join(' ');
}
@Injectable({providedIn:'root'})
class Store {
  rows:Asset[]=E.initial(); metadata=this.rows.map(({id,symbol,name,sector,base})=>({id,symbol,name,sector,base}));
  entities=this.rows.map(a=>signal<Asset>({...a})); memberships=this.rows.map(()=>signal(false)); selections=this.rows.map(()=>signal(false)); filters=signal(initialUI()); selectedId=signal<number|null>(null); tick=signal(0); history=signal([100]);
 summary=computed(()=>aggregate(this.entities.map(s=>s())));
 visible=computed(()=>{const ui=this.filters();return this.ordered(ui,ui.onlyWatch?this.memberships.flatMap((s,id)=>s()?[id]:[]):[],id=>this.entities[id]());});
 chart=computed(()=>points(this.history())); selected=computed(()=>{count('selected');const id=this.selectedId();return id===null?null:this.entities[id]();});
  workload=100; hz=5; mode:Mode='records'; running=false; timer:ReturnType<typeof setInterval>|undefined;
  sectors=E.sectors; workloads=[0,100,500,2000,5000];
  shellChange:()=>void=()=>{}; restoreFocus:HTMLElement|null=null;
  constructor(private zone:NgZone) {
    
    (window as any).market={version:'19',track:'idiomatic-v2',
      configure:(count:number,hz:number,mode:Mode)=>this.zone.run(()=>{this.workload=count;this.hz=hz;this.mode=mode;this.shellChange();}),
      apply:(event:MarketEvent,mode:Mode)=>this.zone.run(()=>this.deliver(event,mode)),
      reset:()=>this.zone.run(()=>this.reset()), rows:()=>this.rows.map(a=>({...a})),
      state:()=>({checksum:E.checksum(this.rows),tick:this.tickValue,visible:this.visibleValue,watch:this.watchValue, ...this.uiValue,running:this.running,selected:this.uiValue.selectedId}),
      diagnostics:()=>({...counts}),clearDiagnostics:()=>{for(const k of Object.keys(counts))delete counts[k];}
    };
  }
  get uiValue(){return {...this.filters(),selectedId:this.selectedId()};} get tickValue(){return this.tick();} get watchValue(){return this.memberships.flatMap((s,id)=>s()?[id]:[]);} get visibleValue(){return this.visible();} get summaryValue(){return this.summary();} get chartValue(){return this.chart();} get selectedValue(){return this.selected();}
  ordered(ui:UI, watch:number[], prices:(id:number)=>Asset):number[] {
    count('order'); const ids=this.metadata.filter(a=>(!ui.query||(a.symbol+' '+a.name).toLowerCase().includes(ui.query.toLowerCase()))&&(!ui.sector||a.sector===ui.sector)&&(!ui.onlyWatch||watch.includes(a.id))).map(a=>a.id);
    const sign=ui.ascending?1:-1;
    return ids.sort((a,b)=>{const x=ui.sortKey==='price'?prices(a).price:this.metadata[a].symbol,y=ui.sortKey==='price'?prices(b).price:this.metadata[b].symbol;return (x<y?-sign:x>y?sign:0)||a-b;});
  }
  deliver(event:MarketEvent,mode:Mode):void {
    if(event.tick!==this.tickValue)throw Error('Out-of-order event');
    this.rows=E.apply(this.rows,event,mode);
    for(const id of mode==='array'?this.rows.map(a=>a.id):event.changes.map(c=>c.id))this.entities[id].set({...this.rows[id]});this.tick.update(t=>t+1);this.history.update(h=>h.concat(this.summary().index).slice(-60));
    this.shellChange();
  }
  updateUI(patch:Partial<UI>):void { if('selectedId' in patch){const old=this.selectedId();if(old!==null)this.selections[old].set(false);this.selectedId.set(patch.selectedId!);if(patch.selectedId!==null)this.selections[patch.selectedId!].set(true);}else this.filters.update(ui=>({...ui,...patch})); this.shellChange(); }
  search(query:string):void{this.updateUI({query});}
  filter(sector:string):void{this.updateUI({sector});}
  sort(sortKey:'symbol'|'price'):void{const active=document.activeElement;this.restoreFocus=active instanceof HTMLElement&&active.closest('tbody')?active:null;this.updateUI({sortKey,ascending:this.uiValue.sortKey===sortKey?!this.uiValue.ascending:true});}
  select(selectedId:number|null):void{this.updateUI({selectedId});}
  watchFilter():void{this.updateUI({onlyWatch:!this.uiValue.onlyWatch});}
  watch(id:number):void{ this.memberships[id].update(v=>!v); this.shellChange(); }
  step():void{this.deliver(E.event(this.tickValue,this.workload),this.mode);}
  toggle():void{this.running=!this.running;clearInterval(this.timer);if(this.running)this.timer=setInterval(()=>this.step(),1000/this.hz);this.shellChange();}
  rate(hz:number):void{this.hz=hz;if(this.running){this.toggle();this.toggle();}this.shellChange();}
  reset():void { clearInterval(this.timer);this.running=false;this.rows=E.initial(); this.rows.forEach((a,id)=>{this.entities[id].set({...a});this.memberships[id].set(false);this.selections[id].set(false);});this.filters.set(initialUI());this.selectedId.set(null);this.tick.set(0);this.history.set([100]); this.shellChange(); }
}
// No private Angular APIs. Diagnostic replicas count public lifecycle checks only.
@Directive()
class View {
  constructor(public s:Store){}
  get version(){return '19';} get track(){return 'idiomatic-v2';}
  get rows(){return this.s.rows;} get visible(){return this.s.visibleValue;} get sectors(){return this.s.sectors;}
  get workloads(){return this.s.workloads;} get workload(){return this.s.workload;} set workload(v:number){this.s.workload=v;}
  get hz(){return this.s.hz;} get mode(){return this.s.mode;} set mode(v:Mode){this.s.mode=v;}
  get running(){return this.s.running;} get tick(){return this.s.tickValue;}
  get query(){return this.s.filters().query;} get sector(){return this.s.filters().sector;} get onlyWatch(){return this.s.filters().onlyWatch;}
  get selectedId(){return this.s.selectedId();} get selected(){return this.s.selectedValue;}
  get index(){return this.s.summaryValue.index;} get advancing(){return this.s.summaryValue.advancing;} get chart(){return this.s.chartValue;}
  toggle(){this.s.toggle();} rate(v:number){this.s.rate(v);} reset(){this.s.reset();} step(){this.s.step();}
  search(v:string){this.s.search(v);} filter(v:string){this.s.filter(v);} sort(v:'symbol'|'price'){this.s.sort(v);}
  watchFilter(){this.s.watchFilter();} watch(id:number){this.s.watch(id);} select(id:number|null){this.s.select(id);}
  identify(_i:number,id:number){return id;}
  @Input() publication:unknown;
}

@Component({selector:'tr[market-row]',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,host:{'[attr.data-id]':'a.id','[class.selected]':'isSelected'},imports:[CommonModule,],templateUrl:'./AssetRow.html'})
class AssetRow extends View {@Input() id!:number;get a(){return this.s.entities[this.id]();}get isWatched(){return this.s.memberships[this.id]();}get isSelected(){return this.s.selections[this.id]();}}

@Component({selector:'market-toolbar',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[CommonModule,],templateUrl:'./Toolbar.html'})
class Toolbar extends View {}

@Component({selector:'market-table',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[CommonModule,AssetRow],templateUrl:'./Table.html'})
class Table extends View {ngAfterViewChecked(){const el=this.s.restoreFocus;if(el?.isConnected){el.focus({preventScroll:true});this.s.restoreFocus=null;}}}

@Component({selector:'market-summary',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[CommonModule,],templateUrl:'./Summary.html'})
class Summary extends View {@Input() logicalTick=0; @Input() settings="";}

@Component({selector:'market-chart',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[CommonModule,],templateUrl:'./Chart.html'})
class Chart extends View {}

@Component({selector:'market-details',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[CommonModule,],templateUrl:'./Details.html'})
class Details extends View {}

@Component({selector:'market-app',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[CommonModule,Toolbar,Table,Summary,Chart,Details],templateUrl:'./Shell.html'})
class Shell extends View {constructor(s:Store,cd:ChangeDetectorRef){super(s);s.shellChange=()=>cd.markForCheck();}}
bootstrapApplication(Shell,{providers:[]});
