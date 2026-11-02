# Evolution Explorer · Phase 1

The [Evolution Explorer](../dashboard/evolution.html) presents the existing
Angular 14–22 framework dataset as a static, responsive dashboard. It shares the
repository's serving setup and visual language, with links to the separate
historical and research-v2 dashboards. No frontend framework, build step, CDN,
new dependency or performance measurement is involved.

## Run locally

From the repository root, with Node **22.23.2**:

```bash
node scripts/serve.mjs .
# Open http://127.0.0.1:4200/dashboard/evolution.html
# Optional alternate port: PORT=4300 node scripts/serve.mjs .
```

Serving needs no dependency installation. Serve the repository root, not only
`dashboard/`: the page imports the shared query module and fetches the versioned
framework JSON using relative URLs. A static host must preserve those paths and
serve `.mjs` as JavaScript. Opening the HTML with `file://` is not supported.

## Interaction and interpretation

- **Comparison:** defaults to 14 → 22; either direction and identical endpoints
  are supported. Swap exchanges endpoints. Major selectors include all
  catalogued minor events in that major. Exact boundaries are offered for major
  releases and catalogued event releases; the CLI continues to accept arbitrary
  syntactically valid exact stable versions within majors 14–22 (for example,
  `20.0.1`). Accepting an endpoint does not verify that a release exists or that
  it is covered by this catalog. Lower boundaries are exclusive for changes;
  upper boundaries follow the existing major/exact query rules.
- **Feature explorer:** search titles, APIs, event statements and editorial
  impacts; filter by category or changes in the comparison. Cards show the last
  documented event at each boundary, source links and editorial trade-offs.
  Expand full lifecycle history or illustrative migration examples. Full history
  and examples can include releases outside the comparison and are labelled so.
- **Timeline:** uses the same chronologically sorted query events. Filter by
  event major and category, within the comparison or across the full catalog.
  Full-catalog mode includes initial v14 events that are excluded by a v14 lower
  comparison boundary. Reverse comparisons do not reverse historical chronology.
- **Migration:** shows prespecified breaking/deprecation/removal concerns and
  source links. Reverse comparisons show the ascending release-path concerns,
  explicitly not downgrade instructions. Compatibility retains all documented
  minor ranges for the selected majors; it does not extrapolate missing ranges.
  Support status is labelled with the dataset review date, not today's date.
- **Accessibility:** native labelled controls, tab/arrow/Home/End navigation,
  visible focus, skip link, semantic disclosures, live loading/result messages,
  error recovery and single-column mobile layouts. No animation or color-only
  lifecycle meaning is required. Automated checks are not a screen-reader audit.

“Not catalogued” is never presented as “absent.” Empty upgrade results are not
proof of a safe upgrade. Status applies to the named event/API, not necessarily
all related APIs in the card. Preview, stable and default changes are separate
labels. Developer impact is editorial; it is not experimental performance data.

The page fetches **only framework evolution metadata**, not the performance
inventory or benchmark summaries. Existing dashboards retain their own evidence
and limitations. This page offers no performance ranking or researcher approval.

## Implementation and validation

`tools/evolution/query-core.mjs` is the shared browser-safe query engine.
`tools/evolution/query.mjs` retains the CLI API/output and validates datasets
before querying. The extracted engine implements only the existing stable-release
endpoint domain; it does not implement package compatibility ranges or replace
the validator's pinned `semver` dependency. Differential tests against that
dependency check ordering, exact/minor boundaries, reverse comparisons and null
states. No comparison algorithm is copied into the UI.

`dashboard/evolution.mjs` handles DOM rendering, filtering and loading. Text is
rendered through DOM text nodes, with official-source URL checks. A 15-second
request timeout and retry state handle unavailable data. Schema-version/claim
checks and rendering failures hide incomplete comparisons; authoritative full
schema, semantic and evidence validation remains in the data tooling/CI.

Only the active panel renders. Version changes invalidate all panels and refresh
the visible one; a hidden panel refreshes before it is revealed. Filter changes
invalidate only their own panel. Reopening a clean panel retains its DOM and open
disclosures. Filters remain in their controls across tab/version changes. Reload
invalidates every panel, and a failed deferred render cannot commit a new tab
selection. Filter resets set explicit defaults and refresh synchronously, without
queued timers or changes to the comparison versions/other panel's filters.

To run validation (Chrome required for browser tests):

```bash
npm ci --engine-strict --ignore-scripts --no-audit --no-fund
npm ci --prefix tools/evolution --engine-strict --ignore-scripts --no-audit --no-fund
npm test
npm test --prefix tools/evolution
npm run validate --prefix tools/evolution
node tools/evolution/coverage.mjs --check
CHROME=/opt/google/chrome/chrome npm run test:explorer
CHROME=/opt/google/chrome/chrome node scripts/verify-research-dashboard.mjs
node scripts/verify-evidence.mjs
node benchmark/v2/audit.mjs --check
```

Set `CHROME` to your installed Chrome binary (CI uses
`/usr/bin/google-chrome`). Browser tests cover selectors, swap, filters, minor
boundaries, full-catalog timeline, missing states, citations, compatibility,
loading/failure/retry, unsafe data, keyboard/mobile behavior and both original
dashboards. Research-v2 CI runs these checks after its existing dashboard smoke
test. Tests do not collect benchmark measurements or alter research evidence.

### Focused PR #14 verification

Two reviewed issues were corrected: unnecessary hidden-panel rendering
([original render calls](https://github.com/Omri93Rajuan/angular-through-time/blob/4b9d15dad937bba3cc03259fee34f8c5ff3c617e/dashboard/evolution.mjs#L197),
Medium / should fix) and timer-dependent form resets
([original reset handler](https://github.com/Omri93Rajuan/angular-through-time/blob/4b9d15dad937bba3cc03259fee34f8c5ff3c617e/dashboard/evolution.mjs#L286),
Low / maintainability). The reset change makes control values and rendered
results consistent within the same call stack; no prior user-visible data error
is claimed. No additional blocking issue was independently confirmed.

A diagnostic on dataset 1.0.1 changed the default comparison's destination from
22 to 21 with Features active. Instrumenting `document.createElement` counted
2,988 calls on the original head above and 2,137 with active-panel rendering.
MutationObserver records in the hidden Timeline/Migration panels fell from 2/4
to 0/0. This is an engineering DOM-work observation, **not elapsed-time evidence,
an Angular performance comparison or a scientific benchmark result**.

Regression tests verify zero hidden-panel mutations, deferred refresh with the
latest comparison, preserved filters/disclosures, synchronous and hidden-panel
resets, deferred-error recovery and the exact selector/CLI domain distinction.
The existing keyboard/mobile, citation, empty-state and dashboard-regression
tests continue to run. Selector choices and CLI behavior are unchanged.

## Limits and preserved boundaries

The curated dataset is not a complete API catalog or migration plan. Its live
sources can drift; some historical support dates and later minor compatibility
rows are uncollected, and v22 release endpoints were unavailable at review.
Those uncertainties and source retrieval dates remain inspectable in the UI.
Examples are illustrative snippets, not a compiled application migration.

All versioned framework/evidence data, schemas, historical/pilot bytes, frozen
protocol identities, collector, analyzer and root dependency lock remain
unchanged. Future data changes must pass the existing review/validation process.
