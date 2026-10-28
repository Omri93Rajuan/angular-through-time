# PR #10 methodology and engineering review

Reviewed 2026-10-26, starting from `4ea247f619bc7d392ab79572ff708aa2a0345b06`.
The baseline had 29/29 successful GitHub checks. This review independently
re-executed tests and constructed counterexamples rather than treating green CI
as proof of research validity. No real collection or researcher authorization
records were created. The corrective changes are on the existing PR branch.

## Findings, severity and corrections

References below identify the original reviewed lines at the baseline commit;
current implementations are linked separately so the findings remain traceable.

| Severity | Original location | Finding and concrete action | Disposition |
|---|---|---|---|
| **Must fix — high** | `core.mjs:11`, `run.mjs:31` | Approval checked protocol and host but no campaign identity. Reusing the same approval with a new output ID could start another campaign, contrary to the separate-decision stopping rule. Bind approval to a canonical direct-child campaign ID and require that ID during preparation, collection and analysis. | Patched; different/missing campaign-ID authorization is rejected. |
| **Must fix — high** | `core.mjs:49` | Resume inferred whether a slot had been attempted solely from directory existence. A disposable reproduction collected slots `[0,1]`, removed sealed directory `0000`, resumed, and produced calls `[0,1,0]`. Missing observations could silently be replaced. Record an independent exclusive claim before collection and never execute a claimed slot again. | Patched; missing data become an explicit interrupted slot, missing registries/claims fail closed, and sealed evidence is verified before new collection. |
| **Must fix — medium** | `run.mjs:21` | Validation prohibited only descendants of historical/pilot roots. It allowed the confirmatory tree, exact evidence-root paths and symlink aliases. This contradicted the isolation rule. Resolve existing filesystem ancestors and reject all three evidence trees, including their roots. | Patched with lexical and symlink regression cases. |
| **Should fix — medium** | `analysis.mjs:61` | The independent audit counted warm-up records but did not check warm-up events, tick order, cadence, finite timings or whether measurement started after the nominal warm-up. A malformed producer could satisfy the count without the declared warm-up. | Patched; the audit checks event replay, timeline arithmetic and the minimum scheduled warm-up interval. Collection timing and statistical formulas are unchanged. |

Original source: [core](https://github.com/Omri93Rajuan/angular-through-time/blob/4ea247f619bc7d392ab79572ff708aa2a0345b06/benchmark/confirmatory/core.mjs#L11),
[runner](https://github.com/Omri93Rajuan/angular-through-time/blob/4ea247f619bc7d392ab79572ff708aa2a0345b06/benchmark/confirmatory/run.mjs#L21),
[analysis](https://github.com/Omri93Rajuan/angular-through-time/blob/4ea247f619bc7d392ab79572ff708aa2a0345b06/benchmark/confirmatory/analysis.mjs#L61).
Current fixes: [claim and authorization rules](../benchmark/confirmatory/core.mjs),
[entry point](../benchmark/confirmatory/run.mjs),
[warm-up audit](../benchmark/confirmatory/analysis.mjs).

The claim registry uses evidence storage revision 2, not a new research protocol.
The existing confirmatory protocol ID and JSON bytes remain unchanged, as do
historical and pilot evidence. The new collector will not resume an older
storage format; old validation artifacts remain readable by analysis. A source
commit change necessarily requires approval against the new source identity.

## Statistical implementation audit

- Sampling units are independent-process **blocks**, not ticks: 36 complete
  nine-treatment B blocks and 36 two-treatment M4 blocks. B22 observations are
  not reused as M4 controls. The common reference induces dependence between
  B contrasts, which the Bonferroni allocation does not assume away.
- The generator gives each B treatment every position four times, and each M4
  treatment every position 18 times; alternate-cycle reversal is implemented.
  Position balance is verified, but is not randomization or proof of independence.
- Run p95 uses linear interpolation at `(n-1)*0.95`. An independent known-value
  test gives **285.05** for presentation values 1 through 300.
- For each pair `(reference, treatment)`, analysis takes `log(treatment/reference)`,
  averages across blocks and exponentiates. This is a geometric mean paired ratio,
  not a ratio of arithmetic means or a pooled tick quantile. A separate exact
  two-block example verifies `sqrt(8)` and the bootstrap endpoints `[2,4]`.
- The seeded xorshift resampler draws complete block differences with replacement.
  It uses 100,000 draws, seed 14022 and quantiles at `0.05/(2*9)` and its complement.
  Each marginal nominal level is 99.444...%; the family target is 95%.
  [NIST's Bonferroni inequality](https://www.itl.nist.gov/div898/handbook/prc/section4/prc473.htm)
  justifies the alpha allocation, **not** the accuracy of bootstrap marginal
  coverage. Extreme percentile intervals with 36 observations remain approximate.
- Strict adjusted interval bounds below 0.90 or above 1.10 implement the declared
  10% directional rule. Touching either bound is inconclusive. Neither overlap
  with 1 nor an interval inside the practical band establishes equivalence.
- One failed/missing/invalid run makes its entire block incomplete. Primary
  inference for that experiment is withheld unless all 36 blocks are complete.
  Incomplete-case estimates remain descriptive and can be selection-biased;
  they must not be promoted to confirmatory conclusions. A complete M4 experiment
  can remain eligible when B is incomplete, using the original nine-way allocation.

## Methodological limitations requiring sign-off

**High scientific importance:** fixed order plus host drift. A roughly ten-hour
single-host sequence can have correlated blocks, persistent thermal/cache state
and periodic background effects. Position balance and fresh processes do not
establish the iid-block assumption used by the bootstrap. B-before-M4 ordering
also prevents an unconfounded comparison between those two experiments. Claims
must remain conditional on the recorded host, browser, order and workload.

**High scientific importance:** precision is not established by the pilots.
Two six-tick pairs cannot justify a power guarantee or establish the variance of
300-tick run p95s, especially for intermediate versions. The 36-block design is
an explicit budget/precision compromise. The documented 8.3% and 12.5% figures
are sensitivity calculations, not demonstrated precision. The researcher must
accept potentially wide/inconclusive results and approximate simultaneous coverage.

**Measurement interpretation:** 300 events have due times 0 through 59.8 seconds.
Completion can precede 60 seconds or overrun it. Warm-up is 150 events and at least
a nominal 30 seconds, not proven JIT/thermal equilibrium. Per-event fsync is outside
the primary interval but changes cadence and potentially rAF phase; the interval ending at the second animation-frame
callback includes scheduling and the tick check, not isolated rendering
cost. [Animation-frame callbacks precede repaint](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
Headless two-rAF timing does not measure GPU completion, physical display latency,
INP or independently arriving traffic capacity. Serial backpressure and a 15-minute
operational timeout are part of the declared setting.

**Exclusions and stopping:** complete-experiment gating avoids a fast-survivor
primary analysis but does not remove selection bias from descriptive survivors
or selectively published campaigns. A whole-session invalidation can still be
subjective; record the observed environmental violation and supporting detail
without consulting comparative performance. Do not repeatedly run campaigns until
one is favorable. The new campaign-ID binding prevents ordinary approval reuse;
it is not a cryptographic single-use authorization service.

**Integrity and environment:** approval/session files are local attestations,
not verified identities. Conditions are operator-attested, not continuous thermal
or governor telemetry. Seals and claim markers detect ordinary missing/changed
files; they cannot defend against a trusted operator deliberately rewriting the
entire ledger and its hashes. Invalidation records need external archival along
with raw data. Corrupt/truncated seals fail closed rather than being repaired or
trusted. Resume handles ordinary process interruption, not guaranteed recovery
from arbitrary filesystem/power-loss corruption. Archive the whole campaign,
including claim markers, invalidations and rejected attempts.

## Verification and recommendations

Baseline: 38 tests passed and 29/29 GitHub checks were successful at the reviewed
head. After patches: 43 local tests passed, including new missing-attempt,
symlink isolation, independent numerical, warm-up timeline and whole-session
invalidation cases. Complete synthetic 396-slot validation exercises successful
collection, deterministic analysis, injected failure and interruption recovery.
Disposable browser validation covers B14–22 and both M4 arms. Historical/pilot
hash verification, generation and recipe checks are rerun. Current-head hosted CI
results are authoritative on [PR #10](https://github.com/Omri93Rajuan/angular-through-time/pull/10);
baseline green checks must not be substituted for patch-head checks.

**Engineering:** request changes on the original head. Approve the corrected
implementation only after its full CI is green; no statistical design change is
required to address the demonstrated engineering defects. This is a recommendation,
not a GitHub approval submission or merge authorization.

**Scientific collection:** **NO-GO until explicit researcher sign-off** on the
checklist below and actual host readiness. After sign-off, the implementation can
execute the scoped study. This is not a recommendation to advertise universal
Angular performance, isolated Signals effects or precise physical rendering times.

## Researcher approval checklist

- [ ] Exact final source commit, protocol hash/ID, campaign ID, Chrome binary,
      Node/lock identity, host and build/functional-gate artifacts.
- [ ] B14–22 versus the Angular 14 reference; separate M4 Zone-versus-zoneless
      contrast; all nine primary contrasts declared before collection.
- [ ] The restricted workload: 5,000-row application, 100 sparse changes, mutation,
      5 Hz serial-lossless delivery, no timed interactions or arrival-capacity claim.
- [ ] Primary run-p95 paired geometric ratio; descriptive secondary means,
      p50/differences, lateness, completion and failures; no pooling of ticks,
      experiments, pilots or historical samples.
- [ ] 150 warm-up and 300 measured events, nominal versus actual durations,
      reset behavior, headless flags and two-rAF presentation-opportunity semantics.
- [ ] Fixed 36 blocks per experiment, approximately 9.9 hours plus overhead,
      no power guarantee, no precision-based extension or optional stopping.
- [ ] Fixed position-balanced/reversed order, B-before-M4 execution, and the
      residual host-drift/carryover and block-independence assumptions.
- [ ] 100,000 bootstrap draws/seed 14022, paired-block unit, approximate
      Bonferroni-adjusted coverage across nine contrasts, no unplanned contrasts.
- [ ] The [0.90,1.10] practical band and strict whole-interval directional rule;
      inconclusive does not mean equivalent or no effect.
- [ ] Operator-owned AC/performance/load/thermal controls, monitoring and honest
      fresh session attestations; uncontrolled OS cache and temporal effects.
- [ ] Fixed timeout, stop-on-failure, immutable attempts/claims, no replacements,
      explicit interrupted slots and full-experiment inference withholding.
- [ ] Symmetric whole-session environmental exclusions, documented before
      inspecting comparative conclusions; retain slow/late/outlier observations.
- [ ] Separate explicit decision for any new campaign; publish failures and
      incomplete campaigns rather than selecting a favorable completed campaign.
- [ ] Archive all raw files, manifests/gates, journals, seals, claims, invalidations,
      authorization provenance and deterministic analysis; accept the local-trust
      boundary rather than representing hashes as authenticated signatures.

No checklist item is approved by this review. No `approval.json` or `session.json`
was generated or signed on behalf of the researcher.
