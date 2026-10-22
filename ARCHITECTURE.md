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

## Research v2 namespaces

The legacy generator and source remain intact. `scripts/generate-research.mjs` emits independent B and portable C source under `v*/src/research`, with separate build recipes and manifests. `native/v*` retains exact CLI default configurations; `research/native/v*/scaffold` preserves the unmodified scaffold and `adaptation.json` records the changes. Default builders are observed from generated recipes, not inferred from installed packages.

```mermaid
flowchart TD
  E[Unchanged canonical engine] --> P[Mutation-safe entity publication]
  P --> I[14–16 immutable inputs + imperative selectors]
  P --> S[17+ per-entity Signals + computed selectors]
  I --> G[Shell / toolbar / table / row / summary / chart / details]
  S --> G
  O[Independent fixture-derived Node oracle] --> V[Expanded browser acceptance]
  G --> V
  V --> R[Separate v2 pilot attempts + failures]
  M[Versioned manifest + build/input hashes] --> R
  R --> A[Run-level audit + paired block uncertainty]
  A --> D[Research v2 dashboard]
  C[Exact CLI scaffold] --> N[Portable imperative graph + native defaults]
  N --> B[Separate build/cache/diagnostic evidence]
```

Signal row consumers read only their own entity, watch and selection publications. The ordered-ID computed selector reads prices only for price sorting. The selected panel follows only the selected entity; aggregate work remains a full reduction. Older optimized components use immutable touched inputs and explicit invalidation rather than deliberately eager selectors. Both new designs preserve canonical mutation/allocation semantics and include UI publication cost in timings. See [v2 methods](docs/RESEARCH_V2_METHODS.md).
