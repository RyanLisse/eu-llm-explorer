# Model-First Baseline Compare + Benchmarks

Date: 2026-06-22
Owner: Ryan
Execution: OMC teams, 2× `codex` workers (GPT-5.5), file-scoped to avoid write conflicts.

## Problem

The Compare tab is vendor-first: it pairs 2–4 vendors and groups models per row, producing
empty cells whenever one vendor has a model and another does not. Useless for the real
question: "for the models we run on Azure today, is there an EU model that is cheaper / faster /
more reliable / sovereign, and where is it actually better?"

Reference for the presentation we want: `requesty.ai/models` — benchmark-driven model directory
(Intelligence / Coding / Reasoning indices, per-model scores, search, region filter, sortable).

## Goal

Model-first Compare tab where **every EU model is scored against ONE pinned Azure baseline**
(the model Blinqx runs today). One scannable table. Search + filter + sort on the axes that drive
the decision: cost, latency, provider, reliability, **benchmarks**, sovereignty.

## Decided requirements (locked)

1. Compare modus = **Δ vs Azure baseline** (not vendor pairing, not side-by-side select).
2. Baseline = a switchable dropdown of the current Azure models (`gpt-5-nano` default, also
   `gpt-5-mini`, `gpt-5.4-nano`).
3. Layout: status block up top (baseline + headline counts), then ONE table. No vendor pairing,
   no nested cards, no empty matrix cells.
4. Per-row deltas: cheaper / faster / lower-TTFT / more-reliable / sovereign-upgrade, with %.
5. Add **benchmark scores** as first-class, sortable columns (requesty-style).
6. Theme tokens stay (dark/light). The ask was about *information presentation + search*, not colors.

## Out of scope

- No side-by-side multi-select compare (may come later).
- No live vendor catalog refresh / scraping.
- No new runtime dependencies.
- No redesign of Advanced, Presentation, Book, or Chat tabs.

## Shared data contract (BOTH workers code against this — do not change unilaterally)

Add to `ModelRoute` (domain.ts, encoded form nullable) and surface on `RouteView`:

```ts
// Public benchmark scores, 0–100, null when unmeasured for that model.
intelligenceIndex: number | null; // Artificial Analysis Intelligence Index (or equiv.)
codingIndex:       number | null; // coding/SWE benchmark composite
reasoningScore:    number | null; // GPQA Diamond (%) or equiv. reasoning benchmark
benchmarkSource:   string;        // short citation/URL for the above, "" if none
```

- Nullable numbers decode via `Schema.OptionFromNullOr` in the domain and flatten to
  `number | null` on `RouteView` (mirror the existing `slaPct` pattern exactly).
- Where a model has no public benchmark, use `null` + `benchmarkSource: ""`. Do NOT invent scores.

## Worker decomposition

### Worker A — Data layer (owns: `src/domain.ts`, `src/services.ts`, `src/data.ts`, `tests/`)

1. Extend `ModelRoute` + `RouteView` with the four benchmark fields above (mirror `slaPct`).
2. Map them through `toView` in `services.ts`.
3. Populate `src/data.ts` for every route with **sourced** public benchmark values
   (Artificial Analysis Intelligence Index, a coding composite, GPQA Diamond). Cite each in
   `benchmarkSource`. Use `null` where no credible public number exists — never fabricate.
4. Update/extend `tests/` so the catalog still decodes and benchmark fields round-trip.

Verify: `npm run lint`, `npm test`, and `npx tsc --noEmit` pass.

### Worker B — Compare UI + styling (owns: `app/VendorCompare.tsx`, `app/PageShell.tsx`, `app/globals.css`)

1. Build on the existing model-first `VendorCompare.tsx` (Δ vs baseline already drafted).
2. Add benchmark columns (Intelligence / Coding / Reasoning) with Δ vs baseline; make them
   sortable alongside cost/throughput/ttft/reliability.
3. Search across model/maker/host/provider. Filter chips: sovereign-only, open-weight, reasoning,
   show-rejected. Sort select incl. the benchmark axes.
4. Add the `mf-*` CSS classes to `globals.css` (clean table: uppercase column heads, generous row
   spacing, subtle pills) using existing theme tokens. Append at end; do not edit other blocks.
5. Keep `PageShell.tsx` wiring (`routes`, `vendor`, `setVendor`) intact.

Verify: `npm run lint` and `npx tsc --noEmit` pass; Compare tab renders; search/filter/sort work.

## Integration verification (after both workers)

- `npm run lint && npx tsc --noEmit && npm run build && npm test` all green.
- Browser smoke on the Compare tab: baseline switch updates deltas; benchmark sort works;
  no empty matrix cells; no runtime errors in console.

## Open items (not blocking start)

- Second screenshot (`11.19.14`) still pending file access — design refinement only.
- Benchmark sourcing is the main research effort; quality of `benchmarkSource` citations matters.
