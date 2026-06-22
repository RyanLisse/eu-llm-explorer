import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { CATALOG } from "../src/data";
import {
  ALL_PROVIDER_EU_COVERAGE,
  AWS_BEDROCK_EU_COVERAGE,
  PROVIDER_COVERAGE_SUMMARIES,
  REQUESTY_EU_COVERAGE,
  VENDOR_SCOPE_AUDIT,
  buildMultiVendorModels,
} from "../src/vendorCoverage";

const loadDotenvLocal = () => {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1);
      process.env[key] ??= value;
    }
  } catch {
    // CI or production can provide env vars directly.
  }
};

const failures: Array<string> = [];
const checks: Record<string, unknown> = {};

const assert = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

const countBy = <T>(rows: ReadonlyArray<T>, key: (row: T) => string) =>
  rows.reduce<Record<string, number>>((counts, row) => {
    const value = key(row);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});

const expectedRegionRows = ALL_PROVIDER_EU_COVERAGE.reduce((total, row) => total + row.regions.length, 0);
const platformSet = new Set(ALL_PROVIDER_EU_COVERAGE.map((row) => row.platform));
const summarySet = new Set(PROVIDER_COVERAGE_SUMMARIES.map((row) => row.platform));
const overlaps = buildMultiVendorModels(ALL_PROVIDER_EU_COVERAGE);

const coveredPlatformMap = new Map<string, ReadonlyArray<string>>([
  ["AWS Bedrock EU", ["AWS Bedrock"]],
  ["Azure AI Foundry EU", ["Azure AI Foundry EU Data Zone", "Azure AI Foundry EU Regional"]],
  ["Google Vertex AI EU", ["Google Vertex AI EU"]],
  ["IONOS AI Model Hub", ["IONOS AI Model Hub"]],
  ["Mistral La Plateforme", ["Mistral La Plateforme"]],
  ["Nebius Token Factory", ["Nebius Token Factory"]],
  ["OVHcloud AI Endpoints", ["OVHcloud AI Endpoints"]],
  ["Requesty EU Router", ["Requesty EU Router"]],
  ["Scaleway Generative APIs", ["Scaleway Generative APIs"]],
  ["STACKIT AI Model Serving", ["STACKIT AI Model Serving"]],
]);

const expectedVendorScopeStatuses = {
  covered: 8,
  "covered-with-conditions": 2,
  excluded: 10,
  monitor: 2,
};

const allowedRouteProviders = new Set([
  "Azure",
  "AWS Bedrock",
  "Google Vertex",
  "Mistral",
  "OVHcloud",
  "Scaleway",
  "STACKIT",
  "IONOS",
  "Nebius",
  "Groq",
  "Cerebras",
]);
const allowedCapabilities = new Set(["vision", "tools", "cache", "think", "web", "json"]);

checks.staticCounts = {
  modelRoutes: CATALOG.length,
  providerCoverageRows: ALL_PROVIDER_EU_COVERAGE.length,
  coverageRegionRows: expectedRegionRows,
  providerCoverageSummaries: PROVIDER_COVERAGE_SUMMARIES.length,
  vendorScopeRows: VENDOR_SCOPE_AUDIT.length,
  awsBedrockRows: AWS_BEDROCK_EU_COVERAGE.length,
  requestyRows: REQUESTY_EU_COVERAGE.length,
  overlaps: overlaps.length,
};

assert(CATALOG.length === 25, `Expected 25 model routes, got ${CATALOG.length}.`);
for (const route of CATALOG) {
  assert(route.providers.length > 0, `Route ${route.id} must declare at least one provider.`);
  assert(route.capabilities.length > 0, `Route ${route.id} must declare at least one capability.`);
  for (const provider of route.providers) {
    assert(allowedRouteProviders.has(provider), `Route ${route.id} has unknown provider metadata: ${provider}.`);
  }
  for (const capability of route.capabilities) {
    assert(allowedCapabilities.has(capability), `Route ${route.id} has unknown capability metadata: ${capability}.`);
  }
}
assert(
  ALL_PROVIDER_EU_COVERAGE.length === 419,
  `Expected 419 qualifying provider coverage rows, got ${ALL_PROVIDER_EU_COVERAGE.length}.`,
);
assert(
  PROVIDER_COVERAGE_SUMMARIES.length === 11,
  `Expected 11 provider coverage summaries, got ${PROVIDER_COVERAGE_SUMMARIES.length}.`,
);
assert(VENDOR_SCOPE_AUDIT.length === 22, `Expected 22 vendor-scope rows, got ${VENDOR_SCOPE_AUDIT.length}.`);
assert(AWS_BEDROCK_EU_COVERAGE.length === 77, `Expected 77 AWS Bedrock EU rows, got ${AWS_BEDROCK_EU_COVERAGE.length}.`);
assert(REQUESTY_EU_COVERAGE.length === 135, `Expected 135 Requesty EU Router rows, got ${REQUESTY_EU_COVERAGE.length}.`);
assert(overlaps.length === 61, `Expected 61 multi-vendor overlap families, got ${overlaps.length}.`);
assert(
  overlaps.some((row) => row.platforms.includes("Requesty EU Router")),
  "Expected at least one multi-vendor overlap family to include Requesty EU Router.",
);
assert(
  overlaps.some((row) => row.family === "gpt oss" && row.platforms.length >= 5),
  "Expected the gpt oss family to show broad multi-vendor availability.",
);
assert(
  ALL_PROVIDER_EU_COVERAGE.every((row) => row.tier !== "C" && row.requirementFit !== "rejected"),
  "Qualifying provider coverage must not include Tier C or rejected rows.",
);
assert(
  AWS_BEDROCK_EU_COVERAGE.every((row) => row.regions.some((region) => region.inRegion || region.euGeo)),
  "Every AWS Bedrock row must include at least one EU In-Region or EU Geo region.",
);
assert(
  ALL_PROVIDER_EU_COVERAGE.every((row) =>
    !row.regions.some((region) => region.global) || row.regions.some((region) => region.inRegion || region.euGeo),
  ),
  "Global flags must not qualify a row unless an EU-qualified flag is also present.",
);

const vendorScopeStatuses = countBy(VENDOR_SCOPE_AUDIT, (row) => row.status);
checks.vendorScopeStatuses = vendorScopeStatuses;
for (const [status, expected] of Object.entries(expectedVendorScopeStatuses)) {
  assert(vendorScopeStatuses[status] === expected, `Expected ${expected} vendor-scope rows with status ${status}.`);
}

for (const scope of VENDOR_SCOPE_AUDIT.filter(
  (row) => row.status === "covered" || row.status === "covered-with-conditions",
)) {
  const coveredPlatforms = coveredPlatformMap.get(scope.platform) ?? [scope.platform];
  assert(
    coveredPlatforms.some((platform) => platformSet.has(platform) || summarySet.has(platform)),
    `Covered vendor ${scope.platform} must have a qualifying coverage row or summary.`,
  );
}

for (const scope of VENDOR_SCOPE_AUDIT.filter((row) => row.status === "excluded" || row.status === "monitor")) {
  assert(!platformSet.has(scope.platform), `Non-covered vendor ${scope.platform} must not appear in qualifying rows.`);
  assert(!summarySet.has(scope.platform), `Non-covered vendor ${scope.platform} must not appear in summaries.`);
}

const auditTurso = async () => {
  loadDotenvLocal();

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    checks.turso = "skipped: TURSO_DATABASE_URL is not configured";
    return;
  }

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const scalar = async (sql: string) => {
    const result = await client.execute(sql);
    return Number(result.rows[0]?.value ?? 0);
  };

  try {
    const dbCounts = {
      modelRoutes: await scalar("SELECT COUNT(*) AS value FROM model_routes"),
      providerCoverageRows: await scalar("SELECT COUNT(*) AS value FROM provider_coverage"),
      coverageRegionRows: await scalar("SELECT COUNT(*) AS value FROM coverage_regions"),
      providerCoverageSummaries: await scalar("SELECT COUNT(*) AS value FROM provider_coverage_summaries"),
      vendorScopeRows: await scalar("SELECT COUNT(*) AS value FROM vendor_scope"),
      requestyRows: await scalar("SELECT COUNT(*) AS value FROM provider_coverage WHERE platform = 'Requesty EU Router'"),
      awsBedrockRows: await scalar("SELECT COUNT(*) AS value FROM provider_coverage WHERE platform = 'AWS Bedrock'"),
    };

    const statusResult = await client.execute(
      "SELECT status, COUNT(*) AS rows FROM vendor_scope GROUP BY status ORDER BY status",
    );
    const dbStatuses = Object.fromEntries(
      statusResult.rows.map((row) => [String(row.status), Number(row.rows)]),
    ) as Record<string, number>;

    checks.turso = {
      ...dbCounts,
      vendorScopeStatuses: dbStatuses,
    };

    assert(dbCounts.modelRoutes === CATALOG.length, "Turso model_routes count must match static catalog.");
    assert(
      dbCounts.providerCoverageRows === ALL_PROVIDER_EU_COVERAGE.length,
      "Turso provider_coverage count must match static coverage.",
    );
    assert(dbCounts.coverageRegionRows === expectedRegionRows, "Turso coverage_regions count must match static regions.");
    assert(
      dbCounts.providerCoverageSummaries === PROVIDER_COVERAGE_SUMMARIES.length,
      "Turso provider_coverage_summaries count must match static summaries.",
    );
    assert(dbCounts.vendorScopeRows === VENDOR_SCOPE_AUDIT.length, "Turso vendor_scope count must match static audit.");
    assert(dbCounts.requestyRows === REQUESTY_EU_COVERAGE.length, "Turso Requesty rows must match static data.");
    assert(dbCounts.awsBedrockRows === AWS_BEDROCK_EU_COVERAGE.length, "Turso AWS Bedrock rows must match static data.");

    for (const [status, expected] of Object.entries(expectedVendorScopeStatuses)) {
      assert(dbStatuses[status] === expected, `Turso vendor_scope status ${status} must equal ${expected}.`);
    }
  } finally {
    client.close();
  }
};

await auditTurso();

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, checks }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks }, null, 2));
