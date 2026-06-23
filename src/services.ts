import { Effect, Layer, ManagedRuntime, Option, Schema } from "effect";
import { ArrayFormatter } from "effect/ParseResult";
import { CATALOG } from "@/data";
import { CatalogDecodeError, NoEligibleRouteError } from "@/errors";
import {
  ALL_PROVIDER_EU_COVERAGE,
  PROVIDER_COVERAGE_SUMMARIES,
  VENDOR_SCOPE_AUDIT,
  buildMultiVendorModels,
} from "@/vendorCoverage";
import {
  hasTursoConfig,
  loadModelRoutesFromTurso,
  loadProviderCoverageFromTurso,
  loadProviderCoverageSummariesFromTurso,
  loadVendorScopeFromTurso,
} from "@/turso";
import {
  ModelRoute,
  type ChainView,
  type FailoverHop,
  type MultiVendorModelView,
  type ProviderCoverageSummaryView,
  type ProviderCoverageView,
  type VendorScopeView,
  type FailoverChain,
  type ReliabilityGrade,
  type RouteView,
  type ScoredRoute,
} from "@/domain";

// ── ModelCatalogService ────────────────────────────────────────────────────────
// Decodes the curated dataset once and exposes it. Decoding at the boundary means
// a malformed price or bad tier literal fails loudly with CatalogDecodeError
// rather than silently flowing into the UI.

const decodeCatalog = Schema.decodeUnknown(Schema.Array(ModelRoute));
const describeCatalogLoadFailure = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

const loadCatalogInput = Effect.tryPromise(
  async () => {
    if (!hasTursoConfig()) return CATALOG;
    const rows = await loadModelRoutesFromTurso();
    return rows && rows.length > 0 ? rows : CATALOG;
  },
).pipe(
  Effect.catchAll((cause) =>
    Effect.gen(function* () {
      yield* Effect.logWarning("Turso route catalog unavailable; using static catalog fallback.", {
        cause: describeCatalogLoadFailure(cause),
      });
      return CATALOG;
    }),
  ),
);

export class ModelCatalogService extends Effect.Service<ModelCatalogService>()(
  "ModelCatalogService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const input = yield* loadCatalogInput;
      const routes = yield* decodeCatalog(input).pipe(
        Effect.catchTag("ParseError", (err) =>
          Effect.fail(
            new CatalogDecodeError({
              message: "EU route catalog failed schema validation",
              cause: ArrayFormatter.formatErrorSync(err)
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; "),
            }),
          ),
        ),
      );
      yield* Effect.log("Catalog decoded", { routes: routes.length });

      const all = Effect.fn("ModelCatalogService.all")(function* () {
        return routes;
      });

      return { all };
    }),
  },
) {}

// ── ReliabilityService ──────────────────────────────────────────────────────────
// Turns raw SLA / observed-uptime / availability-risk into one 0–100 score so the
// "is it actually up when I need it" question is a first-class, sortable axis —
// not buried in a footnote. Heuristic, documented in README.

const RISK_POINTS = { low: 40, medium: 22, high: 6 } as const;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const gradeOf = (score: number): ReliabilityGrade =>
  score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";

export class ReliabilityService extends Effect.Service<ReliabilityService>()(
  "ReliabilityService",
  {
    accessors: true,
    dependencies: [ModelCatalogService.Default],
    effect: Effect.gen(function* () {
      const catalog = yield* ModelCatalogService;

      const scoreOne = (r: ModelRoute): ScoredRoute => {
        // Uptime component (0–60): observed > SLA > neutral default of 97.
        // Reputable sovereign hosts without a published % get the benefit of 97.
        const base = Option.getOrElse(
          Option.orElse(r.observedUptime, () => r.slaPct),
          () => 97,
        );
        const uptimeComponent = clamp01((base - 70) / 30) * 60;
        const riskComponent = RISK_POINTS[r.availabilityRisk];
        const reliabilityScore = Math.round(uptimeComponent + riskComponent);
        return {
          ...r,
          reliabilityScore,
          reliabilityGrade: gradeOf(reliabilityScore),
          blended: (r.inputPrice + r.outputPrice) / 2,
        };
      };

      const scoredAll = Effect.fn("ReliabilityService.scoredAll")(function* () {
        const routes = yield* catalog.all();
        return routes.map(scoreOne);
      });

      return { scoredAll };
    }),
  },
) {}

// ── RecommendationService ───────────────────────────────────────────────────────
// Builds the EU-first, reliability-aware failover chains per workload class. Tier-B
// (residency / CLOUD Act) routes are NEVER in the auto-fallback list — they sit in
// `escalation`, reachable only via an explicit, logged escalate-* alias.

interface ChainSpec {
  readonly alias: string;
  readonly task: string;
  readonly reasoning: boolean;
  readonly hops: ReadonlyArray<readonly [id: string, rationale: string]>;
  readonly escalation: ReadonlyArray<readonly [id: string, rationale: string]>;
}

const CHAIN_SPECS: ReadonlyArray<ChainSpec> = [
  {
    alias: "fast-path",
    task: "Classification · extraction · chat responses",
    reasoning: false,
    hops: [
      ["mistral-small-4", "Best sovereign workhorse — quality + European language handling"],
      ["mistral-small-3-2", "Same family on Scaleway/OVH (A-grade SLA) — covers Mistral-vendor wobble"],
      ["gpt-oss-20b-ovh", "Cheapest, fastest, different model + host — true diversity"],
    ],
    escalation: [
      ["vertex-gemini-2-5-flash-lite", "Lowest TTFT if you accept residency for a low-risk burst"],
    ],
  },
  {
    alias: "batch-cheap",
    task: "Bulk summarization · routing · high-volume extraction",
    reasoning: false,
    hops: [
      ["ministral-3-3b", "Fastest + cheapest, hosted on OVH for the SLA"],
      ["gpt-oss-20b-ovh", "Lowest EUR price, reasoning toggle off"],
      ["mistral-small-3-2", "Step up in quality, still sovereign A-grade"],
    ],
    escalation: [["bedrock-nova-lite", "Very cheap residency option if sovereign capacity is exhausted"]],
  },
  {
    alias: "quality",
    task: "Customer-facing text · nuanced generation · multilingual work",
    reasoning: false,
    hops: [
      ["mistral-medium-3-5", "Highest Mistral quality on Scaleway (99.9%)"],
      ["mistral-large-3", "Frontier-class, 262K context, still sovereign"],
      ["gpt-oss-120b", "Multi-host sovereign — strongest availability of any single model"],
    ],
    escalation: [["bedrock-claude-sonnet-4-6", "Claude-class quality via Bedrock EU-geo when truly needed"]],
  },
  {
    alias: "reasoning",
    task: "Research · contract review · multi-step agent planning",
    reasoning: true,
    hops: [
      ["magistral-medium-1-2", "Dedicated sovereign reasoning (o3-class)"],
      ["gpt-oss-120b", "Cheapest capable sovereign reasoner, multi-host"],
      ["qwen3-5-397b", "Frontier open-weight reasoning, FR-hosted"],
    ],
    escalation: [["bedrock-claude-sonnet-4-6", "Extended-thinking escalation via Bedrock EU-geo"]],
  },
];

export class RecommendationService extends Effect.Service<RecommendationService>()(
  "RecommendationService",
  {
    accessors: true,
    dependencies: [ReliabilityService.Default],
    effect: Effect.gen(function* () {
      const reliability = yield* ReliabilityService;

      const resolve = (
        scored: ReadonlyArray<ScoredRoute>,
        pairs: ReadonlyArray<readonly [string, string]>,
        task: string,
      ) =>
        Effect.gen(function* () {
          const hops: FailoverHop[] = [];
          for (const [id, rationale] of pairs) {
            const found = Option.fromNullable(scored.find((r) => r.id === id));
            const route = yield* Option.match(found, {
              onNone: () =>
                Effect.fail(
                  new NoEligibleRouteError({
                    task,
                    message: `Route '${id}' not found in catalog`,
                  }),
                ),
              onSome: (r) => Effect.succeed(r),
            });
            hops.push({ route, rationale });
          }
          return hops;
        });

      const chains = Effect.fn("RecommendationService.chains")(function* () {
        const scored = yield* reliability.scoredAll();
        const result: FailoverChain[] = [];
        for (const spec of CHAIN_SPECS) {
          const hops = yield* resolve(scored, spec.hops, spec.task);
          const escalation = yield* resolve(scored, spec.escalation, spec.task);
          result.push({
            alias: spec.alias,
            task: spec.task,
            reasoning: spec.reasoning,
            hops,
            escalation,
          });
        }
        return result;
      });

      return { chains };
    }),
  },
) {}

// ── Runtime ─────────────────────────────────────────────────────────────────────
// Single managed runtime wiring every service's Default layer. Server components
// call `loadExplorerData()` to get fully-decoded, scored, recommended data.

const AppLive = Layer.mergeAll(
  ModelCatalogService.Default,
  ReliabilityService.Default,
  RecommendationService.Default,
);

const runtime = ManagedRuntime.make(AppLive);

export interface ExplorerData {
  readonly routes: ReadonlyArray<RouteView>;
  readonly chains: ReadonlyArray<ChainView>;
  readonly providerCoverage: ReadonlyArray<ProviderCoverageView>;
  readonly providerCoverageSummaries: ReadonlyArray<ProviderCoverageSummaryView>;
  readonly vendorScope: ReadonlyArray<VendorScopeView>;
  readonly multiVendorModels: ReadonlyArray<MultiVendorModelView>;
}

// Flatten Effect Option<number> → number | null so the result is JSON-safe.
const toView = (r: ScoredRoute): RouteView => ({
  id: r.id,
  name: r.name,
  maker: r.maker,
  providers: r.providers,
  route: r.route,
  tier: r.tier,
  mode: r.mode,
  capabilities: r.capabilities,
  openness: r.openness,
  inputPrice: r.inputPrice,
  outputPrice: r.outputPrice,
  throughput: r.throughput,
  ttft: r.ttft,
  latest: r.latest,
  note: r.note,
  contextWindow: r.contextWindow,
  maxOutput: Option.getOrNull(r.maxOutput),
  slaPct: Option.getOrNull(r.slaPct),
  observedUptime: Option.getOrNull(r.observedUptime),
  availabilityRisk: r.availabilityRisk,
  reliabilityNote: r.reliabilityNote,
  intelligenceIndex: Option.getOrNull(r.intelligenceIndex),
  codingIndex: Option.getOrNull(r.codingIndex),
  reasoningScore: Option.getOrNull(r.reasoningScore),
  benchmarkSource: r.benchmarkSource,
  reliabilityScore: r.reliabilityScore,
  reliabilityGrade: r.reliabilityGrade,
  blended: r.blended,
});

const chainToView = (c: FailoverChain): ChainView => ({
  alias: c.alias,
  task: c.task,
  reasoning: c.reasoning,
  hops: c.hops.map((h) => ({ route: toView(h.route), rationale: h.rationale })),
  escalation: c.escalation.map((h) => ({ route: toView(h.route), rationale: h.rationale })),
});

const program = Effect.gen(function* () {
  const scored = yield* ReliabilityService.scoredAll();
  const chains = yield* RecommendationService.chains();
  const providerCoverageEffect = Effect.tryPromise(() => loadProviderCoverageFromTurso()).pipe(
      Effect.map((rows) => (rows && rows.length > 0 ? rows : ALL_PROVIDER_EU_COVERAGE)),
      Effect.catchAll(() => Effect.succeed(ALL_PROVIDER_EU_COVERAGE)),
    );
  const providerCoverageSummariesEffect = Effect.tryPromise(() => loadProviderCoverageSummariesFromTurso()).pipe(
      Effect.map((rows) => (rows && rows.length > 0 ? rows : PROVIDER_COVERAGE_SUMMARIES)),
      Effect.catchAll(() => Effect.succeed(PROVIDER_COVERAGE_SUMMARIES)),
    );
  const vendorScopeEffect = Effect.tryPromise(() => loadVendorScopeFromTurso()).pipe(
      Effect.map((rows) => (rows && rows.length > 0 ? rows : VENDOR_SCOPE_AUDIT)),
      Effect.catchAll(() => Effect.succeed(VENDOR_SCOPE_AUDIT)),
    );
  const [providerCoverage, providerCoverageSummaries, vendorScope] = yield* Effect.all(
    [providerCoverageEffect, providerCoverageSummariesEffect, vendorScopeEffect] as const,
    { concurrency: "unbounded" },
  );
  return {
    routes: scored.map(toView),
    chains: chains.map(chainToView),
    providerCoverage,
    providerCoverageSummaries,
    vendorScope,
    multiVendorModels: buildMultiVendorModels(providerCoverage),
  } satisfies ExplorerData;
});

/** Run the Effect pipeline and return plain serializable data for RSC → client. */
export const loadExplorerData = (): Promise<ExplorerData> => runtime.runPromise(program);
