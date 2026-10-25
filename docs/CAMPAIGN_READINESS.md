# Confirmatory execution readiness

Assessment date: 2026-10-25. Inspected baseline: `cba40d6`.

**NO-GO. No validated confirmatory execution command exists.**

The committed `research/v2/protocol.json` is explicitly `pilot-only`, with
`confirmatoryApproved: false`. Its 30-second warm-up, 60-second measurement
window, minimum ten blocks and 10% practical difference are proposals, not
final decisions. Neither CI success nor infrastructure merge approves them.

## Confirmed correction

The pilot runner previously checked the `CAMPAIGN` environment variable before
collection, but checked protocol approval only at evidence sealing, after all
attempts. It now rejects a non-pilot status or an approval value other than
literal `false` before creating output or launching a browser. Regression
tests exercise the real entry point in disposable directories, including an
unset `CAMPAIGN`. Valid pilot timing, workloads and historical evidence are
unchanged. Existing pilot hashes continue to identify their original harness.

## Essential unresolved decisions and execution gap

1. Freeze the primary comparison(s), workload cells and interpretation of the
   primary outcome. The implemented outcome is run-level p95 **presentation
   opportunity**, not physical presentation or INP. B cross-version results
   cannot isolate the effect of Signals; M4 is a scheduler/polyfill comparison.
2. Decide the final duration and independent-block count with a justified
   precision/sample-size rule and multiplicity treatment for selected primary
   comparisons. The existing two-block, six-tick pilots do not establish these.
3. Freeze the campaign host/environment acceptance rules and treatment-order
   policy before collection. Current pilot environmental fields explicitly
   record power, thermals, governor and background load as uncontrolled.
4. Implement and validate execution of that frozen protocol. The only v2
   runtime runner consumes `protocol.pilot`, performs three warm-up ticks and
   six measured ticks, and writes/seals pilot evidence. The auditor accepts
   two declared pilot contrasts. Increasing `REPS`, changing approval to true,
   or using the legacy runner does not create a confirmatory execution path.
   Confirmatory output and analysis must remain separate from existing pilots.

No independent-arrival implementation, additional ablation, native runtime
campaign or watch/HMR study is required to execute a study explicitly limited
to the existing serial-lossless runtime comparisons. Those are not added as
blockers; unsupported throughput or causal claims must remain excluded.

## Verification of this correction

Local checks passed: 29 unit/regression tests (25 before the correction), exact
118-file legacy and 218-file research generation, nine-version source parity,
nine native recipe checks, all manifest checks, independent oracle tests,
325 historical Git blobs and fixed tree, both pilot evidence batches,
read-only audit of eight pilot attempts with zero errors, and browser dashboard
filters/raw links/mobile/console checks. Production/browser CI matrices are
required on the fix PR; their status is recorded by GitHub, not inferred from
baseline CI. No new performance samples were collected.

The protocol remains unchanged rather than falsely marked finalized. A final
campaign command is deliberately not supplied while its protocol and executable
path remain unresolved. `CAMPAIGN=confirmatory node benchmark/v2/pilot.mjs` is a
tested rejection case, **not** an execution instruction.
