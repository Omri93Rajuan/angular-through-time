import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root, sha} from './inventory.mjs';
import {read} from './validate.mjs';

const framework = read('research/evolution/v1/framework.json');
const evidence = read('research/evolution/v1/evidence.json');
const categories = ['architecture', 'change-detection', 'compiler', 'build', 'api', 'forms', 'ssr', 'testing', 'breaking', 'deprecation'];
const coverage = {
  schemaVersion: 1, datasetVersion: framework.datasetVersion, asOf: framework.asOf,
  claimType: 'derived-coverage-not-performance',
  inputs: Object.fromEntries(['framework', 'evidence'].map(n => [`${n}.json`, sha(fs.readFileSync(path.join(root, `research/evolution/v1/${n}.json`)))])),
  versions: framework.versions.map(v => {
    const features = framework.features.filter(f => v.featureIds.includes(f.id));
    const events = features.flatMap(f => f.events).filter(e => Number(e.version.split('.')[0]) === v.major);
    const present = [...new Set(features.map(f => f.category))].sort();
    return {major: v.major, features: features.length, events: events.length, breakingEvents: events.filter(e => e.breaking).length,
      deprecations: events.filter(e => e.change === 'deprecated').length, compatibilityRows: v.compatibility.length,
      categories: present, categoriesWithoutDedicatedEntry: categories.filter(c => !present.includes(c)), exhaustive: false};
  }),
  evidence: {
    files: evidence.files.length, groups: evidence.datasets.length, numericRecords: evidence.records.length,
    recordsMissingSourceCommit: evidence.records.filter(r => r.sourceCommit === null).length,
    recordsMissingEnvironmentMetadata: evidence.records.filter(r => r.missingProvenance.includes('environmentMetadata')).length,
    byClassification: [...new Set(evidence.datasets.map(d => d.classification))].sort().map(classification => {
      const ids = new Set(evidence.datasets.filter(d => d.classification === classification).map(d => d.id));
      return {classification, files: evidence.files.filter(f => ids.has(f.datasetId)).length, groups: ids.size,
        numericRecords: evidence.records.filter(r => ids.has(r.datasetId)).length};
    }),
    confirmatoryAttempts: 0,
    samplingWarning: 'File, group, numeric-record and event counts are not independent sample sizes. Derived copies and incidental verification timings must not be pooled.'
  },
  gaps: [...framework.uncertainties.map(u => ({area: 'framework', id: u.id, description: u.description, sourceIds: u.sourceIds})),
    ...evidence.missing.map((description, i) => ({area: 'evidence', id: `missing-${i + 1}`, description, sourceIds: []}))]
};
const target = path.join(root, 'research/evolution/v1/coverage.json');
if (process.argv[2] === '--write') fs.writeFileSync(target, JSON.stringify(coverage, null, 2) + '\n');
else if (process.argv[2] === '--check') assert.deepEqual(JSON.parse(fs.readFileSync(target)), coverage, 'Stale coverage report');
else throw new Error('Use --write for derived coverage only, or --check (read-only)');
console.log(`Coverage ${process.argv[2]}: ${coverage.versions.length} majors; ${coverage.evidence.numericRecords} numeric records; no confirmatory observations.`);
