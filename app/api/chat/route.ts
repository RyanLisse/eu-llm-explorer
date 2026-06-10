import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { withClient } from "@/turso";

// Load schema at startup
const schemaPath = path.join(process.cwd(), "db/schema.sql");
const dbSchema = fs.readFileSync(schemaPath, "utf-8");

// Initialize OpenRouter provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

export const maxDuration = 30; // standard Next.js max duration for serverless API

const INITIAL_FILTERS = {
  tiers: { A: true, B: true, C: false },
  modes: { reasoning: true, "non-reasoning": true, configurable: true },
  capabilities: { vision: false, tools: false, cache: false, think: false, web: false, json: false },
  makers: {},
  providers: {},
  openOnly: false,
  maxBlended: 8,
  metric: "throughput",
  sort: "reliability",
  minReliability: 0,
  search: "",
};

export async function POST(req: Request) {
  const { messages, currentFilters } = (await req.json()) as {
    messages: UIMessage[];
    currentFilters: typeof INITIAL_FILTERS;
  };

  // 1. Format current filter state for system prompt
  const tiersStr = Object.entries(currentFilters.tiers ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const modesStr = Object.entries(currentFilters.modes ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const capsStr = Object.entries(currentFilters.capabilities ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");

  const filterStateText = `
Current Explorer filter state:
Tiers: ${tiersStr} | Modes: ${modesStr} | Capabilities: ${capsStr}
maxBlended: $${currentFilters.maxBlended?.toFixed(2) || "8.00"} | minReliability: ${currentFilters.minReliability ?? 0}
Sort: ${currentFilters.sort || "reliability"} | openOnly: ${currentFilters.openOnly ?? false} | Search: "${currentFilters.search || ""}"
`;

  // 2. Format default/reset instructions
  const resetText = `
Default (reset) filter state:
Tiers: A=true B=true C=false | Modes: reasoning=true non-reasoning=true configurable=true
Capabilities: all false | openOnly: false | maxBlended: $8.00 | minReliability: 0 | sort: reliability | search: ""
To reset or match defaults: call set_filters with these exact values.
`;

  // 3. Complete system prompt
  const systemPrompt = `
You are an expert EU Sovereign AI Routing Agent assisting users in the EU AI Gateway Explorer.
Your goal is to help users navigate and explore model routes that comply with European sovereignty requirements.

${filterStateText}
${resetText}

---

DATABASE SCHEMA:
The database contains the following tables:
${dbSchema}

---

WORKED EXAMPLES:
Example 1: "What are the cheapest Tier A routes?"
Query: SELECT name, route, maker, input_price, output_price, (input_price + output_price) / 2.0 AS blended FROM model_routes WHERE tier = 'A' ORDER BY blended ASC LIMIT 10

Example 2: "How many routes per tier?"
Query: SELECT tier, COUNT(*) AS count FROM model_routes GROUP BY tier ORDER BY tier

Example 3: "Show Mistral routes available on AWS Bedrock"
Query: SELECT mr.name, mr.tier, pc.platform, pc.requirement_fit FROM model_routes mr JOIN provider_coverage pc ON pc.model LIKE '%' || mr.name || '%' WHERE mr.maker = 'Mistral' AND pc.platform = 'AWS Bedrock' ORDER BY mr.tier

---

BEHAVIORAL INSTRUCTIONS:
- Always explain your intent to the user before calling a tool. Speak in natural language, describing what actions you are about to perform and why.
- Keep your responses concise and focused on EU AI sovereignty context.
- After calling set_filters or select_route, confirm what changed and why in your final narration.
- Never write SQL that modifies data. Only SELECT statements are allowed.
- You can query database content using the query_data tool. Use this to find route details (like id) if you do not know them.
- If you find a route that answers the user's question, call select_route with its 'route' or 'id' field (called routeId in the tool).
- Do not make up routes or filter states. Use the tools.
`;

  // 4. Stream response
  const result = await streamText({
    model: openrouter("openrouter/free"),
    messages: await convertToModelMessages(messages),
    system: systemPrompt,
    tools: {
      query_data: tool({
        description: "Execute a read-only SQL SELECT query against TursoDB.",
        inputSchema: z.object({
          sql: z.string().describe("A read-only SELECT query"),
        }),
        execute: async ({ sql }) => {
          const trimmed = sql.trim().toUpperCase();
          if (!trimmed.startsWith("SELECT")) {
            return "Only SELECT queries are allowed.";
          }

          try {
            const rows = await withClient(async (client) => {
              const res = await client.execute(sql);
              return res.rows.slice(0, 50);
            });
            if (rows === null) {
              return "Database unavailable — TURSO_DATABASE_URL not configured.";
            }
            return JSON.stringify(rows);
          } catch (e) {
            return `SQL Error: ${e instanceof Error ? e.message : String(e)}`;
          }
        },
      }),
      set_filters: tool({
        description: "Update the Explorer filter state incrementally.",
        inputSchema: z.object({
          tiers: z
            .object({
              A: z.boolean().optional(),
              B: z.boolean().optional(),
              C: z.boolean().optional(),
            })
            .optional(),
          modes: z
            .object({
              reasoning: z.boolean().optional(),
              "non-reasoning": z.boolean().optional(),
              configurable: z.boolean().optional(),
            })
            .optional(),
          capabilities: z
            .object({
              vision: z.boolean().optional(),
              tools: z.boolean().optional(),
              cache: z.boolean().optional(),
              think: z.boolean().optional(),
              web: z.boolean().optional(),
              json: z.boolean().optional(),
            })
            .optional(),
          makers: z.record(z.string(), z.boolean()).optional(),
          providers: z.record(z.string(), z.boolean()).optional(),
          openOnly: z.boolean().optional(),
          maxBlended: z.number().min(0.1).max(8).optional(),
          minReliability: z.number().min(0).max(100).optional(),
          sort: z.enum(["reliability", "blended", "throughput", "ttft", "tier", "name"]).optional(),
          search: z.string().optional(),
        }),
      }),
      select_route: tool({
        description: "Select a specific route to inspect in the detail panel.",
        inputSchema: z.object({
          routeId: z.string().describe("The route id field from model_routes"),
        }),
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
