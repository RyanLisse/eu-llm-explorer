import { Option, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/data";
import { ModelRoute } from "../src/domain";
import { loadExplorerData } from "../src/services";
import { mergeStaticBenchmarkFields } from "../src/turso";

const decodeCatalog = Schema.decodeUnknownSync(Schema.Array(ModelRoute));

describe("catalog benchmark fields", () => {
  it("decodes nullable benchmark fields for every catalog route", () => {
    const decoded = decodeCatalog(CATALOG);

    expect(decoded).toHaveLength(CATALOG.length);
    expect(
      decoded.every(
        (route) =>
          Option.isOption(route.intelligenceIndex) &&
          Option.isOption(route.codingIndex) &&
          Option.isOption(route.reasoningScore) &&
          typeof route.benchmarkSource === "string",
      ),
    ).toBe(true);
  });

  it("round-trips benchmark fields to JSON-safe route views", async () => {
    const data = await loadExplorerData();
    const sourced = data.routes.find((route) => route.id === "mistral-small-4");
    const unsourced = data.routes.find((route) => route.id === "llama-3-3-70b");

    expect(sourced).toMatchObject({
      intelligenceIndex: 21,
      codingIndex: null,
      reasoningScore: null,
      benchmarkSource: "https://artificialanalysis.ai/models/mistral-small-4",
    });
    expect(unsourced).toMatchObject({
      intelligenceIndex: null,
      codingIndex: null,
      reasoningScore: null,
      benchmarkSource: "",
    });
  });

  it("does not ship unsourced benchmark scores", async () => {
    const data = await loadExplorerData();

    expect(
      data.routes.every((route) => {
        const hasScore =
          route.intelligenceIndex !== null || route.codingIndex !== null || route.reasoningScore !== null;
        return hasScore ? route.benchmarkSource.startsWith("https://") : route.benchmarkSource === "";
      }),
    ).toBe(true);
  });

  it("keeps current sourced benchmark values for key compared models", async () => {
    const data = await loadExplorerData();
    const byId = new Map(data.routes.map((route) => [route.id, route]));

    expect(byId.get("mistral-medium-3-5")).toMatchObject({
      inputPrice: 1.5,
      outputPrice: 7.5,
      throughput: 159.7,
      ttft: 2.11,
      intelligenceIndex: 30,
      benchmarkSource: "https://artificialanalysis.ai/models/mistral-medium-3-5",
    });
    expect(byId.get("mistral-large-3")).toMatchObject({
      throughput: 53.4,
      ttft: 1.15,
      intelligenceIndex: 16,
    });
    expect(byId.get("gpt-oss-20b-ovh")).toMatchObject({
      inputPrice: 0.04,
      outputPrice: 0.15,
      throughput: 221.5,
      ttft: 0.92,
      intelligenceIndex: 15,
    });
    expect(byId.get("gpt-oss-120b")).toMatchObject({
      inputPrice: 0.15,
      outputPrice: 0.6,
      throughput: 177.8,
      ttft: 1.3,
      intelligenceIndex: 24,
    });
  });

  it("preserves static benchmark metadata for Turso-loaded rows", () => {
    const staticRoute = CATALOG.find((route) => route.id === "gpt-oss-120b");
    expect(staticRoute).toBeDefined();
    if (!staticRoute) return;

    const tursoRow = {
      ...staticRoute,
      intelligenceIndex: null,
      codingIndex: null,
      reasoningScore: null,
      benchmarkSource: "",
    };

    expect(mergeStaticBenchmarkFields(tursoRow)).toMatchObject({
      intelligenceIndex: 24,
      codingIndex: null,
      reasoningScore: null,
      benchmarkSource: "https://artificialanalysis.ai/models/gpt-oss-120b",
    });
  });
});
