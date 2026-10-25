# Reproduce research v2

Use the repository root, Node 22.23.2, npm 11.6.2, Linux and Chrome. Exact application Node versions remain in `docs/versions.json`; do not run every CLI under root Node. Allow several GB for isolated dependencies and output. Commands below never launch a confirmatory campaign.

```bash
npm ci --engine-strict --no-audit --no-fund
npm test
node scripts/verify-generated.mjs
node scripts/verify-research-generated.mjs
node scripts/check-parity.mjs

# Install exact local Node/npm and application locks, without global Node changes.
VERSIONS=14,15,16,17,18,19,20,21,22 node scripts/setup-research.mjs

# Compile new B implementations. Legacy angular.json and source remain untouched.
VERSIONS=14,15,16,17,18,19,20,21,22 node scripts/build-research.mjs
CHROME=/opt/google/chrome/chrome VERSIONS=14,15,16,17,18,19,20,21,22 node benchmark/v2/verify.mjs

# Same-version Zone arm and separately instrumented consumer replica.
VERSIONS=22 TRACKS=m4-zone,idiomatic-v2-diagnostic node scripts/build-research.mjs
VERSIONS=22 TRACKS=m4-zone node benchmark/v2/verify.mjs
node benchmark/v2/diagnostic.mjs
```

The B build driver copies source into a temporary workspace and selects `research.angular.json`; it does not replace legacy build targets. It retains build logs and input/artifact digests under `benchmark/results-v2/builds`. The pilot refuses stale source or output digests. Generated source is reviewable in `v*/src/research`; edit `templates/research/store.ts` and `scripts/generate-research.mjs`, regenerate, then rebuild.

Native CLI workspaces and their original scaffolds are committed separately. Install from the committed lock, preserving the CLI-selected builder, configurations, targets, budgets and cache policy:

```bash
node scripts/native-toolchain.mjs install
# Run this alone; no other builds or browser jobs during timed work.
node scripts/native-toolchain.mjs build
NATIVE=1 VERSIONS=14,15,16,17,18,19,20,21,22 node benchmark/v2/verify.mjs
VERSION=22 node scripts/native-feedback.mjs
```

`research/native/v*/scaffold` is the exact unmodified scaffold; `recipe.json` records generation arguments and scope choices. `native/v*` contains the adapted portable imperative graph. `scripts/sync-native-payload.mjs` repeats the payload adaptation. `scripts/scaffold-native.mjs` creates scaffolds only when target directories are absent and refuses overwrites. First-time dependency resolution is separate from timed compilation; subsequent `install` commands use strict `npm ci`.

The native build pilot runs one project-cold then one project-warm build per version. These are feasibility observations, not sufficient repetitions or a balanced cross-version campaign. Project-cold clears `dist` and `.angular`; OS cache remains uncontrolled. Recursive inventories include raw/gzip/Brotli bytes for emitted JS without claiming those bytes were all requested at startup. Failed budgets remain failures. Development diagnostics run in disposable copies and verify both intentional errors and recovery; they are not Vite/HMR or watch-latency measurements.

After correctness passes, run small pilots sequentially on an otherwise idle machine:

```bash
# Two variants, two independent blocks, complete position-balanced cycle.
VERSIONS=14,22 TRACKS=idiomatic-v2 REPS=2 node benchmark/v2/pilot.mjs
# Same exact version; Zone treatment versus default zoneless.
VERSIONS=22 TRACKS=idiomatic-v2,m4-zone REPS=2 node benchmark/v2/pilot.mjs
node scripts/verify-evidence.mjs
node benchmark/v2/audit.mjs --check
node scripts/audit-historical-readonly.mjs
node scripts/verify-research-dashboard.mjs
node scripts/serve.mjs .
# http://127.0.0.1:4200/dashboard/research.html
```

Each attempt launches a fresh browser process, requires exact-artifact expanded correctness evidence, checks initial state, warms three ticks, resets, and measures six ticks. This short pilot assesses feasibility only. `CAMPAIGN=confirmatory` fails closed. Approve and freeze the main protocol and precision/sample-size decisions before implementing or running the main campaign. Keep failed attempts and obsolete-artifact checks; do not reuse their timings after code changes.
