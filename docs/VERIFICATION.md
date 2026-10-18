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
