import assert from 'node:assert/strict';
import {pairedInterval} from './statistics.mjs';

const contrasts = [
  {id:'B-endpoints',variants:['14/idiomatic-v2','22/idiomatic-v2']},
  {id:'M4-zoneless-to-zone',variants:['22/idiomatic-v2','22/m4-zone']}
];

export function orderedContrast(variants) {
  const unique=[...new Set(variants)].sort();
  assert.equal(unique.length,2,`Each audited pilot experiment must contain exactly two variants: ${unique.join(', ')}`);
  const contrast=contrasts.find(candidate=>candidate.variants.every(variant=>unique.includes(variant)));
  assert.ok(contrast,`No declared contrast for variants: ${unique.join(', ')}`);
  return contrast;
}

export function buildPairs(rows) {
  const pairs=[];
  for(const experiment of [...new Set(rows.map(row=>row.experiment))].sort()){
    const group=rows.filter(row=>row.experiment===experiment),contrast=orderedContrast(group.map(row=>`${row.version}/${row.track}`));
    const repetitions=[...new Set(group.map(row=>row.rep))].sort((a,b)=>a-b),complete=[];
    for(const rep of repetitions){
      const block=contrast.variants.map(variant=>group.find(row=>`${row.version}/${row.track}`===variant&&row.rep===rep&&row.accepted));
      if(block.every(Boolean))complete.push(block.map(row=>row.statistics.p95));
    }
    pairs.push({experiment,variants:contrast.variants,outcome:'run p95 presentationMs',...pairedInterval(complete),missingBlocks:repetitions.length-complete.length});
  }
  return pairs;
}

export function assertSummaryCurrent(committed,generated) {
  assert.deepEqual(committed,generated,'Committed research summary is stale; run `node benchmark/v2/audit.mjs --write` and review the evidence-derived diff');
}
