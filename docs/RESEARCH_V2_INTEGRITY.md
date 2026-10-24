# Research v2 evidence integrity

This infrastructure protects evidence without changing benchmark treatments, workloads or measurement semantics. It does not approve a confirmatory campaign.

## Historical evidence

The 325 historical files are verified from committed Git blobs rather than checkout-dependent text conversions. The `benchmark/results` Git tree must remain `dad8f757b1ae481b24796ca57e1dadb03238742c`. Raw result directories are marked `-text` in `.gitattributes`, so future checkouts preserve their committed bytes on Windows and Linux.

## Research v2 evidence

[`research/v2/evidence-catalog.json`](../research/v2/evidence-catalog.json) is append-only. The two existing runtime pilot batches are explicitly classified as `retrospective-baseline` with `acquisitionSealed: false`; their hashes provide a baseline but are not represented as acquisition-time seals.

Future exploratory pilot completion appends an `acquisition-time-seal` through the pilot runner. The sealer hashes every regular file in the new batch, records the source commit and refuses an existing batch ID. It also refuses a protocol claiming confirmatory approval. CI compares all pre-existing catalog entries with the PR base and rejects removal, mutation or reordering.

Run the independent read-only verification with:

```sh
npm run research:evidence
```

## Derived summary

`npm run research:audit` derives the summary in memory and compares it with the committed JSON. It never rewrites evidence or the summary. A stale summary fails. An intentional summary refresh requires `node benchmark/v2/audit.mjs --write`, followed by review of the complete diff and the read-only audit.

Contrast direction is declared in code and does not depend on filesystem enumeration. Unknown or incomplete treatment combinations fail closed.
