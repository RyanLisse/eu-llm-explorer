import { AWS_BEDROCK_EU_COVERAGE, OTHER_VENDOR_EU_COVERAGE, REQUESTY_EU_COVERAGE } from "../src/vendorCoverage";

const AWS_SOURCE = "https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html";
const REQUESTY_SOURCE = "https://www.requesty.ai/models?region=eu";
const NEBIUS_SOURCE = "https://tokenfactory.nebius.com/models";
const SCALEWAY_MODELS_SOURCE = "https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/";
const STACKIT_MODELS_SOURCE =
  "https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/";
const MISTRAL_MODELS_SOURCE = "https://docs.mistral.ai/models/overview";
const OVHCLOUD_MODELS_SOURCE = "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/";
const IONOS_MODELS_SOURCE = "https://docs.ionos.com/cloud/ai/ai-model-hub/models/models-comparison";
const GOOGLE_LOCATIONS_SOURCE =
  "https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations?hl=en";
const AZURE_DATA_ZONE_SOURCE =
  "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability";

const EU_AWS_REGIONS = new Set([
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
]);

interface AwsRegion {
  readonly code: string;
  readonly inRegion: boolean;
  readonly geo: boolean;
  readonly global: boolean;
  readonly eol: string | null;
}

interface AwsRow {
  readonly provider: string;
  readonly model: string;
  readonly regions: ReadonlyArray<AwsRegion>;
}

interface RequestyRow {
  readonly provider: string;
  readonly model: string;
  readonly region: string;
}

interface NebiusRow {
  readonly provider: string;
  readonly model: string;
  readonly region: string;
}

interface SourceTable {
  readonly section: string;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

const failures: Array<string> = [];
const checks: Record<string, unknown> = {};

const assert = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

const decodeHtml = (value: string) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

const stripTags = (value: string) => decodeHtml(value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());

const parseTableRows = (table: string): ReadonlyArray<ReadonlyArray<string>> =>
  [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((row) =>
    [...row[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cell) =>
      stripTags(cell[1]?.replaceAll("&nbsp;", " ") ?? ""),
    ),
  );

const parseSectionedTables = (html: string): ReadonlyArray<SourceTable> => {
  const headingMatches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((match) => ({
    index: match.index,
    text: stripTags(match[1] ?? ""),
  }));

  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((match) => {
    const section =
      [...headingMatches].reverse().find((heading) => heading.index < match.index)?.text ?? "Unsectioned table";
    return {
      section,
      rows: parseTableRows(match[0]),
    };
  });
};

const parseAwsCell = (cell: string) => ({
  yes: cell.includes("icon-yes") || /Legacy \(EOL:/.test(cell),
  eol: cell.match(/EOL:\s*([0-9-]+)/)?.[1] ?? null,
});

const parseAwsLiveRows = async (): Promise<ReadonlyArray<AwsRow>> => {
  const response = await fetch(AWS_SOURCE);
  if (!response.ok) throw new Error(`AWS source returned HTTP ${response.status}.`);
  const html = await response.text();

  const sections: Array<{ provider: string; start: number; end: number }> = [];
  const sectionPattern = /<h2[^>]*id="model-regions-[^"]+"[^>]*>([^<]+)<\/h2>/g;
  let sectionMatch: RegExpExecArray | null;
  while ((sectionMatch = sectionPattern.exec(html))) {
    sections.push({ provider: stripTags(sectionMatch[1] ?? ""), start: sectionMatch.index, end: html.length });
  }
  for (let index = 0; index < sections.length - 1; index += 1) {
    sections[index]!.end = sections[index + 1]!.start;
  }

  const rows: Array<AwsRow> = [];
  for (const section of sections) {
    const sectionHtml = html.slice(section.start, section.end);
    const tablePattern = /<table[\s\S]*?<caption>([\s\S]*?)<\/caption>([\s\S]*?)<\/table>/g;
    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = tablePattern.exec(sectionHtml))) {
      const model = stripTags(tableMatch[1] ?? "");
      const tableBody = tableMatch[2] ?? "";
      const regions: Array<AwsRegion> = [];
      const rowPattern = /<tr>([\s\S]*?)<\/tr>/g;
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = rowPattern.exec(tableBody))) {
        const cells = [...(rowMatch[1] ?? "").matchAll(/<td[\s\S]*?<\/td>/g)].map((cell) => cell[0]);
        const code = cells[0]?.match(/<code[^>]*>([^<]+)<\/code>/)?.[1];
        if (!code || !EU_AWS_REGIONS.has(code) || cells.length < 4) continue;

        const inRegion = parseAwsCell(cells[1] ?? "");
        const geo = parseAwsCell(cells[2] ?? "");
        const global = parseAwsCell(cells[3] ?? "");
        if (!inRegion.yes && !geo.yes) continue;

        regions.push({
          code,
          inRegion: inRegion.yes,
          geo: geo.yes,
          global: global.yes,
          eol: inRegion.eol ?? geo.eol ?? global.eol,
        });
      }

      if (regions.length > 0) {
        rows.push({ provider: section.provider, model, regions });
      }
    }
  }

  return rows;
};

const awsSignature = (row: AwsRow) =>
  `${row.provider}|${row.model}|${row.regions
    .map(
      (region) =>
        `${region.code}:${region.inRegion ? "I" : ""}${region.geo ? "G" : ""}${region.global ? "W" : ""}${
          region.eol ? `~${region.eol}` : ""
        }`,
    )
    .join(",")}`;

const staticAwsSignature = (row: (typeof AWS_BEDROCK_EU_COVERAGE)[number]) =>
  `${row.provider}|${row.model}|${row.regions
    .map(
      (region) =>
        `${region.code}:${region.inRegion ? "I" : ""}${region.euGeo ? "G" : ""}${region.global ? "W" : ""}${
          region.legacyEol ? `~${region.legacyEol}` : ""
        }`,
    )
    .join(",")}`;

const parseRequestyStaticRows = (): ReadonlyArray<RequestyRow> =>
  REQUESTY_EU_COVERAGE.map((row) => {
    const region = row.regions[0]?.code ?? "eu";
    const separator = row.model.indexOf("/");
    const provider = separator === -1 ? "" : row.model.slice(0, separator);
    const modelWithRegion = separator === -1 ? row.model : row.model.slice(separator + 1);
    const model = modelWithRegion.replace(/\s+@.+$/, "");
    return { provider, model, region };
  });

const parseRequestyLiveRows = async (): Promise<ReadonlyArray<RequestyRow>> => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await page.goto(REQUESTY_SOURCE, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForFunction(() => document.querySelectorAll("table tbody tr").length > 0, null, {
      timeout: 20_000,
    });

    return await page.locator("table tbody tr").evaluateAll((tableRows) =>
      tableRows.map((tableRow) => {
        const cells = Array.from(tableRow.querySelectorAll("td")).map((cell) => cell.textContent?.trim() ?? "");
        const modelParts = (cells[0] ?? "").split("\n").map((part) => part.trim()).filter(Boolean);
        const rawModel = modelParts[0] ?? "";
        const inlineRegion = rawModel.match(/@([^@\s]+)$/)?.[1];
        const splitRegion = modelParts.find((part) => part.startsWith("@"))?.slice(1);
        const region = inlineRegion ?? splitRegion ?? "eu";
        const model = inlineRegion ? rawModel.slice(0, rawModel.length - inlineRegion.length - 1) : rawModel;
        return {
          model,
          provider: cells[1] ?? "",
          region,
        };
      }),
    );
  } finally {
    await browser.close();
  }
};

const requestySignature = (row: RequestyRow) => `${row.provider}|${row.model}|${row.region}`;

const parseNebiusStaticRows = (): ReadonlyArray<NebiusRow> =>
  OTHER_VENDOR_EU_COVERAGE.filter((row) => row.platform === "Nebius Token Factory").map((row) => ({
    provider: row.provider,
    model: row.model,
    region: row.regions[0]?.code ?? "",
  }));

const parseNebiusLiveRows = async (): Promise<ReadonlyArray<NebiusRow>> => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 5000 } });
    await page.goto(NEBIUS_SOURCE, { waitUntil: "networkidle", timeout: 45_000 });
    const text = await page.locator("body").innerText({ timeout: 10_000 });
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const rows: Array<NebiusRow> = [];

    for (let index = 0; index < lines.length - 7; index += 1) {
      if (!(lines[index + 2] ?? "").startsWith("$")) continue;

      const standardRegion = lines[index + 6] ?? "";
      const standardType = lines[index + 7] ?? "";
      const compactRegion = lines[index + 5] ?? "";
      const compactType = lines[index + 6] ?? "";
      const region = standardRegion.startsWith("eu-") ? standardRegion : compactRegion;
      const type = standardRegion.startsWith("eu-") ? standardType : compactType;
      if (!region.startsWith("eu-") || !["Text-to-text", "Embedding", "Vision"].includes(type)) continue;

      rows.push({
        provider: lines[index] ?? "",
        model: lines[index + 1] ?? "",
        region,
      });
      index += standardRegion.startsWith("eu-") ? 7 : 6;
    }

    return rows;
  } finally {
    await browser.close();
  }
};

const nebiusSignature = (row: NebiusRow) => `${row.provider}|${row.model}|${row.region}`;

const parseGoogleStaticRows = (): ReadonlyArray<string> =>
  OTHER_VENDOR_EU_COVERAGE.filter((row) => row.platform === "Google Vertex AI EU").map((row) => row.model);

const googleSignatureFromCell = (cell: string, duplicateLabels: ReadonlySet<string>) => {
  const match = cell.match(/^(.*?)\s+\(([a-z0-9._-]+)\)$/i);
  if (!match) return cell;

  const label = match[1]?.trim() ?? cell;
  const modelId = match[2]?.trim() ?? label;
  return duplicateLabels.has(label) ? modelId : label;
};

const parseGoogleLiveRows = async (): Promise<ReadonlyArray<string>> => {
  const response = await fetch(GOOGLE_LOCATIONS_SOURCE);
  if (!response.ok) throw new Error(`Google locations source returned HTTP ${response.status}.`);
  const tables = parseSectionedTables(await response.text());
  const europeGoogleTable = tables.find((table) => {
    const header = table.rows[0] ?? [];
    return header.some((cell) => cell.includes("europe-west2")) && table.rows.some((row) => row[0] === "Gemini models");
  });
  if (!europeGoogleTable) throw new Error("Unable to find Google Europe endpoint model table.");

  const cells = europeGoogleTable.rows
    .slice(1)
    .map((row) => row[0] ?? "")
    .filter((cell) => cell && !cell.endsWith("models"));
  const labels = cells.map((cell) => cell.match(/^(.*?)\s+\([a-z0-9._-]+\)$/i)?.[1]?.trim() ?? cell);
  const duplicateLabels = new Set(labels.filter((label, index) => labels.indexOf(label) !== index));

  return cells.map((cell) => googleSignatureFromCell(cell, duplicateLabels));
};

const parseAzureStaticRows = (platform: string): ReadonlyArray<string> =>
  OTHER_VENDOR_EU_COVERAGE.filter((row) => row.platform === platform).map((row) => row.model);

const parseAzureLiveRows = async (kind: "dataZone" | "regional"): Promise<ReadonlyArray<string>> => {
  const response = await fetch(AZURE_DATA_ZONE_SOURCE);
  if (!response.ok) throw new Error(`Azure source returned HTTP ${response.status}.`);
  const tables = parseSectionedTables(await response.text());
  const sectionPattern = kind === "dataZone" ? /Data Zone/i : /Regional/i;
  const excludedSectionPattern = kind === "dataZone" ? /Global/i : /Global|Data Zone/i;
  const models = new Set<string>();

  for (const table of tables) {
    const header = table.rows[0] ?? [];
    const isEuropeTable = header.includes("francecentral") || header.includes("swedencentral");
    if (!isEuropeTable || !sectionPattern.test(table.section) || excludedSectionPattern.test(table.section)) continue;

    for (const row of table.rows.slice(1)) {
      const model = row[0] ?? "";
      if (model && row.slice(2).some((cell) => cell.includes("✅"))) models.add(model);
    }
  }

  return [...models].sort();
};

const parseStaticPlatformRows = (platform: string): ReadonlyArray<string> =>
  OTHER_VENDOR_EU_COVERAGE.filter((row) => row.platform === platform).map((row) => row.model);

const parseScalewayLiveRows = async (): Promise<ReadonlyArray<string>> => {
  const response = await fetch(SCALEWAY_MODELS_SOURCE);
  if (!response.ok) throw new Error(`Scaleway source returned HTTP ${response.status}.`);
  const tables = parseSectionedTables(await response.text());
  const modelTable = tables.find((table) => table.rows[0]?.[0] === "Model name");
  if (!modelTable) throw new Error("Unable to find Scaleway supported-model table.");

  return modelTable.rows
    .slice(1)
    .map((row) => row[0] ?? "")
    .filter(Boolean)
    .sort();
};

const parseStackitLiveRows = async (): Promise<ReadonlyArray<string>> => {
  const response = await fetch(STACKIT_MODELS_SOURCE);
  if (!response.ok) throw new Error(`STACKIT source returned HTTP ${response.status}.`);
  const html = await response.text();
  const rows: Array<string> = [];

  for (const tableMatch of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
    const before = html.slice(Math.max(0, tableMatch.index - 15_000), tableMatch.index);
    const modelName = [...before.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((match) => stripTags(match[1] ?? "")).pop();
    const facts = stripTags(tableMatch[0]);
    if (modelName && /Status\s*Supported/.test(facts)) rows.push(modelName);
  }

  return rows.sort();
};

const parseMistralLiveRows = async (): Promise<ReadonlyArray<string>> => {
  const response = await fetch(MISTRAL_MODELS_SOURCE);
  if (!response.ok) throw new Error(`Mistral source returned HTTP ${response.status}.`);
  const html = await response.text();
  const rows = new Set<string>();
  const today = new Date("2026-06-09T00:00:00Z");

  for (const match of html.matchAll(/href="\/models\/model-cards\/[^"]+"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g)) {
    const model = stripTags(match[1] ?? "");
    if (model && model !== "WHY MISTRAL") rows.add(model);
  }

  for (const table of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
    const tableRows = parseTableRows(table[0]);
    if (!tableRows.some((row) => row.join(" ").includes("Mistral Small 3.2") && row.join(" ").includes("mistral-small-2506"))) continue;

    for (const row of tableRows.slice(1)) {
      const model = (row[0] ?? "").replace(/\s+↗$/, "");
      const lifecycle = row[3] ?? "";
      const retirementDate = lifecycle.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
      if (model === "Mistral Small 3.2" || model === "Magistral Small 1.2") rows.add(model);
      if (!retirementDate) continue;
      if (new Date(`${retirementDate}T00:00:00Z`) >= today) rows.add(model);
    }
  }

  if (html.includes("Mistral Small 3.2") && html.includes("mistral-small-2506")) rows.add("Mistral Small 3.2");
  if (html.includes("Mistral Moderation") && html.includes("Mistral Moderation 2")) rows.add("Mistral Moderation");

  const excluded = new Set(["Mistral Small Creative"]);
  return [...rows].filter((row) => !excluded.has(row)).sort();
};

const parseOvhcloudLiveRows = async (): Promise<ReadonlyArray<string>> => {
  const response = await fetch(OVHCLOUD_MODELS_SOURCE);
  if (!response.ok) throw new Error(`OVHcloud source returned HTTP ${response.status}.`);
  const html = await response.text();
  return [...new Set([...html.matchAll(/<h3[^>]*Models_modelTitle[^>]*>([^<]+)<\/h3>/g)].map((match) => match[1] ?? ""))]
    .filter(Boolean)
    .sort();
};

const parseIonosLiveRows = async (): Promise<ReadonlyArray<string>> => {
  const response = await fetch(IONOS_MODELS_SOURCE);
  if (!response.ok) throw new Error(`IONOS source returned HTTP ${response.status}.`);
  const html = await response.text();
  return [
    ...new Set(
      [...html.matchAll(/href="\/cloud\/ai\/ai-model-hub\/models\/[^"]+"><span[^>]*><strong[^>]*>([^<]+)<\/strong>/g)]
        .map((match) => match[1] ?? "")
        .filter(Boolean),
    ),
  ].sort();
};

const normalizeSourceText = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ");

const normalizeModelToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "");

const compareSets = (name: string, staticRows: ReadonlyArray<string>, liveRows: ReadonlyArray<string>) => {
  const staticSet = new Set(staticRows);
  const liveSet = new Set(liveRows);
  const missing = [...liveSet].filter((row) => !staticSet.has(row)).sort();
  const extra = [...staticSet].filter((row) => !liveSet.has(row)).sort();

  checks[name] = {
    staticRows: staticSet.size,
    liveRows: liveSet.size,
    missing: missing.slice(0, 20),
    extra: extra.slice(0, 20),
  };

  assert(missing.length === 0, `${name}: ${missing.length} live rows are missing from static data.`);
  assert(extra.length === 0, `${name}: ${extra.length} static rows are not present in the live source.`);
};

const liveAwsRows = await parseAwsLiveRows();
compareSets(
  "awsBedrockEu",
  AWS_BEDROCK_EU_COVERAGE.map(staticAwsSignature),
  liveAwsRows.map(awsSignature),
);

const liveRequestyRows = await parseRequestyLiveRows();
compareSets(
  "requestyEu",
  parseRequestyStaticRows().map(requestySignature),
  liveRequestyRows.map(requestySignature),
);

const liveNebiusRows = await parseNebiusLiveRows();
compareSets(
  "nebiusEuPublicEndpoints",
  parseNebiusStaticRows().map(nebiusSignature),
  liveNebiusRows.map(nebiusSignature),
);

const liveGoogleRows = await parseGoogleLiveRows();
compareSets("googleVertexEuropeEndpoints", parseGoogleStaticRows(), liveGoogleRows);

const liveAzureDataZoneRows = await parseAzureLiveRows("dataZone");
compareSets("azureAiFoundryDataZoneEurope", parseAzureStaticRows("Azure AI Foundry EU Data Zone"), liveAzureDataZoneRows);

const liveAzureRegionalRows = await parseAzureLiveRows("regional");
compareSets("azureAiFoundryRegionalEurope", parseAzureStaticRows("Azure AI Foundry EU Regional"), liveAzureRegionalRows);

const liveScalewayRows = await parseScalewayLiveRows();
compareSets("scalewayGenerativeApis", parseStaticPlatformRows("Scaleway Generative APIs"), liveScalewayRows);

const liveStackitRows = await parseStackitLiveRows();
compareSets("stackitAiModelServing", parseStaticPlatformRows("STACKIT AI Model Serving"), liveStackitRows);

const liveMistralRows = await parseMistralLiveRows();
compareSets("mistralLaPlateforme", parseStaticPlatformRows("Mistral La Plateforme"), liveMistralRows);

const liveOvhcloudRows = await parseOvhcloudLiveRows();
compareSets("ovhcloudAiEndpoints", parseStaticPlatformRows("OVHcloud AI Endpoints"), liveOvhcloudRows);

const liveIonosRows = await parseIonosLiveRows();
compareSets("ionosAiModelHub", parseStaticPlatformRows("IONOS AI Model Hub"), liveIonosRows);

const auditOfficialVendorPresence = async () => {
  const platforms = new Set<string>([]);
  const rows = OTHER_VENDOR_EU_COVERAGE.filter((row) => platforms.has(row.platform) && row.sourceType === "official");
  const sourceText = new Map<string, string>();

  for (const source of new Set(rows.map((row) => row.source))) {
    const response = await fetch(source);
    if (!response.ok) {
      failures.push(`Official vendor source ${source} returned HTTP ${response.status}.`);
      continue;
    }
    sourceText.set(source, normalizeModelToken(normalizeSourceText(await response.text())));
  }

  const byPlatform: Record<string, { staticRows: number; missing: Array<string> }> = {};
  for (const platform of platforms) {
    const platformRows = rows.filter((row) => row.platform === platform);
    const missing = platformRows
      .filter((row) => !(sourceText.get(row.source) ?? "").includes(normalizeModelToken(row.model)))
      .map((row) => row.model)
      .sort();

    byPlatform[platform] = {
      staticRows: platformRows.length,
      missing,
    };

    assert(missing.length === 0, `${platform}: ${missing.length} curated rows are absent from the official source page.`);
  }

  checks.officialVendorPresence = byPlatform;
};

await auditOfficialVendorPresence();

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, checks }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks }, null, 2));
