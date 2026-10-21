interface Asset { id:number; symbol:string; name:string; sector:string; price:number; base:number; volume:number; }
interface MarketEvent { tick:number; changes:{id:number;delta:number}[]; }
type Mode = 'mutation' | 'records' | 'array';
interface UI { query:string; sector:string; onlyWatch:boolean; selectedId:number|null; sortKey:'symbol'|'price'; ascending:boolean; }
const initialUI = ():UI => ({query:'',sector:'',onlyWatch:false,selectedId:null,sortKey:'symbol',ascending:true});
const diagnostic = __DIAGNOSTIC__;
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
  __STATE__
  workload=100; hz=5; mode:Mode='records'; running=false; timer:ReturnType<typeof setInterval>|undefined;
  sectors=E.sectors; workloads=[0,100,500,2000,5000];
  shellChange:()=>void=()=>{}; restoreFocus:HTMLElement|null=null;
  constructor(private zone:NgZone) {
    __INIT__
    (window as any).market={version:'__VERSION__',track:'__TRACK__',
      configure:(count:number,hz:number,mode:Mode)=>this.zone.run(()=>{this.workload=count;this.hz=hz;this.mode=mode;this.shellChange();}),
      apply:(event:MarketEvent,mode:Mode)=>this.zone.run(()=>this.deliver(event,mode)),
      reset:()=>this.zone.run(()=>this.reset()), rows:()=>this.rows.map(a=>({...a})),
      state:()=>({checksum:E.checksum(this.rows),tick:this.tickValue,visible:this.visibleValue,watch:this.watchValue, ...this.uiValue,running:this.running,selected:this.uiValue.selectedId}),
      diagnostics:()=>({...counts}),clearDiagnostics:()=>{for(const k of Object.keys(counts))delete counts[k];}
    };
  }
  __GETTERS__
  ordered(ui:UI, watch:number[], prices:(id:number)=>Asset):number[] {
    count('order'); const ids=this.metadata.filter(a=>(!ui.query||(a.symbol+' '+a.name).toLowerCase().includes(ui.query.toLowerCase()))&&(!ui.sector||a.sector===ui.sector)&&(!ui.onlyWatch||watch.includes(a.id))).map(a=>a.id);
    const sign=ui.ascending?1:-1;
    return ids.sort((a,b)=>{const x=ui.sortKey==='price'?prices(a).price:this.metadata[a].symbol,y=ui.sortKey==='price'?prices(b).price:this.metadata[b].symbol;return (x<y?-sign:x>y?sign:0)||a-b;});
  }
  deliver(event:MarketEvent,mode:Mode):void {
    if(event.tick!==this.tickValue)throw Error('Out-of-order event');
    this.rows=E.apply(this.rows,event,mode);
    __PUBLISH__
    this.shellChange();
  }
  updateUI(patch:Partial<UI>):void { __UI__ this.shellChange(); }
  search(query:string):void{this.updateUI({query});}
  filter(sector:string):void{this.updateUI({sector});}
  sort(sortKey:'symbol'|'price'):void{const active=document.activeElement;this.restoreFocus=active instanceof HTMLElement&&active.closest('tbody')?active:null;this.updateUI({sortKey,ascending:this.uiValue.sortKey===sortKey?!this.uiValue.ascending:true});}
  select(selectedId:number|null):void{this.updateUI({selectedId});}
  watchFilter():void{this.updateUI({onlyWatch:!this.uiValue.onlyWatch});}
  watch(id:number):void{ __WATCH__ this.shellChange(); }
  step():void{this.deliver(E.event(this.tickValue,this.workload),this.mode);}
  toggle():void{this.running=!this.running;clearInterval(this.timer);if(this.running)this.timer=setInterval(()=>this.step(),1000/this.hz);this.shellChange();}
  rate(hz:number):void{this.hz=hz;if(this.running){this.toggle();this.toggle();}this.shellChange();}
  reset():void { clearInterval(this.timer);this.running=false;this.rows=E.initial(); __RESET__ this.shellChange(); }
}
// No private Angular APIs. Diagnostic replicas count public lifecycle checks only.
@Directive()
class View {
  constructor(public s:Store){}
  get version(){return '__VERSION__';} get track(){return '__TRACK__';}
  get rows(){return this.s.rows;} get visible(){return this.s.visibleValue;} get sectors(){return this.s.sectors;}
  get workloads(){return this.s.workloads;} get workload(){return this.s.workload;} set workload(v:number){this.s.workload=v;}
  get hz(){return this.s.hz;} get mode(){return this.s.mode;} set mode(v:Mode){this.s.mode=v;}
  get running(){return this.s.running;} get tick(){return this.s.tickValue;}
  get query(){return this.s.uiValue.query;} get sector(){return this.s.uiValue.sector;} get onlyWatch(){return this.s.uiValue.onlyWatch;}
  get selectedId(){return this.s.uiValue.selectedId;} get selected(){return this.s.selectedValue;}
  get index(){return this.s.summaryValue.index;} get advancing(){return this.s.summaryValue.advancing;} get chart(){return this.s.chartValue;}
  toggle(){this.s.toggle();} rate(v:number){this.s.rate(v);} reset(){this.s.reset();} step(){this.s.step();}
  search(v:string){this.s.search(v);} filter(v:string){this.s.filter(v);} sort(v:'symbol'|'price'){this.s.sort(v);}
  watchFilter(){this.s.watchFilter();} watch(id:number){this.s.watch(id);} select(id:number|null){this.s.select(id);}
  identify(_i:number,id:number){return id;}
  @Input() publication:unknown;
}
