import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // standalone only for self-hosted Docker; Vercel handles optimization natively
  ...(process.env.STANDALONE === "true" ? { output: "standalone" } : {}),
  reactStrictMode: true,
  turbopack: {
    root: repoRoot,
  },
  // effect ships modern ESM; let Next transpile it for the server bundle.
  transpilePackages: ["effect", "@effect-atom/atom-react", "ai", "@ai-sdk/react"],
  // Include db/schema.sql in the /api/chat serverless function bundle.
  outputFileTracingIncludes: {
    "/api/chat": ["./db/schema.sql"],
  },
};

export default nextConfig;
