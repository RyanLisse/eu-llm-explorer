import { describe, expect, it } from "vitest";
import type { ProviderCoverageView } from "../src/domain";
import { buildMultiVendorModels } from "../src/vendorCoverage";

// Pure-logic coverage for the provider/capability derivation the Compare view relies
// on. `buildMultiVendorModels` groups coverage rows by normalized model family,
// dedupes + sorts vendors/platforms, derives bestFit, and keeps only families that
// span more than one platform or vendor.

const row = (over: Partial<ProviderCoverageView>): ProviderCoverageView => ({
  platform: "AWS Bedrock",
  provider: "AWS",
  model: "Mixtral",
  tier: "A",
  requirementFit: "eu-residency",
  sourceType: "official",
  regions: [],
  source: "test",
  evidenceNote: "fixture",
  ...over,
});

describe("buildMultiVendorModels", () => {
  it("groups one family across vendors/platforms with sorted, deduped lists", () => {
    const result = buildMultiVendorModels([
      row({ model: "Mixtral", platform: "Azure", provider: "Microsoft" }),
      row({ model: "Mixtral", platform: "AWS Bedrock", provider: "AWS" }),
      row({ model: "Mixtral", platform: "AWS Bedrock", provider: "AWS" }), // duplicate
    ]);

    expect(result).toHaveLength(1);
    const family = result[0];
    expect(family?.vendors).toEqual(["AWS", "Microsoft"]); // sorted, deduped
    expect(family?.platforms).toEqual(["AWS Bedrock", "Azure"]); // sorted, deduped
    expect(family?.models).toEqual(["Mixtral"]);
  });

  it("derives bestFit=sovereign when any row in the family is sovereign", () => {
    const result = buildMultiVendorModels([
      row({ model: "Mixtral", platform: "Azure", provider: "Microsoft", requirementFit: "eu-residency" }),
      row({ model: "Mixtral", platform: "AWS Bedrock", provider: "AWS", requirementFit: "sovereign" }),
    ]);
    expect(result[0]?.bestFit).toBe("sovereign");
  });

  it("defaults bestFit=eu-residency when no row is sovereign", () => {
    const result = buildMultiVendorModels([
      row({ model: "Mixtral", platform: "Azure", provider: "Microsoft" }),
      row({ model: "Mixtral", platform: "AWS Bedrock", provider: "AWS" }),
    ]);
    expect(result[0]?.bestFit).toBe("eu-residency");
  });

  it("filters out single-platform single-vendor families", () => {
    const result = buildMultiVendorModels([
      row({ model: "Command", platform: "Azure", provider: "Microsoft" }),
    ]);
    expect(result).toEqual([]);
  });

  it("sorts families with more platforms first", () => {
    const result = buildMultiVendorModels([
      // Mixtral: 2 platforms
      row({ model: "Mixtral", platform: "Azure", provider: "Microsoft" }),
      row({ model: "Mixtral", platform: "AWS Bedrock", provider: "AWS" }),
      // Gemma: 3 platforms
      row({ model: "Gemma", platform: "Azure", provider: "Microsoft" }),
      row({ model: "Gemma", platform: "AWS Bedrock", provider: "AWS" }),
      row({ model: "Gemma", platform: "Vertex", provider: "Google" }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.platforms.length).toBeGreaterThanOrEqual(result[1]?.platforms.length ?? 0);
    expect(result[0]?.models).toEqual(["Gemma"]);
  });

  it("returns an empty array for empty input", () => {
    expect(buildMultiVendorModels([])).toEqual([]);
  });
});
