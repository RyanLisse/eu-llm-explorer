import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG } from "../src/data";

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

test("catalog routes declare explicit provider and capability metadata", () => {
  for (const route of CATALOG) {
    assert.ok(route.providers.length > 0, `${route.id} has provider metadata`);
    assert.ok(route.capabilities.length > 0, `${route.id} has capability metadata`);

    for (const provider of route.providers) {
      assert.equal(allowedRouteProviders.has(provider), true, `${route.id} provider ${provider} is allowed`);
    }

    for (const capability of route.capabilities) {
      assert.equal(allowedCapabilities.has(capability), true, `${route.id} capability ${capability} is allowed`);
    }
  }
});
