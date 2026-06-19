# Plan 006: Unify Compare filters with the agent-editable filter contract

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9f43e68..HEAD -- app/VendorCompare.tsx app/Chat.tsx app/PageShell.tsx app/Explorer.tsx src/atoms.ts src/domain.ts docs/design.md tests package.json package-lock.json`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-add-ultracite-qlty-and-test-baseline.md`, `plans/003-fix-chat-tool-contracts.md`, `plans/004-normalize-provider-capability-metadata.md`
- **Category**: direction | correctness | tech-debt
- **Planned at**: commit `9f43e68`, 2026-06-19

## Why this matters

The Compare tab is now the primary workflow, but its model matrix filters are local React state while the chat agent only reads and writes the shared Advanced Explorer `filterAtom`. That means a user can ask the agent to filter the workspace while looking at Compare and see no matrix change, even though the tool call reports success. This plan makes the common filter contract shared across Compare, Advanced, and chat while preserving Compare-only presentation controls such as "hide Azure-only".

## Current state

Relevant files:

- `app/VendorCompare.tsx` — owns the Compare matrix and currently keeps model-first filters in local `matrixFilters` state.
- `app/Chat.tsx` — executes `set_filters` tool calls by writing only `filterAtom`.
- `app/Explorer.tsx` — consumes `filterAtom` for Advanced route filtering.
- `src/atoms.ts` — defines `FilterState`, `INITIAL_FILTERS`, `filterAtom`, and `selectedRouteAtom`.
- `docs/design.md` — documents Compare and Advanced as separate but parallel workflows, and says filter field names must stay aligned with the chat route.
- Tests created by Plan 001 — add shared-filter tests there.

Current excerpts:

```tsx
// app/VendorCompare.tsx:395-404
const [selectedVendorKeys, setSelectedVendorKeys] = useState<ReadonlyArray<string>>([]);
const [modelSearch, setModelSearch] = useState("");
const [matrixFilters, setMatrixFilters] = useState<MatrixFilters>({
  reasoning: false,
  openOnly: false,
  vision: false,
  tools: false,
  sovereignOnly: false,
  hideAzureOnly: true,
});
```

```tsx
// app/Chat.tsx:50-62
const { messages, status, sendMessage, addToolOutput } = useChat({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === "set_filters") {
      const patch = toolCall.input as any;
      setFilters((f) => ({
        ...f,
        ...patch,
        tiers: { ...f.tiers, ...(patch.tiers ?? {}) },
        modes: { ...f.modes, ...(patch.modes ?? {}) },
        capabilities: { ...f.capabilities, ...(patch.capabilities ?? {}) },
      }));
```

```ts
// src/atoms.ts:9-22
export interface FilterState {
  readonly tiers: Record<Tier, boolean>;
  readonly modes: Record<Mode, boolean>;
  readonly capabilities: Record<Capability, boolean>;
  readonly makers: Record<string, boolean>;
  readonly providers: Record<string, boolean>;
  readonly openOnly: boolean;
  readonly maxBlended: number;
  readonly metric: "throughput" | "ttft";
  readonly sort: "reliability" | "blended" | "throughput" | "ttft" | "tier" | "name";
  readonly minReliability: number;
  readonly search: string;
}
```

```md
<!-- docs/design.md:80-88 -->
* **Compare tab** (`app/VendorCompare.tsx`): model-first matrix ...
* **Advanced tab** (`app/Explorer.tsx`): de oorspronkelijke filter-explorer ...
...
* Filterstatus wordt per bericht meegestuurd als context.
```

Repo conventions to preserve:

- Keep `src/atoms.ts` as the state contract owner; do not create a second global store.
- Keep Compare-specific vendor selection local to `VendorCompare.tsx`.
- Use existing Blinqx/HippoLine tokens and compact controls; do not redesign the shell.
- Match strict TypeScript style; avoid `any` unless a package callback leaves no practical alternative.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0, no TypeScript errors |
| Unit tests | `npm test` | exit 0; only available after Plan 001 |
| Lint | `npm run lint` | exit 0; only available after Plan 001 fixes lint |
| Build | `npm run build` | exit 0 |
| Data audit | `npm run coverage:audit` | JSON with `"ok": true` |

## Scope

**In scope**:

- `src/atoms.ts`
- `app/VendorCompare.tsx`
- `app/Chat.tsx`
- `app/PageShell.tsx` only if active-tab context must be passed to chat
- `app/Explorer.tsx` only if shared helper extraction changes import paths
- `docs/design.md`
- Existing test files from Plan 001, or new tests under that test structure
- `plans/README.md` status row

**Out of scope**:

- Changing provider/capability metadata shape; that belongs to Plan 004.
- Changing SQL validation, prompt hardening, or chat model configuration; those belong to Plans 002 and 003.
- Redesigning the Compare matrix or changing vendor selection limits.
- Making chat select vendors in the compare tray. This plan covers filter state, not vendor-set management.

## Git workflow

- Branch: `codex/eu-llm-slfg-plan-006-007` or the active worktree branch chosen by the operator.
- Commit message style: match repo history, e.g. `feat: unify compare filters with chat agent`.
- Do not push or open a PR unless the operator explicitly asks.

## Steps

### Step 1: Extract shared filter patch semantics

Create a pure helper in `src/atoms.ts` or a tiny adjacent module if tests need isolated imports:

- It accepts current `FilterState` plus a partial patch matching the `set_filters` tool input.
- It deep-merges `tiers`, `modes`, `capabilities`, `makers`, and `providers`.
- It preserves existing values when a field is omitted.
- It applies scalar fields such as `openOnly`, `maxBlended`, `metric`, `sort`, `minReliability`, and `search` only when present.

This should incorporate the Plan 003 fix for maker/provider deep merge. If Plan 003 has not landed, stop and run Plan 003 first.

**Verify**: `npm test -- --run` or the repo's Plan-001 test command -> tests cover partial nested patches and pass.

### Step 2: Make Compare consume the shared filter where fields overlap

In `app/VendorCompare.tsx`, replace the overlapping local state with `useAtomValue(filterAtom)` / `useAtomSet(filterAtom)` for these fields:

- search: use `filters.search` instead of `modelSearch`
- reasoning: derive from `filters.modes.reasoning || filters.modes.configurable`
- openOnly: use `filters.openOnly`
- vision/tools: use `filters.capabilities.vision` and `filters.capabilities.tools`
- Tier A / sovereign-only: derive from `filters.tiers.A === true && filters.tiers.B === false && filters.tiers.C === false`, or add a small helper that translates the compare chip into a tier patch

Keep `hideAzureOnly` as Compare-local state because Advanced has no matching concept.

**Verify**: `npm run typecheck` -> exit 0.

### Step 3: Route Compare filter controls through the shared patch helper

Update Compare filter chip handlers so toggles call the shared patch helper via `setFilters`, not local `setMatrixFilters`, for overlapping fields. Keep the user-facing behavior:

- Reasoning chip toggles reasoning/configurable route visibility in a predictable way.
- Open chip toggles `openOnly`.
- Vision and Tools chips toggle their matching capability fields.
- Tier A chip toggles between Tier-A-only and the prior broad default if no narrower state exists.
- Search box writes `filters.search`.

Do not let Compare reset unrelated Advanced-only filters accidentally. If a mapping is ambiguous, prefer preserving state and document the choice in a short comment near the helper.

**Verify**: `npm run typecheck` -> exit 0.

### Step 4: Feed active surface context into chat tool output

If `Chat` needs to report which surface it updated, pass the current tab from `PageShell` into `Chat` as a small prop such as `activeSurface`. Update tool output to include `{ applied: true, surface: "compare" | "explorer" | "global" }` without changing the server tool schema.

This is a UI feedback improvement only. Do not add a new server tool unless the current tool shape cannot express the shared filters.

**Verify**: `npm run typecheck` -> exit 0.

### Step 5: Update docs and tests

Update `docs/design.md` so the state section says:

- Compare and Advanced share the common filter contract for search, mode, openness, capabilities, and tiers.
- Compare retains local state for selected vendors and Azure-only visibility.
- Chat `set_filters` updates the shared filter contract, so visible Compare filters can change when Compare is active.

Add tests for the shared patch helper and, if the test setup supports React components, one lightweight Compare filter mapping test. Do not add brittle visual snapshot tests.

**Verify**: `npm test` -> exit 0.

## Test plan

- Shared helper test: patching `{ capabilities: { tools: true } }` preserves existing `vision/cache/think/web/json` values.
- Shared helper test: patching `{ providers: { Azure: true } }` preserves existing provider keys and does not drop makers.
- Shared helper test: scalar patch `{ search: "mistral", openOnly: true }` updates only those fields.
- Compare mapping test, if practical: toggling the Open chip changes shared `openOnly` and filters matrix rows through existing `rowMatchesFilters` behavior.

## Done criteria

- [ ] Compare search/reasoning/open/vision/tools/Tier-A controls use the shared filter state.
- [ ] Chat `set_filters` updates affect the Compare matrix for overlapping filter fields.
- [ ] Compare-only state remains local for selected vendors and Azure-only visibility.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm test` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- Plans 001, 003, or 004 have not landed and the relevant code still matches the old excerpts.
- The shared mapping requires changing the public server `set_filters` tool schema.
- Making Compare use shared filters would require changing the provider/capability data model before Plan 004.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Future filter additions should start in `src/atoms.ts` and then decide explicitly whether they are global, Advanced-only, or Compare-only. Reviewers should scrutinize accidental resets of nested filter maps and any behavior where a Compare chip modifies more Advanced filters than the user would expect.
