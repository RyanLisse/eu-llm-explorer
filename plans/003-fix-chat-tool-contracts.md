# Plan 003: Fix chat tool contract bugs and centralize the chat model ID

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6ebb30b..HEAD -- app/Chat.tsx app/api/chat/route.ts app/PageShell.tsx src/atoms.ts docs/design.md docs/brainstorms docs/plans package.json tests`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-add-ultracite-qlty-and-test-baseline.md`
- **Category**: bug | docs
- **Planned at**: commit `6ebb30b`, 2026-06-12

## Why this matters

The chat agent is supposed to manipulate the UI reliably. Right now, two small contract bugs make the agent look successful while state can be wrong: route strings are displayed as selectable even though Explorer only selects ids, and provider/maker patches overwrite existing nested filter state. A third mismatch makes the displayed chat model disagree with the actual server model, which is exactly the kind of drift that makes agent products feel untrustworthy.

## Current state

Relevant files:

- `app/api/chat/route.ts` — defines `select_route`, `set_filters`, and the OpenRouter model call.
- `app/Chat.tsx` — executes client-side tool calls and displays action chips.
- `app/Explorer.tsx` — reads `selectedRouteAtom` and selects by route id.
- `docs/brainstorms/2026-06-09-agent-native-chat-requirements.md` — original tool contract.
- `docs/plans/2026-06-09-001-feat-agent-native-chat-panel-plan.md` — implementation plan that superseded parts of the brainstorm.
- `docs/design.md` — design-system/current interface description.

Current excerpts:

```ts
// app/api/chat/route.ts:100-101
- If you find a route that answers the user's question, call select_route with its 'route' or 'id' field (called routeId in the tool).
```

```ts
// app/Chat.tsx:50-57
} else if (toolCall.toolName === "select_route") {
  const { routeId } = toolCall.input as { routeId: string };
  setSelectedRoute(routeId);
  addToolOutput({
    tool: "select_route",
    toolCallId: toolCall.toolCallId,
    output: { applied: true },
  });
}
```

```ts
// app/Explorer.tsx:165
const selected = visible.find((r) => r.id === selectedId) ?? ranked[0] ?? nonRejected[0] ?? visible[0] ?? null;
```

```ts
// app/Chat.tsx:38-44
setFilters((f) => ({
  ...f,
  ...patch,
  tiers: { ...f.tiers, ...(patch.tiers ?? {}) },
  modes: { ...f.modes, ...(patch.modes ?? {}) },
  capabilities: { ...f.capabilities, ...(patch.capabilities ?? {}) },
}));
```

```md
<!-- docs/brainstorms/...:41-42 -->
`set_filters` → Partial `FilterState` update ... **Deep-merge semantics**: only the fields present in the call are updated; omitted fields retain their current values.
```

```ts
// app/Chat.tsx:86-88
<h3>Compliance Agent</h3>
<p className="eyebrow">owl-alpha · sovereign routing</p>
```

```ts
// app/api/chat/route.ts:106-108
const result = await streamText({
  model: openrouter("openrouter/free"),
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit/component tests | `npm test` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Data audit | `npm run coverage:audit` | JSON contains `"ok": true` |

## Scope

**In scope**:

- `app/Chat.tsx`
- `app/api/chat/route.ts`
- A small shared config file if needed, e.g. `src/chatConfig.ts`
- Tests created by Plan 001
- Docs that describe the chat model/tool contract: `docs/design.md`, `docs/brainstorms/...`, `docs/plans/...`

**Out of scope**:

- Adding new agent tools such as `select_vendor` or `open_tab` — that is direction follow-up.
- Replacing OpenRouter/provider libraries.
- Changing the filter UI itself.
- Conversation persistence.

## Git workflow

- Branch: `advisor/003-chat-tool-contract`
- Commit message suggestion: `fix: align chat tool contracts`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Make route selection id-only or normalize before setting state

Choose one safe contract and apply it consistently.

Preferred: id-only contract.

- In `app/api/chat/route.ts`, update the system prompt and `select_route` tool description so the model must pass the `id` field from `model_routes`, not the human-readable `route` field.
- In `app/Chat.tsx`, before `setSelectedRoute`, check whether `routeId` matches a route id in the `routes` prop.
- If it does not match an id but does match a route string, normalize it to that route’s `id` for backwards compatibility.
- If it matches neither, do not mutate selection; call `addToolOutput` with `{ applied: false, reason: "unknown_route" }`.

Target behavior:

```ts
const route = routes.find((r) => r.id === routeId) ?? routes.find((r) => r.route === routeId);
if (!route) {
  addToolOutput({ tool: "select_route", toolCallId, output: { applied: false, reason: "unknown_route" } });
  return;
}
setSelectedRoute(route.id);
```

Use the exact AI SDK argument shape present in the current `addToolOutput` calls.

**Verify**: `npm test` → includes tests or component-level coverage for id match, route-string normalization, and unknown route no-op.

### Step 2: Deep-merge all nested filter maps

Update the `set_filters` handler in `app/Chat.tsx` so it deep-merges `makers` and `providers` too:

```ts
setFilters((f) => ({
  ...f,
  ...patch,
  tiers: { ...f.tiers, ...(patch.tiers ?? {}) },
  modes: { ...f.modes, ...(patch.modes ?? {}) },
  capabilities: { ...f.capabilities, ...(patch.capabilities ?? {}) },
  makers: { ...f.makers, ...(patch.makers ?? {}) },
  providers: { ...f.providers, ...(patch.providers ?? {}) },
}));
```

If `false` means disabled for makers and `true` means selected for providers, preserve those semantics. Do not delete keys unless the tool schema gains an explicit clear/reset operation.

**Verify**: `npm test` → includes a test where an existing provider/maker key survives a patch that only changes another key.

### Step 3: Centralize the chat model id

Create a tiny shared constant, for example in `src/chatConfig.ts`:

```ts
export const CHAT_MODEL_ID = process.env.OPENROUTER_MODEL_ID ?? "openrouter/free";
export const CHAT_MODEL_LABEL = CHAT_MODEL_ID.replace(/^openrouter\//, "");
```

Server components cannot use arbitrary env vars client-side unless explicitly exposed, so do not import a server-only env expression into `app/Chat.tsx` if it would leak unexpected variables. Simpler safe option:

- Server: use `process.env.OPENROUTER_MODEL_ID ?? "openrouter/free"`.
- Client UI: display a neutral label such as `OpenRouter free-tier · sovereign routing`, unless `NEXT_PUBLIC_OPENROUTER_MODEL_LABEL` is set.

Update docs to match whichever default is chosen. If Ryan specifically wants `owl-alpha`, set the default to the exact supported OpenRouter model id and verify a real chat call manually; otherwise do not claim `owl-alpha` in UI.

**Verify**: `npm run typecheck` → no server/client env import error. `grep -R "owl-alpha\|openrouter/auto\|openrouter/free" app docs src` → only intentional, consistent references remain.

### Step 4: Refresh docs for actual behavior

Update the chat docs so they describe:

- Current model default and where to configure it.
- `select_route` expects a route id; route-string normalization is only backwards compatibility if implemented.
- `set_filters` deep-merges all nested maps.
- Chat starts closed if that remains the implementation; do not leave docs saying it starts open on desktop unless you change the implementation.

**Verify**: `grep -R "starts open on desktop\|owl-alpha\|openrouter/auto" docs app src` → no stale claims unless they are explicitly marked historical.

### Step 5: Re-run baseline

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run coverage:audit
```

**Verify**: all exit 0.

## Test plan

Add tests for:

- `select_route` id match selects the expected id.
- `select_route` route-string match normalizes to id, if backwards compatibility is implemented.
- Unknown route does not mutate selection and returns an unapplied tool output.
- `set_filters` preserves existing `makers` and `providers` keys when patching another key.
- Model label/config references are not duplicated across server and UI.

## Done criteria

- [ ] Agent route selection cannot silently claim success while Explorer selection remains unchanged.
- [ ] Provider/maker patches preserve existing nested filter state.
- [ ] Chat model id/label is consistent across server, UI, and docs.
- [ ] Stale chat docs are corrected.
- [ ] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run coverage:audit` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- AI SDK `addToolOutput` behavior differs from the current code and tool results cannot be tested without a live model.
- The chosen OpenRouter model id cannot be verified from docs/runtime and would risk paid calls.
- Fixing docs reveals a larger product decision conflict about whether chat should start open or closed.

## Maintenance notes

The next likely extension is adding navigation tools for Compare/Book/Presentation. Keep this plan focused on existing tools only; adding new tools before the current contracts are reliable would compound confusion.
