import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { CATALOG } from "../src/data";
import { ALL_PROVIDER_EU_COVERAGE, PROVIDER_COVERAGE_SUMMARIES, VENDOR_SCOPE_AUDIT } from "../src/vendorCoverage";

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

const coverageId = (platform: string, provider: string, model: string) =>
  [platform, provider, model].map((part) => part.replaceAll("::", " ")).join("::");

loadDotenvLocal();

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  throw new Error("TURSO_DATABASE_URL is required. Run `turso db show eu-llm-explorer --url`.");
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  for (const statement of readFileSync("db/schema.sql", "utf8").split(";")) {
    const sql = statement.trim();
    if (sql) await client.execute(sql);
  }

  await client.batch(
    [
      "DELETE FROM coverage_regions",
      "DELETE FROM provider_coverage",
      "DELETE FROM provider_coverage_summaries",
      "DELETE FROM vendor_scope",
      "DELETE FROM model_routes",
    ],
    "write",
  );

  for (const row of CATALOG) {
    await client.execute({
      sql: `
        INSERT INTO model_routes (
          id, name, maker, route, tier, mode, openness, input_price, output_price, throughput, ttft,
          latest, note, sla_pct, observed_uptime, availability_risk, reliability_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        row.id,
        row.name,
        row.maker,
        row.route,
        row.tier,
        row.mode,
        row.openness,
        row.inputPrice,
        row.outputPrice,
        row.throughput,
        row.ttft,
        row.latest ? 1 : 0,
        row.note,
        row.slaPct,
        row.observedUptime,
        row.availabilityRisk,
        row.reliabilityNote,
      ],
    });
  }

  for (const row of ALL_PROVIDER_EU_COVERAGE) {
    const id = coverageId(row.platform, row.provider, row.model);
    await client.execute({
      sql: `
        INSERT INTO provider_coverage (
          id, platform, provider, model, tier, requirement_fit, source_type, source, evidence_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        row.platform,
        row.provider,
        row.model,
        row.tier,
        row.requirementFit,
        row.sourceType,
        row.source,
        row.evidenceNote,
      ],
    });

    for (const region of row.regions) {
      await client.execute({
        sql: `
          INSERT INTO coverage_regions (
            coverage_id, code, name, in_region, eu_geo, global, legacy_eol
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          region.code,
          region.name,
          region.inRegion ? 1 : 0,
          region.euGeo ? 1 : 0,
          region.global ? 1 : 0,
          region.legacyEol,
        ],
      });
    }
  }

  for (const row of PROVIDER_COVERAGE_SUMMARIES) {
    await client.execute({
      sql: `
        INSERT INTO provider_coverage_summaries (
          platform, provider, tier, requirement_fit, model_count, source_type, source, evidence_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        row.platform,
        row.provider,
        row.tier,
        row.requirementFit,
        row.modelCount,
        row.sourceType,
        row.source,
        row.evidenceNote,
      ],
    });
  }

  for (const row of VENDOR_SCOPE_AUDIT) {
    await client.execute({
      sql: `
        INSERT INTO vendor_scope (
          platform, provider, tier, status, category, model_coverage, source_type, source, evidence_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        row.platform,
        row.provider,
        row.tier,
        row.status,
        row.category,
        row.modelCoverage,
        row.sourceType,
        row.source,
        row.evidenceNote,
      ],
    });
  }

  console.log(
    JSON.stringify({
      database: url,
      modelRoutes: CATALOG.length,
      providerCoverageRows: ALL_PROVIDER_EU_COVERAGE.length,
      providerCoverageSummaries: PROVIDER_COVERAGE_SUMMARIES.length,
      vendorScopeRows: VENDOR_SCOPE_AUDIT.length,
    }),
  );
} finally {
  client.close();
}
