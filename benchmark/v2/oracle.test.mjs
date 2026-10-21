import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Oracle} from './oracle.mjs';
import E from '../../packages/market-fixtures/engine.js';
test('independent oracle matches canonical engine across all publication modes', () => {
  for (const mode of ['mutation','records','array']) {
    const oracle = new Oracle(); let rows = E.initial();
    for (let tick=0; tick<65; tick++) { const event=E.event(tick, tick%2 ? 500 : 0); oracle.apply(event); rows=E.apply(rows,event,mode); }
    assert.deepEqual(oracle.rows,rows); assert.equal(oracle.history.length,60);
  }
});
test('oracle handles floor, zero work, ties and independent derived values', () => {
  const o=new Oracle(), before=o.rows[0].price, volume=o.rows[0].volume;
  o.apply({tick:0,changes:[{id:0,delta:-1000000}]});
  assert.equal(o.rows[0].price,1); assert.equal(o.rows[0].volume,volume+1000000);
  assert.equal(o.advancing,0); assert.ok(Math.abs(o.index-(4999+1/before)/50)<1e-12);
  o.apply({tick:1,changes:[]}); assert.equal(o.tick,2); assert.equal(o.history.length,3);
  assert.equal(o.visible({query:'m0042'})[0].id,42);
  assert.equal(o.visible({onlyWatch:true,watch:[42]}).length,1);
  assert.throws(()=>o.apply({tick:0,changes:[]}));
});
test('display precision follows DecimalPipe rounded-zero convention',async()=>{const {decimal}=await import('./oracle.mjs');assert.equal(decimal(-.0001),'0.00');assert.equal(decimal(-.01),'-0.01');assert.equal(decimal(12345.25),'12,345.25');assert.equal(decimal(12345,0),'12,345');});
