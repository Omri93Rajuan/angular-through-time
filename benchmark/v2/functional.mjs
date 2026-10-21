import assert from 'node:assert/strict';
import {Oracle,decimal} from './oracle.mjs';
import E from '../../packages/market-fixtures/engine.js';
import {frames,reset,parity} from '../harness/functional.mjs';
export async function checkDOM(page,oracle,ui={}) {
 const actual=await page.evaluate(()=>({
  rows:[...document.querySelectorAll('tbody tr')].map(r=>({id:+r.dataset.id,cells:[...r.querySelectorAll('td')].map(c=>c.textContent.trim()),watch:r.querySelector('.star').getAttribute('aria-pressed')})),
  stats:[...document.querySelectorAll('.stats strong')].map(e=>e.textContent.trim()),
  chart:document.querySelector('polyline').getAttribute('points'),detail:document.querySelector('.detail-price')?.textContent.trim(),tick:document.querySelector('#tick').textContent
 }));
 const expected=oracle.visible(ui);assert.deepEqual(actual.rows.map(r=>r.id),expected.map(r=>r.id));
 for(let i=0;i<expected.length;i++){
  const a=expected[i],r=actual.rows[i];
  assert.equal(r.cells[3],decimal(a.price/100),`price ${a.id}`);
  assert.equal(r.cells[4],decimal((a.price-a.base)/a.base*100)+'%',`percentage ${a.id}`);
  assert.equal(r.cells[5],decimal(a.volume,0),`volume ${a.id}`);
  assert.equal(r.watch,String((ui.watch||[]).includes(a.id)),`watch ${a.id}`);
 }
 assert.deepEqual(actual.stats,[decimal(oracle.index),decimal(oracle.advancing,0),'5,000',String(oracle.tick)]);
 const points=actual.chart.split(' ').map(p=>p.split(',').map(Number));assert.equal(points.length,oracle.chart.length);
 points.forEach((p,i)=>p.forEach((n,j)=>assert.ok(Math.abs(n-oracle.chart[i][j])<1e-8,'chart coordinate')));
 if(ui.selectedId!=null)assert.equal(actual.detail,decimal(oracle.rows[ui.selectedId].price/100));else assert.equal(actual.detail,undefined);
}
export async function functional(page){
 await parity(page);
 for(const mode of ['mutation','records','array']){
  await reset(page);const o=new Oracle();
  await page.locator('[data-id="0"] .asset').click();await frames(page);
  const ui={selectedId:0};
  // Selected and unrelated updates, floor, zero delta, zero work and all-record publication.
  const changes=[[{id:0,delta:20}],[{id:42,delta:-20}],[{id:0,delta:-1000000}],[{id:0,delta:0}],[]];
  for(const list of changes){const event={tick:o.tick,changes:list};o.apply(event);await page.evaluate(({event,mode})=>new Promise(resolve=>setTimeout(()=>{window.market.apply(event,mode);resolve();},0)),{event,mode});await frames(page);await checkDOM(page,o,ui);}
  const event=E.event(o.tick,5000);o.apply(event);await page.evaluate(({event,mode})=>window.market.apply(event,mode),{event,mode});await frames(page);await checkDOM(page,o,ui);
  await page.evaluate(()=>{window.savedRow=document.querySelector('[data-id="42"]');window.savedAsset=window.savedRow.querySelector('.asset');window.savedAsset.focus();});
  // Sort through the contract to keep focus on the row; inspect actual DOM identity.
  await page.locator('#sort-price').evaluate(e=>e.click());await frames(page);ui.sortKey='price';await checkDOM(page,o,ui);
  assert.ok(await page.evaluate(()=>window.savedRow===document.querySelector('[data-id="42"]')&&document.activeElement===window.savedAsset),'row/focus retained on reorder');
  await page.locator('#sort-price').click();await frames(page);ui.ascending=false;await checkDOM(page,o,ui);
  const sortedEvent=E.event(o.tick,100);o.apply(sortedEvent);await page.evaluate(({event,mode})=>window.market.apply(event,mode),{event:sortedEvent,mode});await frames(page);await checkDOM(page,o,ui);
  await page.locator('#search').fill('NO-MATCH');await frames(page);ui.query='NO-MATCH';await checkDOM(page,o,ui);assert.equal(await page.locator('.empty').count(),1);
  await page.locator('#search').fill('M0042');await frames(page);ui.query='M0042';await checkDOM(page,o,ui);
  await page.getByRole('button',{name:'Watch M0042',exact:true}).click();await frames(page);ui.watch=[42];
  await page.locator('#watch-filter').click();await frames(page);ui.onlyWatch=true;await checkDOM(page,o,ui);
  await page.getByRole('button',{name:'Watch M0042',exact:true}).click();await frames(page);ui.watch=[];await checkDOM(page,o,ui);
 }
 await reset(page);await checkDOM(page,new Oracle());
 return {passed:true,oracle:'fixture-independent-v2',coverage:['legacy workflows','all row numeric cells','summary','chart','selected live updates','three modes','zero work','floor','price reorder after update','empty roundtrip','watch filter','external async','stable row identity/focus']};
}
