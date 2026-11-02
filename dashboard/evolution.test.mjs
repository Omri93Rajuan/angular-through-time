import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {serve} from '../scripts/serve.mjs';
import {compare} from '../tools/evolution/query-core.mjs';

const data = JSON.parse(fs.readFileSync('research/evolution/v1/framework.json'));
const datasetRoute = '**/research/evolution/v1/framework.json';
let browser, server, url;
before(async () => {
  ({server, url} = await serve('.'));
  browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox']});
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
async function pageFor(t, options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => { await context.close(); assert.deepEqual(errors, [], 'No uncaught browser exceptions'); });
  return page;
}
async function open(page) {
  await page.goto(`${url}/dashboard/evolution.html`);
  await page.locator('#explorer').waitFor({state: 'visible'});
}
async function select(page, from, to) {
  await page.locator('#from').selectOption(from);
  await page.locator('#to').selectOption(to);
}

test('default selectors and swap use the shared bidirectional query contract', async t => {
  const page = await pageFor(t);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await open(page);
  assert.equal(await page.locator('#from').inputValue(), '14');
  assert.equal(await page.locator('#to').inputValue(), '22');
  const expected = compare(data, '14', '22');
  assert.equal(await page.locator('#change-count').textContent(), String(expected.eventsBetween.length));
  assert.equal(await page.locator('.feature-card').count(), data.features.length);
  await page.getByRole('button', {name: 'Swap comparison versions'}).click();
  assert.equal(await page.locator('#from').inputValue(), '22');
  assert.equal(await page.locator('#to').inputValue(), '14');
  assert.equal(await page.locator('#change-count').textContent(), String(expected.eventsBetween.length));
  await page.getByRole('tab', {name: 'Migration insights'}).click();
  assert.match(await page.locator('#migration-warning').textContent(), /not instructions to downgrade/);
  assert.equal(await page.locator('#migration-list .event').count(), expected.upgradeConcerns.length);
  assert.ok(!requests.some(request => /benchmark\/results|evidence\.json/.test(request)), 'Framework UI does not fetch performance evidence');
});

test('feature search, category, changed-only filter and empty state compose and reset', async t => {
  const page = await pageFor(t);
  await open(page);
  await page.locator('#search').fill('bootstrapApplication');
  assert.equal(await page.locator('.feature-card').count(), 1);
  assert.equal(await page.locator('.feature-card').getAttribute('data-feature-id'), 'standalone');
  await page.locator('#category').selectOption('forms');
  assert.equal(await page.locator('.feature-card').count(), 0);
  assert.match(await page.locator('#feature-list').textContent(), /No catalogued features match/);
  await page.locator('#feature-filters').getByRole('button', {name: 'Clear filters'}).click();
  await page.waitForFunction(count => document.querySelectorAll('.feature-card').length === count, data.features.length);
  await select(page, '20', '21');
  await page.locator('#feature-scope').selectOption('changed');
  const expected = [...new Set(compare(data, '20', '21').eventsBetween.map(e => e.featureId))].sort();
  assert.deepEqual((await page.locator('.feature-card').evaluateAll(cards => cards.map(card => card.dataset.featureId))).sort(), expected);
  await page.locator('#search').fill('<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('.feature-card').count(), 0);
  assert.equal(await page.locator('#feature-list img').count(), 0);
});

test('minor boundaries, equal boundaries and timeline filters never imply complete coverage', async t => {
  const page = await pageFor(t);
  await open(page);
  await select(page, '19.0.0', '20.0.0');
  await page.getByRole('tab', {name: 'Evolution timeline'}).click();
  assert.equal(await page.locator('#timeline-list [data-version="20.2.0"]').count(), 0);
  await page.locator('#to').selectOption('20');
  assert.equal(await page.locator('#timeline-list [data-version="20.2.0"][data-feature-id="zoneless"]').count(), 1);
  await page.locator('#timeline-category').selectOption('change-detection');
  await page.locator('#timeline-version').selectOption('20');
  const expected = compare(data, '19.0.0', '20').eventsBetween.filter(e => e.category === 'change-detection' && e.version.startsWith('20.'));
  assert.equal(await page.locator('#timeline-list .event').count(), expected.length);
  await select(page, '20', '20');
  assert.equal(await page.locator('#change-count').textContent(), '0');
  assert.match(await page.locator('#timeline-list').textContent(), /does not establish that no changes occurred/);
  await page.locator('#timeline-filters').getByRole('button', {name: 'Clear filters'}).click();
  await page.locator('#timeline-scope').selectOption('all');
  assert.equal(await page.locator('#timeline-list .event').count(), 79);
  await page.locator('#timeline-version').selectOption('14');
  assert.equal(await page.locator('#timeline-list .event').count(), data.features.flatMap(f => f.events).filter(e => e.version.startsWith('14.')).length);
  await page.getByRole('tab', {name: 'Migration insights'}).click();
  assert.match(await page.locator('#migration-list').textContent(), /not a guarantee of a safe/);
});

test('null lifecycle state, explicit default labels and source citations remain visible', async t => {
  const page = await pageFor(t);
  await open(page);
  await select(page, '14', '15');
  const signals = page.locator('.feature-card[data-feature-id="signals"]');
  assert.equal(await signals.locator('.state').filter({hasText: 'Not catalogued at this boundary'}).count(), 2);
  await select(page, '14', '19');
  const standalone = page.locator('.feature-card[data-feature-id="standalone"]');
  assert.match(await standalone.locator('.state').last().textContent(), /Default changed/);
  assert.match(await standalone.locator('.impact-grid').textContent(), /editorial/);
  const links = await page.locator('a[data-source-id]').evaluateAll(items => items.map(a => ({id: a.dataset.sourceId, href: a.href, title: a.title})));
  assert.ok(links.length > data.sources.length);
  for (const link of links) {
    const source = data.sources.find(s => s.id === link.id);
    assert.equal(link.href, source.url);
    assert.ok(link.title.includes(source.retrievedAt));
  }
  await standalone.locator('details').first().locator('summary').click();
  assert.equal(await standalone.locator('details').first().locator('.event').count(), 4);
  assert.match(await standalone.locator('details').first().textContent(), /outside the selected comparison/);
});

test('migration compatibility retains all minor ranges and official guidance', async t => {
  const page = await pageFor(t);
  await open(page);
  await page.getByRole('tab', {name: 'Migration insights'}).click();
  const expected = compare(data, '14', '22');
  assert.equal(await page.locator('#compatibility .compatibility-row').count(), expected.versions.reduce((n, v) => n + v.compatibility.length, 0));
  for (const version of expected.versions) {
    for (const row of version.compatibility) {
      assert.ok((await page.locator('#compatibility').textContent()).includes(row.angular));
      assert.ok((await page.locator('#compatibility').textContent()).includes(row.typescript));
    }
  }
  assert.equal(await page.locator('#update-guide').getAttribute('href'), data.sources.find(s => s.id === 'update').url);
  assert.match(await page.locator('#compatibility').textContent(), /as of 2026-11-01/);
});

test('loading, HTTP failure and retry are accessible and do not show stale comparisons', async t => {
  const page = await pageFor(t);
  let release, arrived;
  const pending = new Promise(resolve => { release = resolve; });
  const requested = new Promise(resolve => { arrived = resolve; });
  await page.route(datasetRoute, async route => { arrived(); await pending; await route.fulfill({status: 503, body: 'Unavailable'}); });
  await page.goto(`${url}/dashboard/evolution.html`, {waitUntil: 'domcontentloaded'});
  await requested;
  assert.match(await page.locator('#load-status').textContent(), /Loading documented/);
  assert.equal(await page.locator('#explorer').isVisible(), false);
  release();
  await page.getByRole('alert').waitFor({state: 'visible'});
  assert.equal(await page.locator('#explorer').isVisible(), false);
  await page.unroute(datasetRoute);
  await page.getByRole('button', {name: 'Retry loading dataset'}).click();
  await page.locator('#explorer').waitFor({state: 'visible'});
  assert.equal(await page.getByRole('alert').isVisible(), false);
});

test('incompatible data, missing source records and unsafe links fail closed', async t => {
  for (const change of [
    d => { d.schemaVersion = 99; },
    d => { d.features = []; },
    d => { d.sources = d.sources.filter(s => s.id !== 'blog-15'); },
    d => { d.sources[0].url = 'javascript:alert(1)'; }
  ]) {
    const page = await pageFor(t);
    const invalid = structuredClone(data);
    change(invalid);
    await page.route(datasetRoute, route => route.fulfill({json: invalid}));
    await page.goto(`${url}/dashboard/evolution.html`);
    await page.getByRole('alert').waitFor({state: 'visible'});
    assert.equal(await page.locator('#explorer').isVisible(), false);
  }
});

test('tabs, selectors and disclosure controls work by keyboard on a narrow viewport', async t => {
  const page = await pageFor(t, {viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await open(page);
  await page.locator('#tab-features').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#panel-features').isVisible(), false);
  await page.keyboard.press('End');
  assert.equal(await page.locator('#tab-migration').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#tab-features').getAttribute('aria-selected'), 'true');
  await page.locator('#from').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#from').inputValue(), '15');
  const summary = page.locator('.feature-card details summary').first();
  await summary.focus();
  await page.keyboard.press('Enter');
  assert.equal(await summary.locator('..').getAttribute('open'), '');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
  for (const tab of ['Evolution timeline', 'Migration insights']) {
    await page.getByRole('tab', {name: tab}).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tab} fits mobile`);
  }
});

test('historical and research dashboards retain data and link to the Explorer', async t => {
  const page = await pageFor(t);
  const historical = JSON.parse(fs.readFileSync('benchmark/results/summary.json'));
  await page.goto(`${url}/dashboard/`);
  await page.waitForFunction(() => document.querySelector('#samples').textContent !== '—');
  assert.equal(await page.locator('#samples').textContent(), String(historical.sampleCount));
  assert.ok(await page.locator('#rows tr').count() > 0);
  await page.setViewportSize({width: 390, height: 844});
  const nav = await page.locator('header nav').boundingBox();
  assert.ok(nav.x >= 0 && nav.x + nav.width <= 390, 'Historical navigation remains usable on mobile');
  await page.getByRole('link', {name: 'Evolution Explorer'}).click();
  await page.locator('#explorer').waitFor({state: 'visible'});
  await page.getByRole('link', {name: 'Research v2', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('attempts'));
  const research = JSON.parse(fs.readFileSync('benchmark/results-v2/summary.json'));
  assert.equal(await page.locator('#runs tr').count(), research.rows.length);
  await page.getByRole('link', {name: 'Evolution Explorer'}).click();
  await page.locator('#explorer').waitFor({state: 'visible'});
});

test('only active panels render; hidden panels refresh on demand without losing filters or clean DOM', async t => {
  const page = await pageFor(t);
  await open(page);
  assert.equal(await page.locator('#timeline-list .event').count(), 0, 'Timeline is not built at startup');
  assert.equal(await page.locator('#compatibility .compatibility-card').count(), 0, 'Migration is not built at startup');
  await page.locator('#search').fill('bootstrapApplication');
  await page.locator('#category').selectOption('architecture');
  await page.locator('.feature-card details summary').first().click();
  await page.evaluate(() => { window.savedCard = document.querySelector('.feature-card'); });
  await page.getByRole('tab', {name: 'Evolution timeline'}).click();
  await page.locator('#timeline-version').selectOption('20');
  await page.locator('#timeline-category').selectOption('change-detection');
  await page.getByRole('tab', {name: 'Feature explorer'}).click();
  assert.ok(await page.evaluate(() => window.savedCard === document.querySelector('.feature-card')), 'Clean activation reuses DOM');
  assert.equal(await page.locator('.feature-card details').first().getAttribute('open'), '');
  await page.getByRole('tab', {name: 'Migration insights'}).click();
  const mutations = await page.evaluate(() => {
    const ids = ['panel-features', 'panel-timeline', 'panel-migration'];
    const observers = ids.map(id => {
      const observer = new MutationObserver(() => {});
      observer.observe(document.getElementById(id), {subtree: true, childList: true, characterData: true});
      return observer;
    });
    for (const value of ['17', '19']) {
      const select = document.getElementById('to');
      select.value = value;
      select.dispatchEvent(new Event('change', {bubbles: true}));
    }
    return Object.fromEntries(ids.map((id, i) => {
      const count = observers[i].takeRecords().length;
      observers[i].disconnect();
      return [id, count];
    }));
  });
  assert.equal(mutations['panel-features'], 0);
  assert.equal(mutations['panel-timeline'], 0);
  assert.ok(mutations['panel-migration'] > 0);
  assert.equal(await page.locator('#migration-list .event').count(), compare(data, '14', '19').upgradeConcerns.length);
  await page.getByRole('tab', {name: 'Evolution timeline'}).click();
  assert.equal(await page.locator('#timeline-version').inputValue(), '20');
  assert.equal(await page.locator('#timeline-category').inputValue(), 'change-detection');
  assert.equal(await page.locator('#timeline-list .event').count(), 0, 'Latest bounds apply before revealing old filtered timeline');
  await page.locator('#to').selectOption('20');
  assert.equal(await page.locator('#timeline-list .event').count(), compare(data, '14', '20').eventsBetween.filter(e => e.category === 'change-detection' && e.version.startsWith('20.')).length);
  await page.getByRole('tab', {name: 'Feature explorer'}).click();
  assert.equal(await page.locator('#search').inputValue(), 'bootstrapApplication');
  assert.equal(await page.locator('#category').inputValue(), 'architecture');
  assert.equal(await page.locator('.feature-card').count(), 1);
  assert.match(await page.locator('.feature-card .state-label').last().textContent(), /To · 20/);
});

test('form resets are synchronous, panel-local and safe while a panel is hidden', async t => {
  const page = await pageFor(t);
  await open(page);
  await select(page, '20', '20');
  await page.locator('#search').fill('no-such-api');
  await page.locator('#category').selectOption('forms');
  await page.locator('#feature-scope').selectOption('changed');
  await page.getByRole('tab', {name: 'Evolution timeline'}).click();
  await page.locator('#timeline-scope').selectOption('all');
  await page.locator('#timeline-version').selectOption('14');
  await page.getByRole('tab', {name: 'Feature explorer'}).click();
  const reset = await page.locator('#feature-filters').evaluate(form => {
    form.reset(); // Observe in the same call stack, before any queued timer.
    return {search: document.getElementById('search').value, category: document.getElementById('category').value,
      scope: document.getElementById('feature-scope').value, cards: document.querySelectorAll('.feature-card').length};
  });
  assert.deepEqual(reset, {search: '', category: '', scope: 'all', cards: data.features.length});
  assert.equal(await page.locator('#from').inputValue(), '20');
  assert.equal(await page.locator('#to').inputValue(), '20');
  assert.equal(await page.locator('#timeline-scope').inputValue(), 'all');
  assert.equal(await page.locator('#timeline-version').inputValue(), '14');
  const hiddenReset = await page.locator('#timeline-filters').evaluate(form => {
    const observer = new MutationObserver(() => {});
    observer.observe(document.getElementById('timeline-list'), {subtree: true, childList: true});
    form.reset();
    const mutations = observer.takeRecords().length;
    observer.disconnect();
    return {scope: document.getElementById('timeline-scope').value, version: document.getElementById('timeline-version').value,
      category: document.getElementById('timeline-category').value, mutations};
  });
  assert.deepEqual(hiddenReset, {scope: 'comparison', version: '', category: '', mutations: 0});
  await page.getByRole('tab', {name: 'Evolution timeline'}).click();
  assert.equal(await page.locator('#timeline-list .event').count(), 0);
  assert.match(await page.locator('#timeline-list').textContent(), /does not establish that no changes occurred/);
});

test('deferred rendering failures keep tab state coherent and retry invalidates all cached panels', async t => {
  const page = await pageFor(t);
  const invalid = structuredClone(data);
  invalid.versions[0].compatibility[0].sourceIds = ['missing-source'];
  await page.route(datasetRoute, route => route.fulfill({json: invalid}));
  await open(page);
  await page.getByRole('tab', {name: 'Evolution timeline'}).click();
  await page.getByRole('tab', {name: 'Migration insights'}).click();
  await page.getByRole('alert').waitFor({state: 'visible'});
  assert.equal(await page.locator('#explorer').isVisible(), false);
  assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#tab-migration').getAttribute('aria-selected'), 'false');
  await page.unroute(datasetRoute);
  await page.getByRole('button', {name: 'Retry loading dataset'}).click();
  await page.locator('#explorer').waitFor({state: 'visible'});
  assert.ok(await page.locator('#panel-timeline').isVisible());
  await page.getByRole('tab', {name: 'Migration insights'}).click();
  assert.equal(await page.locator('#compatibility .compatibility-card').count(), 2);
  await page.getByRole('tab', {name: 'Feature explorer'}).click();
  assert.equal(await page.locator('.feature-card').count(), data.features.length);
});

test('exact selector choices match the documented subset of CLI endpoints', async t => {
  const page = await pageFor(t);
  await open(page);
  const expected = [...new Set([...data.versions.map(v => String(v.major)), ...data.versions.map(v => v.release.version),
    ...data.features.flatMap(f => f.events.map(e => e.version))])].sort();
  for (const id of ['from', 'to']) {
    const choices = await page.locator(`#${id} option`).evaluateAll(options => options.map(o => o.value));
    assert.deepEqual(choices.sort(), expected);
    for (const choice of choices) assert.doesNotThrow(() => compare(data, choice, '22'));
    assert.ok(!choices.includes('20.0.1'), 'Uncatalogued patch endpoint is intentionally CLI-only');
  }
  // The CLI re-exports this same engine (identity checked by the data-tool suite).
  const result = compare(data, '20.0.1', '20.2.0');
  assert.equal(result.from, '20.0.1');
  assert.ok(result.eventsBetween.some(e => e.featureId === 'zoneless' && e.version === '20.2.0'));
});
