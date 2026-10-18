import {test} from 'node:test';
import assert from 'node:assert/strict';
import {balancedOrder} from './order.mjs';
test('each variant occupies every position once per complete cycle', () => {
  const base = ['a','b','c','d'].map(version => ({version}));
  const jobs = balancedOrder(base, 8);
  assert.equal(jobs.length, 32);
  for (let cycle = 0; cycle < 2; cycle++) for (let position = 0; position < 4; position++) {
    const values = Array.from({length:4}, (_, rep) => jobs[(cycle * 4 + rep) * 4 + position].version);
    assert.deepEqual([...values].sort(), ['a','b','c','d']);
  }
  assert.deepEqual(jobs, balancedOrder(base, 8));
});
