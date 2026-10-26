# Confirmatory runtime campaign: frozen proposal and execution

This is a concrete proposal, **not researcher approval**. The machine-readable
[protocol](../research/v2/confirmatory-protocol.json) is bound by SHA-256 to an
explicit approval, campaign ID, source commit/tree, Node, Chrome binary, root lock and host.
The existing pilot protocol and all existing evidence remain unchanged.

## Fixed scope and estimands

Two experiments run separately: B-runtime has Angular 14–22 with the validated
`idiomatic-v2` applications; M4 has Angular 22 `idiomatic-v2` (zoneless) and
`m4-zone`. B measures version-specific architecture/compiler combinations, not
isolated Signals causality. M4 compares the scheduler/polyfill treatment.

The nine prespecified primary contrasts are versions 15–22 versus 14 within B,
plus Zone versus zoneless within M4. Each run contributes its p95 presentation
opportunity (apply through two animation-frame callbacks, **not** physical
presentation or INP). The primary estimator is the mean within-block log ratio,
exponentiated to a geometric mean ratio. Values below 1 favor the numerator
(version 15–22 or Zone). p95 differences in milliseconds, p50, synchronous apply,
late-update counts, completion windows and failures are descriptive secondary
outcomes, with no additional significance claims. Quantiles use the existing
harness's interpolation. Individual ticks are never independent replicates.

Both experiments use 5 Hz, 100 changed records, mutation, no timed interaction,
and serial-lossless delivery. Each fresh browser process receives 150 paced
warm-up events across at least 30 seconds, reset, then 300 events scheduled over
a nominal 60-second window. The last due time is 59.8 seconds; its completion
may precede 60 seconds or exceed it under backpressure. No events are dropped.
The same deterministic workload and initial/final numeric UI oracle apply to
every treatment. Full functional acceptance must match exact source/artifact
hashes and browser version. Validation data and historical/pilot observations
are excluded from confirmatory analysis.

## Fixed sample size, order and precision

**36 independent-process paired blocks per experiment**, with all nine B
variants in each B block and both M4 variants in each M4 block. There are 396
fresh-process attempts, approximately 9.9 hours of nominal warm-up/measurement,
plus functional checks, startup and backpressure. The existing cyclic order
places each B variant in each position four times and each M4 treatment in each
position 18 times, reversing direction on alternate complete cycles. B finishes
before M4 begins. Pairing is within experiment/block only; the separate B
Angular 22 observations are never reused as M4 controls.

36 is a fixed budget/precision compromise, not a power guarantee. It exceeds
the provisional minimum ten and supports four full B cycles with two cycles in
each direction. The two six-tick pilot pairs give log-ratio sample SDs of about
0.172 (B endpoints) and 0.255 (M4). As a **sensitivity calculation only**, a
normal approximation using 2.773 × SD / sqrt(36) implies multiplicative upper
half-widths around 8.3% and 12.5%, respectively. Those tiny pilot estimates do
not establish long-window variance, independence, coverage or power. There is
no justified precision prediction for intermediate versions. The researcher
must accept potentially inconclusive intervals rather than an invented power
claim. Actual relative interval half-widths are reported; no further blocks
are collected because a result is wide or unfavorable.

Block percentile bootstrap: 100,000 resamples, seed 14022, alpha 0.05/9 for each
of nine primary intervals. The union-bound allocation is described by
[NIST's Bonferroni method](https://www.itl.nist.gov/div898/handbook/prc/section4/prc473.htm).
Bootstrap marginal coverage is approximate, so simultaneous coverage is also
approximate, not guaranteed finite-sample 95%. Dependence between contrasts
sharing a reference does not require an independence assumption for the
Bonferroni allocation. Independence of blocks remains an assumption: fresh
processes do not eliminate host drift. Fixed balanced order is reproducible
but not randomized; it mitigates position effects without ruling out periodic
host effects. No cross-experiment comparison is made.

The practical threshold is a ratio outside [0.90, 1.10]. A practical directional
conclusion requires the entire adjusted interval below 0.90 or above 1.10.
Otherwise report inconclusive at 10%; this is not an equivalence test.

## Environment, stopping and evidence rules

One Linux host, Node 22.23.2, fixed Chrome binary and source/lock identity.
Before each invocation the operator records a fresh (<1 hour) attestation of
AC power, fixed performance policy, no competing heavy workloads and no
thermal throttling. Keep the settings stable throughout the session, monitor
the host, and stop on a violation. These conditions are **operator-attested,
not automatically certified telemetry**. Preparation and functional checks
finish before collection; do not build, install, run CI or analyze concurrently.
The machine identity and approval must remain identical on resume. OS page cache
is uncontrolled; fresh browser contexts do not imply cold OS cache.

Requests and returned timings are written and fsynced to an append-only journal
outside the measured apply-to-presentation interval. That durability overhead
can affect cadence/lateness; it is common to all treatments and is part of this
protocol, unlike the older pilot's buffering. Final UI checking and independent
oracle replay occur after measurement. Every attempted slot, browser error,
manifest, functional gate and available final state is preserved. Each terminal
attempt receives a file-list/hash seal; its start record binds campaign metadata
and session attestation. Archive/commit the complete directory after collection
to anchor these local integrity hashes externally; hashes are not signatures.

A fixed 15-minute per-attempt safety timeout records failure and stops the
invocation. Errors and interruptions also stop or terminate the invocation.
Resume never replays an attempted slot: interrupted slots become rejected,
existing successful/failed slots are immutable, and execution continues with
the next unattempted slot. There are no replacement blocks or data-dependent
stopping rules. A complete experiment requires all its 36 blocks; if any block
is incomplete, descriptive estimates may be reported but primary inference is
withheld for that experiment. Slow/late correct runs and statistical outliers
remain included. A new campaign after invalidation requires a separate explicit
researcher decision; do not choose a favorable campaign after inspecting results.

To record an environmental violation after stopping collection, use:

```bash
node benchmark/confirmatory/invalidate-session.mjs \
  benchmark/results-confirmatory/runtime-1 SESSION_FILE \
  noThermalThrottling 'OPERATOR NAME' 'Observed throttling; supporting details'
```

`SESSION_FILE` is the affected `session-*.json`. Allowed conditions are
`acPower`, `fixedPerformancePolicy`, `noHeavyWorkloads`, `noThermalThrottling`.
The command writes a new immutable invalidation record and excludes **the whole
session symmetrically**, preserving all raw attempts; it never selects individual
slow results. Do not erase or edit invalidations.

## Setup and explicit approval

Use the [existing setup guide](RESEARCH_V2_SETUP.md) to install exact runtimes and
locks, build B14–22 and M4, and run their expanded functional gates on the chosen
Chrome binary. Keep the approved source checkout clean. Do not substitute a
pilot command, override `REPS`, or edit the pilot protocol.

```bash
# No collection: inspect the exact host/source/protocol identities.
CHROME=/opt/google/chrome/chrome npm run --silent confirmatory:run -- --prepare --campaign-id runtime-1 \
  > /tmp/campaign-proposal.json
```

A researcher must review this document, approve all listed decisions, and save
the proposal's `approval` object to an **external** `approval.json`, setting
`approved: true`, their name in `researcher`, and an ISO UTC `approvedAt`.
Do not invent approval or edit campaign-ID/identity/hash/accepted-decision fields. An approval cannot be reused for a different campaign ID. The
operator saves the `session` object separately to external `session.json`, fills
`operator`, current ISO UTC `checkedAt`, and truthfully sets the four environment
checks to true. These JSON records are explicit local authorization attestations,
not cryptographic signatures or a hosted identity service. Files start unapproved.

Only after that approval, the final command is:

```bash
CHROME=/opt/google/chrome/chrome npm run confirmatory:run -- \
  --approval /absolute/path/approval.json \
  --session /absolute/path/session.json \
  --output benchmark/results-confirmatory/runtime-1
```

Resume uses **the same command plus `--resume`**, with a fresh truthful session
attestation. A `.lock` prevents concurrent writers. After abrupt termination,
inspect its recorded host/PID and verify that process is no longer running before
removing **only** the stale `.lock`. Never remove an attempt directory, seal or `attempt-claims` marker. Each new attempt is claimed before collection. If a claimed directory disappears, resume records an interruption instead of collecting a replacement. Missing claim registries fail closed. The evidence storage revision is separate from the unchanged protocol identity.
A changed source, host, browser, protocol, build, gate or approval fails closed.
If interruption occurred before metadata was initialized, no trustworthy campaign
exists: retain that directory and initialize a new ID rather than overwriting it.

After collection (not concurrently):

```bash
node benchmark/confirmatory/analysis.mjs \
  benchmark/results-confirmatory/runtime-1 > /tmp/runtime-1-analysis.json
```

Analysis is read-only and deterministic. It replays events independently, checks
seals, metadata, manifests/gates, tick counts/timing arithmetic, final state and
run summaries before reporting effects. Exit 1 indicates invalid evidence;
exit 2 indicates an incomplete real campaign with primary inference withheld;
exit 0 indicates successful analysis. Store the derived report alongside an
archived campaign, not inside its raw directory. A whole-family completion flag
and per-experiment eligibility are explicit.

## Validation and approval boundary

`npm run confirmatory:dry-run` executes the complete 396-slot order on synthetic
three-tick fixtures, repeats analysis, injects a failure, and recovers an
interruption in disposable OS-temporary directories. Its output is marked
`synthetic-validation`, never eligible for primary inference. CI runs it.

```bash
CHROME=/opt/google/chrome/chrome node benchmark/confirmatory/run.mjs \
  --browser-validation --output /tmp/confirmatory-browser-validation
node benchmark/confirmatory/analysis.mjs /tmp/confirmatory-browser-validation \
  > /tmp/confirmatory-browser-analysis.json
```

This uses the actual browser collector with short windows, one block, and
`browser-validation` classification; evidence-tree destinations are forbidden.
CI runs it across B14–22 plus M4 using its existing browser matrix. `VERSIONS`
selects only disposable browser validation; real campaigns reject pilot/matrix
overrides. These checks verify execution and correctness, not full-duration
performance. The researcher still must approve scope, the fixed block budget
and precision limitations, nominal durations, 10% threshold, approximate
multiplicity-adjusted inference, balanced order and host/environment controls.
