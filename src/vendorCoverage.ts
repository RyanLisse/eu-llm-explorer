import type {
  CoverageRegionView,
  MultiVendorModelView,
  ProviderCoverageSummaryView,
  ProviderCoverageView,
  VendorScopeView,
} from "@/domain";

const AWS_EU_REGION_NAMES: Record<string, string> = {
  "eu-central-1": "Frankfurt",
  "eu-central-2": "Zurich",
  "eu-north-1": "Stockholm",
  "eu-south-1": "Milan",
  "eu-south-2": "Spain",
  "eu-west-1": "Ireland",
  "eu-west-2": "London",
  "eu-west-3": "Paris",
};

const AWS_BEDROCK_EU_SOURCE =
  "https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html";
const MISTRAL_MODELS_SOURCE = "https://docs.mistral.ai/models/overview";
const SCALEWAY_MODELS_SOURCE = "https://www.scaleway.com/en/docs/generative-apis/reference-content/supported-models/";
const OVHCLOUD_MODELS_SOURCE = "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/";
const STACKIT_MODELS_SOURCE =
  "https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/";
const IONOS_MODELS_SOURCE = "https://docs.ionos.com/cloud/ai/ai-model-hub/models/models-comparison";
const GOOGLE_RESIDENCY_SOURCE =
  "https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency?hl=en";
const GOOGLE_LOCATIONS_SOURCE =
  "https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations?hl=en";
const NEBIUS_MODELS_SOURCE = "https://tokenfactory.nebius.com/models";
const AZURE_DATA_ZONE_SOURCE =
  "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability";
const REQUESTY_MODELS_SOURCE = "https://www.requesty.ai/models?region=eu";
const REQUESTY_EU_ROUTING_SOURCE = "https://docs.requesty.ai/features/eu-routing";

const AWS_BEDROCK_EU_ROWS = `
Amazon|Nova 2 Sonic|eu-north-1:I
Amazon|Nova 2 Lite|eu-central-1:GW,eu-north-1:GW,eu-south-1:GW,eu-south-2:GW,eu-west-1:GW,eu-west-3:GW
Amazon|Titan Text Embeddings V2|eu-central-1:I,eu-central-2:I,eu-north-1:I,eu-south-1:I,eu-south-2:I,eu-west-1:I,eu-west-2:I,eu-west-3:I
Amazon|Titan Multimodal Embeddings G1|eu-central-1:I,eu-west-1:I,eu-west-2:I,eu-west-3:I
Amazon|Titan Embeddings G1 - Text|eu-central-1:I
Amazon|Rerank|eu-central-1:I
Amazon|Nova Sonic|eu-north-1:I
Amazon|Nova Pro|eu-central-1:G,eu-north-1:G,eu-south-1:G,eu-south-2:G,eu-west-1:G,eu-west-2:I,eu-west-3:G
Amazon|Nova Reel|eu-west-1:I
Amazon|Nova Lite|eu-central-1:G,eu-north-1:IG,eu-south-1:G,eu-south-2:G,eu-west-1:G,eu-west-2:I,eu-west-3:G
Amazon|Nova Canvas|eu-west-1:I
Amazon|Nova Micro|eu-central-1:G,eu-north-1:G,eu-south-1:G,eu-south-2:G,eu-west-1:G,eu-west-2:I,eu-west-3:G
Anthropic|Claude Fable 5|eu-central-1:GW,eu-central-2:GW,eu-north-1:IGW,eu-south-1:GW,eu-south-2:GW,eu-west-1:IGW,eu-west-2:GW,eu-west-3:GW
Anthropic|Claude Sonnet 4|eu-central-1:G,eu-north-1:G,eu-south-1:G,eu-south-2:G,eu-west-1:GW,eu-west-3:G
Anthropic|Claude Sonnet 4.6|eu-central-1:GW,eu-central-2:GW,eu-north-1:GW,eu-south-1:GW,eu-south-2:GW,eu-west-1:GW,eu-west-2:IGW,eu-west-3:GW
Anthropic|Claude Opus 4.8|eu-central-1:GW,eu-central-2:GW,eu-north-1:IGW,eu-south-1:GW,eu-south-2:GW,eu-west-1:IGW,eu-west-2:GW,eu-west-3:GW
Anthropic|Claude Opus 4.7|eu-central-1:GW,eu-central-2:GW,eu-north-1:IGW,eu-south-1:GW,eu-south-2:GW,eu-west-1:IGW,eu-west-2:GW,eu-west-3:GW
Anthropic|Claude Opus 4.6|eu-central-1:GW,eu-central-2:GW,eu-north-1:GW,eu-south-1:GW,eu-south-2:GW,eu-west-1:GW,eu-west-2:IGW,eu-west-3:GW
Anthropic|Claude Opus 4.5|eu-central-1:GW,eu-central-2:GW,eu-north-1:GW,eu-south-1:GW,eu-south-2:GW,eu-west-1:GW,eu-west-2:GW,eu-west-3:GW
Anthropic|Claude Haiku 4.5|eu-central-1:GW,eu-central-2:GW,eu-north-1:IGW,eu-south-1:GW,eu-south-2:GW,eu-west-1:IGW,eu-west-2:GW,eu-west-3:GW
Anthropic|Claude Sonnet 4.5|eu-central-1:GW,eu-central-2:GW,eu-north-1:GW,eu-south-1:GW,eu-south-2:GW,eu-west-1:GW,eu-west-2:GW,eu-west-3:GW
Anthropic|Claude 3 Haiku|eu-central-1:IG~2026-09-10,eu-central-2:I,eu-west-1:IG~2026-09-10,eu-west-2:I,eu-west-3:IG~2026-09-10
Anthropic|Claude 3 Sonnet|eu-central-1:IG,eu-west-1:IG,eu-west-3:IG
Anthropic|Claude 3.7 Sonnet|eu-central-1:G,eu-north-1:G,eu-west-1:G,eu-west-2:I,eu-west-3:G
Anthropic|Claude 3.5 Sonnet|eu-central-1:IG,eu-central-2:I,eu-west-1:G,eu-west-3:G
Cohere|Embed v4|eu-central-1:GW,eu-central-2:GW,eu-north-1:GW,eu-south-1:GW,eu-south-2:GW,eu-west-1:IGW,eu-west-2:GW,eu-west-3:GW
Cohere|Embed English|eu-central-1:I,eu-west-1:I,eu-west-2:I,eu-west-3:I
Cohere|Embed Multilingual|eu-central-1:I,eu-west-1:I,eu-west-2:I,eu-west-3:I
Cohere|Rerank 3.5|eu-central-1:I
DeepSeek|DeepSeek V3.2|eu-north-1:I,eu-west-2:I
DeepSeek|DeepSeek-V3.1|eu-north-1:I,eu-west-2:I
Google|Gemma 3 27B PT|eu-south-1:I,eu-west-1:I,eu-west-2:I
Google|Gemma 3 12B IT|eu-south-1:I,eu-west-1:I,eu-west-2:I
Google|Gemma 3 4B IT|eu-south-1:I,eu-west-1:I,eu-west-2:I
Meta|Llama 3 70B Instruct|eu-west-2:I
Meta|Llama 3 8B Instruct|eu-west-2:I
Meta|Llama 3.2 3B Instruct|eu-central-1:G~2026-07-07,eu-west-1:G~2026-07-07,eu-west-3:G~2026-07-07
Meta|Llama 3.2 1B Instruct|eu-central-1:G~2026-07-07,eu-west-1:G~2026-07-07,eu-west-3:G~2026-07-07
MiniMax|MiniMax M2|eu-south-1:I,eu-west-1:I,eu-west-2:I
MiniMax|MiniMax M2.1|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
MiniMax|MiniMax M2.5|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
Mistral AI|Magistral Small 2509|eu-south-1:I,eu-west-1:I,eu-west-2:I
Mistral AI|Pixtral Large|eu-central-1:G,eu-north-1:G,eu-west-1:G,eu-west-3:G
Mistral AI|Mistral Large|eu-west-1:I,eu-west-2:I,eu-west-3:I
Mistral AI|Voxtral Small 24B 2507|eu-south-1:I,eu-west-1:I,eu-west-2:I
Mistral AI|Mixtral 8x7B Instruct|eu-west-1:I,eu-west-2:I,eu-west-3:I
Mistral AI|Mistral 7B Instruct|eu-west-1:I,eu-west-2:I,eu-west-3:I
Mistral AI|Voxtral Mini 3B 2507|eu-south-1:I,eu-west-1:I,eu-west-2:I
Mistral AI|Ministral 14B 3.0|eu-south-1:I,eu-west-1:I,eu-west-2:I
Mistral AI|Ministral 3 8B|eu-south-1:I,eu-west-1:I,eu-west-2:I
Mistral AI|Ministral 3B|eu-south-1:I,eu-west-1:I,eu-west-2:I
Mistral AI|Devstral 2 123B|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
Moonshot AI|Kimi K2.5|eu-north-1:I,eu-west-2:I
NVIDIA|NVIDIA Nemotron Nano 12B v2 VL BF16|eu-south-1:I,eu-west-1:I,eu-west-2:I
NVIDIA|NVIDIA Nemotron Nano 9B v2|eu-south-1:I,eu-west-1:I,eu-west-2:I
NVIDIA|Nemotron Nano 3 30B|eu-south-1:I,eu-west-1:I,eu-west-2:I
NVIDIA|NVIDIA Nemotron 3 Super 120B|eu-south-1:I,eu-west-1:I,eu-west-2:I,eu-central-1:I,eu-north-1:I
OpenAI|GPT OSS Safeguard 120B|eu-south-1:I,eu-west-1:I,eu-west-2:I
OpenAI|gpt-oss-120b|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
OpenAI|GPT OSS Safeguard 20B|eu-south-1:I,eu-west-1:I,eu-west-2:I
OpenAI|gpt-oss-20b|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
Qwen|Qwen3 Coder Next|eu-west-2:I
Qwen|Qwen3 Coder 480B A35B Instruct|eu-north-1:I,eu-west-2:I
Qwen|Qwen3 235B A22B 2507|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-2:I
Qwen|Qwen3 VL 235B A22B|eu-south-1:I,eu-west-1:I,eu-west-2:I
Qwen|Qwen3 Next 80B A3B|eu-south-1:I,eu-west-1:I,eu-west-2:I
Qwen|Qwen3 32B|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
Qwen|Qwen3-Coder-30B-A3B-Instruct|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
TwelveLabs|Marengo Embed 3.0|eu-west-1:G
TwelveLabs|Marengo Embed v2.7|eu-west-1:G
TwelveLabs|Pegasus v1.2|eu-central-1:GW,eu-central-2:GW,eu-north-1:GW,eu-south-1:GW,eu-south-2:GW,eu-west-1:GW,eu-west-2:GW,eu-west-3:GW
Z.AI|GLM 4.7 Flash|eu-central-1:I,eu-north-1:I,eu-south-1:I,eu-west-1:I,eu-west-2:I
Z.AI|GLM 4.7|eu-north-1:I,eu-west-2:I
Z.AI|GLM 5|eu-north-1:I,eu-west-2:I
`.trim();

const parseAwsRegion = (token: string) => {
  const [code, flagsWithEol = ""] = token.split(":");
  const [flags = "", legacyEol = ""] = flagsWithEol.split("~");
  const regionCode = code ?? "";
  return {
    code: regionCode,
    name: AWS_EU_REGION_NAMES[regionCode] ?? regionCode,
    inRegion: flags.includes("I"),
    euGeo: flags.includes("G"),
    global: flags.includes("W"),
    legacyEol: legacyEol || null,
  };
};

const REQUESTY_REGION_NAMES: Record<string, string> = {
  eu: "Requesty EU-filtered model",
  "eu-central-1": "Frankfurt",
  "eu-north-1": "Stockholm",
  "eu-south-1": "Milan",
  "eu-west-1": "Ireland",
  "eu-west-2": "London",
  "eu-west-3": "Paris",
  "europe-central2": "Warsaw",
  "europe-north1": "Finland",
  "europe-southwest1": "Madrid",
  "europe-west1": "Belgium",
  "europe-west4": "Netherlands",
  "europe-west8": "Milan",
  francecentral: "France Central",
  swedencentral: "Sweden Central",
};

const GOOGLE_EU_REGIONS: ReadonlyArray<CoverageRegionView> = [
  { code: "europe-west2", name: "London", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-west1", name: "Belgium", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-west4", name: "Netherlands", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-west6", name: "Zurich", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-west3", name: "Frankfurt", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-north1", name: "Finland", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-central2", name: "Warsaw", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-west8", name: "Milan", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-southwest1", name: "Madrid", inRegion: true, euGeo: false, global: false, legacyEol: null },
  { code: "europe-west9", name: "Paris", inRegion: true, euGeo: false, global: false, legacyEol: null },
];

const NEBIUS_REGION_NAMES: Record<string, string> = {
  "eu-north1": "EU North 1",
};

const parseRequestyRegion = (code: string) => ({
  code,
  name: REQUESTY_REGION_NAMES[code] ?? code,
  inRegion: code !== "eu",
  euGeo: code === "eu",
  global: false,
  legacyEol: null,
});

export const AWS_BEDROCK_EU_COVERAGE: ReadonlyArray<ProviderCoverageView> = AWS_BEDROCK_EU_ROWS.split("\n").map(
  (line) => {
    const [provider = "", model = "", regions = ""] = line.split("|");
    return {
      platform: "AWS Bedrock",
      provider,
      model,
      tier: "B",
      requirementFit: "eu-residency",
      sourceType: "official",
      regions: regions.split(",").map(parseAwsRegion),
      source: AWS_BEDROCK_EU_SOURCE,
      evidenceNote:
        "Qualifies only when invoked via EU In-Region or EU Geographic routing. Do not use Global routing for hard-EU data.",
    };
  },
);

const REQUESTY_EU_ROWS = `
minimax-m2.5|bedrock|eu-north-1
minimax-m2.5|bedrock|eu-south-1
minimax-m2.5|bedrock|eu-west-1
minimax-m2.5|bedrock|eu-central-1
claude-opus-4-8|bedrock|eu-west-3
claude-opus-4-8|bedrock|eu-north-1
claude-opus-4-8|bedrock|eu-west-1
claude-opus-4-8|bedrock|eu-central-1
gpt-4o-mini|azure|swedencentral
nousresearch/hermes-4-405b|nebius|eu
nvidia/nemotron-3-nano-omni|nebius|eu
zai-org/glm-5.1|nebius|eu
mistral-medium-3-5|mistral|eu
minimax-m2.5|inceptron|eu
kimi-k2.6|inceptron|eu
glm-5.1|inceptron|eu
gpt-5.4|azure|swedencentral
gpt-5.4|azure|francecentral
openai-responses/gpt-5.5|azure|swedencentral
gpt-5.5|azure|swedencentral
claude-opus-4-7|bedrock|eu-west-3
claude-opus-4-7|bedrock|eu-west-1
claude-opus-4-7|bedrock|eu-central-1
claude-opus-4-7|bedrock|eu-north-1
kimi-k2.5|bedrock|eu-west-2
kimi-k2.5|bedrock|eu-north-1
mistral-small-2603|mistral|eu
mistral-small-latest|mistral|eu
gpt-oss-120b|nebius|eu
deepseek-ai/DeepSeek-V3.2|nebius|eu
claude-sonnet-4-6|bedrock|eu-north-1
claude-sonnet-4-6|bedrock|eu-west-1
claude-sonnet-4-6|bedrock|eu-west-3
claude-sonnet-4-6|bedrock|eu-central-1
moonshotai/kimi-k2.5|nebius|eu
claude-opus-4-6|vertex|europe-west1
openai-responses/gpt-5.4|azure|swedencentral
openai-responses/gpt-5.4|azure|francecentral
devstral-latest|mistral|eu
claude-opus-4-5|bedrock|eu-west-3
claude-opus-4-5|bedrock|eu-central-1
claude-opus-4-5|bedrock|eu-north-1
claude-opus-4-5|bedrock|eu-west-1
gpt-5.1|azure|francecentral
gpt-5.1|azure|swedencentral
claude-opus-4-5|vertex|europe-west1
claude-haiku-4-5|bedrock|eu-central-1
claude-haiku-4-5|bedrock|eu-north-1
claude-haiku-4-5|bedrock|eu-west-1
claude-haiku-4-5|bedrock|eu-west-3
gemini-2.5-flash-image|vertex|europe-central2
gemini-2.5-flash-image|vertex|europe-west8
gemini-2.5-flash-image|vertex|europe-west4
gemini-2.5-flash-image|vertex|europe-north1
gemini-2.5-flash-image|vertex|europe-west1
gemini-2.5-flash-image|vertex|europe-southwest1
claude-sonnet-4|bedrock|eu-west-3
claude-sonnet-4-5|bedrock|eu-central-1
claude-sonnet-4|bedrock|eu-central-1
claude-sonnet-4|bedrock|eu-west-1
claude-sonnet-4-5|bedrock|eu-north-1
claude-sonnet-4|bedrock|eu-north-1
claude-sonnet-4-5|bedrock|eu-west-1
claude-sonnet-4-5|bedrock|eu-west-3
claude-sonnet-4|vertex|europe-west1
claude-sonnet-4-5|vertex|europe-west1
claude-sonnet-4-6|vertex|europe-west1
claude-haiku-4-5|vertex|europe-west1
gemini-2.5-flash|coding|europe-west1
gemini-2.5-flash|coding|europe-west4
gemini-2.5-flash|coding|europe-north1
gemini-2.5-flash|coding|europe-west8
gemini-2.5-flash|coding|europe-central2
gemini-2.5-flash-lite|vertex|europe-west1
gemini-2.5-flash-lite|vertex|europe-west8
gemini-2.5-flash-lite|vertex|europe-north1
gemini-2.5-flash-lite|vertex|europe-west4
gemini-2.5-flash-lite|vertex|europe-central2
gemini-2.5-flash|vertex|europe-west1
gemini-2.5-flash|vertex|europe-west8
gemini-2.5-flash|vertex|europe-central2
gemini-2.5-flash|vertex|europe-west4
gemini-2.5-flash|vertex|europe-north1
gemini-2.5-pro|coding|europe-north1
gemini-2.5-pro|coding|europe-west4
gemini-2.5-pro|coding|europe-west1
gemini-2.5-pro|coding|europe-central2
gemini-2.5-pro|coding|europe-west8
gemini-2.5-pro|vertex|europe-west1
gemini-2.5-pro|vertex|europe-west4
gemini-2.5-pro|vertex|europe-central2
gemini-2.5-pro|vertex|europe-west8
gemini-2.5-pro|vertex|europe-north1
gpt-5|azure|francecentral
gpt-5-nano|azure|swedencentral
o4-mini|azure|francecentral
gpt-5-nano|azure|francecentral
o4-mini|azure|swedencentral
gpt-5-mini|azure|swedencentral
gpt-5-mini|azure|francecentral
gpt-5|azure|swedencentral
openai-responses/gpt-4.1|azure|francecentral
openai-responses/gpt-4.1|azure|swedencentral
gpt-4.1|azure|francecentral
gpt-4.1|azure|swedencentral
openai-responses/gpt-4.1-mini|azure|francecentral
gpt-4.1-mini|azure|francecentral
gpt-4.1-nano|azure|swedencentral
gpt-4.1-nano|azure|francecentral
openai-responses/gpt-4.1-nano|azure|swedencentral
openai-responses/gpt-4.1-nano|azure|francecentral
devstral-small-latest|mistral|eu
codestral-latest|mistral|eu
devstral-medium-2507|mistral|eu
devstral-small-2507|mistral|eu
mistral-medium-latest|mistral|eu
pixtral-large-latest|mistral|eu
meta-llama/Llama-3.3-70B-Instruct|nebius|eu
mistral-large-latest|mistral|eu
open-mistral-7b|mistral|eu
mistral-small-2503|mistral|eu
`.trim();

export const REQUESTY_EU_COVERAGE: ReadonlyArray<ProviderCoverageView> = REQUESTY_EU_ROWS.split("\n").map((line) => {
  const [model = "", upstreamProvider = "", region = "eu"] = line.split("|");
  return {
    platform: "Requesty EU Router",
    provider: "Requesty",
    model: `${upstreamProvider}/${model}${region === "eu" ? "" : ` @${region}`}`,
    tier: "B",
    requirementFit: "eu-residency",
    sourceType: "official",
    regions: [parseRequestyRegion(region)],
    source: REQUESTY_MODELS_SOURCE,
    evidenceNote:
      "Requesty EU router qualifies only via router.eu.requesty.ai/v1 with EU-only approved upstream models; the EU endpoint alone is not sufficient for end-to-end residency.",
  };
});

const sovereignRows = (
  platform: string,
  provider: string,
  models: ReadonlyArray<string>,
  source: string,
  evidenceNote: string,
  sourceType: "official" | "report-derived" = "official",
): ReadonlyArray<ProviderCoverageView> =>
  models.map((model) => ({
    platform,
    provider,
    model,
    tier: "A",
    requirementFit: "sovereign",
    sourceType,
    regions: [],
    source,
    evidenceNote,
  }));

const residencyRows = (
  platform: string,
  provider: string,
  models: ReadonlyArray<string>,
  source: string,
  evidenceNote: string,
  sourceType: "official" | "report-derived" = "official",
): ReadonlyArray<ProviderCoverageView> =>
  models.map((model) => ({
    platform,
    provider,
    model,
    tier: "B",
    requirementFit: "eu-residency",
    sourceType,
    regions: [],
    source,
    evidenceNote,
  }));

const nebiusRows = (
  rows: ReadonlyArray<{ provider: string; model: string; region: string }>,
): ReadonlyArray<ProviderCoverageView> =>
  rows.map((row) => ({
    platform: "Nebius Token Factory",
    provider: row.provider,
    model: row.model,
    tier: "A",
    requirementFit: "sovereign",
    sourceType: "official",
    regions: [
      {
        code: row.region,
        name: NEBIUS_REGION_NAMES[row.region] ?? row.region,
        inRegion: true,
        euGeo: false,
        global: false,
        legacyEol: null,
      },
    ],
    source: NEBIUS_MODELS_SOURCE,
    evidenceNote: "Official public endpoint catalog row. Qualifies only for EU-region endpoints such as eu-north1.",
  }));

const googleRows = (models: ReadonlyArray<string>): ReadonlyArray<ProviderCoverageView> =>
  models.map((model) => ({
    platform: "Google Vertex AI EU",
    provider: "Google Vertex",
    model,
    tier: "B",
    requirementFit: "eu-residency",
    sourceType: "official",
    regions: GOOGLE_EU_REGIONS,
    source: GOOGLE_LOCATIONS_SOURCE,
    evidenceNote:
      "Official Google Europe endpoint list. Pair with the data-residency commitment and avoid global endpoints for hard-EU data.",
  }));

const REPORT_SOURCE = "Supplied EU-sovereign LLM research paper and supporting reports captured June 2026.";

export const VENDOR_SCOPE_AUDIT: ReadonlyArray<VendorScopeView> = [
  {
    platform: "Mistral La Plateforme",
    provider: "Mistral AI",
    tier: "A",
    status: "covered",
    category: "sovereign",
    modelCoverage: "Official catalog rows are seeded for current Mistral-hosted qualifying models.",
    sourceType: "official",
    source: MISTRAL_MODELS_SOURCE,
    evidenceNote: "EU-native modelmaker route. Use DPA/ZDR and France/EU processing commitments for sensitive workloads.",
  },
  {
    platform: "Scaleway Generative APIs",
    provider: "Scaleway",
    tier: "A",
    status: "covered",
    category: "sovereign",
    modelCoverage: "Official supported-model table is seeded for qualifying serverless/open-weight rows.",
    sourceType: "official",
    source: SCALEWAY_MODELS_SOURCE,
    evidenceNote: "French sovereign provider; serverless rows must be checked for EOL before new deployment.",
  },
  {
    platform: "OVHcloud AI Endpoints",
    provider: "OVHcloud",
    tier: "A",
    status: "covered",
    category: "sovereign",
    modelCoverage: "Official AI Endpoints catalog rows are seeded.",
    sourceType: "official",
    source: OVHCLOUD_MODELS_SOURCE,
    evidenceNote: "French sovereign provider; pin production calls to the qualifying EU/Gravelines endpoint.",
  },
  {
    platform: "STACKIT AI Model Serving",
    provider: "STACKIT",
    tier: "A",
    status: "covered",
    category: "sovereign",
    modelCoverage: "Official shared-model rows are seeded.",
    sourceType: "official",
    source: STACKIT_MODELS_SOURCE,
    evidenceNote: "Schwarz Group EU cloud route with OpenAI-compatible eu01 endpoint.",
  },
  {
    platform: "IONOS AI Model Hub",
    provider: "IONOS",
    tier: "A",
    status: "covered",
    category: "sovereign",
    modelCoverage: "Official active model comparison rows are seeded.",
    sourceType: "official",
    source: IONOS_MODELS_SOURCE,
    evidenceNote: "German sovereign route for language, coding, embedding, image, and OCR workloads.",
  },
  {
    platform: "Nebius Token Factory",
    provider: "Nebius",
    tier: "A",
    status: "covered-with-conditions",
    category: "sovereign",
    modelCoverage: "Seeded from the live public Token Factory endpoint catalog, restricted to EU-region endpoints.",
    sourceType: "official",
    source: NEBIUS_MODELS_SOURCE,
    evidenceNote: "Amsterdam-HQ provider with EU endpoint rows. Public rows qualify only when the selected endpoint region is in the EU.",
  },
  {
    platform: "AWS Bedrock EU",
    provider: "AWS Bedrock",
    tier: "B",
    status: "covered",
    category: "eu-residency",
    modelCoverage: "Official EU regional matrix rows are seeded for all EU-qualifying Bedrock routes.",
    sourceType: "official",
    source: AWS_BEDROCK_EU_SOURCE,
    evidenceNote: "Only EU In-Region and EU Geographic routing qualify. Global profiles are explicitly out of scope.",
  },
  {
    platform: "Google Vertex AI EU",
    provider: "Google Vertex",
    tier: "B",
    status: "covered",
    category: "eu-residency",
    modelCoverage: "Seeded from the official Google Europe endpoint model list and qualified by Google data-residency docs.",
    sourceType: "official",
    source: GOOGLE_LOCATIONS_SOURCE,
    evidenceNote: "Use EU regional or EU multi-region Vertex endpoints only; Google AI Studio/global Gemini API is excluded.",
  },
  {
    platform: "Azure AI Foundry EU",
    provider: "Microsoft Azure",
    tier: "B",
    status: "covered",
    category: "eu-residency",
    modelCoverage: "Official EU Data Zone and EU Regional rows are seeded as separate platforms.",
    sourceType: "official",
    source: AZURE_DATA_ZONE_SOURCE,
    evidenceNote: "Only Data Zone or EU Regional deployments qualify; Global Standard is excluded.",
  },
  {
    platform: "Requesty EU Router",
    provider: "Requesty",
    tier: "B",
    status: "covered-with-conditions",
    category: "eu-router",
    modelCoverage: "The live EU-filtered Requesty model library is seeded as 121 router rows.",
    sourceType: "official",
    source: REQUESTY_MODELS_SOURCE,
    evidenceNote: "Use router.eu.requesty.ai/v1 and approve EU-only upstream models; router location alone is not enough.",
  },
  {
    platform: "Groq public API",
    provider: "Groq",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "No public-API model rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Report verdict: US entity/public API does not guarantee EU-only routing; possible only as a dedicated EU deployment.",
  },
  {
    platform: "Cerebras public cloud",
    provider: "Cerebras",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "No public-cloud model rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Report verdict: public inference cloud is not a public EU-hosted route; sovereign programs are bespoke infrastructure.",
  },
  {
    platform: "SambaNova public API",
    provider: "SambaNova",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "No public-API model rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Rejected in the source matrix for sensitive workloads due US-entity/global-route risk.",
  },
  {
    platform: "Together AI",
    provider: "Together AI",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "No public-API model rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Rejected in the source matrix for sensitive workloads due US-entity/global-route risk.",
  },
  {
    platform: "Fireworks AI",
    provider: "Fireworks AI",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "No public-API model rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Rejected in the source matrix for sensitive workloads due US-entity/global-route risk.",
  },
  {
    platform: "OpenRouter / global aggregators",
    provider: "OpenRouter",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "No global aggregator model rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Rejected unless a provider can prove EU-only processing and storage for the selected upstream model.",
  },
  {
    platform: "AWS Bedrock Global profiles",
    provider: "AWS Bedrock",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "Global-profile rows are deliberately excluded from AWS Bedrock EU coverage.",
    sourceType: "official",
    source: AWS_BEDROCK_EU_SOURCE,
    evidenceNote: "Global cross-region inference can route outside the EU and does not meet the hard-EU requirement.",
  },
  {
    platform: "Azure Global Standard",
    provider: "Microsoft Azure",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "Global Standard rows are deliberately excluded from Azure EU coverage.",
    sourceType: "official",
    source: AZURE_DATA_ZONE_SOURCE,
    evidenceNote: "Global Standard is not an EU-residency route; use Data Zone or EU Regional only.",
  },
  {
    platform: "Google AI Studio / global Gemini API",
    provider: "Google",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "Global Gemini API rows are deliberately excluded.",
    sourceType: "official",
    source: GOOGLE_RESIDENCY_SOURCE,
    evidenceNote: "Use Vertex AI EU regional/multi-region endpoints for data residency; global API is out of scope.",
  },
  {
    platform: "Direct Anthropic API",
    provider: "Anthropic",
    tier: "C",
    status: "excluded",
    category: "rejected",
    modelCoverage: "Direct API rows are deliberately excluded; Claude appears only through EU Bedrock/Vertex/Requesty rows.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Use Bedrock EU or Vertex EU for Claude-class residency; direct global API is not a hard-EU route.",
  },
  {
    platform: "Aleph Alpha / PhariaAI",
    provider: "Aleph Alpha",
    tier: "C",
    status: "monitor",
    category: "infrastructure",
    modelCoverage: "No turnkey LLM API rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Report says Cohere transaction makes the route transatlantic; monitor before treating as pure EU-sovereign.",
  },
  {
    platform: "T-Systems / Open Telekom Cloud",
    provider: "T-Systems",
    tier: "C",
    status: "monitor",
    category: "infrastructure",
    modelCoverage: "No model-as-a-service rows are seeded.",
    sourceType: "report-derived",
    source: REPORT_SOURCE,
    evidenceNote: "Sovereign infrastructure, but not a turnkey LLM-as-a-service comparable to the covered vendors.",
  },
];

export const OTHER_VENDOR_EU_COVERAGE: ReadonlyArray<ProviderCoverageView> = [
  ...sovereignRows(
    "Mistral La Plateforme",
    "Mistral AI",
    [
      "Mistral Large 3",
      "Mistral Medium 3.5",
      "Mistral Medium 3",
      "Mistral Medium 3.1",
      "Mistral Small 4",
      "Mistral Small 3.2",
      "Ministral 3 3B",
      "Ministral 3 8B",
      "Ministral 3 14B",
      "Magistral Medium 1.2",
      "Magistral Small 1.2",
      "Devstral 2",
      "Codestral",
      "Codestral Embed",
      "Leanstral",
      "OCR 3",
      "Mistral Nemo 12B",
      "Mistral Embed",
      "Voxtral Mini Transcribe 2",
      "Voxtral Small",
      "Mistral Moderation",
      "Mistral Moderation 2",
      "Voxtral Mini Transcribe Realtime",
      "Voxtral TTS",
    ],
    MISTRAL_MODELS_SOURCE,
    "Official Mistral model catalog. Qualifies only when processing is contractually pinned to EU/France with DPA/ZDR.",
  ),
  ...sovereignRows(
    "Scaleway Generative APIs",
    "Scaleway",
    [
      "gpt-oss-120b",
      "gpt-oss-20b",
      "whisper-large-v3",
      "qwen3.6-35b-a3b",
      "qwen3.5-397b-a17b",
      "qwen3.5-35b-a3b",
      "qwen3.5-122b-a10b",
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-235b-a22b-thinking-2507",
      "qwen3-embedding-8b",
      "qwen3-coder-30b-a3b-instruct",
      "qwen2.5-coder-32b-instruct",
      "gemma-4-31b-it",
      "gemma-4-26b-a4b-it",
      "gemma-3-27b-it",
      "llama-3.3-70b-instruct",
      "llama-3.1-70b-instruct",
      "llama-3.1-8b-instruct",
      "llama-3-8b-instruct",
      "llama-3-70b-instruct",
      "llama-3.1-nemotron-70b-instruct",
      "deepseek-r1-distill-llama-70b",
      "deepseek-r1-distill-llama-8b",
      "mistral-7b-instruct-v0.3",
      "mistral-large-3-675b-instruct-2512",
      "mistral-medium-3.5-128b",
      "mistral-small-3.2-24b-instruct-2506",
      "mistral-small-3.1-24b-instruct-2503",
      "mistral-small-24b-instruct-2501",
      "voxtral-small-24b-2507",
      "mistral-nemo-instruct-2407",
      "mixtral-8x7b-instruct-v0.1",
      "magistral-small-2506",
      "devstral-2-123b-instruct-2512",
      "devstral-small-2505",
      "pixtral-12b-2409",
      "molmo-72b-0924",
      "holo2-30b-a3b",
      "bge-multilingual-gemma2",
      "sentence-t5-xxl",
      "minimax-m2.5",
    ],
    SCALEWAY_MODELS_SOURCE,
    "Official Scaleway supported-model table; Generative APIs are hosted in European data centers. Exclude EOL serverless rows from new serverless deployments.",
  ),
  ...sovereignRows(
    "OVHcloud AI Endpoints",
    "OVHcloud",
    [
      "Qwen3.6-27B",
      "Qwen3.5-397B-A17B",
      "Qwen3.5-9B",
      "Qwen3-Embedding-8B",
      "Qwen3Guard-Gen-8B",
      "Qwen3Guard-Gen-0.6B",
      "Qwen3-Coder-30B-A3B-Instruct",
      "gpt-oss-20b",
      "gpt-oss-120b",
      "Qwen3-32B",
      "Mistral-Small-3.2-24B-Instruct-2506",
      "Mistral-7B-Instruct-v0.3",
      "Meta-Llama-3_3-70B-Instruct",
      "Qwen2.5-VL-72B-Instruct",
      "bge-multilingual-gemma2",
      "Mistral-Nemo-Instruct-2407",
      "bge-m3",
      "stable-diffusion-xl-base-v10",
      "whisper-large-v3",
      "whisper-large-v3-turbo",
      "nvr-tts-it-it",
      "nvr-tts-en-us",
      "nvr-tts-de-de",
      "nvr-tts-es-es",
    ],
    OVHCLOUD_MODELS_SOURCE,
    "Official OVHcloud AI Endpoints catalog. Deployed from OVHcloud sovereign infrastructure; production use should pin the EU/Gravelines endpoint.",
  ),
  ...sovereignRows(
    "STACKIT AI Model Serving",
    "STACKIT",
    [
      "Qwen3-VL 235B",
      "Qwen3.6 27B",
      "Llama 3.3 70B",
      "GPT-OSS 120B",
      "Gemma 3 27B",
      "GPT-OSS 20B",
      "E5 Mistral 7B",
      "Qwen3 Vision-Language Embedding",
    ],
    STACKIT_MODELS_SOURCE,
    "Official shared-model docs expose an OpenAI-compatible eu01 endpoint and supported model status.",
  ),
  ...sovereignRows(
    "IONOS AI Model Hub",
    "IONOS",
    [
      "Mistral Nemo 12B",
      "Llama 3.1 8B",
      "Mistral Small 24B",
      "Llama 3.3 70B",
      "Llama 3.1 405B",
      "GPT-OSS 120B",
      "Qwen3 Coder Next 80B",
      "BGE Large v1.5",
      "BGE m3",
      "Paraphrase Multilingual MPNet v2",
      "Qwen3 VL Embedding 8B",
      "Qwen3 VL Reranker 8B",
      "FLUX.1-schnell",
      "LightOnOCR-2-1B",
    ],
    IONOS_MODELS_SOURCE,
    "Official IONOS active model comparison; AI Model Hub is positioned for data privacy, security, and compliance.",
  ),
  ...nebiusRows([
    { provider: "NVIDIA", model: "Cosmos3-Super-Reasoner", region: "eu-north1" },
    { provider: "openbmb", model: "openbmb/MiniCPM-V-4_5", region: "eu-north1" },
    { provider: "NVIDIA", model: "Nemotron-3-Nano-Omni", region: "eu-north1" },
    { provider: "Z.ai", model: "GLM-5.1", region: "eu-north1" },
    { provider: "NousResearch", model: "Hermes-4-405B", region: "eu-north1" },
    { provider: "NousResearch", model: "Hermes-4-70B", region: "eu-north1" },
    { provider: "OpenAI", model: "gpt-oss-120b", region: "eu-north1" },
    { provider: "Prime Intellect", model: "INTELLECT-3", region: "eu-north1" },
    { provider: "Qwen", model: "Qwen3-235B-A22B-Instruct-2507", region: "eu-north1" },
    { provider: "Qwen", model: "Qwen3-30B-A3B-Instruct-2507", region: "eu-north1" },
    { provider: "Qwen", model: "Qwen3-Embedding-8B", region: "eu-north1" },
    { provider: "Qwen", model: "Qwen3-Next-80B-A3B-Thinking", region: "eu-north1" },
    { provider: "Qwen", model: "Qwen3-32B", region: "eu-north1" },
    { provider: "Google", model: "Gemma-3-27b-it", region: "eu-north1" },
    { provider: "NVIDIA", model: "Llama-3_1-Nemotron-Ultra-253B-v1", region: "eu-north1" },
    { provider: "NVIDIA", model: "Nemotron-3-Nano-30B-A3B", region: "eu-north1" },
    { provider: "Qwen", model: "Qwen2.5-VL-72B-Instruct", region: "eu-north1" },
    { provider: "Meta", model: "Llama-3.3-70B-Instruct", region: "eu-north1" },
  ]),
  ...googleRows([
    "Gemini 3 Pro Image",
    "Gemini 3.1 Flash Image",
    "Gemini 3.5 Flash",
    "Gemini 3.1 Flash-Lite",
    "Gemini 3.1 Flash Image preview",
    "Gemini 3.1 Pro preview",
    "Gemini 3 Flash preview",
    "Gemini 3 Pro Image preview",
    "Gemini 2.5 Pro",
    "Gemini 2.5 Flash preview",
    "Gemini 2.5 Flash-Lite preview",
    "Gemini 2.5 Flash Image",
    "Gemini 2.5 Flash",
    "Gemini 2.5 Flash-Lite",
    "Gemini 2.5 Flash with Gemini Live API native audio",
    "Gemini 2.0 Flash with Gemini Live API preview",
    "Gemini Embedding 2",
    "Gemini Embedding",
    "Embeddings for Text",
    "Embeddings for Multimodal",
    "Veo 2 Generate",
    "veo-2.0-generate-exp",
    "veo-2.0-generate-preview",
    "veo-3.0-generate-preview",
    "veo-3.0-fast-generate-preview",
    "Veo 3 Generate",
    "Veo 3 Fast Generate",
    "Veo 3.1 Generate preview",
    "Veo 3.1 Fast Generate preview",
    "Veo 3.1 Generate",
    "Veo 3.1 Fast Generate",
    "Veo 3.1 Lite Generate preview",
    "Chirp 3: Transcription",
    "Chirp 3: HD Voices",
    "Chirp 3: Instant Custom Voice",
    "Chirp 2: Transcription",
    "Gemini 2.5 Pro TTS",
    "Gemini 2.5 Flash TTS",
    "Gemini 2.5 Flash Lite Preview TTS preview",
  ]),
  ...residencyRows(
    "Azure AI Foundry EU Data Zone",
    "Azure",
    [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.2",
      "gpt-5.1-codex",
      "gpt-5.4",
      "gpt-5.5",
      "gpt-image-1.5",
      "model-router",
      "o1",
      "o3",
      "o3-mini",
      "o4-mini",
      "text-embedding-3-large",
      "text-embedding-3-small",
      "text-embedding-ada-002",
    ],
    AZURE_DATA_ZONE_SOURCE,
    "Official Microsoft Data Zone table. Only Europe Data Zone or EU Regional deployments qualify; Global Standard is excluded.",
  ),
  ...residencyRows(
    "Azure AI Foundry EU Regional",
    "Azure",
    [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5.1",
      "gpt-5.2",
      "gpt-5.3-codex",
      "gpt-5.4",
      "o1",
      "o3",
      "o3-mini",
      "o4-mini",
      "text-embedding-3-large",
      "text-embedding-3-small",
      "text-embedding-ada-002",
      "tts",
      "tts-hd",
      "whisper",
    ],
    AZURE_DATA_ZONE_SOURCE,
    "Official Microsoft Standard/Regional Europe table. Processing is in the selected EU deployment region.",
  ),
];

export const ALL_PROVIDER_EU_COVERAGE: ReadonlyArray<ProviderCoverageView> = [
  ...AWS_BEDROCK_EU_COVERAGE,
  ...OTHER_VENDOR_EU_COVERAGE,
  ...REQUESTY_EU_COVERAGE,
];

export const PROVIDER_COVERAGE_SUMMARIES: ReadonlyArray<ProviderCoverageSummaryView> = [
  {
    platform: "Mistral La Plateforme",
    provider: "Mistral AI",
    tier: "A",
    requirementFit: "sovereign",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "Mistral La Plateforme").length,
    sourceType: "official",
    source: MISTRAL_MODELS_SOURCE,
    evidenceNote: "French/EU modelmaker route; use DPA/ZDR and France/EU processing contractually.",
  },
  {
    platform: "Scaleway Generative APIs",
    provider: "Scaleway",
    tier: "A",
    requirementFit: "sovereign",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "Scaleway Generative APIs").length,
    sourceType: "official",
    source: SCALEWAY_MODELS_SOURCE,
    evidenceNote: "Official supported-model table; Generative APIs are hosted in European data centers.",
  },
  {
    platform: "OVHcloud AI Endpoints",
    provider: "OVHcloud",
    tier: "A",
    requirementFit: "sovereign",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "OVHcloud AI Endpoints").length,
    sourceType: "official",
    source: OVHCLOUD_MODELS_SOURCE,
    evidenceNote: "Official AI Endpoints catalog; production use should pin the qualifying EU/Gravelines endpoint.",
  },
  {
    platform: "STACKIT AI Model Serving",
    provider: "STACKIT",
    tier: "A",
    requirementFit: "sovereign",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "STACKIT AI Model Serving").length,
    sourceType: "official",
    source: STACKIT_MODELS_SOURCE,
    evidenceNote: "Official shared-model docs expose an OpenAI-compatible eu01 endpoint and supported model status.",
  },
  {
    platform: "IONOS AI Model Hub",
    provider: "IONOS",
    tier: "A",
    requirementFit: "sovereign",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "IONOS AI Model Hub").length,
    sourceType: "official",
    source: IONOS_MODELS_SOURCE,
    evidenceNote: "Official active model comparison for language, coding, embedding, image, and OCR models.",
  },
  {
    platform: "Nebius Token Factory",
    provider: "Nebius",
    tier: "A",
    requirementFit: "sovereign",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "Nebius Token Factory").length,
    sourceType: "official",
    source: NEBIUS_MODELS_SOURCE,
    evidenceNote: "Live public endpoint catalog restricted to EU-region rows; verify dedicated endpoints by selected region.",
  },
  {
    platform: "Google Vertex AI EU",
    provider: "Google",
    tier: "B",
    requirementFit: "eu-residency",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "Google Vertex AI EU").length,
    sourceType: "official",
    source: GOOGLE_LOCATIONS_SOURCE,
    evidenceNote: "Use EU regional or EU multi-region endpoints only; avoid global endpoints for hard-EU data.",
  },
  {
    platform: "Azure AI Foundry EU Data Zone",
    provider: "Microsoft Azure",
    tier: "B",
    requirementFit: "eu-residency",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "Azure AI Foundry EU Data Zone").length,
    sourceType: "official",
    source: AZURE_DATA_ZONE_SOURCE,
    evidenceNote: "Only Data Zone or EU regional deployments qualify; Global Standard does not satisfy hard-EU routing.",
  },
  {
    platform: "Azure AI Foundry EU Regional",
    provider: "Microsoft Azure",
    tier: "B",
    requirementFit: "eu-residency",
    modelCount: ALL_PROVIDER_EU_COVERAGE.filter((row) => row.platform === "Azure AI Foundry EU Regional").length,
    sourceType: "official",
    source: AZURE_DATA_ZONE_SOURCE,
    evidenceNote: "Standard/Regional Europe deployments process prompts and responses in the selected EU deployment region.",
  },
  {
    platform: "AWS Bedrock EU",
    provider: "AWS Bedrock",
    tier: "B",
    requirementFit: "eu-residency",
    modelCount: AWS_BEDROCK_EU_COVERAGE.length,
    sourceType: "official",
    source: AWS_BEDROCK_EU_SOURCE,
    evidenceNote:
      "Official AWS regional matrix: EU In-Region and EU Geo routes qualify for EU residency; Global routes are explicitly excluded.",
  },
  {
    platform: "Requesty EU Router",
    provider: "Requesty",
    tier: "B",
    requirementFit: "eu-residency",
    modelCount: REQUESTY_EU_COVERAGE.length,
    sourceType: "official",
    source: REQUESTY_EU_ROUTING_SOURCE,
    evidenceNote:
      "EU router runs in Frankfurt; use router.eu.requesty.ai/v1 and approve only EU-region models from the EU model library.",
  },
];

const normalizeFamily = (model: string): string =>
  model
    .toLowerCase()
    .replace(/ @[\w-]+$/g, "")
    .replace(/^(azure|bedrock|coding|inceptron|mistral|nebius|vertex)\//g, "")
    .replace(/^openai-responses\//g, "")
    .replace(/\b(instruct|preview|safeguard|standard|pt|it|bf16|hf)\b/g, "")
    .replace(/\b(v|g|g1|g2|v0|v1|v2|v3|v4|v5)\b/g, "")
    .replace(/\b(20b|120b|70b|32b|27b|24b|14b|12b|9b|8b|7b|4b|3b|235b|405b|480b|397b|123b|80b|30b|2507|2509|3\\.0|3\\.1|3\\.2|3\\.3|3\\.5|3\\.6|4\\.5|4\\.6|4\\.7|4\\.8|2\\.5|5\\.1)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const buildMultiVendorModels = (
  coverage: ReadonlyArray<ProviderCoverageView>,
): ReadonlyArray<MultiVendorModelView> => Object.values(
  coverage.reduce<Record<string, ProviderCoverageView[]>>((acc, row) => {
    const key = normalizeFamily(row.model);
    if (!key) return acc;
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {}),
)
  .map((rows) => {
    const vendors = Array.from(new Set(rows.map((row) => row.provider))).toSorted();
    const platforms = Array.from(new Set(rows.map((row) => row.platform))).toSorted();
    const bestFit: "sovereign" | "eu-residency" = rows.some((row) => row.requirementFit === "sovereign")
      ? "sovereign"
      : "eu-residency";
    return {
      family: normalizeFamily(rows[0]?.model ?? ""),
      models: Array.from(new Set(rows.map((row) => row.model))).toSorted(),
      vendors,
      platforms,
      bestFit,
    };
  })
  .filter((row) => row.platforms.length > 1 || row.vendors.length > 1)
  .toSorted((a, b) => b.platforms.length - a.platforms.length || a.family.localeCompare(b.family));

export const MULTI_VENDOR_MODELS: ReadonlyArray<MultiVendorModelView> =
  buildMultiVendorModels(ALL_PROVIDER_EU_COVERAGE);
