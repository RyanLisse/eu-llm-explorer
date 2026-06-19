import { describe, expect, it } from "vitest";

// API-boundary scaffold for the chat route. This intentionally only imports the
// module and asserts its public contract — it does NOT exercise the OpenRouter or
// Turso calls. Plan 002 will build on this file to add request-validation and
// SQL-read-surface tests.
//
// Mock seam for Plan 002:
//   - OpenRouter: the route builds its provider via `createOpenRouter({ apiKey })`
//     from "@openrouter/ai-sdk-provider" and streams via `streamText` from "ai".
//     Stub these with `vi.mock("ai", ...)` / `vi.mock("@openrouter/ai-sdk-provider")`
//     so no network call fires.
//   - Turso: DB access goes through `withClient` in "@/turso", which is a no-op
//     (returns null) unless TURSO_DATABASE_URL is set. Tests can `vi.mock("@/turso")`
//     to assert the SQL read-surface guards without a live database.
//
// Importing the module is side-effect-safe: it reads db/schema.sql at load (present
// in-repo) and constructs the provider with an empty key, but performs no I/O until
// POST is invoked.

describe("chat route module", () => {
  it("exports a POST handler and a maxDuration", async () => {
    const route = await import("../../app/api/chat/route");
    expect(typeof route.POST).toBe("function");
    expect(route.maxDuration).toBe(30);
  });
});
