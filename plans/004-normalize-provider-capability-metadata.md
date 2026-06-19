# Plan 004: Normalize provider and capability metadata in the catalog

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6ebb30b..HEAD -- src/domain.ts src/data.ts src/services.ts src/turso.ts src/vendorCoverage.ts db/schema.sql scripts tests app/Explorer.tsx app/VendorCompare.tsx`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-add-ultracite-qlty-and-test-baseline.md`, `plans/003-fix-chat-tool-contracts.md`
- **Category**: tech-debt | architecture
- **Planned at**: commit `6ebb30b`, 2026-06-12

## Why this matters

The project has shifted from a mail-agent model comparison into a general Blinqx agent strategy surface. Provider and capability filters are now core product facets, but they are inferred from display strings and notes. That will break quietly as new providers, sectors, and model families are added. Normalize this metadata at the catalog boundary so filtering, comparison, chat tools, and future exports all use explicit fields.

## Current state

Relevant files:

- `src/domain.ts` — route schema and serializable `RouteView`.
- `src/data.ts` — static fallback catalog.
- `src/services.ts` — currently derives provider tags and capabilities.
- `src/turso.ts` — maps Turso rows into `ModelRouteInput`.
- `db/schema.sql` — Turso schema for `model_routes`.
- `scripts/seed-turso.ts` — seeds static catalog into Turso.
- `scripts/audit-coverage.ts` — asserts static/Turso row counts and invariants.
- `app/Explorer.tsx` and `app/VendorCompare.tsx` — consume `RouteView.providers` and `RouteView.capabilities`.

Current excerpts:

```ts
// src/services.ts:267-283
const providerTags = (route: string): ReadonlyArray<string> => {
  const providers = [
    ["Azure", route.includes("Azure")],
    ["AWS Bedrock", route.includes("Bedrock") || route.includes("AWS")],
    ["Google Vertex", route.includes("Vertex")],
    ["Mistral", route.includes("Mistral")],
    ["OVHcloud", route.includes("OVH")],
    ["Scaleway", route.includes("Scaleway")],
    ["STACKIT", route.includes("STACKIT")],
    ["IONOS", route.includes("IONOS")],
    ["Nebius", route.includes("Nebius")],
    ["Groq", route.includes("Groq")],
    ["Cerebras", route.includes("Cerebras")],
  ] as const;
  const tags = providers.filter(([, on]) => on).map(([name]) => name);
  return tags.length > 0 ? tags : [route];
};
```

```ts
// src/services.ts:289-330
const derivedCapabilities = (r: ScoredRoute): ReadonlyArray<Capability> => {
  const text = `${r.id} ${r.name} ${r.maker} ${r.route} ${r.note}`.toLowerCase();
  const capabilities = new Set<Capability>();
  // string heuristics add vision / think / tools / json / cache / web
  return CAPABILITY_ORDER.filter((capability) => capabilities.has(capability));
};
```

```sql
-- db/schema.sql:1-18
CREATE TABLE IF NOT EXISTS model_routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  maker TEXT NOT NULL,
  route TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('A', 'B', 'C')),
  mode TEXT NOT NULL CHECK (mode IN ('reasoning', 'non-reasoning', 'configurable')),
  openness TEXT NOT NULL CHECK (openness IN ('open-weight', 'open-source', 'proprietary')),
  input_price REAL NOT NULL,
  output_price REAL NOT NULL,
  throughput REAL NOT NULL,
  ttft REAL NOT NULL,
  latest INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL,
  sla_pct REAL,
  observed_uptime REAL,
  availability_risk TEXT NOT NULL CHECK (availability_risk IN ('low', 'medium', 'high')),
  reliability_note TEXT NOT NULL
);
```

Design constraints to preserve:

- `RouteView.providers` and `RouteView.capabilities` are already the UI-facing names; keep those names if possible.
- `Capability` literals are `vision`, `tools`, `cache`, `think`, `web`, `json` in `src/domain.ts`.
- The design doc describes filters as Effect atom state mirrored by the chat tool; avoid renaming `FilterState` fields without updating chat tools.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `npm test` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Data audit | `npm run coverage:audit` | JSON contains `"ok": true` |
| Optional seed check | `npm run db:seed` | only run with explicit operator approval because it mutates Turso |

## Scope

**In scope**:

- `src/domain.ts`
- `src/data.ts`
- `src/services.ts`
- `src/turso.ts`
- `db/schema.sql`
- `scripts/seed-turso.ts`
- `scripts/audit-coverage.ts`
- Tests created by Plan 001
- Docs only if needed to document the new catalog fields

**Out of scope**:

- Do not redesign the UI filters.
- Do not add new capability categories beyond the existing six unless the maintainer explicitly approves.
- Do not run `npm run db:seed` against production/dev Turso without explicit approval.
- Do not change pricing/reliability values.

## Git workflow

- Branch: `advisor/004-normalized-route-metadata`
- Commit message suggestion: `refactor: normalize route metadata facets`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add explicit metadata fields to the domain

Extend `ModelRoute` in `src/domain.ts` with explicit fields:

```ts
providers: Schema.Array(Schema.String),
capabilities: Schema.Array(Capability),
```

If Effect Schema requires readonly arrays or a different constructor, match the project’s existing Effect style. Update `ModelRouteInput` and `RouteView` flow so these fields are part of the decoded route, not derived later.

**Verify**: `npm run typecheck` → expect errors in `src/data.ts`, `src/turso.ts`, and `src/services.ts` until the next steps fill the fields. Do not stop for these expected intermediate errors.

### Step 2: Populate static catalog metadata

Update every route in `src/data.ts` with explicit `providers` and `capabilities`.

Use the current heuristic output as a starting point, but make deliberate corrections where string matching was too broad or too narrow. Keep provider labels aligned with the UI/vendor comparison labels:

- `Azure`
- `AWS Bedrock`
- `Google Vertex`
- `Mistral`
- `OVHcloud`
- `Scaleway`
- `STACKIT`
- `IONOS`
- `Nebius`
- `Groq`
- `Cerebras`

For capabilities, use only the existing literals:

- `vision`
- `tools`
- `cache`
- `think`
- `web`
- `json`

**Verify**: `npm run typecheck` → remaining errors should now be limited to Turso/schema/service mappings.

### Step 3: Update Turso schema and seed mapping

Choose one storage approach:

Preferred simple approach: JSON text columns on `model_routes`:

```sql
providers_json TEXT NOT NULL DEFAULT '[]',
capabilities_json TEXT NOT NULL DEFAULT '[]'
```

Then update:

- `scripts/seed-turso.ts` insert columns/args with `JSON.stringify(row.providers)` and `JSON.stringify(row.capabilities)`.
- `src/turso.ts` select these columns and parse them into arrays.
- `db/schema.sql` for fresh databases.

For existing databases, document whether a manual migration is required. Do not silently run production migrations in this plan.

**Verify**: `npm run typecheck` → exits 0 after mappings are complete.

### Step 4: Remove string-derived providers/capabilities from `src/services.ts`

Delete `providerTags`, `CAPABILITY_ORDER`, `hasAny`, and `derivedCapabilities` if they are no longer used.

Update `toView` to pass through explicit fields:

```ts
providers: r.providers,
capabilities: r.capabilities,
```

Add fallback validation if necessary: a route with an empty providers array should fail the audit/test rather than silently using `route` as a provider.

**Verify**: `npm run typecheck` → exits 0.

### Step 5: Strengthen data audits and tests

Update `scripts/audit-coverage.ts` or add tests so they assert:

- Every route has at least one provider.
- Every provider is in an allowed provider-label set.
- Every capability is in the existing `Capability` set.
- No route uses an empty capability array unless that is explicitly allowed and documented.
- Static and Turso catalogs agree after seeding/mapping.

**Verify**: `npm run coverage:audit` → JSON contains `"ok": true`.

### Step 6: Re-run baseline

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run coverage:audit
```

**Verify**: all exit 0.

## Test plan

Add tests for:

- Static catalog route metadata is non-empty and uses allowed literals.
- `toView` preserves explicit providers/capabilities.
- Turso mapping parses JSON metadata correctly and falls back/fails predictably on malformed JSON.
- Existing Explorer provider/capability filters still work with the normalized fields.

## Done criteria

- [ ] `src/services.ts` no longer derives providers/capabilities from display strings.
- [ ] `ModelRoute` includes explicit provider and capability metadata.
- [ ] Static catalog and Turso loaders both populate the new fields.
- [ ] Audits/tests catch missing/unknown provider/capability metadata.
- [ ] UI behavior remains unchanged for existing filters.
- [ ] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run coverage:audit` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- Existing Turso production data cannot be migrated safely without a separate migration plan.
- Provider labels are ambiguous for a route and the source docs do not identify the host clearly.
- Capability assignment requires adding new categories beyond the existing UI contract.
- More than a small number of UI components require changes beyond passing through the new fields.

## Maintenance notes

This normalized metadata becomes the source of truth for future sector-specific agent routing and decision exports. Reviewers should check the catalog values carefully; this is not just a type refactor. If provider names are later localized or rebranded, keep stable internal provider ids separate from display labels.
