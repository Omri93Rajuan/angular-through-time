import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {EVIDENCE_CATALOG,assertCatalogAppendOnly,verifyEvidenceCatalog,verifyHistoricalEvidence} from '../benchmark/v2/evidence.mjs';

const current=JSON.parse(fs.readFileSync(EVIDENCE_CATALOG));
const historical=verifyHistoricalEvidence();
verifyEvidenceCatalog(current);

const base=process.env.PR_BASE_SHA?.trim();
if(base){
  const resolves=spawnSync('git',['rev-parse','--verify',`${base}^{commit}`],{stdio:'ignore'}).status===0;
  assert.ok(resolves,`PR_BASE_SHA does not resolve to a commit: ${base}`);
  const exists=spawnSync('git',['cat-file','-e',`${base}:${EVIDENCE_CATALOG}`],{stdio:'ignore'}).status===0;
  if(exists){const previous=JSON.parse(execFileSync('git',['show',`${base}:${EVIDENCE_CATALOG}`]));assertCatalogAppendOnly(current,previous);}
}

console.log(`${historical.files} historical Git blobs and tree ${historical.tree} verified; ${current.entries.length} pilot evidence batches verified (${current.entries.filter(e=>e.acquisitionSealed).length} acquisition-time sealed).`);
