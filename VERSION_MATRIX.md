# Exact compatibility matrix

Selected from the [official Angular matrix](https://angular.dev/reference/versions), checked 2026-10-18. Pins deliberately target known release lines rather than latest patches. All apps use RxJS 7.8.2 and tslib 2.8.1. Full transitive versions are locked per application.

| Major | Angular | CLI / build-angular | TypeScript | Node | Zone.js | npm |
|---|---|---|---|---|---|---|
| 14 | 14.2.12 | 14.2.13 | 4.8.4 | 16.20.2 | 0.11.8 | 8.19.4 |
| 15 | 15.2.10 | 15.2.11 | 4.9.5 | 18.20.8 | 0.12.0 | 10.9.8 |
| 16 | 16.2.12 | 16.2.16 | 5.1.6 | 18.20.8 | 0.13.3 | 10.9.8 |
| 17 | 17.3.12 | 17.3.17 | 5.4.5 | 20.19.5 | 0.14.10 | 10.9.8 |
| 18 | 18.2.14 | 18.2.21 | 5.5.4 | 22.23.2 | 0.14.10 | 11.6.2 |
| 19 | 19.2.15 | 19.2.19 | 5.8.3 | 22.23.2 | 0.15.1 | 11.6.2 |
| 20 | 20.3.0 | 20.3.0 | 5.9.3 | 22.23.2 | 0.15.1 | 11.6.2 |
| 21 | 21.0.0 | 21.0.0 | 5.9.3 | 22.23.2 | 0.15.1 | 11.6.2 |
| 22 | 22.0.0 | 22.0.0 | 6.0.3 | 22.23.2 | 0.16.0 | 11.6.2 |

Angular 14 uses Node 16, 15–16 use Node 18, 17 uses Node 20, and 18–22 use Node 22. Angular 22.0 requires TypeScript 6.0; historical compilers never consume that TypeScript source. The root harness uses Node 22.23.2. Validation evidence, not pin selection alone, establishes build status.

Clean strict installs verified 2026-10-19: Angular 14 overrides browserslist to 4.26.3 and node-releases to 2.0.27 for Node 16 compatibility. Angular 17 skips an incompatible optional lzma binary dependency; it is absent from the installed tree. See benchmark/results/audits/installs.json.
