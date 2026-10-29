# Angular Evolution Dataset v1

Snapshot date: **2026-10-29**. This dataset describes Angular 14–22 and indexes
the repository's existing measurements. Framework documentation and experimental
evidence are separate inputs. An API introduction, a stable designation or a CLI
default change is not evidence of a measured performance improvement.

## Files and identities

| File | Purpose |
|---|---|
| [framework.json](../research/evolution/v1/framework.json) | Releases, dated support snapshot, minor-specific compatibility, feature lifecycle, migration concerns, editorial benefits/trade-offs and small code examples |
| [evidence.json](../research/evolution/v1/evidence.json) | Every tracked historical/v2 evidence file, byte count, SHA-256, original batch identity, selected raw numeric values and provenance gaps |
| [coverage.json](../research/evolution/v1/coverage.json) | Deterministic coverage counts, input hashes and explicit missing information |
| [Schemas](../research/evolution/schemas/) | Draft-07 JSON Schemas for framework and evidence datasets |
| [Coverage report](ANGULAR_EVOLUTION_COVERAGE.md) | Human-readable evidence audit and interpretation limits |
| [Tools](../tools/evolution/) | Validation, evidence indexing, coverage generation and JSON queries; isolated dependency lock |

`schemaVersion: 1` identifies the data contract; `datasetVersion: "1.0.0"`
identifies this content snapshot. The inventory was prepared from dev commit
`a6043de92d675d7bb7d76140f64a2dad0dd9df03`. That is an inventory anchor,
**not** the acquisition commit of any observation. Per-record `sourceCommit`
comes only from saved provenance; missing values remain null.

The confirmatory protocol's approval-binding SHA-256 remains
`60ae7ed6133b61848783fedaed96c316ea635625f295f83466dea8d3a493d702`.
The data validator also checks the existing protocol bytes and root research
lock. These data tools neither collect measurements nor grant approval.

## Reproduce and query

From the repository root, use Node **22.23.2**. npm 10.9.8 was used for the
isolated tools lock. No Chrome, application install or benchmark execution is
needed for these commands:

```bash
npm ci --prefix tools/evolution --engine-strict --ignore-scripts --no-audit --no-fund
npm test --prefix tools/evolution
npm run validate --prefix tools/evolution
node tools/evolution/coverage.mjs --check
node scripts/verify-evidence.mjs
node benchmark/v2/audit.mjs --check

node tools/evolution/query.mjs compare 14 22
node tools/evolution/query.mjs timeline
node tools/evolution/query.mjs between 16.0.0 20.2.0
node tools/evolution/query.mjs upgrade 17 22
```

Queries return JSON with the source registry and dataset identity. Any pair of
majors 14–22 can be compared in either direction. `upgrade` requires ascending
versions. A bare major includes **all catalogued minor events** in that major;
an exact version is inclusive. `between` uses an exclusive lower boundary and
inclusive upper boundary. `introducedBetween` separates introductions from
stabilizations, removals and default changes. Compatibility retains every
documented minor range rather than projecting the latest requirement onto an
entire major.

Feature states are the **last documented event** at each boundary. Null means
not catalogued, not proven absent. An event's status describes the named
feature/API transition, not every API in its `apis` list: a deprecation of an old
API does not deprecate the replacement mentioned alongside it. The comparison
is a research aid, not a complete migration plan. The
[official update guide](https://angular.dev/update-guide) and intervening release
notes remain necessary for a real upgrade.

To regenerate only derived files after a reviewed inventory/metadata edit:

```bash
node tools/evolution/inventory.mjs --write
node tools/evolution/coverage.mjs --write
npm run validate --prefix tools/evolution
node tools/evolution/coverage.mjs --check
git diff -- research/evolution
```

Neither writer touches raw results. `--write` is not an evidence-repair tool.
Investigate unexpected differences before accepting a new dataset snapshot.
The v1 writer deliberately rejects tracked confirmatory archives; their import
requires the separately reviewed process below.

## Source and validation policy

Each factual release, support, compatibility and feature event has nonempty
`sourceIds` resolving to official Angular documentation, an official release
blog, or an Angular/CLI GitHub release. Entries retain a retrieval date and a
locator. Experimental, preview, stable, default, deprecated and removed are
distinct transitions. A future removal intention is not recorded as a removal.
Developer benefits/trade-offs are explicitly **editorial interpretations** of
the cited APIs. Examples are illustrative snippets, with imports/context
omitted as stated; they are not a compiled cross-version example test suite.

Validation checks required fields, types, unknown properties, primary-source
URLs, missing/unavailable citations, unique identifiers/titles, event ordering,
status regressions, semver relationships, compatibility overlap, version indexes,
raw hashes, JSON pointers, numeric values, provenance gaps and classification.
Coverage must exactly match its inputs. Negative tests mutate in-memory copies;
they never alter saved evidence. CI runs the new checks plus the existing evidence
catalog/audit checks. Root benchmark dependencies and existing CI gates remain
unchanged.

Schema and semantic checks cannot prove that a URL entails every sentence or
that two differently named features are semantically identical. Source review
remains necessary. In particular, arbitrary prose must not introduce speed
claims: `performanceConclusion` is always null, inventory `conclusions` is empty,
and the current evidence cannot be marked confirmatory. Live source availability
is not a CI dependency; sources may drift or become unavailable after retrieval.

Angular documentation and release authors receive attribution through the source
registry. Descriptions are concise paraphrases; examples are small illustrative
adaptations with citations. Linked upstream material retains its upstream terms;
the repository license does not relicense those sites. Omri Rajuan remains the
project author; this dataset does not imply Angular team endorsement.

## Importing future confirmatory results

This is an **import procedure**, not authorization to collect. Keep the existing
[confirmatory protocol, approval and operator requirements](CONFIRMATORY_CAMPAIGN.md)
and approved exact source checkout unchanged. Do not rebuild that checkout at
the data-tooling commit or regenerate approval to fit this inventory.

1. After separately authorized collection has stopped, archive the entire raw
   campaign: metadata, approval actually supplied by the researcher, sessions,
   invalidations, all attempt claims, successful/failed/interrupted directories,
   journals, manifests, functional gates and seals. No selected successes or
   replacement observations. Preserve the exact source Git object, dependencies,
   browser identity and original experiment/campaign IDs.
2. On the campaign's approved source checkout, run the existing read-only
   analyzer against that archive, saving the output **outside** its raw directory:

   ```bash
   # Existing analyzer; only for an already collected, archived campaign.
   node benchmark/confirmatory/analysis.mjs /absolute/path/to/archived-campaign \
     > /absolute/path/outside-raw/campaign-analysis.json
   ```

   Exit 1 means invalid evidence; exit 2 means an incomplete real campaign with
   primary inference withheld for incomplete experiments. Exit 0 alone is not
   sufficient: synthetic/browser-validation analysis can also succeed. Inspect
   `kind`, `protocolHash`, every contrast's `inferenceEligible`, completion status
   and the underlying approval/identity/seal validation.
3. Create a **new versioned evidence dataset**, leaving v1 intact. Include the
   raw-archive file manifest/hashes, archive location, exact approved source,
   protocol/approval identity, analyzer source and command, analysis file hash,
   raw row/contrast pointers, complete-block counts and all exclusion reasons.
   Retain incomplete and invalid evidence as such; never promote it into an
   eligible contrast. Review the schema extension and importer before adding
   these records. The present v1 format intentionally admits no confirmatory
   conclusions.
4. Preserve the declared sampling units, uncertainty method, multiplicity,
   practical threshold and stopping rules. Do not recalculate a pooled effect
   using historical, pilot, synthetic or browser-validation rows. Keep B and M4
   separate. B cannot isolate a single framework feature's causal effect;
   presentation opportunity is not a physical rendering timestamp.
5. Validate both the original archived analysis and the new imported references.
   Reproduce analysis deterministically on the approved source; compare output
   bytes/hashes. Review scientific claims separately from schema validity.

This task imports no confirmatory observations and changes no approval records.
