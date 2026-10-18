import {test} from 'node:test';import assert from 'node:assert/strict';import {quantile,describe,cls} from './statistics.mjs';
test('quartiles interpolate and retain outliers',()=>{assert.deepEqual(describe([1,2,3,100]),{n:4,median:2.5,q1:1.75,q3:27.25,iqr:25.5,min:1,max:100});assert.equal(quantile([],0.5),null);});
test('CLS excludes input shifts and separates distant windows',()=>{assert.equal(cls([{start:0,value:.1},{start:500,value:.2},{start:2000,value:.25},{start:2200,value:.9,hadRecentInput:true}]),.1+.2);});
