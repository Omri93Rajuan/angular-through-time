import 'zone.js';
import {Component, NgModule, NgZone, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
declare const MarketEngine: any; const E = MarketEngine;
@Component({selector:'market-app', changeDetection:ChangeDetectionStrategy.Default, standalone:false,  templateUrl:'./baseline.html'})
class MarketApp {

  version = '17'; track = 'baseline';
  rows: any[] = E.initial(); visible: any[] = []; sectors = E.sectors;
  workloads = [0,100,500,2000,5000]; workload = 100; hz = 5; mode = 'records';
  query = ''; sector = ''; onlyWatch = false; watched = new Set<number>();
  selectedId: number | null = null; tick = 0; running = false; timer: any;
  sortKey = 'symbol'; ascending = true; index = 100; advancing = 0; history: number[] = [100]; chart = '';
  get selected(): any { return this.selectedId === null ? null : this.rows[this.selectedId]; }
  constructor(private zone: NgZone, private cd: ChangeDetectorRef) {
    this.refresh();
    (window as any).market = {
      version: this.version, track: this.track,
      configure: (count: number, hz: number, mode: string) => this.zone.run(() => { this.workload=count; this.hz=hz; this.mode=mode; this.notify(); }),
      reset: () => this.zone.run(() => this.reset()),
      apply: (event: any, mode: string) => this.zone.run(() => this.deliver(event, mode)),
      state: () => ({checksum:E.checksum(this.rows),tick:this.tick,visible:this.visible.map(a=>a.id),watch:Array.from(this.watched).sort((a,b)=>a-b),selected:this.selectedId,query:this.query,sector:this.sector,running:this.running}),
      rows: () => this.rows.map(a => ({...a}))
    };
  }
  identify(i: number, a: any): number { return a.id; }
  refresh(): void {
    let list = this.rows.filter(a => (!this.query || (a.symbol + ' ' + a.name).toLowerCase().includes(this.query.toLowerCase())) && (!this.sector || a.sector === this.sector) && (!this.onlyWatch || this.watched.has(a.id)));
    const key = this.sortKey, sign = this.ascending ? 1 : -1;
    list.sort((a,b) => a[key] < b[key] ? -sign : a[key] > b[key] ? sign : a.id-b.id);
    this.visible = list;
    this.index = this.rows.reduce((n,a)=>n+a.price/a.base,0)/50;
    this.advancing = this.rows.filter(a=>a.price>a.base).length;
    const lo = Math.min(...this.history)-0.01, hi = Math.max(...this.history)+0.01;
    this.chart = this.history.map((v,i)=>(i*300/Math.max(1,this.history.length-1))+','+(110-(v-lo)/(hi-lo)*100)).join(' ');
    this.notify();
  }
  notify(): void { this.cd.markForCheck(); }
  deliver(event: any, mode: string): void {
    if(event.tick !== this.tick) throw Error('Out-of-order event');
    this.rows = E.apply(this.rows,event,mode); this.tick++;
    this.index = this.rows.reduce((n,a)=>n+a.price/a.base,0)/50;
    this.history = this.history.concat(this.index).slice(-60); this.refresh();
  }
  step(): void { this.deliver(E.event(this.tick,this.workload),this.mode); }
  toggle(): void { this.running = !this.running; clearInterval(this.timer); if(this.running) this.timer=setInterval(()=>this.step(),1000/this.hz); this.notify(); }
  rate(hz: number): void { this.hz=hz; if(this.running){this.toggle();this.toggle();} }
  reset(): void { clearInterval(this.timer);this.running=false;this.rows=E.initial();this.tick=0;this.query='';this.sector='';this.onlyWatch=false;this.watched.clear();this.selectedId=null;this.sortKey='symbol';this.ascending=true;this.history=[100];this.refresh(); }
  search(q: string): void { this.query=q;this.refresh(); }
  filter(s: string): void {this.sector=s;this.refresh();}
  sort(k: string): void {this.ascending=this.sortKey===k ? !this.ascending : true;this.sortKey=k;this.refresh();}
  watch(id: number): void {if(this.watched.has(id))this.watched.delete(id);else this.watched.add(id);this.refresh();}
  watchFilter(): void {this.onlyWatch=!this.onlyWatch;this.refresh();}
  select(id: number | null): void {this.selectedId=id;this.notify();}

}
@NgModule({declarations:[MarketApp], imports:[BrowserModule],  bootstrap:[MarketApp]}) class AppModule {}
platformBrowserDynamic().bootstrapModule(AppModule);
