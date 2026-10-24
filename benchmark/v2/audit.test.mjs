import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {assertSummaryCurrent,buildPairs} from './audit-core.mjs';

const row=(experiment,version,track,rep,p95)=>({experiment,version,track,rep,accepted:true,statistics:{p95}});
test('declared contrast direction is invariant to evidence enumeration order',()=>{
 const rows=[row('e',14,'idiomatic-v2',0,10),row('e',22,'idiomatic-v2',0,8),row('e',22,'idiomatic-v2',1,9),row('e',14,'idiomatic-v2',1,12)];
 const expected=buildPairs(rows);assert.deepEqual(buildPairs([...rows].reverse()),expected);assert.deepEqual(expected[0].variants,['14/idiomatic-v2','22/idiomatic-v2']);assert.equal(expected[0].estimate,-2.5);
});
test('unknown or incomplete treatment combinations fail closed',()=>{assert.throws(()=>buildPairs([row('e',14,'unknown',0,1),row('e',22,'idiomatic-v2',0,1)]),/No declared contrast/);assert.throws(()=>buildPairs([row('e',22,'idiomatic-v2',0,1)]),/exactly two/);});
test('stale summaries fail validation',()=>{assert.doesNotThrow(()=>assertSummaryCurrent({a:1},{a:1}));assert.throws(()=>assertSummaryCurrent({a:1},{a:2}),/stale/);});
test('a failed audit invocation returns a failing process status',()=>{const result=spawnSync(process.execPath,['benchmark/v2/audit.mjs','--unsupported'],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/Unknown audit arguments/);});
