import assert from "node:assert/strict";
import test from "node:test";
import { buildVendorDecisionPacket, formatDecisionPacketMarkdown, type DecisionPacketData } from "../src/decisionPacket";

const route = {
  id: "mistral-large-3",
  name: "Mistral Large 3",
  maker: "Mistral",
  providers: ["Scaleway", "AWS Bedrock"],
  route: "Mistral / Scaleway / Bedrock EU",
  tier: "A",
  mode: "non-reasoning",
  capabilities: ["tools", "json"],
  openness: "open-weight",
  inputPrice: 0.5,
  outputPrice: 1.5,
  throughput: 206,
  ttft: 1.1,
  intelligenceIndex: 16,
  latest: true,
  note: "Frontier-class route.",
  slaPct: 99.9,
  observedUptime: null,
  availabilityRisk: "low",
  reliabilityNote: "Sovereign route.",
  reliabilityScore: 98,
  reliabilityGrade: "A",
  blended: 1,
} as const;

const fixture: DecisionPacketData = {
  routes: [route],
  providerCoverage: [
    {
      platform: "Scaleway Generative APIs",
      provider: "Scaleway",
      model: "Mistral Large 3",
      tier: "A",
      requirementFit: "sovereign",
      sourceType: "official",
      regions: [{ code: "fr-par", name: "Paris", inRegion: true, euGeo: false, global: false, legacyEol: null }],
      source: "https://example.com/scaleway",
      evidenceNote: "EU sovereign platform evidence.",
    },
    {
      platform: "AWS Bedrock",
      provider: "AWS",
      model: "Mistral Large 3",
      tier: "B",
      requirementFit: "eu-residency",
      sourceType: "official",
      regions: [{ code: "eu-central-1", name: "Frankfurt", inRegion: true, euGeo: false, global: false, legacyEol: null }],
      source: "https://example.com/aws",
      evidenceNote: "EU residency evidence.",
    },
  ],
  providerCoverageSummaries: [
    {
      platform: "Scaleway Generative APIs",
      provider: "Scaleway",
      tier: "A",
      requirementFit: "sovereign",
      modelCount: 1,
      sourceType: "official",
      source: "https://example.com/scaleway",
      evidenceNote: "EU sovereign platform evidence.",
    },
    {
      platform: "AWS Bedrock EU",
      provider: "AWS",
      tier: "B",
      requirementFit: "eu-residency",
      modelCount: 1,
      sourceType: "official",
      source: "https://example.com/aws",
      evidenceNote: "EU residency evidence.",
    },
  ],
  vendorScope: [],
  chains: [
    {
      alias: "quality",
      task: "Customer-facing text",
      reasoning: false,
      hops: [{ route, rationale: "Sovereign default" }],
      escalation: [{ route, rationale: "Residency fallback" }],
    },
  ],
};

test("builds a Tier A sovereignty decision packet", () => {
  const packet = buildVendorDecisionPacket(fixture, "Scaleway Generative APIs", "2026-06-19T00:00:00.000Z");

  assert.ok(packet);
  assert.equal(packet.verdict.tier, "A");
  assert.match(packet.verdict.fit, /EU-sovereign/);
  assert.ok(packet.evidence.length > 0);
  assert.ok(packet.modelCoverage.totalModels > 0);

  const markdown = formatDecisionPacketMarkdown(packet);
  assert.match(markdown, /Sovereignty Decision Packet/);
  assert.match(markdown, /engineering governance artifact, not legal advice/);
});

test("builds a Tier B residency packet with CLOUD Act caveat", () => {
  const packet = buildVendorDecisionPacket(fixture, "AWS Bedrock EU", "2026-06-19T00:00:00.000Z");

  assert.ok(packet);
  assert.equal(packet.verdict.tier, "B");
  assert.match(packet.verdict.summary, /CLOUD Act/);
  assert.ok(packet.restrictions.some((restriction) => restriction.includes("not full EU sovereignty")));
});

test("unknown vendor key returns null", () => {
  assert.equal(buildVendorDecisionPacket(fixture, "Unknown Vendor"), null);
});
