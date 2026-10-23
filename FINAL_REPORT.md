> Historical protocol/report: the observations below remain unchanged. Research v2 methods, verification and limitations are documented in [the v2 report](docs/RESEARCH_V2_REPORT.md) and [methods](docs/RESEARCH_V2_METHODS.md). Do not treat old samples as validation of new implementations.

# Angular Through Time — final verification report

Continuation date: 2026-10-19. Existing code, Git history, raw samples, logs and emitted artifacts were inspected before work resumed. The zero-change control and historical endpoint cold builds had already finished; they were audited rather than repeated. No runtime matrix was restarted.

## Completed evidence

- **18 production variants:** Angular 14–22, baseline and idiomatic. Full-matrix runtime batch contains **144 accepted A–H samples**; endpoint B/H batch contains **32 accepted samples**, four repetitions per variant. Final checksums agree across comparable variants.
- **Zero-change 1 Hz control:** Angular 22 baseline, three ticks, checksum `ba2bdece`, no late events. This is a narrow control, not a full-matrix zero-workload study.
- **Clean installs:** all nine applications passed `npm ci --engine-strict --no-audit --no-fund` using supported pinned Node/npm versions, with unchanged lockfiles. Angular 14 required compatible browserslist/node-releases overrides. Angular 17's incompatible optional lzma binary is skipped, not installed.
- **Cold builds:** the repaired endpoint batch contains **16 successful builds**, four per version/track, each variant occupying every execution position once. Dist and CLI caches were cleared before each build; installation was excluded and OS page cache retained. Inputs, lockfiles, source commit, toolchains, execution order and emitted hashes are recorded. Emitted JS matches previously validated runtime artifacts exactly. Historical and repaired batches remain separate.
- **Separate Lighthouse diagnostics:** 18/18 accepted reports in `lighthouse-2026-10-19T08-34-40.295Z`, one per variant, with full LHR, final checksum, artifact hashes and no Lighthouse run warnings. No workload benchmarks or builds ran concurrently.
- **Replay and sample audit:** 189 accepted runtime samples in total, including historical smoke evidence; 861 measured update ticks, 330 late updates, zero discarded updates under serial backpressure. All replay/checksum and timing consistency checks pass. Seven descriptive 1.5×IQR outlier flags remain included. One historical runtime rejection and one rejected Lighthouse attempt are preserved.

| Runtime batch | Accepted | Late / measured ticks | Maximum lateness |
|---|---:|---:|---:|
| Full matrix `2026-10-18T14-10-28.721Z` | 144 | 174 / 504 | 2273.90 ms |
| Endpoint repetitions `2026-10-18T14-24-28.363Z` | 32 | 144 / 320 | 1393.20 ms |
| Zero control `2026-10-18T14-29-26.459Z` | 1 | 0 / 3 | 3.90 ms |

The totals also include two unversioned historical smoke batches; they are not pooled with these experiments. Accepted means correct output, not sustained target rate.

## Commands and artifacts

Commands below use the repository root. Durable stdout/stderr is under [`benchmark/results/verification-logs/`](benchmark/results/verification-logs/).

| Status | Exact command | Evidence |
|---|---|---|
| Verified historical pass | `EXPERIMENT_LABEL=full-matrix-smoke VERSIONS=14,15,16,17,18,19,20,21,22 REPS=1 TICKS=4 node benchmark/harness/run.mjs` | [144 samples](benchmark/results/runtime/2026-10-18T14-10-28.721Z/) |
| Verified historical pass | `EXPERIMENT_LABEL=balanced-endpoint-repetitions VERSIONS=14,22 REPS=4 TICKS=10 HZ=10 SCENARIOS=B,H node benchmark/harness/run.mjs` | [32 samples and order](benchmark/results/runtime/2026-10-18T14-24-28.363Z/) |
| Verified historical pass | `VERSIONS=22 TRACKS=baseline REPS=1 TICKS=3 HZ=1 WORKLOAD=0 MODE=mutation SCENARIOS=B node benchmark/harness/run.mjs` | [Zero-control sample](benchmark/results/runtime/2026-10-18T14-29-26.459Z/) |
| PASS | `node scripts/verify-installs.mjs` | [Per-runtime install audit](benchmark/results/audits/installs.json), `npm-ci-14.txt` through `npm-ci-22.txt` |
| PASS | `SKIP_INSTALL=1 BUILD_REPS=4 VERSIONS=14,22 node scripts/build.mjs` | [Repaired execution order](benchmark/results/build-orders/build-2026-10-19T08-27-42.151Z.json), `repaired-endpoint-cold-builds.txt`, [raw builds](benchmark/results/builds/) |
| PASS | `node scripts/verify-generated.mjs` | `generated-parity.txt`: all 118 generated files match scratch generation; working files untouched |
| PASS | `VERSIONS=14,15,16,17,18,19,20,21,22 REPS=1 node benchmark/harness/lighthouse.mjs` (corrected harness) | [18 full reports](benchmark/results/lighthouse/), [execution order](benchmark/results/lighthouse-orders/lighthouse-2026-10-19T08-34-40.295Z.json), `lighthouse-owned-page.txt` |
| PASS | `npm ci --engine-strict --no-audit --no-fund` | `root-ci-final.txt`: 116 packages installed |
| PASS | `npm test` | `unit-tests-final.txt`: 7 passed, 0 failed |
| PASS | `node scripts/check-parity.mjs` | `source-parity-final.txt`: all nine engines, baseline templates, styles and exact pins agree |
| PASS | `node scripts/audit-results.mjs` | [Audit](benchmark/results/audits/results.json): 0 integrity errors, 7 retained outlier flags, 18 Lighthouse reports |
| PASS | `npm run summarize` | [JSON](benchmark/results/summary.json), [summary CSV](benchmark/results/summary.csv), [samples CSV](benchmark/results/samples.csv), [raw timings CSV](benchmark/results/timings.csv): 1,589 summary rows |
| PASS | `node scripts/verify-dashboard.mjs` | [Dashboard audit](benchmark/results/audits/dashboard.json): 576 selections, 257 raw links, 1,589 verified summary rows, no page errors; `dashboard-final.txt` |
| PASS | `git diff --check` | No whitespace errors |

[Desktop preview](docs/previews/dashboard-verified-desktop.png) · [Mobile preview](docs/previews/dashboard-verified-mobile.png). Dashboard batch, profile and track filters match raw sample membership; rejected observations are excluded from statistics and remain listed.

## Retained failures and provenance limits

- The first resumed `VERSIONS=14,15,16,17,18,19,20,21,22 REPS=1 node benchmark/harness/lighthouse.mjs` failed its post-run assertion because Lighthouse closed its self-owned page. The harness now passes an explicitly owned Puppeteer page. [Rejected diagnostic](benchmark/results/diagnostic-failures/lighthouse-2026-10-19T08-31-20.494Z-14-baseline-0.json); log `lighthouse-all-variants.txt`. That first attempt has no retained LHR and is not a measurement used in summaries.
- The strengthened `node scripts/audit-results.mjs` initially failed because the historical full-matrix build predates saved build orders. It now reports missing historical order as a provenance limitation; the two repeated endpoint batches have verifiable orders. Log `results-audit-missing-historical-order.txt` retains the failure.
- `node scripts/verify-dashboard.mjs` initially timed out waiting for a native dropdown option to be visible. The verifier now waits for attachment; all selections pass. Log `dashboard-option-wait-failure.txt` preserves the failure.
- An earlier Angular 22 idiomatic functional attempt raced zoneless rendering; its rejected runtime JSON remains. Earlier compilation/installation failures are documented in [the verification ledger](docs/VERIFICATION.md).
- Unversioned smoke artifacts differ from current outputs and remain historical evidence. The audit records those hash differences; no raw files were rewritten.
- Historical Angular 14 builds used a transitive package declaring Node 18 under Node 16. They are preserved separately from the repaired strict-compatible batch; identical output hashes do not make build timings interchangeable.

## Interpretation and remaining scope

These are local descriptive measurements, not performance rankings. Both tracks deliberately use the **webpack browser builder**. They do not measure default Angular CLI builder evolution through esbuild/Vite. The idiomatic track uses a conservative revision-signal adapter, not a fully signal-derived optimized store.

Machine load, thermal state, CPU governor and OS cache are uncontrolled. Short samples, fixed scenario order, serial backpressure, automation overhead and sampled JS heap limit interpretation. Targeted records may have zero deltas; finite-window throughput can exceed nominal rate and is not sustained capacity. No physical FPS, process RSS, independent producer loss, statistical significance or full rate/mode/workload factorial is claimed.

Remaining work is optional broader research: longer repeated independent runs, isolated hardware controls, the full factorial, and a separately designed default-builder comparison. See [methodology](METHODOLOGY.md), [limitations](LIMITATIONS.md) and [reproduction instructions](README.md).
