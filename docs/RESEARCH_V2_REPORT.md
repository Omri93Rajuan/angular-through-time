# Angular Through Time — research v2 engineering report

Updated 2026-10-22. This report separates implemented apparatus, executed correctness checks, exploratory observations and work that still requires a researcher decision. It is not a peer-reviewed paper, preregistration or confirmatory performance conclusion.

## Research question and implementation

The project studies three distinct questions: historical controlled framework/compiler evolution; deliberately optimized version-appropriate application architectures; and native CLI toolchain defaults. Cross-version architectural changes do not identify an isolated Signals, standalone, control-flow or scheduler effect.

Historical `baseline` and conservative `idiomatic` code remain intact. A frozen catalog verifies all **325 historical result files** byte-for-byte. The replay audit was run in a temporary copy: **189 accepted samples, 861 update ticks, 330 late updates, zero integrity errors, seven retained outlier flags and 18 Lighthouse reports**. These are historical observations, not v2 results. PR #3 was inspected and left unmerged and unmodified; this work uses a separate feature branch from `dev`. Its known Angular 18 lock placement repair was reused on this branch without changing its package-version set.

New B applications have shell, toolbar, table, asset row, summary, chart and selected-details components. Angular 14–16 uses optimized immutable publications and explicit dependency-aware selectors with OnPush. Angular 17+ uses domain/UI signal state and computed derivations, including per-row entity, watch and selection consumers. Stable modern loops and conditions enter at 18; stable zoneless scheduling enters at pinned 20.3. Common `@Input` interfaces are retained rather than requiring signal-input syntax. Signal architecture revision 2 reads row identity from a stable input, keeping price changes out of the table's host-identity dependencies.

All native C workspaces come from the exact CLI-generated recipe, with original scaffolds, invocation records, adaptation hashes and dedicated lockfiles. Generated budgets, TypeScript configuration, test/build/serve targets, bootstrap providers and cache defaults are preserved. A portable imperative component graph is used throughout C, with framework-default change detection. Generated builder selection is webpack `browser` for 14–16, devkit `application` for 17–19, and `@angular/build:application` for 20–22. This is native-stack evolution, not a bundler-only experiment or Vite runtime measurement.

The Angular 22 M4 Zone arm and zoneless B arm share the same signal graph, OnPush policy and control flow. Only this same-version comparison is intended to narrow scheduler/polyfill attribution. Other proposed ablations remain outstanding.

## Correctness and reproducibility

The independent oracle reads the frozen fixture JSON and separately implements event arithmetic and derivations. It checks visible order, every displayed price/percentage/volume, market index, advancing count, chart points, selected live prices, zero work, clamping, all update modes and reset. Browser workflows also cover search, sector/watch filtering, empty-state round trips, ordering after updates, pause/resume, asynchronous delivery, retained row nodes and focus.

All nine B variants and all nine native C variants passed the expanded browser suite. Native Angular 18 was rechecked after its clean-install lock repair. Production compilation succeeded for all nine B and all nine C versions; C also completed project-cold/project-warm feasibility builds. Exact evidence directories and the final pilot observations are listed below.

Generation verification covers **118 legacy files** and **218 research files**. Legacy source parity remains valid. Unit tests cover the engine, independent oracle, supported manifest cells, order balancing and run-level uncertainty. A separate native-recipe check compares the adapted configuration with the original scaffold and verifies that all changes are documented. CI includes separate nine-version B and C production/browser matrices with pinned actions and read-only permissions; CI build verification does not create timing observations.

## Retained failures and corrections

- The initial numeric oracle compared a floating-point aggregate with exact equality; the hand-derived unit assertion now uses a tight numerical tolerance. Browser display comparison remains exact at the displayed precision.
- Angular DecimalPipe renders rounded negative zero as `0.00`; the independent display formatter now encodes that convention explicitly.
- An initial modern-flow generator transformation added a closing block to the chart. The failed Angular 22 compilation is retained; the transformation was scoped to the intended conditional.
- Reordering retained row nodes but lost focused row controls. All new architectures now explicitly restore the existing focused element after view updates; this behavior was verified without changing legacy source.
- The first v2 dashboard check exposed an unsupported `.mjs` MIME type in the static server. The server now serves JavaScript modules correctly; failed checks and console diagnosis are retained.
- Missing favicon requests failed the console-error gate. New B pages have an explicit empty favicon; errors were not ignored.
- CLI invocation from an installed workspace prevented `ng new`. Generation now invokes an exact copied CLI from a clean temporary directory; the first failure remains logged.
- Native Angular 18's first install succeeded, but strict `npm ci` exposed a chokidar/readdirp lock placement inconsistency. The repair preserved the package-name/version set. Failed and successful installs, repaired builds and browser checks are retained.
- The first consumer diagnostic used `ngDoCheck` as a proxy for template refresh and failed. Hook counts and template evaluation are now recorded separately in an instrumented-only replica. A further revision moved signal-row host identity to the stable ID input to remove an unnecessary price dependency.
- Earlier native build feasibility batches have explicit deviations: one first build briefly overlapped a historical audit; another ran while its on-disk driver was being edited for CI support. Neither is eligible for source-frozen timing claims. They remain visible. The replacement driver captures startup provenance, checks source/input stability and measures duration immediately around the CLI process.

No historical raw evidence was rewritten, and no rejected attempt was removed because it was slow or unfavorable.

## Measurement protocol and interpretation

The executable runtime campaign is **pilot-only**. Each independent block launches a fresh browser process. A full functional acceptance is reused only for exactly matching input/artifact hashes and browser version; initial and final numeric UI state are checked again in each process. Three warm-up ticks precede reset and six measured sparse-mutation ticks at 5 Hz. Treatment order uses complete balanced cycles. These short windows are feasibility checks, not sustained-rate or tail-latency estimates.

Run-level p50/p95 and paired uncertainty use independent blocks, never ticks as independent repetitions. Missing and rejected attempts remain visible. Bootstrap intervals with two pairs are unstable and do not establish significance. Synchronous apply-call duration is secondary because lazy computed work can occur during rendering. Presentation opportunity uses two animation-frame callbacks, not a physical presentation timestamp. Serial lossless delivery cannot establish independent-arrival capacity or dropped-event behavior.

Native build pilots are separate from runtime. Project-cold removes output and Angular caches; OS cache is uncontrolled. Compression inventories count each emitted JS artifact once and distinguish them from unmeasured startup-requested bytes. One cold/warm pair per version, in fixed version order, cannot support a build-speed ranking. Development diagnostics use disposable copies with intentional TypeScript/template errors, a CSS edit and recovery; they do not measure watch/HMR latency.

## Executed evidence and pilot observations

The two runtime batches used source commit `1ceb5ba42cf7bcc315b8963ea8f5c9ff443f0bd4`, clean measured source (`sourceDirty: false`) and the same Chrome binary hash. Both were run after compilation and browser verification had finished. Each contains four independent-process attempts: two variants × two balanced blocks. All **8 attempts / 48 measured ticks** passed; no update began more than one target interval late. This six-tick result does not establish sustained capacity.

| Pilot comparison | Complete blocks | Mean paired difference in run p95 | Exploratory 95% block-bootstrap interval |
|---|---:|---:|---:|
| Angular 22 minus Angular 14, B architectures | 2 | -0.28 ms | -9.80 to 9.25 ms |
| Angular 22 Zone minus zoneless, same signal architecture | 2 | 32.36 ms | 14.55 to 50.18 ms |

The B endpoint pilot provides no useful separation. The Zone arm was higher in both observed M4 blocks, but two blocks and six-tick windows are insufficient for a causal performance conclusion or reliable uncertainty estimate. With two observed paired differences, the bootstrap largely restates those two values. Neither result is a significance claim. Preserve the absolute observations and expand an approved design rather than selecting a favorable conclusion.

- [B endpoint raw pilot](../benchmark/results-v2/pilots/2026-10-22T04-24-34.076Z/), [M4 raw pilot](../benchmark/results-v2/pilots/2026-10-22T04-25-28.693Z/) and [audited summary](../benchmark/results-v2/summary.json).
- [Final B browser acceptance for 17–22](../benchmark/results-v2/verification/2026-10-22T04-20-03.553Z/); unchanged 14–16 acceptance is in [the full matrix](../benchmark/results-v2/verification/2026-10-21T06-50-58.917Z/).
- [Native C full matrix](../benchmark/results-v2/verification/2026-10-21T06-51-00.078Z/) and [repaired native Angular 18 acceptance](../benchmark/results-v2/verification/2026-10-22T04-18-48.272Z/).
- [M4 acceptance](../benchmark/results-v2/verification/2026-10-22T04-20-56.592Z/) and [instrumented revision-2 consumer diagnostic](../benchmark/results-v2/diagnostics/2026-10-22T04-20-56.581Z.json): one row-template evaluation and **zero table-template evaluations** for one sparse mutation; one full aggregate reduction, cached ordering, six DOM mutation records. The watch action evaluated one row template and the table, without recomputing the aggregate/order. Public hook counts are reported separately.
- All nine current B versions passed [feature checks](../benchmark/results-v2/features/) and [65-tick / 60-point history checks](../benchmark/results-v2/history/). These directories retain earlier checks as well.
- [Strict native lock replication](../benchmark/results-v2/native/2026-10-21T06-59-02.170Z/) includes the initial Angular 18 failure; [its repair passed](../benchmark/results-v2/native/2026-10-21T07-00-44.176Z/). All nine native locks now have strict clean-install evidence.

The final native build feasibility batch is [2026-10-22T04-16-15.490Z](../benchmark/results-v2/native/2026-10-22T04-16-15.490Z/), with source/input guards passing for all 18 attempts. The following are individual observations, **n=1 per version/cache cell**, in fixed version order. They are not estimates of typical build speed. Earlier compilation-only batches remain visible and excluded from source-frozen timing eligibility.

| Angular | Project-cold build (ms) | Project-warm build (ms) | All emitted JS (raw bytes) |
|---|---:|---:|---:|
| 14 | 14074.5 | 6162.3 | 172,847 |
| 15 | 12974.1 | 4624.2 | 174,359 |
| 16 | 12123.7 | 4526.0 | 183,470 |
| 17 | 5648.1 | 4854.4 | 172,880 |
| 18 | 4850.9 | 2307.1 | 179,542 |
| 19 | 4611.1 | 2336.1 | 179,875 |
| 20 | 4666.1 | 3071.0 | 181,789 |
| 21 | 4553.0 | 2386.6 | 143,896 |
| 22 | 4980.8 | 2435.3 | 148,527 |

Angular 22 [development diagnostics](../benchmark/results-v2/feedback/2026-10-22T04-23-44.278Z/) passed all five cases: baseline, intentional TypeScript error, intentional template-property error, CSS-output change and recovery. These prove diagnostic coverage for this corpus, not human productivity or watcher latency.

## Limitations and remaining decisions

The main confirmatory campaign is **NOT RUN: researcher approval is required** for the frozen experiment list, primary metrics, duration, precision/sample-size rule, practically relevant effect and multiplicity policy. The proposed 30-second warm-up, 60-second window and at least ten independent blocks remain proposals. Two-block pilots cannot establish a reliable final sample-size decision.

Hardware power, governor, thermals, OS cache and background workload are not controlled. Headless Chrome/automation is part of the measurement setting. The generated graph has seven component roles but shares a TypeScript module; it is not a representative enterprise import graph. Publication/copying costs, full aggregate reductions and the large DOM remain substantial architectural costs. Do not extrapolate one instrumented Angular 22 consumer diagnostic to all versions, interactions or workloads.

The independent scheduled-arrival/FIFO experiment, M0/M1/M2/M3/M5 ablations, matched-option builder bridge, watch feedback, common-contract default-runner comparison and a broader runtime scenario/mode/rate matrix are **NOT RUN / not yet implemented as accepted research cells**. Existing default starter tests are not advertised as Market Terminal contract coverage. Startup-requested JS, native C runtime performance, extended memory campaigns and no-state callback scheduling also remain unmeasured. These are outstanding scope items, not fabricated environmental failures.

See [methods](RESEARCH_V2_METHODS.md), [exact replication commands](RESEARCH_V2_SETUP.md), [protocol and pending decisions](../research/v2/protocol.json), [v2 dashboard](../dashboard/research.html), and [historical report](../FINAL_REPORT.md). Omri Rajuan is credited as project author in [CITATION.cff](../CITATION.cff). No affiliation, DOI or publication identifier is invented.
