# Evolution data coverage and evidence audit

Snapshot: 2026-10-29; inventory baseline dev
`a6043de92d675d7bb7d76140f64a2dad0dd9df03`.
The [machine-readable coverage](../research/evolution/v1/coverage.json) is derived
from the two datasets and checks their SHA-256 identities.

## Framework coverage

The [framework dataset](../research/evolution/v1/framework.json) contains all nine
majors, 51 named features, 79 lifecycle events, 39 source entries, 18 compatibility
rows and five code examples. Release dates, support states and compatibility are
individually cited. Source entries include one explicitly unavailable release
record; unavailable sources cannot support factual feature claims.

| Major | Principal coverage | Release/source trail |
|---|---|---|
| 14 | Standalone preview, typed forms, lazy components, experimental esbuild, form-option deprecation | [Framework 14.0.0](https://github.com/angular/angular/releases/tag/14.0.0), [CLI 14.0.0](https://github.com/angular/angular-cli/releases/tag/14.0.0) |
| 15 | Stable standalone, directive composition, HTTP providers, migration schematic, compiler option removal | [Framework 15.0.0](https://github.com/angular/angular/releases/tag/15.0.0), [release blog](https://blog.angular.dev/angular-v15-is-now-available-df7be7f2f4c8) |
| 16 | Preview Signals/hydration, required inputs, DestroyRef, ngcc removal, injection-context migration | [Framework 16.0.0](https://github.com/angular/angular/releases/tag/16.0.0), [release blog](https://blog.angular.dev/angular-v16-is-here-4d7a28ec680d) |
| 17 | Stable core Signals/hydration, preview control flow/defer, application builder default, minor-version signal APIs | [Framework 17.0.0](https://github.com/angular/angular/releases/tag/17.0.0), [CLI 17.0.0](https://github.com/angular/angular-cli/releases/tag/17.0.0); exact 17.1/17.2/17.3 entries in dataset |
| 18 | Stable control flow/defer, experimental zoneless, scheduler/coalescing changes, HTTP module deprecation | [Framework 18.0.0](https://github.com/angular/angular/releases/tag/18.0.0), [release blog](https://blog.angular.dev/angular-v18-is-now-available-e79d5ac0affe) |
| 19 | Standalone decorator default, stable signal inputs/queries/model/output, preview/experimental reactivity and hydration, effect timing | [Framework 19.0.0](https://github.com/angular/angular/releases/tag/19.0.0), [release blog](https://blog.angular.dev/meet-angular-v19-7b29dfd05b84) |
| 20 | Stable effects/linkedSignal/incremental hydration, zoneless preview then stable in 20.2, template syntax/HMR, Vitest experiment | [Framework 20.0.0](https://github.com/angular/angular/releases/tag/20.0.0), [20.2.0](https://github.com/angular/angular/releases/tag/20.2.0), [release blog](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301) |
| 21 | Zoneless default, Signal Forms experiment, Aria preview, stable/default Vitest, host type checking and router migration | [Framework 21.0.0](https://github.com/angular/angular/releases/tag/21.0.0), [release blog](https://blog.angular.dev/announcing-angular-v21-57946c34f14b) |
| 22 | Stable Signal Forms/Aria/resources, OnPush default, template comments, webpack deprecation and changed release cadence | [Official release page](https://angular.dev/events/v22), [release blog](https://blog.angular.dev/announcing-angular-v22-c52bb83a4664), [release policy](https://angular.dev/reference/releases) |

The table is an index, not an exhaustive changelog. The JSON records exact
introduction/stabilization/default/deprecation/removal versions and selected
migrations. `categoriesWithoutDedicatedEntry` identifies gaps in the curated
index; it does **not** assert that Angular made no changes in those areas.

Known omissions and uncertainty:

- Support is an as-of snapshot from the [official support table](https://angular.dev/reference/releases).
  Historical end-of-support dates for 14–19 are uncollected/null. Future
  month-only dates retain month precision. Do not apply the current cadence
  retroactively to older releases.
- [Compatibility](https://angular.dev/reference/versions) is transcribed by
  minor ranges. The retrieved table lists 22.0.x; later 22.x compatibility is
  uncollected, despite a newer site version. Do not extrapolate that row.
- Framework and CLI GitHub release-by-tag requests for 22.0.0 returned HTTP 404
  during research. Accessible official release documentation supports v22 facts;
  no GitHub publication timestamp is invented.
- The reviewed 19.0.0 release has no separate deprecations section. This does not
  establish absence of deprecations throughout 19.x.
- Material/CDK details, every patch, all minor API signature revisions and
  exhaustive package-level breaking/deprecation lists are outside this snapshot.
  Use the [official update guide](https://angular.dev/update-guide) and the
  linked release notes for production migrations. API examples here illustrate
  migration concepts; they are not a compilation matrix.
- Live pages may change after retrieval. This snapshot stores URLs, retrieval
  dates and locators, not complete copies of upstream documents. Factual source
  entailment needs human review; structural validation cannot establish it.

## Saved evidence inventory

Every one of the **667 tracked files** beneath `benchmark/results`,
`benchmark/results-v2` and `benchmark/results-confirmatory` is indexed by path,
original group/batch, byte count and SHA-256. There are 50 groups and 404 JSON
records with selected numeric observations. These counts are **not sample
sizes**. Full raw files remain authoritative, including failures and metadata
that have no extracted metric. Logs and derived CSV/JSON summaries are included
in the file manifest and must not be counted as additional observations.

| Dataset family | Files | Numeric records | Scientific use / missing information |
|---|---:|---:|---|
| Historical runtime | 200 | 189 | Short, mixed original workloads/tracks. Preserve original experiment and revision-signal idiomatic labels; no equivalence to v2 architecture |
| Historical builds | 68 | 68 | Controlled-toolchain timings and bundle assets; cache labels do not certify cold OS cache or native defaults |
| Historical Lighthouse | 18 | 18 | Navigation audit scores/timings, not update latency or independent runtime replication |
| V2 runtime pilots | 10 | 8 | Two B endpoint blocks and two M4 blocks; six events per attempt; no sustained-tail or confirmatory inference |
| V2 native feasibility | 148 | 73 | Install, verification and cache-cell measurements coexist; read existing `timingEligible` and deviations before even descriptive comparison |
| V2 compilation verification | 86 | 43 | Incidental build durations, not balanced build-performance measurements |
| Development diagnostic workflow | 10 | 5 | Deliberate errors/CSS/recovery; no watcher/HMR latency or productivity study |
| Instrumented consumer diagnostics | 3 | 0 | Hook/template/DOM counts remain in raw files; instrumentation is not runtime performance evidence |
| Supporting/derived files | 124 | 0 | Verification/feature/history results, orders, metadata, logs, audits and summaries; no extra independent samples |

The manifest covers **325 historical and 342 v2 files**. Existing historical
blob/tree verification and the two pilot catalogs are checked independently.
The pilot catalogs are retrospective: zero batches have acquisition-time seals.
See the [v2 report](RESEARCH_V2_REPORT.md) and
[raw audited summary](../benchmark/results-v2/summary.json) for original
acceptance, deviations and exploratory observations. The older report's pilot
planning text is historical context; the separate
[confirmatory proposal](CONFIRMATORY_CAMPAIGN.md) is authoritative for a future
authorized campaign. This dataset does not revise either document's decisions.

Of the 404 numeric records, **109 lack a saved acquisition source commit** and
**57 lack the environment container/metadata recognized by this extractor**.
These are transparent extraction gaps, not a claim that the other records have
complete environment control. Source dirty status, acceptance and timing
eligibility remain their saved values or null. Missing provenance is never
filled with the dataset-generation commit. Numeric values are copied without
rounding and linked by JSON Pointer to the original record. Metrics not selected
by the extractor remain available in the hashed raw file.

Only the 18 cold/warm attempts in the final native batch have timing eligibility
in the existing summary. Earlier/native installation records are retained;
eligibility is neither re-adjudicated nor implied by the presence of elapsed
time. Even eligible native observations have n=1 per version/cache cell and
fixed order; they do not support a build-speed ranking. Pilot ticks are not
independent runs. Presentation opportunity is not a physical presentation time.

## Missing experimental coverage and isolation

There are **zero tracked real confirmatory attempts** and no primary conclusions
to import. Missing evidence includes long-window B measurements for all nine
versions, adequately repeated M4 results, cross-host replication, a complete
balanced native build campaign, controlled memory/startup-requested-byte studies
and reliable HMR/watch-latency measurements. No documented feature is used as a
substitute for these measurements.

Source fixtures, synthetic unit/dry-run data and disposable CI browser-validation
outputs are verification inputs/outputs, not public performance observations.
Local preparation packages, ignored build artifacts, user worktrees and external
approval/session templates are excluded from the Git-tracked evidence inventory.
Their exclusion does not imply the checks were never performed, nor that live
host conditions or researcher approval have been established.

Future confirmatory archives require a new, reviewed evidence dataset and the
[documented import procedure](ANGULAR_EVOLUTION.md#importing-future-confirmatory-results).
Historical/pilot IDs, raw bytes, protocol identity, acquisition conditions and
all failed attempts must remain intact.
