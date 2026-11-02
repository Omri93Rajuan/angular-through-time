import {compare, timeline} from '../tools/evolution/query-core.mjs';

const $ = id => document.getElementById(id);
const datasetUrl = '../research/evolution/v1/framework.json';
const categories = {
  architecture: 'Architecture', forms: 'Forms', migration: 'Migration', api: 'APIs',
  build: 'Build tooling', 'change-detection': 'Change detection', ssr: 'Server rendering',
  compiler: 'Compiler', breaking: 'Breaking changes', testing: 'Testing',
  accessibility: 'Accessibility', deprecation: 'Deprecations'
};
const labels = {
  experimental: 'Experimental', 'developer-preview': 'Developer preview', stable: 'Stable',
  deprecated: 'Deprecated', removed: 'Removed', introduced: 'Introduced', stabilized: 'Stabilized',
  'default-changed': 'Default changed', expanded: 'Expanded', promoted: 'Promoted to preview',
  'behavior-changed': 'Behavior changed'
};
let data, comparison, sourceMap;
let activePanel = 'features';
const panelRenderers = {features: renderFeatures, timeline: renderTimeline, migration: renderMigration};
const dirtyPanels = new Set(Object.keys(panelRenderers));

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function badge(value) {
  const element = node('span', labels[value] || value, 'badge');
  element.dataset.tone = value;
  return element;
}
function sources(ids) {
  const container = node('div', undefined, 'sources');
  for (const id of ids) {
    const source = sourceMap.get(id);
    if (!source) throw Error(`Missing source reference: ${id}`);
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(['angular.dev', 'blog.angular.dev', 'angular.io'].includes(url.hostname) ||
        (url.hostname === 'github.com' && /^\/angular\/(angular|angular-cli)\//.test(url.pathname)))) {
      throw Error('Unrecognized official source URL');
    }
    const link = node('a', `${id} ↗${source.availability === 'unavailable' ? ' (unavailable at review)' : ''}`);
    link.href = source.url;
    link.title = `${source.locator} · Retrieved ${source.retrievedAt}`;
    link.dataset.sourceId = id;
    container.append(link);
  }
  return container;
}
function options(select, values) {
  select.replaceChildren(...values.map(([value, label]) => {
    const option = node('option', label);
    option.value = value;
    return option;
  }));
}
function versionOptions(select) {
  options(select, data.versions.map(v => [String(v.major), `Angular ${v.major} · all catalogued minors`]));
  for (const version of data.versions) {
    const group = node('optgroup');
    group.label = `Angular ${version.major} · exact boundaries`;
    const events = data.features.flatMap(f => f.events).filter(e => Number(e.version.split('.')[0]) === version.major);
    const releases = [...new Set([version.release.version, ...events.map(e => e.version)])];
    releases.sort((a, b) => {
      const left = a.split('.').map(Number), right = b.split('.').map(Number);
      return left[1] - right[1] || left[2] - right[2];
    });
    for (const release of releases) {
      const option = node('option', `${release} · exact`);
      option.value = release;
      group.append(option);
    }
    select.append(group);
  }
}
function eventBody(event, title) {
  const item = node('li', undefined, 'event');
  item.dataset.version = event.version;
  if (event.featureId) item.dataset.featureId = event.featureId;
  item.append(node('span', `Angular ${event.version}`, 'event-version'));
  if (title) item.append(node('h3', title));
  item.append(badge(event.change), badge(event.status));
  if (event.breaking) item.append(badge('Breaking change'));
  item.append(node('p', event.statement));
  if (event.migration) item.append(node('p', `Migration guidance: ${event.migration}`));
  item.append(sources(event.sourceIds));
  return item;
}
function boundaryState(event, title) {
  const state = node('div', undefined, 'state');
  state.append(node('p', title, 'state-label'));
  if (!event) {
    state.append(node('p', 'Not catalogued at this boundary. This does not establish absence.'));
  } else {
    state.append(badge(event.status), badge(event.change));
    state.append(node('p', `Last documented event: ${event.version} — ${event.statement}`));
    state.append(sources(event.sourceIds));
  }
  return state;
}
function featureCard(feature, state) {
  const card = node('article', undefined, 'feature-card');
  card.dataset.featureId = feature.id;
  card.append(node('h4', feature.title), node('p', feature.apis.join(' · '), 'api-list'));
  const states = node('div', undefined, 'states');
  states.append(boundaryState(state.fromLastDocumentedEvent, `From · ${comparison.from}`),
    boundaryState(state.toLastDocumentedEvent, `To · ${comparison.to}`));
  card.append(states);
  const impacts = node('div', undefined, 'impact-grid');
  for (const [title, text] of [['Developer impact · editorial', feature.developerImpact.benefit], ['Trade-off · editorial', feature.developerImpact.tradeoff]]) {
    const column = node('div');
    column.append(node('strong', title), node('p', text));
    impacts.append(column);
  }
  card.append(impacts, sources(feature.developerImpact.sourceIds));
  const history = node('details');
  history.append(node('summary', `Full documented lifecycle · ${feature.events.length} events`),
    node('p', 'Full catalog history, including events outside the selected comparison.', 'muted'));
  const events = node('ol', undefined, 'event-list');
  events.append(...feature.events.map(e => eventBody(e)));
  history.append(events);
  card.append(history);
  for (const example of data.examples.filter(e => e.featureId === feature.id)) {
    const details = node('details');
    details.append(node('summary', `Illustrative migration example · ${example.beforeVersion} → ${example.afterVersion}`), node('p', example.note));
    const columns = node('div', undefined, 'code-grid');
    for (const [label, code] of [[`Before · ${example.beforeVersion}`, example.before], [`After · ${example.afterVersion}`, example.after]]) {
      const column = node('div'), pre = node('pre');
      pre.append(node('code', code));
      column.append(node('strong', label), pre);
      columns.append(column);
    }
    details.append(columns, sources(example.sourceIds));
    card.append(details);
  }
  return card;
}
function renderFeatures() {
  const text = $('search').value.trim().toLocaleLowerCase('en');
  const changed = new Set(comparison.eventsBetween.map(e => e.featureId));
  const selected = data.features.filter(f => (!$('category').value || f.category === $('category').value) &&
    ($('feature-scope').value !== 'changed' || changed.has(f.id)) &&
    [f.title, ...f.apis, f.developerImpact.benefit, f.developerImpact.tradeoff, ...f.events.map(e => e.statement)].join(' ').toLocaleLowerCase('en').includes(text));
  const states = new Map(comparison.features.map(f => [f.id, f]));
  $('feature-results').textContent = `${selected.length} of ${data.features.length} catalogued features · grouped by category`;
  $('feature-list').replaceChildren();
  for (const category of Object.keys(categories)) {
    const features = selected.filter(f => f.category === category);
    if (!features.length) continue;
    const section = node('section');
    section.append(node('h3', `${categories[category]} / ${features.length}`, 'category-heading'));
    section.append(...features.map(f => featureCard(f, states.get(f.id))));
    $('feature-list').append(section);
  }
  if (!selected.length) $('feature-list').append(node('p', 'No catalogued features match these filters. Clear filters to explore again.', 'empty'));
}
function renderTimeline() {
  const full = $('timeline-scope').value === 'all';
  const events = (full ? timeline(data) : comparison.eventsBetween).filter(e => (!$('timeline-version').value || e.version.split('.')[0] === $('timeline-version').value) &&
    (!$('timeline-category').value || e.category === $('timeline-category').value));
  $('timeline-results').textContent = `${events.length} documented transitions · ${full ? 'full catalog (independent of comparison selectors)' : 'comparison interval'}`;
  const list = node('ol', undefined, 'event-list');
  list.append(...events.map(e => eventBody(e, `${e.title} · ${categories[e.category]}`)));
  $('timeline-list').replaceChildren(events.length ? list : node('p', 'No catalogued transitions in this interval match the filters. This does not establish that no changes occurred.', 'empty'));
}
function compatibilityCard(endpoint, side) {
  const version = comparison.versions.find(v => v.major === Number(endpoint.split('.')[0]));
  const card = node('article', undefined, 'compatibility-card');
  card.append(node('h4', `${side} · Angular ${endpoint}`),
    node('p', `Support: ${version.support.status} as of ${version.support.asOf}`), sources(version.support.sourceIds),
    node('p', `Major release: ${version.release.date}`), sources(version.release.sourceIds));
  for (const row of version.compatibility) {
    const item = node('div', undefined, 'compatibility-row');
    item.append(node('strong', `Angular ${row.angular}`));
    const fields = node('dl');
    for (const [label, key] of [['Node.js', 'node'], ['TypeScript', 'typescript'], ['RxJS', 'rxjs']]) fields.append(node('dt', label), node('dd', row[key]));
    item.append(fields, sources(row.sourceIds));
    card.append(item);
  }
  return card;
}
function renderMigration() {
  const reverse = comparison.direction === 'descending-comparison';
  $('migration-warning').textContent = `${reverse ? 'Reverse comparison: the following concerns describe the ascending release path, not instructions to downgrade. ' : ''}${comparison.migrationWarning}`;
  $('compatibility').replaceChildren(compatibilityCard(comparison.from, 'From'), compatibilityCard(comparison.to, 'To'));
  $('migration-results').textContent = `${comparison.upgradeConcerns.length} catalogued concerns in this interval`;
  const list = node('ol', undefined, 'event-list');
  list.append(...comparison.upgradeConcerns.map(e => eventBody(e, e.title)));
  $('migration-list').replaceChildren(list.children.length ? list : node('p', 'No catalogued upgrade concerns in this interval. This is not a guarantee of a safe or change-free upgrade; consult official guidance.', 'empty'));
}
function render() {
  comparison = compare(data, $('from').value, $('to').value);
  $('direction').textContent = comparison.from === comparison.to ? 'Same boundary' : comparison.direction === 'descending-comparison' ? 'Reverse comparison · not a downgrade plan' : 'Forward comparison';
  $('boundary').textContent = comparison.boundary;
  $('change-count').textContent = comparison.eventsBetween.length;
  $('concern-count').textContent = comparison.upgradeConcerns.length;
  $('feature-count').textContent = data.features.length;
  for (const panel of Object.keys(panelRenderers)) dirtyPanels.add(panel);
  renderActivePanel();
}
function renderActivePanel(panel = activePanel) {
  if (!dirtyPanels.has(panel)) return;
  panelRenderers[panel]();
  dirtyPanels.delete(panel);
}
function invalidatePanel(panel) {
  dirtyPanels.add(panel);
  renderActivePanel();
}
function showError() {
  $('explorer').hidden = true;
  $('explorer').setAttribute('aria-busy', 'false');
  $('load-status').textContent = '';
  $('load-error').textContent = 'The framework dataset could not be loaded or its contract is incompatible. Retry, or inspect the framework JSON and explorer guide. No comparison is being shown.';
  $('load-error').hidden = false;
  $('retry').hidden = false;
}
function guarded(action) {
  try { action(); } catch { showError(); }
}
async function load() {
  $('explorer').hidden = true;
  $('explorer').setAttribute('aria-busy', 'true');
  $('load-error').hidden = true;
  $('retry').hidden = true;
  $('load-status').textContent = 'Loading documented Angular changes…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(datasetUrl, {signal: controller.signal});
    if (!response.ok) throw Error('Dataset request failed');
    data = await response.json();
    if (data.schemaVersion !== 1 || data.claimType !== 'documented-framework-evolution' ||
      !Array.isArray(data.features) || !data.features.length || !Array.isArray(data.versions) || data.versions.length !== 9 ||
      !Array.isArray(data.sources) || !Array.isArray(data.uncertainties) || !Array.isArray(data.examples) ||
      data.features.some(f => !categories[f.category])) throw Error('Unsupported framework contract');
    sourceMap = new Map(data.sources.map(s => [s.id, s]));
    // Full schema and semantic checks run in CI; the browser fails closed on an
    // incompatible envelope, missing references or unsafe source destinations.
    sources(data.sources.map(s => s.id));
    versionOptions($('from'));
    versionOptions($('to'));
    $('from').value = '14';
    $('to').value = '22';
    const categoryOptions = [['', 'All categories'], ...Object.entries(categories)];
    options($('category'), categoryOptions);
    options($('timeline-category'), categoryOptions);
    options($('timeline-version'), [['', 'All event versions'], ...data.versions.map(v => [String(v.major), `Angular ${v.major}`])]);
    $('dataset-meta').textContent = `Dataset ${data.datasetVersion} · reviewed ${data.asOf} · ${data.sources.length} source entries`;
    $('coverage').textContent = data.scope.coverage;
    $('uncertainties').replaceChildren(...data.uncertainties.map(u => {
      const item = node('li', u.description);
      item.append(sources(u.sourceIds));
      return item;
    }));
    $('update-guide').href = sourceMap.get('update').url;
    render();
    $('explorer').hidden = false;
    $('explorer').setAttribute('aria-busy', 'false');
    $('load-status').textContent = `${data.features.length} features loaded. Choose versions or explore the documented timeline.`;
  } catch { showError(); } finally { clearTimeout(timeout); }
}

const tabs = [...document.querySelectorAll('[role=tab]')];
function selectTab(tab) {
  const panel = tab.id.slice('tab-'.length);
  // Refresh before revealing a previously hidden panel. Clean panels keep their
  // DOM (including open disclosures); controls retain their own filter values.
  renderActivePanel(panel);
  activePanel = panel;
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    $(item.getAttribute('aria-controls')).hidden = !active;
  }
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => guarded(() => selectTab(tab)));
  tab.addEventListener('keydown', event => {
    const next = {ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    guarded(() => selectTab(tabs[next]));
    tabs[next].focus();
  });
}
for (const id of ['from', 'to']) $(id).addEventListener('change', () => guarded(render));
$('swap').addEventListener('click', () => guarded(() => {
  const from = $('from').value;
  $('from').value = $('to').value;
  $('to').value = from;
  render();
}));
$('search').addEventListener('input', () => guarded(() => invalidatePanel('features')));
for (const id of ['category', 'feature-scope']) $(id).addEventListener('change', () => guarded(() => invalidatePanel('features')));
for (const id of ['timeline-scope', 'timeline-version', 'timeline-category']) $(id).addEventListener('change', () => guarded(() => invalidatePanel('timeline')));
for (const [id, panel, defaults] of [
  ['feature-filters', 'features', {search: '', category: '', 'feature-scope': 'all'}],
  ['timeline-filters', 'timeline', {'timeline-scope': 'comparison', 'timeline-version': '', 'timeline-category': ''}]
]) {
  $(id).addEventListener('submit', event => event.preventDefault());
  $(id).addEventListener('reset', event => {
    event.preventDefault();
    guarded(() => {
      for (const [control, value] of Object.entries(defaults)) $(control).value = value;
      invalidatePanel(panel);
    });
  });
}
$('retry').addEventListener('click', load);
await load();
