import { Schema } from "effect";

/**
 * Domain model for the EU-sovereign LLM route explorer.
 *
 * A "route" is a (model, EU host) pair — the same open-weight model on OVHcloud
 * and on Scaleway are two distinct routes because their sovereignty, price and
 * reliability differ. Everything downstream (scoring, recommendation, UI) keys
 * off this schema.
 */

// ── Branded identifiers ───────────────────────────────────────────────────────
export const RouteId = Schema.String.pipe(Schema.brand("@EUExplorer/RouteId"));
export type RouteId = Schema.Schema.Type<typeof RouteId>;

// ── Enumerations ───────────────────────────────────────────────────────────────

/** Sovereignty tier. A = EU-native/sovereign, B = EU-residency under a US vendor
 *  (CLOUD Act exposure), C = rejected for sensitive workloads. */
export const Tier = Schema.Literal("A", "B", "C");
export type Tier = Schema.Schema.Type<typeof Tier>;

export const Mode = Schema.Literal("reasoning", "non-reasoning", "configurable");
export type Mode = Schema.Schema.Type<typeof Mode>;

export const Openness = Schema.Literal("open-weight", "open-source", "proprietary");
export type Openness = Schema.Schema.Type<typeof Openness>;

export const Capability = Schema.Literal("vision", "tools", "cache", "think", "web", "json");
export type Capability = Schema.Schema.Type<typeof Capability>;

/**
 * Operational availability risk — distinct from the SLA number. Captures the
 * "will the model/capacity actually be there when I deploy" question that the
 * Azure investigation surfaced (model-rollout lag, capacity-not-guaranteed,
 * shared-quota 429 contention, single-vendor concentration).
 */
export const AvailabilityRisk = Schema.Literal("low", "medium", "high");
export type AvailabilityRisk = Schema.Schema.Type<typeof AvailabilityRisk>;

export const ReliabilityGrade = Schema.Literal("A", "B", "C", "D");
export type ReliabilityGrade = Schema.Schema.Type<typeof ReliabilityGrade>;

// ── Route schema ─────────────────────────────────────────────────────────────
//
// Reliability inputs are nullable in the raw dataset and decode to Option<number>
// in the domain, per Effect's "no null/undefined in domain types" rule.

export const ModelRoute = Schema.Struct({
  id: RouteId,
  name: Schema.String,
  maker: Schema.String,
  /** Human-readable EU host + region, e.g. "OVHcloud AI Endpoints (FR)". */
  route: Schema.String,
  providers: Schema.Array(Schema.String),
  capabilities: Schema.Array(Capability),
  tier: Tier,
  mode: Mode,
  openness: Openness,
  /** USD or EUR per 1M tokens, as published by the vendor (mixed currencies). */
  inputPrice: Schema.Number,
  outputPrice: Schema.Number,
  /** Median tokens/sec from Artificial Analysis / vendor figures. */
  throughput: Schema.Number,
  /** Median time-to-first-token in seconds. */
  ttft: Schema.Number,
  latest: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  note: Schema.String,

  // Reliability dimension
  /** Vendor-published monthly uptime SLA, e.g. 99.9. None = no public SLA. */
  slaPct: Schema.OptionFromNullOr(Schema.Number),
  /** Third-party observed 90-day uptime (status monitors). None = unmeasured. */
  observedUptime: Schema.OptionFromNullOr(Schema.Number),
  availabilityRisk: AvailabilityRisk,
  reliabilityNote: Schema.String,

  // Public benchmark dimension
  /** Artificial Analysis Intelligence Index or equivalent. None = unmeasured. */
  intelligenceIndex: Schema.OptionFromNullOr(Schema.Number),
  /** Coding/SWE composite score. None = unmeasured. */
  codingIndex: Schema.OptionFromNullOr(Schema.Number),
  /** GPQA Diamond percentage or equivalent reasoning benchmark. None = unmeasured. */
  reasoningScore: Schema.OptionFromNullOr(Schema.Number),
  /** Short public citation/URL for benchmark fields. Empty when no score is present. */
  benchmarkSource: Schema.String,
});
export type ModelRoute = Schema.Schema.Type<typeof ModelRoute>;

/** The shape the raw dataset is authored in (encoded form: nullable numbers). */
export type ModelRouteInput = Schema.Schema.Encoded<typeof ModelRoute>;

// ── Derived / scored types ─────────────────────────────────────────────────────

export interface ScoredRoute extends ModelRoute {
  /** Composite 0–100 reliability score (see ReliabilityService). */
  readonly reliabilityScore: number;
  readonly reliabilityGrade: ReliabilityGrade;
  /** (input + output) / 2, a rough blended $/1M proxy. */
  readonly blended: number;
}

/** A single hop in a failover chain. */
export interface FailoverHop {
  readonly route: ScoredRoute;
  readonly rationale: string;
}

/** A named failover chain for one general workload class (e.g. "fast-path"). */
export interface FailoverChain {
  readonly alias: string;
  readonly task: string;
  readonly reasoning: boolean;
  readonly hops: ReadonlyArray<FailoverHop>;
  /** Tier-B routes deliberately kept OUT of auto-fallback, reachable only via
   *  an explicit, logged escalate-* call. */
  readonly escalation: ReadonlyArray<FailoverHop>;
}

// ── Serializable views (server → client boundary) ───────────────────────────────
// Plain, JSON-safe shapes. Option<number> is flattened to number | null so RSC can
// hand these to client components without leaking Effect runtime objects.

export interface RouteView {
  readonly id: string;
  readonly name: string;
  readonly maker: string;
  readonly providers: ReadonlyArray<string>;
  readonly route: string;
  readonly tier: Tier;
  readonly mode: Mode;
  readonly capabilities: ReadonlyArray<Capability>;
  readonly openness: Openness;
  readonly inputPrice: number;
  readonly outputPrice: number;
  readonly throughput: number;
  readonly ttft: number;
  readonly latest: boolean;
  readonly note: string;
  readonly slaPct: number | null;
  readonly observedUptime: number | null;
  readonly availabilityRisk: AvailabilityRisk;
  readonly reliabilityNote: string;
  readonly intelligenceIndex: number | null;
  readonly codingIndex: number | null;
  readonly reasoningScore: number | null;
  readonly benchmarkSource: string;
  readonly reliabilityScore: number;
  readonly reliabilityGrade: ReliabilityGrade;
  readonly blended: number;
}

export interface HopView {
  readonly route: RouteView;
  readonly rationale: string;
}

export interface ChainView {
  readonly alias: string;
  readonly task: string;
  readonly reasoning: boolean;
  readonly hops: ReadonlyArray<HopView>;
  readonly escalation: ReadonlyArray<HopView>;
}

export interface CoverageRegionView {
  readonly code: string;
  readonly name: string;
  readonly inRegion: boolean;
  readonly euGeo: boolean;
  readonly global: boolean;
  readonly legacyEol: string | null;
}

export interface ProviderCoverageView {
  readonly platform: string;
  readonly provider: string;
  readonly model: string;
  readonly tier: Tier;
  readonly requirementFit: "sovereign" | "eu-residency" | "rejected";
  readonly sourceType: "official" | "report-derived";
  readonly regions: ReadonlyArray<CoverageRegionView>;
  readonly source: string;
  readonly evidenceNote: string;
}

export interface ProviderCoverageSummaryView {
  readonly platform: string;
  readonly provider: string;
  readonly tier: Tier;
  readonly requirementFit: "sovereign" | "eu-residency" | "rejected";
  readonly modelCount: number;
  readonly sourceType: "official" | "report-derived";
  readonly source: string;
  readonly evidenceNote: string;
}

export interface VendorScopeView {
  readonly platform: string;
  readonly provider: string;
  readonly tier: Tier;
  readonly status: "covered" | "covered-with-conditions" | "excluded" | "monitor";
  readonly category: "sovereign" | "eu-residency" | "eu-router" | "rejected" | "infrastructure";
  readonly modelCoverage: string;
  readonly sourceType: "official" | "report-derived";
  readonly source: string;
  readonly evidenceNote: string;
}

export interface MultiVendorModelView {
  readonly family: string;
  readonly models: ReadonlyArray<string>;
  readonly vendors: ReadonlyArray<string>;
  readonly platforms: ReadonlyArray<string>;
  readonly bestFit: "sovereign" | "eu-residency";
}
