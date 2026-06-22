import { createClient, type Client, type Row } from "@libsql/client/web";
import { CATALOG } from "@/data";
import type {
  CoverageRegionView,
  ModelRouteInput,
  ProviderCoverageSummaryView,
  ProviderCoverageView,
  Capability,
  Tier,
  VendorScopeView,
} from "@/domain";

type BenchmarkFields = Pick<
  ModelRouteInput,
  "benchmarkSource" | "codingIndex" | "intelligenceIndex" | "reasoningScore"
>;

const benchmarkFieldsByRouteId = new Map<string, BenchmarkFields>(
  CATALOG.map((route) => [
    String(route.id),
    {
      intelligenceIndex: route.intelligenceIndex,
      codingIndex: route.codingIndex,
      reasoningScore: route.reasoningScore,
      benchmarkSource: route.benchmarkSource,
    },
  ]),
);

export const mergeStaticBenchmarkFields = (route: ModelRouteInput): ModelRouteInput => {
  const staticFields = benchmarkFieldsByRouteId.get(String(route.id));
  return {
    ...route,
    intelligenceIndex: route.intelligenceIndex ?? staticFields?.intelligenceIndex ?? null,
    codingIndex: route.codingIndex ?? staticFields?.codingIndex ?? null,
    reasoningScore: route.reasoningScore ?? staticFields?.reasoningScore ?? null,
    benchmarkSource: route.benchmarkSource || staticFields?.benchmarkSource || "",
  };
};

const config = () => {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return null;
  // @libsql/client/web uses fetch and only accepts http(s):// URLs.
  // The native client auto-translates libsql:// → wss://, but /web does not.
  return {
    url: url.trim().replace(/^libsql:\/\//, "https://"),
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
};

export const hasTursoConfig = (): boolean => config() !== null;

export const withClient = async <A>(fn: (client: Client) => Promise<A>): Promise<A | null> => {
  const cfg = config();
  if (!cfg) return null;
  const client = createClient(cfg);
  try {
    return await fn(client);
  } finally {
    client.close();
  }
};

const asString = (row: Row, key: string): string => String(row[key] ?? "");
const asNumber = (row: Row, key: string): number => Number(row[key] ?? 0);
const asNullableNumber = (row: Row, key: string): number | null => (row[key] == null ? null : Number(row[key]));
const asBoolean = (row: Row, key: string): boolean => Number(row[key] ?? 0) === 1;
const asStringArray = (row: Row, key: string): ReadonlyArray<string> => {
  const value = row[key];
  if (typeof value !== "string") return [];
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.map(String) : [];
};

export const loadModelRoutesFromTurso = async (): Promise<ReadonlyArray<ModelRouteInput> | null> =>
  withClient(async (client) => {
    const result = await client.execute(`
      SELECT id, name, maker, route, providers_json, capabilities_json, tier, mode, openness, input_price, output_price, throughput, ttft,
             intelligence_index, latest, note, sla_pct, observed_uptime, availability_risk, reliability_note
      FROM model_routes
      ORDER BY tier, maker, name
    `);
return result.rows.map((row) =>
      mergeStaticBenchmarkFields({
        id: asString(row, "id"),
        name: asString(row, "name"),
        maker: asString(row, "maker"),
        route: asString(row, "route"),
        providers: asStringArray(row, "providers_json"),
        capabilities: asStringArray(row, "capabilities_json") as ReadonlyArray<Capability>,
        tier: asString(row, "tier") as Tier,
        mode: asString(row, "mode") as ModelRouteInput["mode"],
        openness: asString(row, "openness") as ModelRouteInput["openness"],
        inputPrice: asNumber(row, "input_price"),
        outputPrice: asNumber(row, "output_price"),
        throughput: asNumber(row, "throughput"),
        ttft: asNumber(row, "ttft"),
        intelligenceIndex: asNullableNumber(row, "intelligence_index"),
        latest: asBoolean(row, "latest"),
        note: asString(row, "note"),
        slaPct: asNullableNumber(row, "sla_pct"),
        observedUptime: asNullableNumber(row, "observed_uptime"),
        availabilityRisk: asString(row, "availability_risk") as ModelRouteInput["availabilityRisk"],
        reliabilityNote: asString(row, "reliability_note"),
        codingIndex: null,
        reasoningScore: null,
        benchmarkSource: "",
      }),
    );
  });

export const loadProviderCoverageFromTurso = async (): Promise<ReadonlyArray<ProviderCoverageView> | null> =>
  withClient(async (client) => {
    const coverage = await client.execute(`
      SELECT id, platform, provider, model, tier, requirement_fit, source_type, source, evidence_note
      FROM provider_coverage
      ORDER BY platform, provider, model
    `);
    const regions = await client.execute(`
      SELECT coverage_id, code, name, in_region, eu_geo, global, legacy_eol
      FROM coverage_regions
      ORDER BY coverage_id, code
    `);
    const byCoverage = new Map<string, CoverageRegionView[]>();
    for (const row of regions.rows) {
      const coverageId = asString(row, "coverage_id");
      byCoverage.set(coverageId, [
        ...(byCoverage.get(coverageId) ?? []),
        {
          code: asString(row, "code"),
          name: asString(row, "name"),
          inRegion: asBoolean(row, "in_region"),
          euGeo: asBoolean(row, "eu_geo"),
          global: asBoolean(row, "global"),
          legacyEol: row.legacy_eol == null ? null : asString(row, "legacy_eol"),
        },
      ]);
    }
    return coverage.rows.map((row) => {
      const id = asString(row, "id");
      return {
        platform: asString(row, "platform"),
        provider: asString(row, "provider"),
        model: asString(row, "model"),
        tier: asString(row, "tier") as Tier,
        requirementFit: asString(row, "requirement_fit") as ProviderCoverageView["requirementFit"],
        sourceType: asString(row, "source_type") as ProviderCoverageView["sourceType"],
        regions: byCoverage.get(id) ?? [],
        source: asString(row, "source"),
        evidenceNote: asString(row, "evidence_note"),
      };
    });
  });

export const loadProviderCoverageSummariesFromTurso = async (): Promise<
  ReadonlyArray<ProviderCoverageSummaryView> | null
> =>
  withClient(async (client) => {
    const result = await client.execute(`
      SELECT platform, provider, tier, requirement_fit, model_count, source_type, source, evidence_note
      FROM provider_coverage_summaries
      ORDER BY platform
    `);
    return result.rows.map((row) => ({
      platform: asString(row, "platform"),
      provider: asString(row, "provider"),
      tier: asString(row, "tier") as Tier,
      requirementFit: asString(row, "requirement_fit") as ProviderCoverageSummaryView["requirementFit"],
      modelCount: asNumber(row, "model_count"),
      sourceType: asString(row, "source_type") as ProviderCoverageSummaryView["sourceType"],
      source: asString(row, "source"),
      evidenceNote: asString(row, "evidence_note"),
    }));
  });

export const loadVendorScopeFromTurso = async (): Promise<ReadonlyArray<VendorScopeView> | null> =>
  withClient(async (client) => {
    const result = await client.execute(`
      SELECT platform, provider, tier, status, category, model_coverage, source_type, source, evidence_note
      FROM vendor_scope
      ORDER BY
        CASE status
          WHEN 'covered' THEN 0
          WHEN 'covered-with-conditions' THEN 1
          WHEN 'excluded' THEN 2
          ELSE 3
        END,
        platform
    `);
    return result.rows.map((row) => ({
      platform: asString(row, "platform"),
      provider: asString(row, "provider"),
      tier: asString(row, "tier") as Tier,
      status: asString(row, "status") as VendorScopeView["status"],
      category: asString(row, "category") as VendorScopeView["category"],
      modelCoverage: asString(row, "model_coverage"),
      sourceType: asString(row, "source_type") as VendorScopeView["sourceType"],
      source: asString(row, "source"),
      evidenceNote: asString(row, "evidence_note"),
    }));
  });
