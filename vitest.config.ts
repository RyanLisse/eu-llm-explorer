import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit/API-boundary tests run in Node (no DOM needed yet). The `@` alias mirrors
// tsconfig `paths` so modules importing `@/...` (e.g. the chat route) resolve under
// Vitest. Playwright e2e specs are excluded so `npm test` never depends on browsers;
// run those via `npm run test:e2e`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**", "**/*.e2e.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
