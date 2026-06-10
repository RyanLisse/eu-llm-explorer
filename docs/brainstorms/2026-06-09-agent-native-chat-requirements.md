# Agent-native chat panel — Requirements

**Date:** 2026-06-09  
**Status:** Ready for planning

---

## Goal

Add a persistent, collapsible chat panel to the right side of the EU AI Gateway Explorer. The panel hosts an AI agent (free OpenRouter model) that can both answer questions about the route data via live TursoDB SQL queries **and** act on the Explorer UI — applying filters, selecting routes — while narrating its reasoning as it streams.

A user types "show me the cheapest Tier A reasoning model" and the agent (1) queries TursoDB if it needs data, (2) fires `set_filters` to update the Explorer, (3) fires `select_route` to highlight the winner, and (4) explains why — all in one streamed response.

---

## Primary outcome

Users can interrogate and navigate the route catalog through natural language without touching any filter control. The Explorer remains fully usable alongside the chat; the agent's actions are visible as the filters and selection update in real time while the explanation streams.

---

## Scope

### 1. Chat UI panel — `app/Chat.tsx`

- Fixed-width right panel (~380 px), collapsible via a toggle button in the topbar or panel edge.
- Starts open on desktop, collapsed on narrow viewports.
- Message list with streaming: user messages flush right, assistant messages flush left.
- Tool call results rendered inline — when the agent fires `set_filters` or `select_route`, a compact "action chip" appears in the message stream showing what changed (e.g. "Applied: Tier A · sort by reliability").
- Text input at the bottom with send on Enter / button.
- No "Undo" or "Reset" in the chat panel — the existing Reset button in the filter sidebar is the user's escape hatch; the chat should mention this if the user asks to undo.

### 2. API route — `app/api/chat/route.ts`

- `POST /api/chat` using Vercel AI SDK `streamText`.
- Provider: OpenRouter via `@ai-sdk/openai` with custom `baseURL: https://openrouter.ai/api/v1`. Model: `openrouter/auto` (auto-routes to best available free model — currently NVIDIA Nemotron Ultra 55B or equivalent).
- Three tools:

| Tool | Execution | Purpose |
|------|-----------|---------|
| `query_data` | Server-side | Executes a read-only SQL query against TursoDB via the existing `withClient` helper in `src/turso.ts`. Returns up to 50 rows as JSON. Rejects any statement that is not a `SELECT`. Must accept raw SQL — no higher-level intent wrappers (cardinal sin: encoding workflow logic into the tool). |
| `set_filters` | Client-side | Partial `FilterState` update. Parameters mirror the fields in `src/atoms.ts` (`tiers`, `modes`, `maxBlended`, `minReliability`, `sort`, `openOnly`, `providers`, `makers`, `search`). No `execute` fn — handled by the client's `onToolCall`. **Deep-merge semantics**: only the fields present in the call are updated; omitted fields retain their current values. |
| `select_route` | Client-side | `{ routeId: string }`. Highlights a route in the ranked cards, chart, and detail panel. No `execute` fn — handled by the client. |

- Request body includes `currentFilters: FilterState` and `visibleCount: number` sent from the client on every turn.
- System prompt is built **dynamically per request** and includes:
  - **Current app state header** (injected from request body):
    ```
    Current filter state: tiers=A+B, modes=all, maxBlended=$8.00, minReliability=0, sort=reliability, openOnly=false
    Visible routes: 42  |  Selected route: (none)
    ```
  - **`INITIAL_FILTERS` values** so the agent can reset without a dedicated tool:
    ```
    Default (reset) state: tiers=A+B+C(C off), modes=all on, maxBlended=$8, minReliability=0, sort=reliability, openOnly=false
    ```
  - Full `db/schema.sql` content so the model has exact column names.
  - Three worked Q→SQL examples covering common patterns (filter by tier + sort, aggregation, join with coverage table).
  - Instruction to narrate intent *before* firing tools: "Always explain what you are about to do and why before calling a tool."
  - Instruction to keep responses concise and focused on EU sovereignty context.

### 3. Layout change — `app/page.tsx`

- Wrap the existing `<main>` content and `<Chat>` in a `page-split` flex container (row direction).
- Main content takes `flex: 1 1 0`, min-width 0 so it can shrink.
- Chat panel takes a fixed width (CSS custom property `--chat-width: 380px`), animated to 0 when collapsed.
- No change to the Explorer component's internal layout.

### 4. Client tool execution — `app/Chat.tsx`

- `useChat` is configured with `body` returning `{ currentFilters, visibleCount }` on every send so the API route can build the dynamic system prompt. These values are read from `filterAtom` and a `visibleCount` prop passed from `page.tsx`.
- `onToolCall` callback intercepts `set_filters` and `select_route` calls.
- `set_filters` → deep-merges the partial payload into the current `filterAtom` value using `setFilters(f => ({ ...f, ...patch, tiers: { ...f.tiers, ...patch.tiers }, modes: { ...f.modes, ...patch.modes } }))`.
- `select_route` → calls a setter on a new `selectedRouteAtom` (see §5 below).
- After handling a client-side tool call, the callback must call `addToolResult` to let the SDK continue the stream.

### 5. Lift `selectedId` to a shared atom — `src/atoms.ts`

- `selectedId` is currently `useState` local to `Explorer.tsx`. Lift it to a new exported `selectedRouteAtom` (initial value `null`).
- `Explorer.tsx` reads/writes via `useAtomValue` / `useAtomSet` instead of `useState`.
- `Chat.tsx` writes via `useAtomSet` when processing a `select_route` tool call.
- No other behaviour changes to selection logic.

### 6. Environment variables — `.env.local`

- `OPENROUTER_API_KEY` — provided, must be added.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` — already present, reused by `query_data`.

---

## New dependencies

| Package | Reason |
|---------|--------|
| `ai` | Vercel AI SDK — `streamText`, `useChat`, tool definitions |
| `@ai-sdk/openai` | OpenAI-compatible provider used for OpenRouter |
| `zod` | Tool parameter schemas required by the AI SDK |

---

## Out of scope

- Conversation persistence across page reloads.
- File or image attachments (the referenced attachment component is not needed).
- Agent undo / filter history stack — user uses the existing Reset button.
- GROQ as primary provider (can be wired as a fallback in a later iteration; the key is placed in `.env.local`).
- Model picker UI — `openrouter/auto` is the default; changing models is a config edit.
- Write/mutate SQL — `query_data` is strictly read-only.
- Multi-vendor model overlap table and coverage table actions — the agent can query and describe these but cannot highlight rows in those tables (only routes via `select_route`).

---

## Assumptions

- `openrouter/auto` has sufficient context window for the schema + few-shot examples (~2 000 tokens system prompt).
- Free models can generate valid SQLite-compatible SQL for the four-table schema given the schema literal and examples in the system prompt.
- `@effect-atom/atom-react` atoms are module-level singletons, so `filterAtom` and `selectedRouteAtom` are shared across `Explorer.tsx` and `Chat.tsx` without additional provider setup.
- The `withClient` helper in `src/turso.ts` can be safely called from an API route (it creates and closes a client per call — no connection pooling issue).

---

## Success criteria

- "Show me Tier A routes under $1/1M sorted by throughput" → filters update, agent explains the query and result.
- "What is the most reliable sovereign route right now?" → agent queries TursoDB, selects the top route, streams a clear rationale.
- "Compare Mistral on OVHcloud vs Scaleway" → agent queries both rows, narrates the comparison without changing filters.
- Chat panel toggles open/closed without breaking the Explorer layout at any viewport width.
- No paid API calls — only `openrouter/auto` free tier used.
