# Plan 005: Export sovereignty decision packets for governance review

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6ebb30b..HEAD -- app src db scripts tests package.json package-lock.json README.md docs`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M/L
- **Risk**: MED
- **Depends on**: `plans/001-add-ultracite-qlty-and-test-baseline.md`, `plans/004-normalize-provider-capability-metadata.md`
- **Category**: direction | docs | architecture
- **Planned at**: commit `6ebb30b`, 2026-06-12

## Why this matters

The Explorer already contains source URLs, evidence notes, provider tiers, coverage rows, reliability scores, and failover-chain rationale. That is enough to produce an auditable sovereignty decision packet for procurement, legal, security, and product stakeholders. Exporting a boring Markdown/JSON packet turns the app from a visual comparison tool into a governance artifact Blinqx teams can attach to DPIA, vendor-review, or architecture-decision workflows.

## Current state

Relevant files:

- `README.md` — product intent, source-capture notes, seeded matrix counts, and caveats.
- `db/schema.sql` — tables with source/evidence fields for coverage and vendor scope.
- `app/VendorCompare.tsx` — current vendor decision UI and selected-vendor view model.
- `src/services.ts` — failover chain specs and `loadExplorerData()` aggregation.
- `src/domain.ts` — serializable view types for routes, provider coverage, summaries, vendor scope, and chains.
- Tests created by Plan 001 — add packet-generation tests there.

Current excerpts:

```md
<!-- README.md:81-90 -->
## Data sources (captured June 2026)
...
Current seeded provider-coverage matrix: **419 qualifying rows** across **11 provider summaries**, including **77 AWS Bedrock EU rows** and **135 Requesty EU Router rows** ...
```

```sql
-- db/schema.sql:21-65
CREATE TABLE IF NOT EXISTS provider_coverage (... source TEXT NOT NULL, evidence_note TEXT NOT NULL, ...);
CREATE TABLE IF NOT EXISTS provider_coverage_summaries (... source TEXT NOT NULL, evidence_note TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vendor_scope (... source TEXT NOT NULL, evidence_note TEXT NOT NULL);
```

```tsx
// app/VendorCompare.tsx:226-230
const heading = selected.isCurrent
  ? "Azure AI Foundry — your current platform baseline"
  : sovereign
    ? `${selected.label} is fully EU-sovereign — ${stats.modelCount} EU models available`
    : `${selected.label} keeps data in the EU, but is not sovereign — CLOUD Act applies`;
```

```tsx
// app/VendorCompare.tsx:273-287
<div className={`verdict-panel ${sovereign ? "ok" : "warn"}`} role="note">
  ...
  {selected.evidenceNote}{" "}
  {isUrl(selected.source) && <a ...>Source</a>}
</div>
```

```ts
// src/services.ts:142-189
const CHAIN_SPECS: ReadonlyArray<ChainSpec> = [
  { alias: "fast-path", task: "Classification · extraction · chat responses", ... },
  { alias: "batch-cheap", task: "Bulk summarization · routing · high-volume extraction", ... },
  { alias: "quality", task: "Customer-facing text · nuanced generation · multilingual work", ... },
  { alias: "reasoning", task: "Research · contract review · multi-step agent planning", ... },
];
```

Design constraints to preserve:

- Do not overstate legal conclusions. Use language already present in the product: Tier A = EU-sovereign; Tier B = EU-residency with CLOUD Act exposure; Tier C = rejected for sensitive data.
- Keep source freshness visible. README says the source bundle was captured June 2026 and prices/availability must be verified before production commitment.
- Prefer Markdown/JSON first. PDF export is explicitly out of scope for this plan unless the maintainer asks for it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `npm test` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Data audit | `npm run coverage:audit` | JSON contains `"ok": true` |
| Qlty | `qlty check --all` | exit 0 or known baseline from Plan 001 |

## Scope

**In scope**:

- `src/domain.ts` — add export packet types if useful.
- `src/services.ts` or a new `src/decisionPacket.ts` — pure packet builder.
- `app/VendorCompare.tsx` — add UI affordance for exporting/copying the selected packet only if it stays small.
- `app/api/**` — optional route for downloadable JSON/Markdown if client-only generation is awkward.
- Tests created by Plan 001.
- `README.md` or `docs/design.md` only to document the packet format and caveats.

**Out of scope**:

- PDF generation.
- Legal advice wording beyond existing tier/risk language.
- Secrets, credentials, or provider API keys.
- Live web fetching during packet generation.
- Mutating Turso or adding cloud storage.
- Building a full procurement workflow or approval system.

## Git workflow

- Branch: `advisor/005-decision-packets`
- Commit message suggestion: `feat: export sovereignty decision packets`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Define the packet schema and pure builder

Create a pure function, preferably in `src/decisionPacket.ts`, that accepts the already-loaded `ExplorerData` plus a selected vendor/platform key or route id and returns a JSON-serializable packet.

Minimum packet shape:

```ts
interface SovereigntyDecisionPacket {
  generatedAt: string;
  catalogCaptured: "June 2026";
  subject: { kind: "vendor" | "route"; key: string; label: string };
  verdict: { tier: "A" | "B" | "C"; fit: string; summary: string; caveat: string };
  evidence: Array<{ source: string; sourceType: string; note: string }>;
  modelCoverage: { totalModels: number; benchmarkedRoutes: number; regions: string[] };
  benchmarkHighlights: Array<{ model: string; inputPrice: number | null; outputPrice: number | null; throughput: number | null; ttft: number | null; reliabilityScore: number | null }>;
  recommendedUse: string[];
  restrictions: string[];
  fallbackPolicy: Array<{ alias: string; sovereignHops: string[]; escalationHops: string[] }>;
}
```

Use existing `RouteView`, `ProviderCoverageView`, `ProviderCoverageSummaryView`, `VendorScopeView`, and `ChainView` data. Do not re-fetch remote sources.

**Verify**: `npm run typecheck` → exits 0 after the pure function and types compile.

### Step 2: Generate Markdown from the same packet

Add a second pure function such as `formatDecisionPacketMarkdown(packet)`.

The Markdown must include:

- Title and generated timestamp.
- Subject vendor/route.
- Verdict with tier and caveat.
- Evidence table with source URLs and evidence notes.
- Coverage summary.
- Benchmark highlights.
- Recommended use and restrictions.
- Fallback policy section.
- A fixed disclaimer: `This packet is an engineering governance artifact, not legal advice. Verify pricing, availability, DPA terms, and subprocessor lists before production commitment.`

**Verify**: `npm test` → snapshot or string tests assert the Markdown contains the verdict, at least one source URL, the caveat, and the disclaimer.

### Step 3: Add tests for representative packets

Add tests for at least:

1. A Tier A sovereign vendor such as Scaleway or Mistral.
2. A Tier B residency vendor such as AWS Bedrock EU or Azure AI Foundry.
3. A route-level packet if route export is included.
4. Missing/unknown key returns a typed error or `null`, not a crash.

Use static data or a small fixture rather than requiring Turso. Tests should not depend on `.env.local`.

**Verify**: `npm test` → exits 0 and includes the new packet tests.

### Step 4: Add a UI affordance without bloating the page

In `app/VendorCompare.tsx`, add a small action near the selected vendor verdict or heading:

- `Copy decision packet` — copies Markdown to clipboard; or
- `Download JSON` / `Download Markdown` — uses a Blob on the client.

Prefer client-only generation from existing props unless packet size or duplicated logic makes a small API route cleaner. If Clipboard API is unavailable, fall back to download.

Use existing button/card styling and Blinqx design tokens. Do not introduce a modal unless necessary.

**Verify**: browser smoke manually or via Playwright — open Compare, select Scaleway, click export/copy/download, confirm a packet is produced and contains the selected vendor name.

### Step 5: Document the packet format and limits

Update `README.md` or `docs/design.md` with:

- What the packet is for.
- What it is not: not legal advice, not fresh live pricing by itself.
- Which data sources feed it.
- How to regenerate and verify with `npm run coverage:audit` and, when network/browser checks are acceptable, `npm run coverage:live-audit`.

**Verify**: `grep -R "decision packet\|engineering governance artifact" README.md docs` → finds the new docs.

### Step 6: Re-run the full baseline

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run coverage:audit
qlty check --all
```

**Verify**: all required commands exit 0, except `qlty check --all` may match the documented baseline from Plan 001.

## Test plan

- Unit tests for JSON packet builder.
- Unit tests for Markdown formatter.
- One browser or component smoke test for the UI affordance if the test harness supports it.
- No tests should require Turso env vars or live web access.

## Done criteria

- [ ] A selected vendor can produce a JSON decision packet.
- [ ] A selected vendor can produce a Markdown decision packet.
- [ ] Packet includes tier verdict, caveat, evidence/source notes, model coverage, benchmark highlights, and fallback policy.
- [ ] Tier B packets explicitly mention EU residency and CLOUD Act exposure.
- [ ] Tier A packets avoid claiming more than EU-sovereign route status and still include verification caveats.
- [ ] Tests cover Tier A, Tier B, and unknown-key behavior.
- [ ] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run coverage:audit` pass.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- Building the packet requires live provider API calls or new secrets.
- The desired output must be PDF rather than Markdown/JSON.
- The packet needs legal approval language not already present in the repo.
- The implementation would require changing core data semantics from Plans 002–004.
- Any command prints `.env.local` values.

## Maintenance notes

Reviewers should scrutinize wording more than mechanics. This feature is valuable because it is conservative and auditable; marketing-style claims would make it worse. When provider freshness is later surfaced in the UI, add the latest audit timestamp/status to the packet as a follow-up field.
