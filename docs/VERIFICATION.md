# Verification ledger

This file distinguishes implemented capability from executed evidence. Final matrix results are updated after validation.

## Executed during implementation

- Inspected the empty workspace; no existing files were overwritten.
- Read the reference repository's high-level architecture and official Angular compatibility/zoneless/control-flow documentation.
- Exact framework, CLI and TypeScript versions checked through registry metadata and installation.
- Unit tests cover deterministic fixture/replay, unique event IDs, identity semantics, unsupported workload rejection, quartile interpolation and CLS session windows.
- Angular 14 baseline/idiomatic production builds succeeded with Node 16.20.2.
- Angular 22 baseline/idiomatic production builds succeeded with Node 22.23.2 and TypeScript 6.0.3.
- Endpoint smoke runs were recorded under `benchmark/results/runtime/`. Early results used no Git commit (null) and overlapped implementation/build activity; these are functionality evidence only.
- Dashboard was loaded in Chrome, actual-result bars rendered, scenario/track filters exercised, and screenshot inspected.
- Angular 22 terminal screenshot inspected; all 5,000 rows remain in the DOM behind a scrollable table.

## Failures retained and corrected

1. Angular 14 compilation initially auto-discovered modern Node type declarations incompatible with TypeScript 4.8. Browser tsconfig now uses `types: []`. Original log retained in `benchmark/results/diagnostics/`.
2. npm 10.9.8 crashed inside Arborist resolving Angular 22's optional peer graph (`edgesOut` on null). Pinned npm 11.6.2 for Node 22 runtimes; installation succeeded without ignoring peer dependencies. Historical Node 16 uses npm 8, Node 18/20 use npm 10.
3. Angular 22 idiomatic first functional check inspected details before zoneless rendering completed. Functional assertions now use the identical two-frame boundary across every variant. Failed raw JSON remains, and the corrected functional suite passed.
4. Visual review found dynamic workload options selected 0 while state remained 100. Bound option selection explicitly and added a functional assertion.

## Measurement boundaries

These local runs are smoke/acceptance checks on a working desktop. No claim of isolated hardware conditions, statistical significance, physical FPS, total browser memory or general version superiority. Full rate × mode × workload factorial runs remain an experiment the researcher can execute with the provided harness.

## Full-matrix acceptance — completed

Command: `EXPERIMENT_LABEL=full-matrix-smoke VERSIONS=14,15,16,17,18,19,20,21,22 REPS=1 TICKS=4 node benchmark/harness/run.mjs`

Evidence: [`benchmark/results/runtime/2026-10-18T14-10-28.721Z/`](../benchmark/results/runtime/2026-10-18T14-10-28.721Z/).

- 144/144 accepted samples: 9 versions × 2 tracks × 8 scenarios.
- All 18 variants passed the common functional gate before measurements.
- Every scenario's final checksum agreed across all 18 variants.
- Chrome 148.0.7778.178; same executable hash throughout; 1440×1000 viewport; headless.
- Experiment source commit `aa2799ee8078c94a1bd37c44d4edb1a4bd39347c`; source was clean at launch. Subsequent harness-order improvements do not change this single-repetition execution order.
- All 18 final production builds succeeded before this batch. No builds ran concurrently with it.

| Angular | Baseline build | Idiomatic build | Common functional gate | A–H, both tracks |
|---|---|---|---|---|
| 14 | Pass | Pass | Pass | Pass |
| 15 | Pass | Pass | Pass | Pass |
| 16 | Pass | Pass | Pass | Pass |
| 17 | Pass | Pass | Pass | Pass |
| 18 | Pass | Pass | Pass | Pass |
| 19 | Pass | Pass | Pass | Pass |
| 20 | Pass | Pass | Pass | Pass |
| 21 | Pass | Pass | Pass | Pass |
| 22 | Pass | Pass | Pass | Pass |

## Balanced endpoint repetitions — completed

Command: `EXPERIMENT_LABEL=balanced-endpoint-repetitions VERSIONS=14,22 REPS=4 TICKS=10 HZ=10 SCENARIOS=B,H node benchmark/harness/run.mjs`

Evidence: [`benchmark/results/runtime/2026-10-18T14-24-28.363Z/`](../benchmark/results/runtime/2026-10-18T14-24-28.363Z/).

- 32 accepted samples: 4 version/track variants × 4 repetitions × 2 scenarios.
- Each variant occupied every execution position once.
- Both endpoint versions and tracks produced identical final checksums for each scenario in every repetition.
- Measurements preserve target-rate misses; accepted means correct output, not that 10 Hz was sustained.

## Zero-change control — completed

Command: `VERSIONS=22 TRACKS=baseline REPS=1 TICKS=3 HZ=1 WORKLOAD=0 MODE=mutation SCENARIOS=B node benchmark/harness/run.mjs`

Evidence: [`benchmark/results/runtime/2026-10-18T14-29-26.459Z/`](../benchmark/results/runtime/2026-10-18T14-29-26.459Z/).

The browser applied three logical ticks at a 1 Hz target without changing asset values; final checksum remained `ba2bdece`. This measures delivery/application-check overhead, not absence of JavaScript work.

## Fresh root dependency installation — completed

`npm ci --no-audit --no-fund` succeeded from the committed root lockfile (116 packages), without changing dependency pins.

## Continuation audit — 2026-10-19

The workspace, commits, logs and raw artifacts confirmed that the zero-workload control and original four-repetition endpoint builds had already completed. They were not restarted. Nine strict clean installs passed after repairing Angular 14's Node-16-incompatible transitive browserslist/node-releases resolution. A separate 16-build endpoint batch (`build-2026-10-19T08-27-42.151Z`) passed with identical JavaScript hashes to validated runtime samples.

The separate Lighthouse batch `lighthouse-2026-10-19T08-34-40.295Z` produced 18 accepted reports and no run warnings. Its first attempt was rejected because Lighthouse closed its self-owned page; the corrected harness owns the measured page for final checksum/row-count checks. That rejection is preserved.

Final replay audit: 189 accepted runtime samples, 861 update ticks, 330 late updates, zero discarded updates by serial policy, zero integrity errors and seven retained descriptive outlier flags. Two rejected runtime/diagnostic attempts remain visible. Historical smoke hash differences and the original full-build batch's missing order file are recorded as provenance limitations. Neither is retroactively repaired with invented evidence.

`npm ci --engine-strict --no-audit --no-fund` passed at the root; `npm test` passed all seven tests; source parity passed; scratch generation matched all 118 generated files without modifying them. See [FINAL_REPORT.md](../FINAL_REPORT.md) for exact commands, final dashboard validation and artifact links.

Dashboard verification passed 576 filter selections against 1,589 summary rows, checked 257 raw links, and found no page errors. Desktop/mobile screenshots were reviewed. An initial verifier wait on native option visibility was corrected to attachment; its failed log is retained.

## Repository layout migration

The Angular applications now live at the repository root as `v14/` through `v22/`; before this refactor they were at `apps/angular-14/` through `apps/angular-22/`. Historical commit IDs and raw benchmark records intentionally retain their original provenance and are not rewritten. Commands in the historical records were run against the old layout; use the current scripts and root-level version directories when reproducing them from this checkout. This move does not change generated application contents, dependency pins, benchmark observations, or recorded hashes.
