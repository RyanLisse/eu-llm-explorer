# EU-Sovereign LLM Explorer

Reliability-aware comparison of EU LLM routes for **general AI workloads**, built around provider choice, sovereignty boundaries, and the finding that **Azure Europe is neither stable nor model-complete**. Next.js (App Router) + Effect-TS, themed to the Blinqx / HippoLine design system.

## What this answers

> "What are our best options, since Azure Europe is not stable and not all models are available?"

Three things, expanded from the prior research:

1. **Provider comparison.** Routes can be filtered by hosting provider, including Azure, AWS Bedrock, Google Vertex, Mistral, OVHcloud, Scaleway, STACKIT, IONOS, Nebius, and Requesty EU Router.
2. **A reliability axis.** Every route gets a composite 0–100 score from vendor SLA + third-party observed uptime + operational availability risk (model-rollout lag, capacity-not-guaranteed, quota contention, single-vendor concentration). Filterable and sortable.
3. **General workload topology.** Sovereign-first chains cover fast-path, batch, quality, and reasoning workloads where hops stay inside Tier A, while Tier-B residency routes (Bedrock/Vertex/Azure EU) remain explicit choices.

## Architecture

```
src/domain.ts     Schema + branded types + serializable views (RouteView/ChainView)
src/errors.ts     Schema.TaggedError (CatalogDecodeError, NoEligibleRouteError)
src/data.ts       Curated June-2026 seed dataset (decoded at the boundary)
src/turso.ts      Turso/libSQL data access for route and provider coverage tables
src/decisionPacket.ts
                  Pure Markdown/JSON sovereignty decision-packet builder
db/schema.sql     Turso schema for routes, vendor coverage, regions, and summaries
scripts/seed-turso.ts
                  Idempotent seed from the curated TypeScript data into Turso
src/services.ts   Effect.Service layers:
                    ModelCatalogService → ReliabilityService → RecommendationService
                    + ManagedRuntime + loadExplorerData() (RSC entry point)
src/atoms.ts      effect-atom filter state (keep-alive)
app/page.tsx      Dynamic server component: runs the Effect pipeline, renders analysis + chains
app/Explorer.tsx  Client component: filters, scatter plot, table
app/globals.css   Blinqx palette + HippoLine (Metropolis/Arial) typography
docs/design.md    Blinqx/HippoLine design tokens and interface architecture
```

The runtime data layer is Turso-first: when `TURSO_DATABASE_URL` is configured, routes and provider coverage are loaded from Turso/libSQL, decoded once (`Schema.decodeUnknown`), scored, and routed through composed `Effect.Service` layers. If Turso env vars are absent or the DB is empty, the app falls back to the curated TypeScript seed data so local builds still work. Filter state uses `@effect-atom/atom-react`.

Agent-native UI and tool parity is tracked in `docs/agent-native-capability-map.md`. The runtime catalog database is intentionally read-only from the app and chat agent; persistent data changes belong in seed or maintenance flows, not browser/API CRUD paths.

## Reliability score (heuristic)

```
uptimeComponent = clamp((base - 70) / 30, 0, 1) * 60      // base = observed > SLA > 97 default
riskComponent   = { low: 40, medium: 22, high: 6 }[availabilityRisk]
score           = round(uptimeComponent + riskComponent)  // 0–100
grade           = score >= 85 ? A : >= 70 ? B : >= 50 ? C : D
```

It is a decision aid, **not** a vendor guarantee. The point is to make "will the model actually be up when I need it" a first-class, sortable signal — which is exactly where Azure EU fails despite a 99.9% paper SLA.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # production build; / is dynamic when Turso is configured
npm test           # node:test unit coverage for agent contracts, SQL guard, catalog metadata, packets
npm run lint       # scoped Biome lint baseline for agent/data/test code
npm run check      # full Ultracite audit; currently includes a large existing style baseline
npm run coverage:audit  # static data + Turso row-count/invariant audit
npm run coverage:live-audit  # compare AWS/Requesty rows with current live sources
```

## Turso

The app expects a Turso database in an EU region for the catalog. Current local setup was created with the Turso CLI:

```bash
turso db create eu-llm-explorer --location aws-eu-west-1
turso db show eu-llm-explorer --url
turso db tokens create eu-llm-explorer
```

Store the URL/token in `.env.local` using `.env.example` as the template, then seed:

```bash
npm run db:seed
turso db shell eu-llm-explorer "SELECT COUNT(*) FROM provider_coverage;"
npm run coverage:audit
npm run coverage:live-audit
```

`coverage:audit` verifies the curated source data and the seeded Turso tables agree on the catalog, provider coverage, region rows, summaries, vendor-scope statuses, AWS Bedrock EU rows, Requesty EU Router rows, and multi-vendor overlap count.
`coverage:live-audit` fetches the current AWS Bedrock regional availability table, rendered Requesty EU model library, rendered Nebius Token Factory public catalog, Google Vertex Europe endpoint table, Microsoft Azure Europe Data Zone/Regional tables, Scaleway supported-model table, STACKIT supported shared-model sections, Mistral model/lifecycle tables, OVHcloud catalog cards, and IONOS model hub table, then fails if the curated rows drift from those live sources.

## Decision packets

The Compare view can copy a Markdown sovereignty decision packet or download the same packet as JSON for the currently selected provider option. Packets are generated from already-loaded catalog data; they do not call live vendor APIs and they are not legal advice. Use them as engineering governance artifacts for DPIA, architecture-decision, procurement, or security-review handoff, then re-verify pricing, availability, DPA terms, subprocessor lists, and live source freshness before production commitment.

## Data sources (captured June 2026)

- Azure EU Data Zone capacity/quota & model rollout: Microsoft Learn (quotas-limits, region-support) + Microsoft Q&A threads on GPT-5.2 / GPT-5.4 EU Data Zone and Claude-on-Foundry EU timeline.
- Vendor coverage matrix: AWS Bedrock EU regional model table, Microsoft Azure EU Data Zone/Regional model table, Google Vertex data-residency docs, Mistral model catalog, Scaleway supported models, OVHcloud AI Endpoints catalog, STACKIT shared models, IONOS model comparison, Nebius Token Factory docs, and Requesty EU model library/routing docs.
- Sovereign SLAs: OVHcloud AI Endpoints (99.8%), Scaleway Generative APIs Serverless (99.9%), Nebius Token Factory (99.9%).
- Residency SLAs: AWS Bedrock (99.9% regional), Google Vertex AI (~99.9% SLO).
- Mistral reliability: status.mistral.ai + third-party monitors (≈79% 90-day observed → "medium" availability risk, mitigated by sovereign failover).
- Pricing / benchmarks: vendor pricing pages + Artificial Analysis (median TTFT/throughput). **Verify on the official pricing page before committing.**

Current seeded provider-coverage matrix: **406 qualifying rows** across **11 provider summaries**, including **74 AWS Bedrock EU rows** and **121 Requesty EU Router rows** from `https://www.requesty.ai/models?region=eu`. Requesty rows qualify only when using `https://router.eu.requesty.ai/v1` with approved EU-region upstream models. Every covered provider row is checked against a current official or rendered-live source; Mistral rows exclude already-retired lifecycle entries.

The app also carries a separate **vendor scope audit** so "all vendors" is reviewable without mixing rejected routes into the qualifying-model count:

- **10 covered or conditionally covered routes:** Mistral, Scaleway, OVHcloud, STACKIT, IONOS, Nebius, AWS Bedrock EU, Google Vertex AI EU, Azure AI Foundry EU, Requesty EU Router.
- **10 excluded routes:** Groq public API, Cerebras public cloud, SambaNova public API, Together AI, Fireworks AI, OpenRouter/global aggregators, AWS Bedrock Global profiles, Azure Global Standard, Google AI Studio/global Gemini API, Direct Anthropic API.
- **2 monitor-only infrastructure routes:** Aleph Alpha/PhariaAI and T-Systems/Open Telekom Cloud.

> EU sovereignty rests on corporate structure (no US CLOUD Act reach). Residency (Tier B) keeps data in EU regions under a US operator, so CLOUD Act exposure remains — document it in your DPA/records of processing.
