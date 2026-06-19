# Implement All SLFG Plans

## Current State

The `plans/` directory contains seven implementation plans generated across two
base commits: `6ebb30b` and `9f43e68`. This branch already includes part of the
agent-native hardening work, including route-id selection, workspace navigation
tools, Compare model selection, slash-command discovery, and SQL table allowlists.

Because of that existing work, the historical drift checks in the individual
plans are expected to show changes. Treat the plans as backlog scope, not as a
request to revert the branch to the original excerpts.

## Ideal State

- Verification baseline is deterministic: tests, typecheck, build, lint, static
  coverage audit, and Qlty/Ultracite checks are available or documented.
- Chat requests are validated before model invocation, filter/workspace context is
  injected as untrusted JSON, SQL reads are allowlisted and limited, and DB errors
  do not leak internals.
- Agent tool contracts use canonical ids, deep-merge nested filters, and centralize
  the OpenRouter model id/label.
- Catalog provider and capability facets are explicit metadata, not derived from
  display strings.
- Governance users can export Markdown/JSON decision packets from loaded explorer
  data without live provider calls.
- Compare and Advanced share the common filter contract where fields overlap,
  while Compare-only model and display state remains local/shared through Compare
  state.
- Data loading keeps static fallback behavior while parallelizing independent
  reads, and live-audit output no longer includes no-op checks.

## Verification Criteria

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint`
- `npm run coverage:audit`
- `qlty check --all` when Qlty is available after setup
- Browser smoke for Compare model-first filtering and decision-packet export

## Execution Notes

Keep edits scoped to the plan files and their listed modules. Do not run Turso
seed/migration commands. If live-source audit reports real external drift, report
that as data-refresh work instead of editing catalog values in this pass.
