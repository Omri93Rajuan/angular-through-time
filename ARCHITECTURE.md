# Architecture

`packages/market-fixtures/engine.js` is a dependency-free UMD engine used unchanged by Node and browser script bundles. Angular compilers do not consume modern shared TypeScript. `packages/benchmark-contract/contract.json` defines the external interface. `templates/` owns the common UI and compatible adapter body; `scripts/generate.mjs` materializes isolated projects and explicit stable architecture variants. Generated source is committed so changes can be reviewed without executing a generator. Edit templates then regenerate; do not hand-edit generated source.

`v14/` … `v22/` each have exact framework/CLI/TypeScript/RxJS/Zone/tslib pins, their own lockfile, `.nvmrc`, and two build targets. Baseline and idiomatic are separately built bundles, not runtime switches. The harness does not load into Angular and controls updates over `window.market`.

The applications previously lived at `apps/angular-14/` … `apps/angular-22/`. Historical commits and benchmark provenance refer to that earlier layout; the recorded raw results and hashes are unchanged. Reproduction with the current checkout uses the corresponding `v<major>/` directory.

`scripts/build.mjs` installs pinned local Node/npm pairs, resolves dependencies on first install then uses npm ci, clears build caches and records production build artifacts. `scripts/serve.mjs` serves only static files bound to loopback. `benchmark/harness/functional.mjs` gates measurements; `run.mjs` executes replay and stores raw JSON; `summarize.mjs` emits descriptive JSON/CSV. `dashboard/` is an independent dependency-free results explorer and never loads into measured apps.

The terminal has no network API dependency. Timers only control delivery cadence; they never choose events. Initial state is paused to protect navigation measurements. UI controls and the harness use the same state transition code. No persistence is used, ensuring watchlist reset is repeatable.

```mermaid
flowchart LR
  F[Seeded fixtures and event log] --> H[Independent Node harness]
  T[Shared templates + version matrix] --> A[9 isolated apps × 2 tracks]
  A --> B[Pinned runtime production builds]
  B --> S[Loopback static server]
  S --> C[One Chrome binary]
  H -->|Playwright actions and controlled ticks| C
  C -->|DOM assertions, timings, CDP| R[Raw JSON and CSV]
  B -->|Build durations and asset hashes| R
  R --> D[Descriptive summaries and dashboard]
```
