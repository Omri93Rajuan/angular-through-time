# PR #12 architecture, factual and evidence-integrity review

Reviewed 2026-11-01. Original PR head:
`25e25be1dc1f50716582c1fb4fb222a37adcb976`; base:
`a6043de92d675d7bb7d76140f64a2dad0dd9df03` (`dev`).
Scope: all 16 original changed files, schemas/tools, all 51 feature entries and
79 events, five illustrative examples, 18 compatibility rows and the full
667-file evidence manifest. This is an engineering/source review, not researcher
approval, a new experiment or an external scientific peer review.

## Findings and focused corrections

No Critical or High issue was confirmed. The following Medium issues were
reproduced on the original head and corrected on the same PR branch. Original
links below identify the code before correction; fixes are in the current tools.

| Severity | Original location | Review comment | Impact and correction |
|---|---|---|---|
| Medium | [inventory.mjs:50](https://github.com/Omri93Rajuan/angular-through-time/blob/25e25be1dc1f50716582c1fb4fb222a37adcb976/tools/evolution/inventory.mjs#L50) | Preserve identity fields already present in manifests and provenance. | 43 compilation records lost their version/track; 16 historical builds and 18 Lighthouse records lost `provenance.sourceDirty`. The extractor now uses those saved fields, without guessing missing values. Additive `context` retains workload, cache, protocol and order information needed to avoid accidental pooling in a UI. Original experiment/batch IDs remain intact. |
| Medium | [inventory.mjs:50](https://github.com/Omri93Rajuan/angular-through-time/blob/25e25be1dc1f50716582c1fb4fb222a37adcb976/tools/evolution/inventory.mjs#L50) | Make the usage classification agree with timing eligibility and verification purpose. | 19 installation records, 36 timing-ineligible native builds and five diagnostic records were `descriptive-only`. They are now `verification-only`; rejected records fail closed as well. This changes the derived display classification, not raw acceptance or the existing audit's eligibility. All 18 eligible native timings remain descriptive only. |
| Medium | [inventory.mjs:22](https://github.com/Omri93Rajuan/angular-through-time/blob/25e25be1dc1f50716582c1fb4fb222a37adcb976/tools/evolution/inventory.mjs#L22) | Anchor a versioned snapshot to its declared source tree rather than every future file in HEAD. | Any later pilot would force v1 regeneration, while any later confirmatory archive would make the v1 CI gate fail, conflicting with the documented separate-version import. Membership now comes from the baseline Git tree. Existing files must match its original blobs; later archives belong to a new dataset and do not alter or invalidate v1. |
| Medium | [validate.mjs:59](https://github.com/Omri93Rajuan/angular-through-time/blob/25e25be1dc1f50716582c1fb4fb222a37adcb976/tools/evolution/validate.mjs#L59), [validate.mjs:74](https://github.com/Omri93Rajuan/angular-through-time/blob/25e25be1dc1f50716582c1fb4fb222a37adcb976/tools/evolution/validate.mjs#L74), [validate.mjs:78](https://github.com/Omri93Rajuan/angular-through-time/blob/25e25be1dc1f50716582c1fb4fb222a37adcb976/tools/evolution/validate.mjs#L78) | Reject semantically empty compatibility ranges and contradictory date/lifecycle records. | `<0.0.0` passed as a Node requirement; support could end before release; an already-stable feature could stabilize again; removals could omit breaking warnings. Focused semantic assertions now reject these cases. Month-only dates remain intervals; no exact cutoff is invented. |
| Medium | [query.mjs:46](https://github.com/Omri93Rajuan/angular-through-time/blob/25e25be1dc1f50716582c1fb4fb222a37adcb976/tools/evolution/query.mjs#L46) | Retain limitations when projecting comparison results into upgrade/timeline output. | Array-only projections dropped the comparison warning. All CLI modes now include scope, uncertainties and an interpretation warning. An empty upgrade list cannot be read as evidence of a safe or change-free upgrade. Existing `result` shapes remain unchanged. |
| Low | [framework.json, template-hmr event](../research/evolution/v1/framework.json) | Cite the source that explicitly distinguishes stabilization from enabling a default. | The v20 announcement describes template HMR by default; the official roadmap explicitly confirms stabilization in v20. Added that precise source without changing the event's version/status. |

Content revision **1.0.1** records these pre-merge corrections. Framework/support
review date is 2026-11-01; the acquisition baseline and its historical dates are
unchanged. There are still 51 features and 79 events, now with 40 source entries.

## Factual and architectural assessment

The important lifecycle distinctions are supported by primary sources:

- Standalone preview in 14, stable APIs in 15, CLI default in 17 and decorator
  default in 19 are separate events. The [v15 announcement](https://blog.angular.dev/angular-v15-is-now-available-df7be7f2f4c8),
  [CLI 17 release](https://github.com/angular/angular-cli/releases/tag/17.0.0) and
  [framework 19 release](https://github.com/angular/angular/releases/tag/19.0.0)
  support the distinction.
- Core Signals stabilization in 17 does not stabilize effects or all signal APIs.
  [17.0.0](https://github.com/angular/angular/releases/tag/17.0.0),
  [17.1.0](https://github.com/angular/angular/releases/tag/17.1.0),
  [17.2.0](https://github.com/angular/angular/releases/tag/17.2.0),
  [17.3.0](https://github.com/angular/angular/releases/tag/17.3.0),
  [19.0.0](https://github.com/angular/angular/releases/tag/19.0.0) and the
  [v20 announcement](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301)
  support the separate input/query/model/output/effect transitions.
- Control flow and defer move from preview in 17 to stable in 18; zoneless is
  experimental in 18, preview in 20, stable in 20.2 and default in 21.
  [v18 announcement](https://blog.angular.dev/angular-v18-is-now-available-e79d5ac0affe),
  [20.2.0 release](https://github.com/angular/angular/releases/tag/20.2.0),
  [v21 announcement](https://blog.angular.dev/announcing-angular-v21-57946c34f14b).
- Signal Forms and Aria have different initial maturity statuses in 21, then
  stabilize with asynchronous resource APIs in 22. OnPush becomes the default
  in 22. These are supported by the [v21 announcement](https://blog.angular.dev/announcing-angular-v21-57946c34f14b),
  [official v22 page](https://angular.dev/events/v22) and
  [component strategy documentation](https://angular.dev/guide/components/advanced-configuration).
- Template HMR's stable status is explicitly confirmed by the
  [official roadmap](https://angular.dev/roadmap). The v22 webpack deprecation
  is supported by the [v22 announcement](https://blog.angular.dev/announcing-angular-v22-c52bb83a4664).
- The selected removals/deprecations and compiler semantics were checked in
  official framework release records. For example, the actual removal of
  `moduleId`/custom interpolation is documented in
  [21.0.0](https://github.com/angular/angular/releases/tag/21.0.0); an older planned
  removal date must not replace the actual release record.
- Release dates for 14–21 were independently checked against GitHub release API
  timestamps. The 18 compatibility rows agree with the
  [official compatibility table](https://angular.dev/reference/versions).
  Current support status/dates and the v22 cadence agree with the
  [official release policy](https://angular.dev/reference/releases).

No incorrect version attribution was confirmed in the reviewed catalog. All
five examples were inspected as migration snippets, not compiled programs.
The typed-control example correctly discloses its changed reset/nullability
behavior. Schema consistency cannot establish source entailment; this source
review is a separate check. Benefits/trade-offs remain editorial interpretations,
not measured speedup claims.

The architecture is appropriate for a static dataset-backed UI: facts and
observations have different files, schemas and claim types; features have stable
IDs and lifecycle events; release/compatibility rows retain minor specificity;
evidence points retain source paths and numeric pointers. No service layer,
database abstraction or frontend is required for this PR.

## Integrity and validation

An independent comparison against `git show <dev-base>:<path>` verified all
667 original file bytes and hashes. A comparison of the old and revised derived
inventory verified identical file manifests, all 50 group identities and all
numeric measurements in 404 records. Acceptance, status, acquisition commit,
experiment ID, repetition, scenario and recorded timing eligibility did not change.

The only normalized existing-record changes are 43 versions, 43 tracks, 34
clean-source flags and 60 usage classifications; `context` is additive. No raw
record was created, overwritten or removed. The frozen approval-binding hash is
still `60ae7ed6133b61848783fedaed96c316ea635625f295f83466dea8d3a493d702`.
Collector, analyzer, protocols and root research lock have no diff from dev.

Local verification:

- 43/43 existing tests; all original six data tests plus five focused regression
  tests (11/11 total).
- Dataset schema/semantic validation, deterministic coverage, negative fixtures
  and unchanged evidence checks.
- Existing historical/pilot audit: 325 historical files, two retrospective pilot
  batches, eight pilot attempts and zero errors.
- Legacy generation/parity, all 218 research generated files and nine native
  recipe validations; existing dashboard browser smoke test.
- Existing synthetic confirmatory dry run: 396 **synthetic** slots, nine
  contrasts, deterministic analysis, failure and interruption recovery. It used
  disposable temporary output and is not scientific evidence.
- Actionlint, whitespace/syntax checks and isolated tooling dependency audit.

The original head had 30/30 GitHub checks passing. The corrected head must pass
the same three workflows (CI, Research v2 correctness, Evolution dataset);
the PR check rollup records their actual outcome. CI is regression evidence,
not proof of factual correctness or scientific validity.

## Remaining limitations and UI contract

- This is a curated catalog, not exhaustive API availability. `featureIds` means
  features changed in a major. Null state, empty changes and missing minor rows
  mean uncollected information, not absence. Preserve the query warnings in a UI.
- Live documents can drift. The v22 framework and CLI release endpoints still
  returned 404 on review; official documentation supports the recorded v22 facts.
  Full release artifacts/timestamps are not invented. Historical support-end
  dates for 14–19 and later 22.x compatibility remain uncollected.
- Graphs may display context-labelled descriptive observations. They must not
  plot verification-only durations as benchmark results, treat ticks as
  independent runs, pool batches/architectures/cache states, or infer feature
  causality from cross-version results. Preserve all failed/unavailable cases.
- B and M4 are separate acquisition experiments even where they reuse the same
  Angular 22 application manifest. Presentation opportunity is not a physical
  presentation or INP measurement. Historical revision-signal idiomatic results
  are not full Signals architecture results.
- The tiny pilots, one-host setting, uncontrolled power/thermal/cache conditions,
  missing provenance and n=1 native cache cells remain limitations. Correctly
  hashing an observation does not make it scientifically generalizable.
- There are no real confirmatory results in this snapshot. A future versioned
  import must verify the original approved source, complete archive, seals and
  analyzer eligibility. No approval or collection is authorized by this review.

Recommendation after green checks: **APPROVE WITH LIMITATIONS**. The data layer
supports version selection, side-by-side documented comparisons, timelines,
curated migration/compatibility guidance and cautious descriptive graphs. No
additional generic backend is needed before that UI. Confirmatory comparison
graphs remain dependent on separately authorized collection and a reviewed import,
not on a missing UI implementation in this PR.
