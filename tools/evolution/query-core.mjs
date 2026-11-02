// Shared browser/CLI query engine. Only stable releases are valid endpoints;
// prereleases and range syntax are deliberately outside this query contract.
function release(input) {
  const text = String(input);
  const match = text.length <= 256 && /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(text);
  if (!match) return null;
  const parts = match.slice(1, 4).map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}
function order(a, b) {
  const left = release(a), right = release(b);
  if (!left || !right) throw new Error('Invalid stable release');
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}
const major = version => release(version)[0];

function endpoint(input) {
  const text = String(input);
  if (/^(1[4-9]|2[0-2])$/.test(text)) return {input: text, upper: `${Number(text) + 1}.0.0`, inclusive: false};
  if (release(text) && major(text) >= 14 && major(text) <= 22) {
    return {input: text, upper: text, inclusive: true};
  }
  throw new Error('Use a major 14–22 or exact stable semver within those majors');
}
const includes = (end, version) => end.inclusive ? order(version, end.upper) <= 0 : order(version, end.upper) < 0;
export function timeline(data) {
  return data.features.flatMap(f => f.events.map(e => ({featureId: f.id, title: f.title, category: f.category, ...e})))
    .sort((a, b) => order(a.version, b.version) || a.featureId.localeCompare(b.featureId, 'en'));
}
export function compare(data, from, to) {
  const a = endpoint(from), b = endpoint(to);
  const reverse = order(a.upper, b.upper) > 0 || (a.upper === b.upper && a.inclusive && !b.inclusive);
  const [lower, upper] = reverse ? [b, a] : [a, b];
  const events = timeline(data).filter(e => !includes(lower, e.version) && includes(upper, e.version));
  const state = (f, bound) => f.events.filter(e => includes(bound, e.version)).at(-1) ?? null;
  return {
    from: a.input, to: b.input, direction: reverse ? 'descending-comparison' : 'ascending-comparison',
    boundary: 'Major inputs include all catalogued minor events in that major. Exact versions are inclusive. Null means not catalogued at this boundary, not proof of absence. Latest event is not a complete API availability guarantee.',
    versions: data.versions.filter(v => [major(a.upper) - (a.inclusive ? 0 : 1), major(b.upper) - (b.inclusive ? 0 : 1)].includes(v.major)),
    features: data.features.map(f => ({id: f.id, title: f.title, fromLastDocumentedEvent: state(f, a), toLastDocumentedEvent: state(f, b), developerImpact: f.developerImpact})),
    eventsBetween: events,
    introducedBetween: events.filter(e => e.change === 'introduced'),
    upgradeConcerns: events.filter(e => e.breaking || ['deprecated', 'removed'].includes(e.change)),
    migrationWarning: 'Curated changes only. Use the official update guide and every intervening release/CLI changelog; this is not an exhaustive migration plan or a downgrade procedure.'
  };
}
