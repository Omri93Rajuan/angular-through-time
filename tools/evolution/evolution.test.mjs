import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {read, validateFramework, validateEvidence, validateProtectedIdentities} from './validate.mjs';
import {buildInventory, snapshotFiles, root} from './inventory.mjs';
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

test('v1 snapshot membership survives later evidence without absorbing or rewriting it', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'evolution-snapshot-test-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const git = args => execFileSync('git', args, {cwd: directory, encoding: 'utf8'});
  git(['init', '--quiet']);
  const first = 'benchmark/results/fixture.json';
  fs.mkdirSync(path.dirname(path.join(directory, first)), {recursive: true});
  fs.writeFileSync(path.join(directory, first), '{"kind":"synthetic-fixture"}\n');
  git(['add', '.']);
  git(['-c', 'user.name=Test Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Disposable snapshot fixture']);
  const base = git(['rev-parse', 'HEAD']).trim();
  const later = 'benchmark/results-confirmatory/later-fixture.json';
  fs.mkdirSync(path.dirname(path.join(directory, later)), {recursive: true});
  fs.writeFileSync(path.join(directory, later), '{"kind":"synthetic-fixture"}\n');
  git(['add', '.']);
  assert.ok(git(['ls-files']).includes(later));
  assert.deepEqual(snapshotFiles(base, directory), [first]);
});

test('saved manifest and provenance fields survive extraction; workload/cache contexts stay distinct', () => {
  const builds = evidence.records.filter(r => r.kind === 'compilation-verification');
  assert.equal(builds.length, 43);
  for (const record of builds) {
    const raw = read(record.file);
    assert.equal(record.version, raw.manifest.version.major);
    assert.equal(record.track, raw.manifest.track);
    assert.equal(record.context.manifestExperiment, raw.manifest.experiment);
  }
  const lighthouse = evidence.records.filter(r => r.file.startsWith('benchmark/results/lighthouse/'));
  assert.equal(lighthouse.length, 18);
  assert.ok(lighthouse.every(r => r.sourceDirty === false));
  const historicalBuilds = evidence.records.filter(r => r.file.startsWith('benchmark/results/builds/') && read(r.file).provenance?.sourceDirty !== undefined);
  assert.equal(historicalBuilds.length, 16);
  assert.ok(historicalBuilds.every(r => r.sourceDirty === false));
  const pilots = evidence.records.filter(r => r.kind === 'pilot');
  assert.equal(new Set(pilots.map(r => r.experiment)).size, 2, 'B and M4 acquisition batches stay distinct');
  assert.ok(pilots.every(r => r.context.workload.hz === 5 && r.context.workload.ticks === 6 && r.context.workload.count === 100));
  const native = evidence.records.filter(r => r.timingEligibleAsRecorded === true);
  assert.deepEqual([...new Set(native.map(r => r.context.cache))].sort(), ['project-cold', 'project-warm']);
});

test('verification durations and rejected timings cannot masquerade as descriptive performance evidence', () => {
  const excluded = evidence.records.filter(r => r.kind === 'native-install' || r.kind === 'development-diagnostic' || r.timingEligibleAsRecorded === false);
  assert.equal(excluded.length, 60);
  assert.ok(excluded.every(r => r.usage === 'verification-only'));
  const eligible = evidence.records.filter(r => r.timingEligibleAsRecorded === true);
  assert.equal(eligible.length, 18);
  assert.ok(eligible.every(r => r.usage === 'descriptive-only' && !r.confirmatoryEligible));
  assert.ok(evidence.records.filter(r => r.accepted === false).every(r => r.usage === 'verification-only'));
});

test('empty compatibility sets and contradictory support/lifecycle states fail validation', () => {
  for (const edit of [
    f => { f.versions[0].compatibility[0].node = '<0.0.0'; },
    f => { f.versions[0].compatibility[0].typescript = '>=5 <4'; },
    f => { f.versions[8].support.activeEnds = '2025-01'; },
    f => { f.versions[8].support.ltsEnds = '2026-01'; },
    f => { f.versions[8].support.status = 'unsupported'; },
    f => { f.versions[7].support.status = 'active'; },
    f => { f.versions[8].release.date = '2020-01-01'; },
    f => { f.features[0].events[2].change = 'stabilized'; },
    f => { f.features[0].events[0].status = 'deprecated'; },
    f => { f.features.find(x => x.id === 'ngcc').events[0].breaking = false; },
    f => { f.features.find(x => x.id === 'http-modules').events[0].migration = null; }
  ]) assert.throws(() => validateFramework(mutation(framework, edit)));
  // A month is an interval, not an invented first-of-month exact cutoff.
  validateFramework(mutation(framework, f => {
    f.versions[7].support.ltsEnds = '2026-11';
  }));
});

test('all CLI query modes retain uncertainty and interpretation warnings, including empty upgrades', () => {
  for (const args of [['timeline'], ['between', '20', '21'], ['upgrade', '14', '14'], ['compare', '22', '14']]) {
    const result = JSON.parse(execFileSync(process.execPath, ['tools/evolution/query.mjs', ...args], {cwd: root, encoding: 'utf8'}));
    assert.equal(result.claimType, 'documented-framework-evolution');
    assert.deepEqual(result.scope, framework.scope);
    assert.deepEqual(result.uncertainties, framework.uncertainties);
    assert.match(result.interpretation, /Empty results do not establish an upgrade is safe/);
    if (args[0] === 'upgrade') assert.deepEqual(result.result, []);
  }
});
