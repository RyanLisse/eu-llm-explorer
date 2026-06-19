import type {
  ChainView,
  ProviderCoverageSummaryView,
  ProviderCoverageView,
  RouteView,
  Tier,
  VendorScopeView,
} from "@/domain";

export interface DecisionPacketData {
  readonly routes: ReadonlyArray<RouteView>;
  readonly providerCoverage: ReadonlyArray<ProviderCoverageView>;
  readonly providerCoverageSummaries: ReadonlyArray<ProviderCoverageSummaryView>;
  readonly vendorScope: ReadonlyArray<VendorScopeView>;
  readonly chains: ReadonlyArray<ChainView>;
}

export interface SovereigntyDecisionPacket {
  readonly generatedAt: string;
  readonly catalogCaptured: "June 2026";
  readonly subject: { readonly kind: "vendor"; readonly key: string; readonly label: string };
  readonly verdict: { readonly tier: Tier; readonly fit: string; readonly summary: string; readonly caveat: string };
  readonly evidence: ReadonlyArray<{ readonly source: string; readonly sourceType: string; readonly note: string }>;
  readonly modelCoverage: {
    readonly totalModels: number;
    readonly benchmarkedRoutes: number;
    readonly regions: ReadonlyArray<string>;
  };
  readonly benchmarkHighlights: ReadonlyArray<{
    readonly model: string;
    readonly inputPrice: number | null;
    readonly outputPrice: number | null;
    readonly throughput: number | null;
    readonly ttft: number | null;
    readonly reliabilityScore: number | null;
  }>;
  readonly recommendedUse: ReadonlyArray<string>;
  readonly restrictions: ReadonlyArray<string>;
  readonly fallbackPolicy: ReadonlyArray<{
    readonly alias: string;
    readonly sovereignHops: ReadonlyArray<string>;
    readonly escalationHops: ReadonlyArray<string>;
  }>;
}

const AZURE_COMPARE_VENDOR_KEY = "Azure AI Foundry";

const PLATFORM_TO_ROUTE_TAG: Record<string, string> = {
  "Mistral La Plateforme": "Mistral",
  "Scaleway Generative APIs": "Scaleway",
  "OVHcloud AI Endpoints": "OVHcloud",
  "STACKIT AI Model Serving": "STACKIT",
  "IONOS AI Model Hub": "IONOS",
  "Nebius Token Factory": "Nebius",
  "Google Vertex AI EU": "Google Vertex",
  "AWS Bedrock EU": "AWS Bedrock",
  [AZURE_COMPARE_VENDOR_KEY]: "Azure",
};

const PLATFORM_TO_COVERAGE: Record<string, ReadonlyArray<string>> = {
  "AWS Bedrock EU": ["AWS Bedrock"],
  [AZURE_COMPARE_VENDOR_KEY]: ["Azure AI Foundry EU Data Zone", "Azure AI Foundry EU Regional"],
};

const unique = <T,>(items: ReadonlyArray<T>): ReadonlyArray<T> => Array.from(new Set(items));

const sourceKey = (source: string, note: string): string => `${source}\n${note}`;

const findSummary = (
  summaries: ReadonlyArray<ProviderCoverageSummaryView>,
  key: string,
): ProviderCoverageSummaryView | null => {
  if (key === AZURE_COMPARE_VENDOR_KEY) {
    return summaries.find((summary) => summary.provider === "Microsoft Azure") ?? null;
  }
  return summaries.find((summary) => summary.platform === key) ?? null;
};

const verdictText = (summary: ProviderCoverageSummaryView): SovereigntyDecisionPacket["verdict"] => {
  if (summary.tier === "A") {
    return {
      tier: summary.tier,
      fit: "EU-sovereign",
      summary: `${summary.platform} is a Tier A route option for EU-sovereign workloads in this catalog.`,
      caveat: "Verify current DPA terms, subprocessor lists, pricing, regions, and model availability before production commitment.",
    };
  }
  if (summary.tier === "B") {
    return {
      tier: summary.tier,
      fit: "EU-residency",
      summary: `${summary.platform} keeps processing in EU-qualified regions but remains exposed to non-EU vendor control such as CLOUD Act risk.`,
      caveat: "Use for explicit escalation or lower-risk workloads after legal, security, and procurement review.",
    };
  }
  return {
    tier: summary.tier,
    fit: "Rejected for sensitive data",
    summary: `${summary.platform} is not approved for sensitive EU workloads in this catalog.`,
    caveat: "Do not use for sensitive workloads unless a new audited deployment route changes the tier.",
  };
};

export function buildVendorDecisionPacket(
  data: DecisionPacketData,
  vendorKey: string,
  generatedAt = new Date().toISOString(),
): SovereigntyDecisionPacket | null {
  const summary = findSummary(data.providerCoverageSummaries, vendorKey);
  if (!summary) return null;

  const coveragePlatforms = PLATFORM_TO_COVERAGE[vendorKey] ?? [vendorKey];
  const coverageRows = data.providerCoverage.filter((row) => coveragePlatforms.includes(row.platform));
  const routeTag = PLATFORM_TO_ROUTE_TAG[vendorKey] ?? summary.platform;
  const benchmarkRoutes = data.routes
    .filter((route) => route.providers.includes(routeTag))
    .toSorted((a, b) => b.reliabilityScore - a.reliabilityScore || a.blended - b.blended)
    .slice(0, 8);
  const scope = data.vendorScope.find((row) => row.platform === vendorKey || row.provider === summary.provider);
  const evidenceMap = new Map<string, { source: string; sourceType: string; note: string }>();
  for (const row of [summary, scope, ...coverageRows].filter(Boolean) as Array<
    ProviderCoverageSummaryView | VendorScopeView | ProviderCoverageView
  >) {
    evidenceMap.set(sourceKey(row.source, row.evidenceNote), {
      source: row.source,
      sourceType: row.sourceType,
      note: row.evidenceNote,
    });
  }

  const regions = unique(
    coverageRows.flatMap((row) => row.regions.map((region) => region.name || region.code).filter(Boolean)),
  ).toSorted();
  const verdict = verdictText(summary);

  return {
    generatedAt,
    catalogCaptured: "June 2026",
    subject: { kind: "vendor", key: vendorKey, label: summary.platform },
    verdict,
    evidence: Array.from(evidenceMap.values()),
    modelCoverage: {
      totalModels: coverageRows.length || summary.modelCount,
      benchmarkedRoutes: benchmarkRoutes.length,
      regions,
    },
    benchmarkHighlights: benchmarkRoutes.map((route) => ({
      model: `${route.maker} ${route.name}`,
      inputPrice: route.inputPrice,
      outputPrice: route.outputPrice,
      throughput: route.throughput,
      ttft: route.ttft,
      reliabilityScore: route.reliabilityScore,
    })),
    recommendedUse:
      summary.tier === "A"
        ? ["Default route candidate for sensitive EU workloads.", "Use in automatic fallback chains when capacity and SLA fit."]
        : ["Escalation candidate when Tier A capacity or model quality is insufficient."],
    restrictions:
      summary.tier === "A"
        ? ["Do not treat source capture as live pricing or availability.", "Re-verify terms before production commitment."]
        : [
            "Do not use as default automatic fallback for sensitive data.",
            "Document explicit approval because EU residency is not full EU sovereignty.",
          ],
    fallbackPolicy: data.chains.map((chain) => ({
      alias: chain.alias,
      sovereignHops: chain.hops.map((hop) => hop.route.id),
      escalationHops: chain.escalation.map((hop) => hop.route.id),
    })),
  };
}

export function formatDecisionPacketMarkdown(packet: SovereigntyDecisionPacket): string {
  const evidenceRows = packet.evidence
    .map((row) => `| ${row.sourceType} | ${row.note.replaceAll("|", "\\|")} | ${row.source} |`)
    .join("\n");
  const benchmarkRows = packet.benchmarkHighlights.length
    ? packet.benchmarkHighlights
        .map(
          (row) =>
            `| ${row.model} | ${row.inputPrice ?? ""} | ${row.outputPrice ?? ""} | ${row.throughput ?? ""} | ${row.ttft ?? ""} | ${row.reliabilityScore ?? ""} |`,
        )
        .join("\n")
    : "| No benchmark routes in catalog |  |  |  |  |  |";
  const fallbackRows = packet.fallbackPolicy
    .map((row) => `| ${row.alias} | ${row.sovereignHops.join(", ")} | ${row.escalationHops.join(", ")} |`)
    .join("\n");

  return [
    `# Sovereignty Decision Packet: ${packet.subject.label}`,
    "",
    `Generated: ${packet.generatedAt}`,
    `Catalog captured: ${packet.catalogCaptured}`,
    "",
    "## Verdict",
    "",
    `- Tier: ${packet.verdict.tier}`,
    `- Fit: ${packet.verdict.fit}`,
    `- Summary: ${packet.verdict.summary}`,
    `- Caveat: ${packet.verdict.caveat}`,
    "",
    "## Evidence",
    "",
    "| Source type | Note | Source |",
    "|---|---|---|",
    evidenceRows || "| none | No evidence rows found | |",
    "",
    "## Coverage",
    "",
    `- Total catalog models: ${packet.modelCoverage.totalModels}`,
    `- Benchmarked routes: ${packet.modelCoverage.benchmarkedRoutes}`,
    `- Regions: ${packet.modelCoverage.regions.join(", ") || "Vendor-level EU evidence only"}`,
    "",
    "## Benchmark Highlights",
    "",
    "| Model | Input | Output | Throughput | TTFT | Reliability |",
    "|---|---:|---:|---:|---:|---:|",
    benchmarkRows,
    "",
    "## Recommended Use",
    "",
    ...packet.recommendedUse.map((item) => `- ${item}`),
    "",
    "## Restrictions",
    "",
    ...packet.restrictions.map((item) => `- ${item}`),
    "",
    "## Fallback Policy",
    "",
    "| Chain | Sovereign hops | Escalation hops |",
    "|---|---|---|",
    fallbackRows,
    "",
    "This packet is an engineering governance artifact, not legal advice. Verify pricing, availability, DPA terms, and subprocessor lists before production commitment.",
  ].join("\n");
}
