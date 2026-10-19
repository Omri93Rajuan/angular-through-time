# Research protocol — Angular Through Time

Protocol initiated 2026-10-18 and revised during implementation and validation on 2026-10-19; this is not a preregistered protocol. This is an exploratory local benchmark, not a published comparative conclusion.

## Questions and tracks

The controlled baseline compares framework/compiler evolution under one shared application design: NgModule, default change detection, Zone.js, explicit `markForCheck`, legacy structural directives, stable identity tracking by numeric ID, the same pipes and DOM, no virtual scrolling, no OnPush, no memoized selectors. All 5,000 records exist in the DOM. All versions use the webpack browser builder, AOT, production optimization, disabled source maps, hashed outputs and disabled CLI disk cache. Angular 21+ explicitly enables Zone-based change detection. Browser targeting still changes with CLI defaults: this is a documented compiler confound, not a pure Angular runtime isolation experiment.

The idiomatic track compares a conservative set of stable architecture choices: v14 NgModule; v15–16 standalone; v17+ a signal invalidation notification; v18+ stable built-in iteration; v21+ default zoneless scheduling. The state algorithm stays shared and a revision signal announces changes to the template. This is a deliberately minimal signal adapter, not a claim to represent every best practice or a fully signal-derived state model. Built-in control flow was preview in v17, so it is excluded there. This track retains the webpack builder to avoid changing two major variables together; it does not represent default new-project CLI builds. Legacy conditionals remain shared. Architecture comparisons must not be labeled isolated framework speed.

## Dataset and delivery

Seed 14022 produces 5,000 fictional assets, five sectors and integer-cent prices. Event seed 90210 plus logical tick produces unique targeted IDs using a coprime stride. No wall-clock data choices. The browser receives the same ES5-compatible engine source as Node. Raw runtime samples contain replayable event logs. Checksums hash IDs, prices, base prices and volumes; UI state and all visible DOM prices are asserted independently.

Modes are `mutation` (same array and records), `records` (same array, cloned changed records), and `array` (new array and all cloned records, including unchanged ones). Scenario F updates all 5,000 as well as replacing the array. Modes are explicit experimental variables. Workloads are 0/100/500/2000 targeted records; the optional WORKLOAD override selects these independently of scenario defaults, except A remains navigation and F remains 5,000 records; target rates 1/5/10 Hz. Initial milestone defaults to 5 Hz and record replacement. Do not combine different modes/rates in summaries.

## Scenarios

| ID | Work | Interaction |
|---|---|---|
| A | Initial 5,000-row rendering | New page navigation, idle stream |
| B | 100 records/tick | Idle |
| C | 500 records/tick | Repeat M → M0 → M00 → M004 → empty search |
| D | 500 records/tick | Toggle price sort each tick |
| E | 500 records/tick | Alternate first-asset open and close |
| F | 5,000 cloned records | Full-array replacement |
| G | 500 records/tick | Toggle M0000 watch membership |
| H | 2,000 records/tick | Stress without interaction |

Three update ticks with the scenario interaction warm each scenario before resetting data and measuring. The browser runs the identical functional suite once per version/track/repetition before any of its scenario samples. Every sample records that gate and also receives final state/DOM validation. Scenario A uses a new page in the already-warm browser, `no-store` HTTP, and no service workers. It is cold navigation, not a cold OS/browser startup. No development server is used. Scenarios C–G interleave actions with controlled ticks; delivery is serial with backpressure. They do not model independent simultaneous producer traffic. No events are discarded: dropped=0 by policy, while lateness is measured relative to scheduled deadlines. This policy is unsuitable for estimating free-running overload drop rates.

## Timing boundaries

Navigation readiness is captured by an independent MutationObserver at the first 5,000-row DOM followed by two animation frames. Event processing: browser `performance.now()` immediately before contract application through synchronous state/selector work. Presentation opportunity: from that same start through two requestAnimationFrame callbacks and matching tick DOM text. It is not a physical display timestamp. Interaction latency: before Playwright dispatch, through action completion and two frames, measured on the browser clock. This includes automation overhead and is NOT INP. Throughput counts accepted targeted records divided by elapsed browser interval, including interactions. Delivery is late if beginning more than one target interval after its due time. Raw lateness is retained, not clamped away except negative early arrival.

PerformanceObserver records LCP candidates, layout shifts with recent-input flags and long-task entries. Frame timestamps indicate callback intervals, not GPU/display FPS, especially headless. CDP JSHeapUsedSize samples before and after ticks provide experimental heap measurements; sampled peak can miss transient allocation peaks and is not total browser RSS. Lighthouse runs separately, desktop defaults, no throttling; its LCP/CLS/TBT are diagnostic lab measurements, not interchangeable with scenario runtime metrics.

## Environments and repetition

Exact dependency versions and lockfiles per version. Local runtime prefixes isolate exact Node/npm binaries and PATH; no global Node override, no shared application node_modules. This is process/dependency isolation, not OS isolation. OS, hardware, binary hash, browser version, viewport, Node, CLI, TypeScript, source hashes and Git commit/dirty state are recorded. A missing commit is explicitly null; such samples are smoke evidence, not archival publication-grade experiments. Chrome binary must remain unchanged during an experiment. Legacy Angular on current Chrome is a tested configuration, not a renewed upstream support guarantee.

Default three repetitions, rotating variant order deterministically within a cycle, reversing direction on alternate complete cycles. Each complete cycle has as many repetitions as variants and puts each variant in every position exactly once. Fewer repetitions form an incomplete Latin square. Scenario order remains fixed and may have carryover effects. Each scenario gets a fresh context. Keep machine otherwise idle, on AC power, with fixed governor and thermal state for publication. Here those controls are not enforced.

Repeated cold builds use the same cyclic position-balancing policy and retain the execution plan. Cold builds are separate processes: remove dist and CLI cache before each timed compilation; exclude dependency installation. OS page cache is not cleared. Individual JS files are counted once, excluding maps, licenses, CSS and HTML. gzip and Brotli are computed independently per file; totals represent all emitted JS, not just route startup traffic. No compressed and raw byte totals are mixed.

## Reporting and acceptance

Keep every raw sample and failure. Accept only after functional assertions, final checksum, DOM values and page error checks pass. Fail closed on errors; do not silently exclude slow runs. Report median, quartiles, IQR, minimum, maximum and sample count within version/track/scenario/hz/mode/tick-count/experiment. Three repetitions are exploratory. No significance, causality or speedup claim without adequate design and analysis. Do not merge experiments with distinct hardware, binaries or source changes. Unmeasured metrics are null/missing, never fabricated zeros.

## Audit and historical compatibility

`node scripts/audit-results.mjs` replays every accepted update log, verifies checksums and timing arithmetic, checks build input/output consistency, and flags outliers using 1.5×IQR only within compatible groups with at least four samples. Flags remain in summaries; they are not automatic exclusions. The audit retains rejected runtime and diagnostic attempts. `node scripts/verify-dashboard.mjs` checks summary/raw membership and exercises dashboard selections against each batch independently.

Event deltas can be zero, so a targeted record need not change its numerical value. Finite-window throughput divides N ticks by an interval containing N−1 scheduled gaps plus processing; it can exceed the requested rate and is not a sustained producer-capacity estimate. Zero dropped updates follows the serial delivery policy, even where deadlines are missed.

Historical Angular 14 builds used a lockfile containing a Node-18-only transitive node-releases package under Node 16. The repaired lock pins compatible browserslist/node-releases versions. Clean strict installs then passed, followed by a new balanced four-repetition endpoint batch. Identical emitted JavaScript hashes link these outputs to existing functional runtime evidence; historical and repaired build timings remain separate. Angular 17's lock includes an incompatible optional lzma binary package that is skipped and absent from its installed dependency tree.

The final Lighthouse batch runs sequentially after builds and independently of workload benchmarks. The harness owns the measured Puppeteer page, verifies its final initial checksum and 5,000 rows, and retains the full LHR and artifact hashes. An earlier attempt failed because Lighthouse closed its self-owned page; that rejected diagnostic is retained separately. One accepted observation per variant does not establish a ranking.
