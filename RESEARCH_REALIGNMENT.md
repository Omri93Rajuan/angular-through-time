# Angular Through Time — research realignment

**Status: design proposal only, 2026-10-19.** Audited repository commit: `a338ee2553f12a500ae610eb09188fc0e06ce2e2`. This review reads application source, generator, templates, installed exact-version Angular/CLI packages, harness and saved audits. No application changes, dependency installations, builds or benchmarks were performed. Historical results and their interpretation in the original protocol remain intact. This document proposes a new protocol, not retroactive validation of a broader claim.

## 1. Research conclusion and evidence

The repository measures a useful but narrow question: how a single-component, eagerly checked, 5,000-row application behaves across pinned Angular releases using the webpack browser builder. Its second track introduces bootstrap, loop and scheduling changes, but does not implement a substantially reactive application architecture. The apparatus is reusable; it does not yet measure the full architectural or developer-tooling evolution in the original objective.

Evidence inspected:

- [Generator](scripts/generate.mjs), especially lines 27–40: standalone threshold, revision signal, loop substitution, explicit change detection and webpack targets.
- [State implementation](templates/body.ts), especially `refresh`, `deliver`, `notify` and external `window.market` adapter; all 18 generated TypeScript/HTML implementations and their `angular.json` configurations.
- [Shared template](templates/app.html): row identity, pipes, details, controls and chart.
- [Functional gate](benchmark/harness/functional.mjs), [runtime driver](benchmark/harness/run.mjs), [build driver](scripts/build.mjs), [Lighthouse driver](benchmark/harness/lighthouse.mjs), summary and dashboard code.
- [Saved result audit](benchmark/results/audits/results.json), [install audit](benchmark/results/audits/installs.json), [dashboard audit](benchmark/results/audits/dashboard.json), and [final report](FINAL_REPORT.md). Counts below are existing recorded evidence, not new measurements.
- Each installed `@schematics/angular/application/index.js`, `application/schema.json`, `ng-new/schema.json` and `utility/workspace-models.js`; installed core declarations, notably v20's stable zoneless provider and v22's `Default = Eager` alias. These local dependency files are reproducible from lockfiles but are not tracked repository documents.

### What is actually implemented

Every variant has **one `MarketApp` component**, no row or panel components, explicit `ChangeDetectionStrategy.Default`, ordinary mutable state fields, eager filtering/sorting and full-dataset aggregation. All render 5,000 rows initially; filtering changes the rendered subset. No virtualization, OnPush, computed selectors, RxJS state streams, async pipe, signal inputs, effects, lazy routes, deferred views, SSR or hydration is used. RxJS is installed but is not used by application state code.

All baselines use `@NgModule`, `BrowserModule`, `platformBrowserDynamic().bootstrapModule`, Zone.js, `NgZone.run`, `ChangeDetectorRef.markForCheck`, `*ngFor` with numeric-ID `trackBy`, `*ngIf` and `DecimalPipe`. Angular 21–22 explicitly provide Zone-based change detection. The v22 `Default` alias still means eager checking; it does **not** follow v22's new implicit OnPush default.

All builds use `@angular-devkit/build-angular:browser`, production AOT/optimization, hashed outputs, disabled source maps and disabled CLI disk cache. The common engine is emitted via the global `scripts` bundle. There are no generated `serve`/`test` targets or normal default CLI development configurations in these app configs. Root tests validate the engine/statistics/order; browser functional checks validate app workflows.

| Exact Angular / CLI | Actual baseline | Actual idiomatic bootstrap | Actual idiomatic state/CD | Actual idiomatic template | Actual idiomatic scheduler |
|---|---|---|---|---|---|
| 14.2.12 / 14.2.13 | Common baseline above | NgModule | Fields, `markForCheck`, eager | `*ngFor` + `*ngIf` | Zone |
| 15.2.10 / 15.2.11 | Same | `bootstrapApplication`, standalone | Fields, `markForCheck`, eager | Same | Zone |
| 16.2.12 / 16.2.16 | Same | Standalone | Fields, `markForCheck`, eager | Same | Zone |
| 17.3.12 / 17.3.17 | Same | Standalone | Fields + revision `signal(0)`, eager | Same + empty revision interpolation | Zone |
| 18.2.14 / 18.2.21 | Same | Standalone | Same revision adapter, eager | Three `@for` loops; three `*ngIf` remain | Zone |
| 19.2.15 / 19.2.19 | Same | Standalone | Same revision adapter, eager | Same partial modern control flow | Zone |
| 20.3.0 / 20.3.0 | Same | Standalone | Same revision adapter, eager | Same | Zone |
| 21.0.0 / 21.0.0 | Same, explicit Zone provider | Standalone | Same revision adapter, eager | Same | Default zoneless; no Zone import |
| 22.0.0 / 22.0.0 | Same, explicit Zone provider | Standalone | Same revision adapter, explicit eager alias | Same | Default zoneless; no Zone import |

The three modern loops cover rows, sector options and workload options. Row tracking remains `a.id`; conditions for empty results and selected/unselected details remain `*ngIf`. Standalone components import `CommonModule`. Signal variants read `revision()` only in an empty interpolation and increment it in `notify()`. `NgZone` and `ChangeDetectorRef` remain injected even in these variants; the zoneless path relies on the revision signal notification, not on `NgZone.run` causing a Zone tick.

### Gaps and their consequences

| Gap | Code evidence | Research consequence |
|---|---|---|
| Signals are only an invalidation counter | `revision.update` and empty interpolation; zero `computed` calls | Measures a notification adapter, not signal state, memoization or dependency granularity |
| No component boundaries or OnPush | One `@Component`; explicit Default in every variant | Cannot demonstrate skipping unaffected row/panel subtrees; adding OnPush to the root alone would still leave a large template to check |
| All selectors recompute eagerly | `refresh()` filters/sorts all rows, computes index/advancers/chart; `deliver()` computes index again before `refresh()` | Shared algorithmic work can dominate framework changes; deleting duplicate work is an application optimization, not evidence for Signals |
| Coarse reactive dependencies | Query/watch changes run `refresh`; selection marks the root | No independent consumers for row prices, watch state, selected details or summaries |
| Partial modern flow | `@for` from v18, but all three conditions remain legacy | Some loop evolution is exercised, but no isolated loop/conditional comparison exists |
| Stable zoneless adoption delayed | Generator threshold is v21; pinned v20 is 20.3.0 | Misses the stable v20.2+ opt-in opportunity; v21 historical comparisons also change other architecture variables |
| Explicit eager checking in v22 | `ChangeDetectionStrategy.Default` aliases `Eager` | Deliberately valid for baseline; unrepresentative of v22's default for idiomatic/default-stack claims |
| All builders held to webpack | Same browser builder in every target | Valid controlled-builder evidence, not default CLI/esbuild evolution or Vite developer experience |
| Synthetic serial workload | Driver waits for presentation and interaction before sending next tick | Useful service-cost experiment, not independent incoming traffic; dropped=0 is a policy |
| Incomplete visual oracle | Gate checks prices/workflows; no full aggregate/chart/volume/percentage oracle | Reactive refactors could pass while derived panels are stale |
| Tooling/application scale absent | One component, mostly `any`, no realistic import graph | Weak basis for incremental-build, diagnostic-quality or architecture maintainability claims |

## 2. Supported feature matrix and source policy

Use exact pinned versions, not an assumed feature set for an entire major. Stable-only features enter the primary tracks. Preview/experimental APIs may be studied in explicitly labeled annexes, but are excluded from the initial plan. Do not simulate unsupported historical features with private Angular APIs or `ngZone: 'noop'` and call that modern zoneless.

| Major (pinned minor) | Standalone | `signal` / `computed` | Built-in `@for` / `@if` | OnPush | Official zoneless status | Recommended B architecture |
|---|---|---|---|---|---|---|
| 14.2 | Preview; omit | Unavailable | Unavailable | Stable opt-in | No modern supported provider | NgModule, component boundaries, OnPush, immutable row inputs and dependency-aware imperative selectors |
| 15.2 | Stable | Unavailable | Unavailable | Stable opt-in | No modern supported provider | Standalone + same optimized pre-signal design |
| 16.2 | Stable | Developer preview; omit from primary | Unavailable | Stable opt-in | No modern supported provider | Same as v15; do not force artificial novelty |
| 17.3 | Stable | Stable core primitives | Developer preview; omit from primary | Stable opt-in | No modern supported provider | Real signal state, computed derivations, row/panel consumers, OnPush, legacy flow, Zone |
| 18.2 | Stable | Stable | Stable | Stable opt-in | Experimental provider; omit from primary | Same reactive graph + modern loops and conditionals, Zone |
| 19.2 | Stable; framework default | Stable; signal inputs also stable | Stable | Stable opt-in | Experimental provider; omit from primary | Same; use stable signal inputs where appropriate |
| 20.3 | Stable | Stable | Stable | Stable opt-in | **Stable opt-in since 20.2** | Same + `provideZonelessChangeDetection()`, no Zone import |
| 21.0 | Stable | Stable | Stable | Stable opt-in | Default | Same optimized zoneless architecture |
| 22.0 | Stable | Stable | Stable | **Framework default** | Default | Same; retain explicit OnPush for auditable intent in B |

Core signal stability does not imply every related API was stable then. The primary v17–18 plan needs only `signal` and `computed`; it does not require preview `effect`, signal inputs, resource APIs or signal queries. `@Input`/`@Output` remain the common interface for causal ablations even when newer input syntax is available. Do not add forms/resources/SSR solely to tick a feature box when the market workload does not exercise them.

Evidence: [v16 preview primitives](https://v17.angular.io/guide/update-to-version-16), [v17 release](https://blog.angular.dev/introducing-angular-v17-4d7033312e4b), [v17 tagged signal source](https://github.com/angular/angular/blob/17.3.12/packages/core/src/render3/reactivity/signal.ts), [v15 standalone stabilization](https://www.youtube.com/watch?v=K6FA6f8fohk), [control-flow stabilization roadmap](https://angular.dev/roadmap), [v19 input/output stabilization](https://blog.angular.dev/meet-angular-v19-7b29dfd05b84), [v18 experimental zoneless](https://v18.angular.dev/guide/experimental/zoneless/), [v19 experimental provider](https://v19.angular.dev/api/core/provideExperimentalZonelessChangeDetection), [stable zoneless API](https://angular.dev/api/core/provideZonelessChangeDetection), [zoneless defaults](https://angular.dev/guide/zoneless), [v22 change-detection defaults](https://angular.dev/guide/components/advanced-configuration). The installed v20 declarations explicitly mark the provider public since 20.2; installed v22 declarations confirm the eager alias. Framework/runtime pins remain governed by the [official compatibility matrix](https://angular.dev/reference/versions).

### Default toolchain matrix

The installed exact-version application schematics select the following builders. Freeze a generated, unmodified scaffold in a temporary worktree during the future implementation phase to confirm the complete recipe, including inherited defaults, prompt answers and CLI package hashes. That scaffold has **not** been generated in this review.

| CLI | Application builder selected by installed schematic | Default bootstrap / scheduling relevant to C |
|---|---|---|
| 14.2.13 | `@angular-devkit/build-angular:browser` (webpack) | NgModule, Zone, eager |
| 15.2.11 | Same | NgModule, Zone, eager; standalone is available, not assumed default |
| 16.2.16 | Same | NgModule, Zone, eager |
| 17.3.17 | `@angular-devkit/build-angular:application` (esbuild) | Standalone, Zone, eager |
| 18.2.21 | Same application builder | Standalone, Zone, eager |
| 19.2.19 | Same application builder | Standalone, Zone, eager; experimental zoneless defaults false |
| 20.3.0 | `@angular/build:application` (esbuild) | Standalone, Zone unless opted out; zoneless option defaults false |
| 21.0.0 | `@angular/build:application` | Standalone, default zoneless, eager |
| 22.0.0 | `@angular/build:application` | Standalone, default zoneless and OnPush |

Package availability is not proof of selection: v18–19 contain a `BuildApplication` enum too, but their inspected application schematic selects `Builders.Application`. Capture the final generated recipe before measurement; if a later schematic rule alters it, preserve that evidence and revise the planned matrix rather than overriding it to match this table.

The installed testing schematics add another tooling transition: v14–19 select `@angular-devkit/build-angular:karma`; v20 selects `@angular/build:karma`; v21–22 select `@angular/build:unit-test` and their application schema defaults `testRunner` to `vitest`. These are inspected recipe choices, not executed test-runner results. Keep C-tests comparisons explicit about browser versus simulated-DOM environments; test-runner wall time is not browser runtime performance.

The application builder became the new-project default in v17. Vite serves development builds; it is not Angular's production bundler. Production esbuild evidence must not be described as Vite runtime performance. [Official migration guide](https://angular.dev/tools/cli/build-system-migration), [v17 workspace documentation](https://v17.angular.io/guide/workspace-config).

## 3. Three separate primary tracks

Track letters below are research tracks, not the existing A–H scenario letters. Use explicit identifiers such as `controlled-v1`, `idiomatic-v2`, `default-cli-v1` to avoid ambiguity.

### A — Controlled Framework Evolution

**Question:** how does the same eager, Zone-based application evolve across these framework/compiler releases under a controlled webpack build policy?

Keep the historical monolithic baseline, row identity, DOM, algorithms, pipes, notifications, update modes and global engine delivery unchanged. Explicit eager checking and Zone operation are intentional even when no longer default. Keep no virtualization, no selective memoization and no new component boundaries. Retain compiler/CLI/Zone/TypeScript versions appropriate to each Angular release. This is a controlled application/build-policy comparison, not pure core-runtime isolation: compiler output, browser targets, framework internals and dependencies still evolve.

Primary independent variable: exact Angular/toolchain version. Workload count, rate, replacement mode and scenario are crossed or blocked factors. Primary outcomes: per-run presentation and interaction distributions, deadline misses and completion rate; secondary outcomes: apply-call time, long tasks, callback intervals, sampled JS heap, startup and emitted bytes. Cold builds and Lighthouse remain separate experiments. Gate: common functional oracle, unchanged source-policy checks, same event log and measurement protocol. Historical samples remain narrow evidence for this track, with their original sample-size/environment limitations.

If application algorithms or DOM are later improved for fairness, create `controlled-v2` across all versions. Never silently replace A-v1 or mix its results with v2.

### B — Idiomatic Angular Evolution

**Question:** what does a deliberately optimized, stable, version-appropriate implementation of the same market experience deliver? This compares whole architectures, not isolated Angular speed.

Use one documented component graph across B versions: shell, toolbar, table, asset row, summary, chart and selected details. An attribute-selected row component can preserve valid `<tr>` structure and existing selectors. Keep all 5,000 rows initially and the same visible content, styling, user actions and stable IDs.

For v14–16, use OnPush components, changed-record inputs and explicit dependency-aware selectors. Do not handicap them with unnecessary recomputation simply to favor Signals. An RxJS store is a legitimate alternative, but is not required for this synchronous simulation; choose and freeze one implementation before timing. For v17+, use actual domain/UI signals and computed derivations, with row-local consumers and stable ordered IDs. Introduce stable modern flow in v18 and zoneless in pinned v20.3. Signal inputs can enter v19+ as a documented architecture choice; their individual benefit is not inferred from the B trend.

Separate immutable static identity/search metadata from price/volume signals. Search by symbol/name and sector should not depend on price changes when sorting by symbol. Price sorting genuinely depends on prices and must invalidate. Selected details should consume the selected entity; watch state should update affected rows without making every row read the whole watch set. Aggregates depend on the full market and still require valid work; Signals do not make an O(N) reduction automatically incremental. Remove the duplicate index reduction consistently across new B implementations, and treat that improvement as shared application design.

Independent variables: version and its declared architecture manifest; workload factors remain explicit. Outcomes: same runtime metrics as A plus separately instrumented diagnostic counts of selector evaluations, checked rows/panels and DOM mutations, and startup/memory costs of many consumers. Gate: identical user-visible semantics, independent derived-value oracle, notification correctness for every update mode, and evidence that the intended reactive boundaries are actually exercised. Faster results are not required for acceptance.

### C — Default Toolchain Evolution

**Question:** what experience does the exact CLI's default client application stack provide for the same functional workload, including build output, startup and developer feedback?

Start from the exact CLI-generated application recipe rather than translating the existing webpack config by hand. Record all prompt answers. Choose CSR, no additional routing requirement and CSS consistently; record these as scope choices wherever a prompt/default differs. Retain the selected builder, production/development defaults, browser targets, budgets, supported test target and cache policy. Do not silently disable an inconvenient budget or force ES2020/default worker counts from the old generator.

Use a fixed portable component graph and imperative state adapter with correct public notifications on all versions. Preserve generated bootstrap/scheduler defaults and do not force the same change-detection default across C; this deliberately measures the default stack. The v22 version must work correctly under implicit OnPush. This source policy is different from B's version-specific signal architecture. Record all source/config adaptation diffs. C's longitudinal result is a package of toolchain/default changes, not a bundler-only effect.

Separate C-production cold/warm builds, C-produced-artifact runtime, C-development rebuild/diagnostic feedback, and optional default-test-runner coverage. Compare the fixed portable payload under both webpack and application builders within a single version in the builder bridge below to narrow attribution. No existing webpack sample can stand in for a newly generated C recipe without exact configuration/source/artifact equivalence; none has been established.

## 4. Experimental contracts and causal ablations

All experiments below inherit the functional/provenance/statistical gates in section 6. Each is a distinct experiment ID and has its own primary outcome. Pair treatments **within the same exact version**, source graph, dependency lock, browser, hardware session and delivery schedule. Cross-major differences alone never identify a feature effect.

| ID / question | Independent variables and eligible versions | Dependent metrics | Fixed controls and key confounders | Additional acceptance criteria |
|---|---|---|---|---|
| A-runtime: evolution under unchanged design? | v14–22; A-v1; scenario/count/rate/mode blocked | Presentation/interaction p50,p95 per run; lateness/backlog; apply time, long tasks, heap secondary | Same monolith, webpack policy, Zone, eager CD; compiler/targets remain confounded | Exact A-v1 source policy and functional parity; report late correct samples, not just fast ones |
| B-runtime: whole-architecture evolution? | v14–22 B manifest; workloads blocked | Same end-to-end metrics plus startup/heap cost | Same graph/UI; APIs, scheduling and derivation design intentionally vary | Feature-use diagnostics and full visual oracle; never label result a Signals-only speedup |
| C-production: default-stack build/output evolution? | CLI default recipe/version; cold vs warm separate | Build wall time; emitted JS raw/gzip/Brotli; startup-requested JS bytes | Node/TS/targets/default parallelism/cache/budgets evolve; install excluded | Exact scaffold/config evidence; build exits cleanly; budget warnings/errors retained; validate emitted artifact before runtime comparisons |
| C-runtime: behavior of default-produced apps? | Default-stack version; workload factors blocked | Startup readiness, presentation/interaction, long tasks, heap | Same portable graph; bootstrap/CD/scheduler/output defaults differ | Production static serving only; same market parity; separate from B and from builder-only claims |
| R-arrival: behavior under independent traffic? | Serial vs fixed-schedule producer policy; initially v14/v22 B, with count/rate and architecture blocked | Scheduled-to-presentation latency, applied throughput, queue depth, misses/overload | Same event trace and FIFO policy; Worker serialization, browser task scheduling and validation overhead recorded | Every event accounted for; final state correct after drain; queue-limit aborts retained, never reported as sustained-rate success |
| M0: effect of introducing boundaries? | Monolith vs row/panel components; initially v14 and v22, eager/Zone/imperative on both | Startup, presentation, heap, checked-component counts | Same selector algorithm, values, track IDs and visible DOM; component host cost remains treatment | Confirms boundary costs before attributing componentization + OnPush to OnPush alone |
| M1: effect of OnPush? | Eager vs OnPush on identical decomposed graph; valid v14–22, initial v14/17/22 | Sparse-update presentation and interaction; checked-row/panel counts; startup | Same imperative store, immutable row publications, Zone, legacy flow; input-reference policy fixed | Untouched rows can be skipped while touched rows remain correct; no stale mutation-mode rows |
| M2a: effect of signal/computed state at coarse granularity? | Matched imperative memoized selectors vs `signal`/`computed`; stable v17–22, initial v17/22 | End-to-end latency, selector counts, heap; synchronous apply time secondary | Same OnPush graph, legacy flow, Zone, publication/equality and derivation algorithms | No revision-only proxy; verify dependencies and cached reads; include an eager-selector control as a separate arm to expose memoization effects |
| M2b: effect of reactive granularity? | Coarse collection signal vs per-entity signals; v17–22, initial v17/22 | Sparse/unrelated updates, scoped UI interactions, consumer counts, initial memory/render cost | Same component graph, OnPush, flow, scheduler and full-reduction algorithm; allocation/publication policy fixed | Row templates read local signals; parent does not read every row signal unnecessarily; identity and no-op policies recorded |
| M3-loop: effect of loop implementation? | `*ngFor trackBy id` vs `@for track id`; stable v18–22, initial v18/22 | Reorder/filter/replacement presentation, node reuse/mutations, JS bytes | Same components, state, CD, scheduler and list content; no changed tracking strategy | Same row order/identity, focus and watch state after reorder; count node recreation in separate diagnostics |
| M3-if: effect of conditionals? | `*ngIf` vs `@if`; stable v18–22, initial v18/22 | Details/empty-state toggle latency, construction/destruction and bytes | Loops fixed; same state graph and rendered content | Correct empty/selected branches and preserved user semantics; separate from loop treatment |
| M4: effect of zoneless scheduling? | Explicit Zone provider + Zone import vs stable zoneless provider/no Zone; **v20.3,21,22 only** | Presentation/interaction, no-state async-task cost, long tasks, startup bytes | Same signal graph, OnPush, flow, callbacks and notifications; main treatment includes removing Zone patching | Correct external callbacks and timers without manual global ticks; prove actual provider/polyfill mode |
| M5: feature interactions? | Small 2×2: eager/OnPush × coarse/fine signal state at v22; then Zone/zoneless × coarse/fine with OnPush fixed | End-to-end response, memory, diagnostic counts | Each factorial freezes remaining factors; separate experiment IDs | All cells pass parity; report interactions rather than summing individual feature gains |
| C-builder bridge: contribution of build system? | webpack browser vs application builder within v17–22; begin v17/22 | Cold build time, bytes, production startup/runtime | Identical portable app and scheduler; match supported semantic options/targets, document impossible matches | Both outputs pass parity; distinguish this matched-option bridge from native-default C recipes; no analogous application-builder cell invented for v14–16 |
| C-feedback: development feedback evolution? | Default dev configuration/version; cold/watch-warm state; fixed TS/template/CSS edits | Build-watch ready time, edit-to-success/error, recovery time; diagnostic coverage | Same typed graph/edit corpus; watcher/OS cache, language service versions and differing diagnostics | Confirm changed output/error, not just console text; repeat reversible edits in fresh copies; no dev-build runtime scores |
| C-tests: default test-tool evolution? | Exact generated test builder/runner per CLI; common portable contract cases | Cold execution time, pass/fail coverage, failure diagnostics | Runner environments differ; adapter/runner cost is part of treatment | Discover actual generated defaults first; identical assertion inventory; missing support is N/A, not zero or a pass |

M2a cannot perfectly isolate a reactive primitive from its notification adapter: document changed code and include a well-optimized non-signal comparator. M2b is the effect of application dependency granularity **using** Signals, not a new Angular-version feature by itself. Signal-tracked components do not imply independent DOM-binding updates without view checking. Angular documents computed caching, dynamic dependencies and signal-driven marking of consuming components; test the actual boundaries rather than assuming them. [Signals guide](https://angular.dev/guide/signals).

A tiny same-version bootstrap bridge (NgModule vs standalone, identical imperative graph, Zone and CD) may be added from v15 onward if bootstrap claims are desired. It would measure startup/build bytes/time, retain all other controls, and require identical rendered workflows. It is optional; B's trend alone cannot establish a standalone benefit.

No primary v16 Signals, v17 modern-flow, or v18–19 zoneless treatment is planned. Optional historical preview studies require their own stability label and protocol. No unsupported matrix cells are filled by extrapolation.

## 5. Minimal application and harness modifications proposed

### State semantics and rendering

Keep `MarketEngine`, seeds, event logs, IDs and canonical replay checksums unchanged. For new B/ablation adapters, separate the canonical simulation state from the UI publication representation. Engine `records` mode retains the array reference while replacing touched records; mutation retains both. Therefore `rowsSignal.set(engineRows)` is insufficient when the reference is unchanged. Publish touched entity snapshots or documented versioned publications, with identical publication rules in paired comparators. Count adaptation/copying in measured work; do not quietly relabel mutation as immutable engine updates.

For full-array mode, preserve its allocation semantics and report whether all rows are republished. Do not suppress unchanged clones with a custom equality rule in only one treatment. A separate equality experiment may be designed later. Freeze each signal/selector equality rule in the manifest. Treat Set/watch mutations similarly: publish a new value or update per-ID membership, rather than mutating a signal-held Set invisibly.

Keep logical tick/history advancement even at workload zero. Zero targeted records is not zero UI work: the tick and chart history still advance. Add an explicitly separate no-state-change callback scenario to study scheduling overhead. Do not change the old zero-workload interpretation.

### Workload coverage

| Feature/question | Existing exercise | Minimal new or extended scenario |
|---|---|---|
| Sparse row reactivity / OnPush | B/H touch 100/2,000 records | Fixed-symbol sort, targeted rows inside/outside visible filter; include one-row diagnostic update and the original counts; independently update selected vs unrelated asset |
| Computed dependencies | Search/sort/watch invoke global refresh | Hold prices changing while query/sector stay fixed; then change only query/watch/selection. Verify only relevant derived work invalidates; price-sort case must still reorder |
| Control flow | C filters; D reorders; F clones all records | Add empty→nonempty search and deterministic reorder round-trips; verify stable node IDs/focus. Same logical dataset, no need to invent a different product |
| Zoneless scheduling | External apply uses `NgZone.run`; UI timer smoke | Equivalent external async callback delivery; fixed background timer callbacks that do not change state; event-triggered UI updates. Keep background load explicit and paired |
| Realistic arrival pressure | Serial update→frames→interaction | Separate fixed-schedule producer trace, e.g. Worker delivery, with due/sent/received/applied/presented IDs and queue depth; same queue/drop policy across treatments |
| Tooling/dependency graph | One component and largely `any` | Reuse decomposed graph with a typed Asset/UI contract in new variants; fixed edits to row template, selector TS, and CSS; intentional misspelled property/type errors and recovery |
| Derived UI correctness | Prices/workflows checked | Assert volume, percentage, advancing count, index, chart points/history and selected price, including updates while details stay open |

For the independent-arrival experiment, compare serial vs scheduled delivery only as separate policies, not one pooled throughput series. Start with lossless FIFO and a predeclared safety queue limit: exceeding it records overload/abort and all pending event IDs, not an accepted lossless run. Drain and record final checksum when feasible. Bounded-drop or coalescing policies are separate future experiments with their own oracle. Count requested/received/applied records, backlog and deadline misses; include producer serialization/dispatch overhead. Run interactions on their own fixed timeline rather than waiting for each update. This remains a representative synthetic workload, not evidence for arbitrary production applications.

### Measurement boundaries

Retain legacy `processingMs` with its original meaning. In new samples call it synchronous apply-call duration: computed evaluation may happen later during rendering, so a reduction in this number alone is not a speedup. End-to-end presentation opportunity and interaction duration are primary. Record run-level p50/p95, lateness and elapsed completion window; do not pool thousands of ticks as independent repetitions.

Two rAF callbacks and a changed tick label do not prove that every row/panel is current. Add untimed per-step or diagnostic-run checks of affected rows/panels and final full-oracle checks; label validation overhead if it affects cadence. Use separate instrumented replicas for selector/CD/DOM counts, avoiding private Angular internals and keeping diagnostic instrumentation out of primary timings. Do not call callback frequency physical FPS or Playwright interaction duration INP. Lighthouse remains a separate browser campaign.

Use recursive artifact inventories for modern builder output directories, distinguish initial requested JS from all emitted chunks, and retain compression method. Do not double-count shared chunks. Cache-cold means cleared project/output caches unless OS cache is actually controlled. Measure native-default cache-enabled warm behavior separately; do not carry the old globally disabled cache setting into C.

C-feedback can initially use `ng build --watch` and compiler diagnostic checks without development-server runtime measurement. Vite startup/HMR is a useful optional developer-workflow study, but it needs an explicit extension to the original “never benchmark development servers” rule. No Vite/HMR performance claim is planned until that scope is agreed; any such study would stay entirely outside production workload metrics. Language-service/DevTools/migration capability can be inventoried qualitatively with pinned versions and reproducible fixtures; code size and automated edit time are not measures of human productivity.

## 6. Common acceptance, controls and analysis

1. **Correctness before timing:** independent fixture-derived oracles for all visible numeric/UI state, row order and stable identity; all engine update modes and zero workload; search/sector/watch/details/pause/reset; no console/page errors, missing callbacks or stale panels. Signals/OnPush performance is not accepted by bypassing difficult mutation cases. The reference oracle should not merely call the same new selector implementation.
2. **Feature verification:** source manifests plus diagnostic runs demonstrate real signal state/consumers, CD mode, flow syntax, scheduler and emitted Zone presence. Freeze code and inputs before measurement. Capture exact CLI/core/Node/npm/TS/Zone versions, lock/config/source hashes, browser binary, hardware, OS and source commit. A dependency being installed does not prove it is bundled or active.
3. **Isolation:** unique fields for research track, architecture revision, experiment/ablation ID, treatment, builder/config recipe, state/publication/equality policy, selector algorithm, component graph, CD, flow, scheduler, delivery policy, scenario and workload. Extend summary grouping and dashboard validation before new runs. Existing schema only distinguishes the old track/profile/batch fields and cannot safely represent this design without additions.
4. **Environment:** sequential timed jobs, fixed Chrome/viewport/locale, controlled power/governor/thermal and background workload where feasible; record deviations. Same supported runtime within each causal pair; different supported runtimes across versions remain a toolchain confound. Keep install time, compilation, runtime, diagnostics and tooling feedback separate.
5. **Pilot and freeze:** after implementation authorization, run correctness first, then a separately labeled small pilot to assess duration, variance and floor effects. Provisional main runtime window: 30 seconds warm-up, reset, 60 seconds measurement at each chosen fixed rate; freeze final duration/sample-size rule before main data collection. Preserve pilots and exclude them from confirmatory pooling. Do not time every factorial cell merely because the harness supports it.
6. **Repetitions:** plan at least ten independent process/run blocks per primary pair, rounded to complete balanced cycles where needed; final count determined from pilot variance and a predeclared precision target, not stopped when a favorable result appears. Two full nine-variant cycles for a longitudinal series are a reasonable starting design, not a claim of sufficient power. Rebalance scenario order or isolate it per process; current fixed order is a carryover risk.
7. **Analysis:** descriptive per-run medians, quartiles, p95 and paired differences with uncertainty intervals over independent blocks. Predeclare primary outcome, minimum practically relevant difference (provisionally 10% end-to-end latency and report absolute milliseconds), and multiplicity treatment before testing claims. Below timer/rAF resolution or with wide intervals, conclude inconclusive. Report negative/null findings and startup/memory tradeoffs. Balanced order alone does not remove hardware drift.
8. **Failures/outliers:** preserve all attempts and rejection reasons. Functional errors invalidate performance samples; overload and lateness remain outcomes when state is correct. Apply environmental-invalidity rules symmetrically. Never remove observations solely for slowness; keep descriptive outlier flags. Missing metrics remain unavailable, not zero.

## 7. Which existing evidence remains valid?

| Evidence | Valid continued use | What requires new measurement |
|---|---|---|
| Full-matrix batch `2026-10-18T14-10-28.721Z`, 144 accepted samples | Historical functional parity and short observations of the exact A-v1 and limited legacy idiomatic implementations | Strong cross-version performance conclusions, longer runs or any changed app/harness protocol |
| Endpoint batch `2026-10-18T14-24-28.363Z`, 32 accepted samples | Four-repeat B/H scenario observations at recorded 10 Hz/10 ticks; evidence of correct output despite lateness | New B architecture, causal feature claims, sustained-rate capacity and independent producer behavior |
| Zero control `2026-10-18T14-29-26.459Z` | Three ticks at 1 Hz, zero targeted records, Angular 22 baseline only | Other versions/architectures, true no-state callbacks, or sustained zero-workload scheduling behavior |
| Historical idiomatic samples | Accurate evidence for standalone bootstrap, revision notification, partial modern loops and later zoneless in those exact combinations | Real signal-state/fine-grained/OnPush claims; cannot relabel them B-v2 or isolate a feature from cross-major changes |
| Original full/repeated webpack builds and repaired batch `build-2026-10-19T08-27-42.151Z` | Actual controlled-webpack build time and JS sizes; repaired endpoint batch has four balanced repetitions per variant | Default CLI/toolchain claims; new graph/builders/configs; never pool old Node-incompatible transitive-lock batch with repaired builds |
| Lighthouse batch `lighthouse-2026-10-19T08-34-40.295Z`, 18 reports | One diagnostic observation per old variant, separate from workload metrics | Rankings, repeated default-stack diagnostics, changed architecture/builder artifacts |
| Unversioned smoke/rejected attempts | Historical debugging/provenance; preserve failure evidence | Archival comparisons or replacement for clean experimental cells |
| Engine fixtures, tests, checksums, compatible install verification | Reusable deterministic inputs, compatibility evidence and regression foundation | New adapters/configs still need builds and expanded functional tests; existing success is not inherited automatically |

The existing total of 189 accepted runtime samples includes historical smoke evidence. Seven retained outlier flags and 330 late updates do not invalidate correctness, but limit performance interpretation. No reanalysis can recover unmeasured consumer counts, independent producer throughput, developer feedback or default-builder effects.

Keep original paths, JSON and experiment IDs immutable. Add a separate research catalog mapping old track names to “legacy controlled” and “legacy conservative idiomatic”; do not rewrite their stored labels. New comparative campaigns need concurrent control runs when comparing old and new architectures: historical timings from another session are not a valid paired control. Exact artifact hashes can reuse functional provenance and avoid redundant exploratory work, but do not create missing measurements or make incompatible environments poolable.

## 8. Implementation phases and risks

| Phase (future; not executed) | Deliverable | Exit gate |
|---|---|---|
| 0 — Approve/freeze protocol | Track definitions, exact feature manifest, hypotheses, primary metrics and bounded experiment list | Agree what can be claimed; preserve historical catalog |
| 1 — Representation and oracle | New schema/catalog, typed portable contract, independent aggregate/chart oracle, diagnostics design | Existing raw results unchanged; old dashboard views still reproduce |
| 2 — Meaningful architecture slices | v14 optimized pre-signal and v22 signal/OnPush row/panel implementations, mutation-safe adapters; retain A-v1 | All functional modes and feature-use checks pass; no expensive timing campaign |
| 3 — Fill stable transitions | v15/16 standalone, v17 signals, v18 flow, v19 inputs if chosen, v20 stable zoneless, v21 defaults | Exact-version source/API/config verification and parity for each cell |
| 4 — Native CLI and ablation recipes | Generated default scaffolds, default-toolchain adapters, same-version paired treatments | Reproducible locks/config snapshots; builder output discovery; independent acceptance of every treatment |
| 5 — Pilot and measurement freeze | Small separately stored pilots, finalized counts/durations/precision rules and measurement cost estimate | Protocol frozen before main samples; stop at design review if cost/scope changes |
| 6 — Main research campaign | Prioritized A/B/C series and selected causal pairs, then interactions if justified | Balanced independent runs, audit/summary isolation, all failures retained |
| 7 — Interpretation | New report relating observed changes to measured architectures/tools with uncertainty | No claims beyond exercised features or measured populations |

Main risks are mutation/equality hiding updates, allocation overhead masquerading as signal cost, full reductions or 5,000-row DOM/layout dominating small scheduling effects, componentization confounding OnPush, lifecycle/instrumentation perturbing timing, default CLI recipe drift, historical package compatibility, and uncontrolled machine drift. Mitigations are the matched comparators, independent oracles, explicit source/config manifests and separate diagnostic campaigns above. Deprecated webpack/legacy directives remain usable at the pinned versions already built; future removal must not cause historical pins to be silently upgraded.

Recommended order after design approval: preserve A, fix measurement/schema/acceptance gaps, implement the v14/v22 B slices, verify stable feature transitions, then construct C and the smallest explanatory ablations. Keep SSR/hydration, signal forms, router-heavy scenarios, virtual scrolling and network-resource studies outside this first realignment. They require different applications or semantics and should not be advertised as measured by Market Terminal.

**Outcome of this review:** one research-design document only. No implementation or benchmark execution is authorized by this document itself; the proposed phases remain unexecuted.
