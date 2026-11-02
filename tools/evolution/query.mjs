import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compare, timeline} from './query-core.mjs';
export {compare, timeline} from './query-core.mjs';
import {read, validateFramework} from './validate.mjs';

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
  console.log(JSON.stringify({datasetVersion: data.datasetVersion, asOf: data.asOf, claimType: data.claimType,
    scope: data.scope, uncertainties: data.uncertainties,
    interpretation: 'Curated documented changes, not exhaustive API availability or a complete migration plan. Major endpoints include catalogued minor events; exact endpoints are inclusive. Empty results do not establish an upgrade is safe. No measured performance conclusion.',
    sources: data.sources, result}, null, 2));
}
