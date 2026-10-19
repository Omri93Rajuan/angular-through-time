# Angular Through Time

**Angular Through Time** is a reproducible research project comparing the same fictional Market Terminal application across Angular 14–22. It includes isolated Angular applications, a deterministic market-data simulator, browser benchmark tooling, saved raw observations, verification records, and a results dashboard.

The project is an experimental apparatus, not a claim that one Angular release or architecture is universally faster.

## Market Terminal

Market Terminal is a client-only monitoring interface for 5,000 fictional assets. Its seeded engine and deterministic event log make the same market updates replayable across versions. The UI includes search and filtering, sorting, watchlist and selected-asset details, summaries, and a price chart. It uses no real market feed, backend, credentials, CDN assets, or trading functionality.

## What is implemented and what is proposed

The repository currently contains **18 buildable variants**: Angular 14–22, each with two separately built implementations:

| Implemented variant | What it represents |
|---|---|
| `baseline` | A common NgModule, Zone.js, eager-change-detection application using the shared Market Terminal and webpack browser builder. |
| `idiomatic` | A conservative, version-aware variant: standalone bootstrap from Angular 15, a revision-signal notification adapter from Angular 17, built-in `@for` loops from Angular 18, and zoneless scheduling in Angular 21–22. It remains a single component with eager derivations and the same webpack builder; it is not a fully signal-driven or default-CLI implementation. |

The [research realignment](RESEARCH_REALIGNMENT.md) is a **design proposal**, not completed implementation or new experimental evidence. It recommends three separately identified future tracks:

| Proposed track | Research question | Status |
|---|---|---|
| **Controlled Framework Evolution** | How does a fixed eager, Zone-based application change across framework/compiler releases under a common webpack policy? | Proposed; the existing baseline provides related historical evidence, but is not a newly validated controlled-v1 protocol. |
| **Idiomatic Angular Evolution** | What does a stable, deliberately optimized architecture appropriate to each Angular version deliver? | Proposed; the existing `idiomatic` variant does not implement the proposed component graph, computed state, or granular reactive architecture. |
| **Default Toolchain Evolution** | What do exact CLI-generated defaults deliver for build output, startup, runtime, and developer feedback? | Proposed; existing variants all use webpack, so default builder evolution is not measured. |

Do not interpret existing `baseline`/`idiomatic` results as results for the three proposed tracks or as isolated feature effects.

## Quick start

Use Node **22.23.2** and a compatible npm version (the project was verified with npm **10.9.8** and **11.6.2**). The first setup/build needs network access to install dependencies and pinned per-version runtimes. Chrome is required for browser benchmarks.

```bash
npm ci
npm test

# Build the endpoint versions (Angular 14 and 22), both implemented variants.
npm run build

# Serve the Angular 22 baseline production build at http://127.0.0.1:4200
npm run serve
```

The build script installs version-specific Node/npm binaries under `.runtimes/` and uses each app's committed lockfile. Dependencies across all nine applications require several GB. `SKIP_INSTALL=1` skips app dependency installation only when those dependencies are already present. Builds clear the relevant `dist` output and Angular CLI cache before compiling.

## Build, benchmark, and inspect results

Build all nine versions and both variants:

```bash
VERSIONS=14,15,16,17,18,19,20,21,22 npm run build
```

The runtime harness expects built artifacts, Chrome, and installed root dependencies. The default run covers endpoint versions, both variants, scenarios A–H, three repetitions, and ten ticks at 5 Hz:

```bash
CHROME=/path/to/chrome npm run bench
```

Example targeted run:

```bash
VERSIONS=14,22 TRACKS=baseline REPS=5 TICKS=30 HZ=10 \
  MODE=records SCENARIOS=B,H npm run bench
```

`MODE` accepts `mutation`, `records`, or `array`; scenario F always uses full-array replacement. `HZ` accepts 1, 5, or 10. `WORKLOAD` can override the record count with 0, 100, 500, or 2000; scenarios A and F retain their special behavior. `SCENARIOS` accepts comma-separated A–H. Use `HEADED=1` only when a visible browser run is intended, and report it separately.

Summarize retained runtime results and open the dashboard:

```bash
npm run summarize
node scripts/serve.mjs .
# Open http://127.0.0.1:4200/dashboard/
```

Lighthouse diagnostics are a separate experiment:

```bash
VERSIONS=14,22 REPS=3 node benchmark/harness/lighthouse.mjs
```

Build measurements are recorded separately from browser runtime measurements. Do not run builds and browser benchmarks concurrently when collecting controlled observations. The harness retains raw samples, event logs, execution order, environment metadata, failures, and provenance under `benchmark/results/`.

## Research method and current evidence

Each Angular application has pinned framework/toolchain dependencies and its own lockfile. Shared source is generated from `templates/`; the deterministic engine and benchmark contract are separate packages. Browser workflows are gated by functional checks, and benchmark replays retain checksums, raw timing observations, and environment metadata. See [methodology](METHODOLOGY.md), [architecture](ARCHITECTURE.md), [version matrix](VERSION_MATRIX.md), [verification ledger](docs/VERIFICATION.md), [final report](FINAL_REPORT.md), and [limitations](LIMITATIONS.md).

The recorded verification includes successful builds and functional checks for all 18 variants, a 144-sample one-repetition matrix, a separate 32-sample four-repetition endpoint batch, a narrow three-tick zero-workload control, and separate Lighthouse diagnostics. These are local descriptive checks, not statistically conclusive comparisons. The matrix sample count is small; some accepted updates were late; serial backpressure prevents dropped events by policy and is not an independent-arrival capacity test. Machine load, thermal state, CPU governor, and OS cache were not fully controlled. See the reports for exact commands, retained failures, and provenance limits. No performance ranking or general superiority claim is supported.

The proposed three-track design, feature ablations, stronger UI oracle, and default-toolchain study have **not** been implemented or measured. Do not mix future results with the historical samples; use distinct experiment and architecture identifiers.

## Reproducibility and development

Generated application sources are committed so they can be inspected without running the generator. To change shared templates or the engine:

```bash
# Edit templates/ and packages/market-fixtures/engine.js, then:
npm run generate
node scripts/verify-generated.mjs
npm test
```

Regenerate the documented version matrix with `node scripts/matrix-doc.mjs`. Install and runtime artifacts under `.runtimes/`, `node_modules/`, `dist/`, and Angular caches are local and ignored. Benchmark result data, failed observations, audit files, previews, and verification records are intentionally retained; do not remove or rewrite them to make results appear cleaner.

## Branch workflow

`main` is the stable, verified state; `dev` is the integration branch. Create future work on `feature/<short-description>` from `dev`, then merge through review. Keep benchmark protocol changes and their result sets identifiable; do not rewrite published history or mix incompatible experiment revisions.

## Attribution and license

The project's research organization was methodologically inspired by [Janirr/angular-evolution-benchmark](https://github.com/Janirr/angular-evolution-benchmark). Market Terminal, its seeded engine, UI, protocol, and results are original work; no implementation, prose, interface, dataset, or result was copied. See [ATTRIBUTION.md](ATTRIBUTION.md) for details and source references.

This project is distributed under the [MIT License](LICENSE). Angular and third-party dependencies remain subject to their respective licenses; production build notices are retained with the build outputs.
