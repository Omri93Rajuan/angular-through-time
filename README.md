# Angular Through Time

An original, reproducible research project comparing Angular 14–22 through **Market Terminal**: a fictional 5,000-asset monitoring application. No trading, external market feed, invented performance data or unsupported speed claims.

Two separately built tracks hold common functionality: a controlled baseline and a conservative idiomatic evolution. See [methodology](METHODOLOGY.md), [architecture](ARCHITECTURE.md), [exact versions](VERSION_MATRIX.md), [limitations](LIMITATIONS.md), [implementation plan](IMPLEMENTATION_PLAN.md) and [attribution](ATTRIBUTION.md). Actual executed status is recorded in [verification](docs/VERIFICATION.md).

## Quick start

Use Linux with Node **22.23.2**, npm **10.9.8 or 11.6.2**, network access for the first install, and Google Chrome. Builds install their own exact supported Node/npm binaries under `.runtimes/`; do not run old Angular builds using the root Node runtime directly.

```bash
npm ci
npm test
# Production builds of the two endpoint versions, both tracks:
npm run build
# Local static terminal (not a development server):
npm run serve
# http://127.0.0.1:4200
```

The build script uses each application's lockfile through `npm ci`. `SKIP_INSTALL=1` skips installation only if the required dependencies already exist. The script removes dist and CLI caches before timing each compilation. Both tracks use webpack deliberately; v22 reports deprecation warnings.

## Reproduce experiments

```bash
# All 18 production variants (sequential builds):
VERSIONS=14,15,16,17,18,19,20,21,22 npm run build

# Default: endpoint versions, both tracks, A–H, three repetitions, ten ticks at 5 Hz
CHROME=/opt/google/chrome/chrome npm run bench

# Targeted experiment:
VERSIONS=14,22 TRACKS=baseline REPS=5 TICKS=30 HZ=10 MODE=records SCENARIOS=B,H npm run bench

# All versions, both tracks:
VERSIONS=14,15,16,17,18,19,20,21,22 REPS=3 npm run bench

# Separate Lighthouse diagnostic runs:
VERSIONS=14,22 REPS=3 node benchmark/harness/lighthouse.mjs

npm run summarize
node scripts/serve.mjs .
# Open http://127.0.0.1:4200/dashboard/
```

`MODE` is mutation, records or array; F always uses full-array replacement. `HZ` is 1, 5 or 10. `WORKLOAD=0`, `100`, `500` or `2000` overrides runtime scenario record counts; A stays initial navigation and F stays 5,000 records. Each profile is retained separately in summaries. `SCENARIOS` accepts comma-separated A–H. Set `HEADED=1` for visible browser runs (requires a display); record this as a separate experiment. The same Chrome executable, viewport and launch policy apply across a run. Keep other machine activity low; close unrelated workloads before publishing measurements. Build and browser measurements are separate and must not overlap for controlled results.

The runtime harness fails closed if functional assertions, page errors, checksums or visible DOM values fail. Failed JSON remains in the result directory. Accepted update scenarios B–H retain event logs, raw timing series and artifact hashes. Navigation samples retain navigation observations and final checksums; historical navigation samples have no per-sample bundle hash. `metadata.json` records environment and source information, and `order.json` records execution order. Summaries include median, quartiles, IQR, min/max and n. CSV files expose summaries and raw sample locations; JSON contains full diagnostics. Lighthouse results retain the full LHR report. Build results list each emitted JS artifact once with uncompressed, gzip and Brotli sizes.

## Development

Edit `templates/` and `packages/market-fixtures/engine.js`, then `npm run generate`. Generated sources intentionally live in independent app directories for historical compiler compatibility. Regenerate the documentation matrix with `node scripts/matrix-doc.mjs`. Build and rerun functional gates after changes. The terminal starts paused; use Resume, Advance one tick or deterministic replay controls to exercise it.

No global packages, backend, API keys, CDN assets or third-party data services are required. Dependencies are installed once per major, approximately several GB across all variants. Runtime isolation is by dependency directory and executable PATH, not a security sandbox or OS container.

## Research status

All nine versions have passed both production builds and the shared functional workflows, with 144 accepted A–H matrix samples. Endpoint repetition and zero-change control runs are also retained; see the verification ledger for exact commands and evidence.

This repository is an executable experimental apparatus. Local results establish functionality and reproducibility of replay; they are not evidence of general statistical superiority. Read the verification ledger before treating an implementation phase as validated. Follow the documented protocol and retain all observations when conducting a controlled study.

For repeated cold-build measurements, use `BUILD_REPS=4 VERSIONS=14,22 npm run build`. Repeated build ordering rotates and reverses the version/track sequence; the complete order is retained under `benchmark/results/build-orders/`. The dashboard also exposes build size/time and Lighthouse diagnostic batches without pooling them into runtime scenarios.

## Verified continuation (2026-10-19)

See [FINAL_REPORT.md](FINAL_REPORT.md) for the command ledger and measured evidence. All nine clean application installs passed `npm ci --engine-strict` on their recorded supported Node versions. Angular 14 pins `browserslist@4.26.3` and `node-releases@2.0.27` to retain Node 16 compatibility. The repaired endpoint cold-build batch is separate from historical builds; its emitted JavaScript hashes match the validated runtime artifacts.

After provisioning runtimes with the build script, reproduce verification with:

```bash
node scripts/verify-installs.mjs
SKIP_INSTALL=1 BUILD_REPS=4 VERSIONS=14,22 node scripts/build.mjs
# Run browser measurements only after builds finish:
VERSIONS=22 TRACKS=baseline REPS=1 TICKS=3 HZ=1 WORKLOAD=0 MODE=mutation SCENARIOS=B npm run bench
VERSIONS=14,15,16,17,18,19,20,21,22 REPS=1 node benchmark/harness/lighthouse.mjs
npm test
node scripts/check-parity.mjs
node scripts/verify-generated.mjs
node scripts/audit-results.mjs
npm run summarize
node scripts/verify-dashboard.mjs
```

The saved zero-change test already passed and was audited rather than repeated. One Lighthouse observation per variant is diagnostic evidence only. Preserve raw results and compare only within the same experiment and workload profile.
