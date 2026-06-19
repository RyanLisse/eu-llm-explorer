import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import fs from "node:fs";
import path from "node:path";
import { INITIAL_FILTERS, type AgentFilterState, type WorkspaceContext } from "@/agent/constants";
import { validateReadOnlySql } from "@/agent/sql";
import {
  DEFAULT_AGENT_CONTEXT,
  formatDefaultFilters,
  formatFilterState,
  formatWorkspaceContext,
  openTabInputSchema,
  queryDataInputSchema,
  resolveSlashCommand,
  selectRouteInputSchema,
  setCompareStateInputSchema,
  setUiStateInputSchema,
  filterPatchSchema,
} from "@/agent/tools";
import { withClient } from "@/turso";

// Load schema at startup
const schemaPath = path.join(process.cwd(), "db/schema.sql");
const dbSchema = fs.readFileSync(schemaPath, "utf-8");

// Initialize OpenRouter provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

export const maxDuration = 30; // standard Next.js max duration for serverless API

const getLastUserText = (messages: ReadonlyArray<UIMessage>): string => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    return message.parts
      .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }
  return "";
};

const deterministicTextResponse = (messages: UIMessage[], text: string): Response => {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) => {
      const id = "deterministic-command";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
};

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    currentFilters?: AgentFilterState;
    workspaceContext?: WorkspaceContext;
  };
  const { messages } = body;
  const currentFilters = body.currentFilters ?? INITIAL_FILTERS;
  const workspaceContext: WorkspaceContext = {
    ...DEFAULT_AGENT_CONTEXT,
    ...(body.workspaceContext ?? {}),
    compareState: {
      ...DEFAULT_AGENT_CONTEXT.compareState,
      ...(body.workspaceContext?.compareState ?? {}),
      matrixFilters: {
        ...DEFAULT_AGENT_CONTEXT.compareState.matrixFilters,
        ...(body.workspaceContext?.compareState?.matrixFilters ?? {}),
      },
    },
  };

  const slashResponse = resolveSlashCommand(getLastUserText(messages));
  if (slashResponse) {
    return deterministicTextResponse(messages, slashResponse.content);
  }

  const filterStateText = formatFilterState(currentFilters);
  const resetText = formatDefaultFilters();
  const workspaceStateText = formatWorkspaceContext(workspaceContext);

  const systemPrompt = `
You are an expert EU Sovereign AI Routing Agent assisting users in the EU AI Gateway Explorer.
Your goal is to help users navigate and explore model routes that comply with European sovereignty requirements.

${filterStateText}
${resetText}
${workspaceStateText}

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
- After calling a UI tool, confirm what changed and why in your final narration.
- Never write SQL that modifies data. Only SELECT statements are allowed.
- You can query database content using the query_data tool. Use this to find route details (like id) if you do not know them.
- If you find a route that answers the user's question, call select_route with the canonical routeId value.
- Use open_tab for top-level workspace navigation.
- Use set_compare_state for Compare model selection, provider selection, model search, and matrix filters.
- Use set_ui_state only for shell state such as active tab, chat panel visibility, or theme.
- Do not make up routes or filter states. Use the tools.
`;

  const result = await streamText({
    model: openrouter("openrouter/free"),
    messages: await convertToModelMessages(messages),
    system: systemPrompt,
    tools: {
      query_data: tool({
        description: "Execute a read-only SQL SELECT query against allowlisted TursoDB catalog tables.",
        inputSchema: queryDataInputSchema,
        execute: async ({ sql }) => {
          const validation = validateReadOnlySql(sql);
          if (!validation.ok) {
            return validation.error;
          }

          try {
            const rows = await withClient(async (client) => {
              const res = await client.execute(validation.sql);
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
        inputSchema: filterPatchSchema,
      }),
      select_route: tool({
        description: "Select a specific route to inspect in the detail panel.",
        inputSchema: selectRouteInputSchema,
      }),
      open_tab: tool({
        description: "Open one of the top-level workspace tabs.",
        inputSchema: openTabInputSchema,
      }),
      set_ui_state: tool({
        description: "Update shell-level UI state such as active tab, chat panel visibility, or theme.",
        inputSchema: setUiStateInputSchema,
      }),
      set_compare_state: tool({
        description: "Update Compare model selection, provider selection, model search, and matrix filters.",
        inputSchema: setCompareStateInputSchema,
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
