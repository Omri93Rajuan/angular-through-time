# Limitations and confounders

- Local samples are exploratory, not publication-ready claims. Machine load, thermal state, OS page cache and CPU governor are uncontrolled.
- Historical Angular/Node releases are unsupported upstream. Isolated local runtimes reproduce compatibility but do not provide a security sandbox.
- Baseline source/layout/identity strategy is shared; Angular internals, Zone versions, TypeScript lowering, browser targeting and optimizer outputs differ unavoidably.
- Both tracks retain webpack. Idiomatic architecture is conservative (revision signal, standalone bootstrap, stable built-in loops, zoneless); it is not a full default-CLI or optimized signal-store comparison.
- Current Chrome tests execution parity for legacy builds; they cannot prove all historical browser support claims.
- Two animation frames approximate presentation opportunity. Headless frame callbacks are not physical FPS. Interaction timing includes Playwright overhead and is not INP.
- Serial backpressure preserves every update and exposes late delivery. It does not estimate loss for a continuously independent producer. Actions occur between ticks, not concurrently with an update callback.
- Checksums do not prove absence of hash collisions; explicit row-level price and workflow assertions supplement them. Engine-based expected checksums share algorithm code, so simulator unit tests separately check identity and uniqueness invariants.
- Sampled CDP heap peak can miss transient peaks. Heap is not process/RSS memory. Lighthouse runs are separate diagnostic sessions with different instrumentation.
- Navigation is HTTP-cache cold with a warm Chrome process and server. Cold builds remove project caches, not OS filesystem caches.
- First installation resolves transitive ranges; subsequent npm ci runs use committed exact lockfiles. Runtime Node binary installer downloads are platform dependent.
- Small repetition counts provide descriptive evidence only; no significance or general performance rankings are justified.
