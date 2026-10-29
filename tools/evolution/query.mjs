import path from 'node:path';
import {fileURLToPath} from 'node:url';
import semver from 'semver';
import {read, validateFramework} from './validate.mjs';

function endpoint(input) {
  const text = String(input);
  if (/^(1[4-9]|2[0-2])$/.test(text)) return {input: text, upper: `${Number(text) + 1}.0.0`, inclusive: false};
  if (semver.valid(text) && !semver.prerelease(text) && semver.major(text) >= 14 && semver.major(text) <= 22) {
    return {input: text, upper: text, inclusive: true};
  }
  throw new Error('Use a major 14–22 or exact stable semver within those majors');
}
const includes = (end, version) => end.inclusive ? semver.lte(version, end.upper) : semver.lt(version, end.upper);
export function timeline(data) {
  return data.features.flatMap(f => f.events.map(e => ({featureId: f.id, title: f.title, category: f.category, ...e})))
    .sort((a, b) => semver.compare(a.version, b.version) || a.featureId.localeCompare(b.featureId, 'en'));
}
export function compare(data, from, to) {
  const a = endpoint(from), b = endpoint(to);
  const reverse = semver.gt(a.upper, b.upper) || (a.upper === b.upper && a.inclusive && !b.inclusive);
  const [lower, upper] = reverse ? [b, a] : [a, b];
  const events = timeline(data).filter(e => !includes(lower, e.version) && includes(upper, e.version));
  const state = (f, bound) => f.events.filter(e => includes(bound, e.version)).at(-1) ?? null;
  return {
    from: a.input, to: b.input, direction: reverse ? 'descending-comparison' : 'ascending-comparison',
    boundary: 'Major inputs include all catalogued minor events in that major. Exact versions are inclusive. Null means not catalogued at this boundary, not proof of absence. Latest event is not a complete API availability guarantee.',
    versions: data.versions.filter(v => [semver.major(a.upper) - (a.inclusive ? 0 : 1), semver.major(b.upper) - (b.inclusive ? 0 : 1)].includes(v.major)),
    features: data.features.map(f => ({id: f.id, title: f.title, fromLastDocumentedEvent: state(f, a), toLastDocumentedEvent: state(f, b), developerImpact: f.developerImpact})),
    eventsBetween: events,
    introducedBetween: events.filter(e => e.change === 'introduced'),
    upgradeConcerns: events.filter(e => e.breaking || ['deprecated', 'removed'].includes(e.change)),
    migrationWarning: 'Curated changes only. Use the official update guide and every intervening release/CLI changelog; this is not an exhaustive migration plan or a downgrade procedure.'
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, from, to] = process.argv.slice(2);
  const data = read('research/evolution/v1/framework.json');
  validateFramework(data);
  let result;
  if (command === 'timeline' && !from) result = timeline(data);
  else if (['compare', 'between', 'upgrade'].includes(command) && from && to && process.argv.length === 5) {
    const comparison = compare(data, from, to);
    if (command === 'upgrade' && comparison.direction === 'descending-comparison') throw new Error('Upgrade requires ascending versions');
    result = command === 'compare' ? comparison : command === 'between' ? comparison.eventsBetween : comparison.upgradeConcerns;
  } else throw new Error('Usage: node tools/evolution/query.mjs timeline | compare FROM TO | between FROM TO | upgrade FROM TO');
  console.log(JSON.stringify({datasetVersion: data.datasetVersion, asOf: data.asOf, claimType: data.claimType, sources: data.sources, result}, null, 2));
}
