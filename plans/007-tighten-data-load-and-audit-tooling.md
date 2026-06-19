# Plan 007: Tighten data-load performance and live-audit tooling

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9f43e68..HEAD -- src/services.ts app/Explorer.tsx scripts/audit-live-sources.ts scripts/audit-coverage.ts src/vendorCoverage.ts tests package.json package-lock.json`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-add-ultracite-qlty-and-test-baseline.md`, `plans/004-normalize-provider-capability-metadata.md`
- **Category**: perf | dx | tooling
- **Planned at**: commit `9f43e68`, 2026-06-19

## Why this matters

The app is small today, but its value depends on fast source-backed comparison as the catalog grows. The current server data loader performs independent Turso fallback reads sequentially, and the Advanced filter rail recomputes provider/maker counts by scanning all routes during render. The live-source audit also contains a no-op official-presence block that always checks an empty platform set, which weakens trust in a repo centered on source freshness.

## Current state

Relevant files:

- `src/services.ts` — aggregates scored routes, failover chains, provider coverage, summaries, vendor scope, and multi-vendor models.
- `app/Explorer.tsx` — renders provider/maker filter rails and currently recomputes counts inline.
- `scripts/audit-live-sources.ts` — compares static vendor coverage against live vendor pages.
- `src/vendorCoverage.ts` — source of provider coverage arrays consumed by the live audit.
- Tests created by Plan 001 — add pure helper tests if helpers are extracted.

Current excerpts:

```ts
// src/services.ts:366-390
const program = Effect.gen(function* () {
  const scored = yield* ReliabilityService.scoredAll();
  const chains = yield* RecommendationService.chains();
  const providerCoverage =
    (yield* Effect.tryPromise(() => loadProviderCoverageFromTurso()).pipe(
      Effect.map((rows) => (rows && rows.length > 0 ? rows : ALL_PROVIDER_EU_COVERAGE)),
      Effect.catchAll(() => Effect.succeed(ALL_PROVIDER_EU_COVERAGE)),
    ));
  const providerCoverageSummaries =
    (yield* Effect.tryPromise(() => loadProviderCoverageSummariesFromTurso()).pipe(
      Effect.map((rows) => (rows && rows.length > 0 ? rows : PROVIDER_COVERAGE_SUMMARIES)),
      Effect.catchAll(() => Effect.succeed(PROVIDER_COVERAGE_SUMMARIES)),
    ));
  const vendorScope =
    (yield* Effect.tryPromise(() => loadVendorScopeFromTurso()).pipe(
      Effect.map((rows) => (rows && rows.length > 0 ? rows : VENDOR_SCOPE_AUDIT)),
      Effect.catchAll(() => Effect.succeed(VENDOR_SCOPE_AUDIT)),
    ));
```

```tsx
// app/Explorer.tsx:466-493
{providers.map((k) => {
  const on = filters.providers[k] === true;
  const n = routes.filter((r) => r.providers.includes(k)).length;
  ...
})}
...
{makers.map((k) => {
  const on = filters.makers[k] !== false;
  const n = routes.filter((r) => r.maker === k).length;
```

```ts
// scripts/audit-live-sources.ts:486-519
const auditOfficialVendorPresence = async () => {
  const platforms = new Set<string>([]);
  const rows = OTHER_VENDOR_EU_COVERAGE.filter((row) => platforms.has(row.platform) && row.sourceType === "official");
  ...
  checks.officialVendorPresence = byPlatform;
};

await auditOfficialVendorPresence();
```

Repo conventions to preserve:

- Keep fallback behavior: if Turso env vars are missing, unavailable, or empty, return curated static data.
- Keep `coverage:live-audit` strict: it should fail when curated rows drift from live sources, not silently skip intended coverage.
- Avoid adding heavy dependencies for SQL or HTML parsing unless a current planned step already introduced them.
- Keep client optimization simple and readable; this UI does not need complex memoization infrastructure.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0, no TypeScript errors |
| Unit tests | `npm test` | exit 0; only available after Plan 001 |
| Static data audit | `npm run coverage:audit` | JSON with `"ok": true` |
| Live source audit | `npm run coverage:live-audit` | JSON with `"ok": true`, or a real source-drift failure to report |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:

- `src/services.ts`
- `app/Explorer.tsx`
- `scripts/audit-live-sources.ts`
- Tests for any extracted pure helpers
- `plans/README.md` status row

**Out of scope**:

- Rewriting the Turso schema or seed data.
- Changing provider/capability metadata; that belongs to Plan 004.
- Fixing external source drift by editing catalog rows. If live audit finds real drift, stop and report the drift separately.
- Replacing the regex/Playwright live audit strategy wholesale.

## Git workflow

- Branch: `codex/eu-llm-slfg-plan-006-007` or the active worktree branch chosen by the operator.
- Commit message style: match repo history, e.g. `perf: parallelize explorer data loading`.
- Do not push or open a PR unless the operator explicitly asks.

## Steps

### Step 1: Parallelize independent server data reads

In `src/services.ts`, refactor the three independent coverage reads so they run in parallel and preserve identical fallback behavior:

- `loadProviderCoverageFromTurso()` -> fallback `ALL_PROVIDER_EU_COVERAGE`
- `loadProviderCoverageSummariesFromTurso()` -> fallback `PROVIDER_COVERAGE_SUMMARIES`
- `loadVendorScopeFromTurso()` -> fallback `VENDOR_SCOPE_AUDIT`

Use Effect's parallel combinator if that is already idiomatic in this file; otherwise a small `Effect.all(..., { concurrency: "unbounded" })` or equivalent is acceptable. Do not parallelize `scored` and `chains` unless you confirm their service dependencies make that safe and useful.

**Verify**: `npm run typecheck` -> exit 0. `npm run coverage:audit` -> `"ok": true`.

### Step 2: Precompute Explorer filter counts

In `app/Explorer.tsx`, replace per-button `routes.filter(...).length` scans with memoized frequency maps:

- `providerCounts`: `Map<string, number>` built from every provider tag on each route.
- `makerCounts`: `Map<string, number>` built from each route maker.

Build both with `useMemo` keyed by `routes`. Keep the rendered labels identical.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Decide and fix the official vendor presence audit

In `scripts/audit-live-sources.ts`, the current `auditOfficialVendorPresence()` audits an empty platform set. Choose one of these two explicit outcomes:

1. If the earlier provider-specific live checks already cover every official source intended for this release, delete `auditOfficialVendorPresence()` and remove `checks.officialVendorPresence`.
2. If there are specific official-source platforms still missing from provider-specific checks, populate the platform set with those exact platforms and make the check meaningful.

Do not leave an empty platform set. Do not claim a vendor source is audited unless the script actually fetches and checks it.

**Verify**: `npm run typecheck` -> exit 0.

### Step 4: Add tests or audit assertions

If test infrastructure from Plan 001 exists, add focused tests for any extracted helper. If no helper was extracted, strengthen `coverage:live-audit` output so the no-op cannot regress:

- If deleting the official presence block, no test is required beyond typecheck and live audit.
- If keeping it with populated platforms, assert that `Object.keys(checks.officialVendorPresence).length > 0` before success.

**Verify**: `npm test` -> exit 0 when tests exist. `npm run coverage:audit` -> `"ok": true`.

### Step 5: Run final verification

Run the full practical gate stack for this plan:

- `npm run typecheck`
- `npm test`
- `npm run coverage:audit`
- `npm run build`

Run `npm run coverage:live-audit` if network access is available and the operator expects current-source validation. If it fails from real source drift, do not patch curated rows in this plan; report the drift as a separate data-refresh task.

## Test plan

- Type-level verification for the parallel Effect refactor via `npm run typecheck`.
- Existing data invariant verification via `npm run coverage:audit`.
- If helper tests are added, include a case where two provider tags on one route increment both counts.
- If official presence audit remains, include a non-empty-check assertion so it cannot silently become a no-op again.

## Done criteria

- [ ] Provider coverage, summary, and vendor-scope reads are no longer sequenced one after another in the request program.
- [ ] Empty/missing Turso behavior still falls back to static curated data.
- [ ] Explorer provider/maker counts are computed from memoized maps, not inline scans per button render.
- [ ] `auditOfficialVendorPresence()` is either removed or checks at least one explicitly named platform.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run coverage:audit` exits 0 with `"ok": true`.
- [ ] `npm run build` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- Plan 004 has not landed and changes to `src/services.ts` would conflict with metadata normalization work.
- Parallelizing the Effect reads changes fallback behavior when Turso env vars are absent.
- `coverage:live-audit` finds real live-source drift; catalog refresh is a separate task.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Reviewers should inspect fallback parity carefully: performance improvements are not worth losing the static-data fallback that keeps local builds usable. For live audits, prefer a smaller set of truthful checks over a broad-looking summary that silently skips work.
