import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
import semver from 'semver';
import {root, buildInventory, sha} from './inventory.mjs';

export const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative)));
const ajv = new Ajv({allErrors: true, strict: true});
const schemas = Object.fromEntries(['framework', 'evidence'].map(name => [name,
  ajv.compile(read(`research/evolution/schemas/${name}.schema.json`))]));
const fail = message => { throw new Error(message); };
function unique(items, label) {
  if (new Set(items).size !== items.length) fail(`Duplicate ${label}`);
}
function schema(name, data) {
  if (!schemas[name](data)) fail(`${name} schema: ${ajv.errorsText(schemas[name].errors)}`);
}
function date(value) {
  const parsed = new Date(value);
  assert.ok(Number.isFinite(+parsed) && parsed.toISOString().startsWith(value), `Invalid date ${value}`);
}

export function validateFramework(data) {
  schema('framework', data);
  date(data.asOf);
  for (const key of ['sources', 'features', 'examples', 'uncertainties']) unique(data[key].map(x => x.id), `${key} ID`);
  unique(data.features.map(f => f.title.toLowerCase().replace(/[^a-z0-9]/g, '')), 'feature title');
  const sources = new Map(data.sources.map(s => [s.id, s]));
  function refs(ids, allowUnavailable = false) {
    for (const id of ids) {
      assert.ok(sources.has(id), `Unknown source ${id}`);
      assert.ok(allowUnavailable || sources.get(id).availability === 'verified', `Unavailable claim source ${id}`);
    }
  }
  for (const source of data.sources) {
    const url = new URL(source.url);
    assert.ok(url.protocol === 'https:' && !url.username && !url.password && !url.port, `Invalid URL ${source.url}`);
    assert.ok(['angular.dev', 'blog.angular.dev', 'angular.io'].includes(url.hostname) ||
      (url.hostname === 'github.com' && /^\/angular\/(angular|angular-cli)\//.test(url.pathname)), `Non-primary source ${source.url}`);
    date(source.retrievedAt);
    assert.ok(source.retrievedAt <= data.asOf, `Future retrieval ${source.id}`);
  }
  for (const feature of data.features) {
    refs(feature.developerImpact.sourceIds);
    let previous;
    for (const event of feature.events) {
      assert.ok(semver.valid(event.version), `Invalid version ${event.version}`);
      refs(event.sourceIds);
      if (previous) {
        assert.ok(semver.gt(event.version, previous.version), `Unordered/duplicate event ${feature.id}`);
        assert.notEqual(previous.status, 'removed', `Event after removal ${feature.id}`);
        assert.notEqual(event.change, 'introduced', `Repeated introduction ${feature.id}`);
        if (['stable', 'deprecated'].includes(previous.status)) {
          assert.ok(!['experimental', 'developer-preview'].includes(event.status), `Regressed status ${feature.id}`);
        }
      }
      if (event.change === 'stabilized') assert.equal(event.status, 'stable', `Stabilized status ${feature.id}`);
      if (event.change === 'removed') assert.equal(event.status, 'removed', `Removed status ${feature.id}`);
      if (event.change === 'deprecated') assert.equal(event.status, 'deprecated', `Deprecated status ${feature.id}`);
      if (event.breaking) assert.ok(event.migration, `Missing migration ${feature.id}`);
      previous = event;
    }
  }
  assert.deepEqual(data.versions.map(v => v.major), [14,15,16,17,18,19,20,21,22], 'Version coverage/order');
  for (const version of data.versions) {
    assert.equal(version.release.version, `${version.major}.0.0`, 'Major release identity');
    date(version.release.date);
    assert.ok(version.release.date <= data.asOf, 'Future release presented as available');
    refs(version.release.sourceIds);
    refs(version.support.sourceIds);
    assert.equal(version.support.asOf, data.asOf, 'Support snapshot date');
    for (const d of [version.support.activeEnds, version.support.ltsEnds]) if (d) date(d);
    const ranges = [];
    for (const row of version.compatibility) {
      refs(row.sourceIds);
      for (const key of ['angular', 'node', 'typescript', 'rxjs']) assert.ok(semver.validRange(row[key]), `Invalid ${key} range`);
      assert.ok(semver.subset(row.angular, `${version.major}.x`), 'Compatibility major mismatch');
      for (const range of ranges) assert.ok(!semver.intersects(range, row.angular), 'Overlapping compatibility rows');
      ranges.push(row.angular);
    }
    assert.deepEqual(version.featureIds, data.features.filter(f => f.events.some(e => semver.major(e.version) === version.major)).map(f => f.id), 'Feature index mismatch');
  }
  for (const example of data.examples) {
    refs(example.sourceIds);
    assert.ok(data.features.some(f => f.id === example.featureId), 'Unknown example feature');
    assert.ok(semver.valid(example.beforeVersion) && semver.valid(example.afterVersion) &&
      semver.lte(example.beforeVersion, example.afterVersion), 'Reversed/invalid example versions');
  }
  for (const u of data.uncertainties) refs(u.sourceIds, true);
}

export function validateEvidence(data, expected = buildInventory()) {
  schema('evidence', data);
  for (const [key, field] of [['datasets','id'], ['files','path'], ['records','id']]) unique(data[key].map(x => x[field]), `${key} identity`);
  // Re-derive citations, hashes, raw JSON pointers, values, missing provenance and
  // classifications together. A plausible-looking hand-edited record must fail.
  assert.deepEqual(data, expected, 'Evidence inventory differs from tracked raw evidence or audited classification');
}

export function validateProtectedIdentities() {
  const bytes = fs.readFileSync(path.join(root, 'research/v2/confirmatory-protocol.json'));
  assert.equal(sha(bytes), '37776eededf3eeeea36bed63c73e06edfe44212762a5c60117133a6f5cd0cf72', 'Frozen protocol bytes changed');
  assert.equal(sha(JSON.stringify(JSON.parse(bytes))), '60ae7ed6133b61848783fedaed96c316ea635625f295f83466dea8d3a493d702', 'Approval-binding identity changed');
  assert.equal(sha(fs.readFileSync(path.join(root, 'package-lock.json'))), '736fc17d3fae06a20108c8a2cfedc0939a0375a0545eba32ab865a8eaec6c7b1', 'Root research lock changed');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const framework = read('research/evolution/v1/framework.json');
  const evidence = read('research/evolution/v1/evidence.json');
  validateFramework(framework);
  validateEvidence(evidence);
  validateProtectedIdentities();
  console.log(`Valid: ${framework.versions.length} majors, ${framework.features.length} features, ${evidence.files.length} evidence files. Frozen protocol/root lock unchanged. No confirmatory conclusions.`);
}
