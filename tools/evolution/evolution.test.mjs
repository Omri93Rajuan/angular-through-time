import test from 'node:test';
import assert from 'node:assert/strict';
import {read, validateFramework, validateEvidence, validateProtectedIdentities} from './validate.mjs';
import {buildInventory} from './inventory.mjs';
import {compare, timeline} from './query.mjs';

const framework = read('research/evolution/v1/framework.json');
const evidence = read('research/evolution/v1/evidence.json');
const expected = buildInventory();
const mutation = (value, edit) => { const copy = structuredClone(value); edit(copy); return copy; };

test('published datasets validate against schemas, raw bytes and protected identities', () => {
  validateFramework(framework);
  validateEvidence(evidence, expected);
  validateProtectedIdentities();
});

test('claims require known, accessible primary source references', () => {
  for (const edit of [
    f => { f.features[0].events[0].sourceIds = []; },
    f => { f.features[0].events[0].sourceIds = ['unknown']; },
    f => { f.features[0].events[0].sourceIds = ['release-22-unavailable']; },
    f => { f.sources[0].url = 'https://angular.dev.evil.example/claims'; },
    f => { delete f.versions[0].compatibility[0].sourceIds; }
  ]) assert.throws(() => validateFramework(mutation(framework, edit)));
});

test('duplicate features, invalid chronology and incompatible version ranges are rejected', () => {
  for (const edit of [
    f => { f.features.push(structuredClone(f.features[0])); },
    f => { f.features[1].title = f.features[0].title; },
    f => { f.features[0].events.reverse(); },
    f => { f.features[0].events[2].status = 'experimental'; },
    f => { f.features[0].events[1].version = '23.0.0'; },
    f => { f.versions[0].compatibility[1].angular = '14.0.x'; },
    f => { f.versions[0].compatibility[0].angular = '15.x'; },
    f => { f.examples[0].afterVersion = '13.0.0'; },
    f => { f.versions[0].featureIds = ['invented']; }
  ]) assert.throws(() => validateFramework(mutation(framework, edit)));
});

test('no performance claims can be smuggled into framework metadata or evidence conclusions', () => {
  assert.throws(() => validateFramework(mutation(framework, f => { f.features[0].performanceConclusion = '20% faster'; })));
  assert.throws(() => validateFramework(mutation(framework, f => { f.features[0].speedup = 1.2; })));
  assert.throws(() => validateEvidence(mutation(evidence, e => { e.conclusions.push('Angular 22 is faster'); }), expected));
  assert.throws(() => validateEvidence(mutation(evidence, e => { e.records[0].confirmatoryEligible = true; }), expected));
});

test('raw hash, numeric pointer, provenance, omission and eligibility changes fail closed', () => {
  for (const edit of [
    e => { e.files[0].sha256 = '0'.repeat(64); },
    e => { e.records[0].measurements[0].value += 1; },
    e => { e.records[0].measurements[0].pointer = '/invented'; },
    e => { e.records[0].sourceCommit = 'a'.repeat(40); },
    e => { e.records[0].missingProvenance = []; },
    e => { e.files.pop(); },
    e => { e.records.push(structuredClone(e.records[0])); },
    e => { e.records[0].timingEligibleAsRecorded = true; }
  ]) assert.throws(() => validateEvidence(mutation(evidence, edit), expected));
});

test('minor releases, lifecycle changes and upgrades remain distinct', () => {
  const result = compare(framework, '16', '20');
  assert.equal(result.introducedBetween.find(e => e.featureId === 'signal-inputs').version, '17.1.0');
  assert.equal(result.eventsBetween.find(e => e.featureId === 'zoneless' && e.change === 'stabilized').version, '20.2.0');
  assert.ok(result.upgradeConcerns.some(e => e.featureId === 'signal-mutate'));
  assert.ok(!compare(framework, '19.0.0', '20.0.0').eventsBetween.some(e => e.version === '20.2.0'));
  assert.deepEqual(compare(framework, '20', '20').eventsBetween, []);
  assert.equal(compare(framework, '20', '21.0.0').direction, 'ascending-comparison');
  assert.ok(compare(framework, '20', '21.0.0').eventsBetween.some(e => e.version === '21.0.0'));
  assert.equal(compare(framework, '21.0.0', '20').direction, 'descending-comparison');
  assert.equal(compare(framework, '22', '14').direction, 'descending-comparison');
  assert.deepEqual(compare(framework, '22', '14').eventsBetween, compare(framework, '14', '22').eventsBetween);
  assert.ok(compare(framework, '14', '15').features.find(f => f.id === 'signals').toLastDocumentedEvent === null);
  assert.equal(timeline(framework).length, framework.features.reduce((n, f) => n + f.events.length, 0));
  for (const input of ['13', '23', '17.x', '20.0.0-next.0', 'garbage']) assert.throws(() => compare(framework, input, '22'));
});
