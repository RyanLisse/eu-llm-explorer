---
title: "chore: Add Ultracite, Qlty, and a working verification baseline"
type: chore
date: 2026-06-19
origin: plans/001-add-ultracite-qlty-and-test-baseline.md
status: planned
depth: standard
---

# chore: Add Ultracite, Qlty, and a working verification baseline

> Origin document: `plans/001-add-ultracite-qlty-and-test-baseline.md` (the improve-skill plan set, plan 001). This plan translates that source into dependency-ordered implementation units with enumerated test scenarios. It is the foundational plan the rest of the `plans/` set depends on.

## Summary

The repo has strong `typecheck` and `build` gates but a **broken** lint command (`next lint`, removed in Next 16) and **no automated test suite** — a backwards risk profile for a project with an agentic chat route (`app/api/chat/route.ts`), model-generated SQL, URL-driven tabs, and compliance-heavy UI claims. This plan adds the two tools requested upstream — **Ultracite** (Biome-based lint/format) and **Qlty** (aggregator) — and stands up a minimal **Vitest** unit/API harness plus an optional Playwright smoke test, so later security and architecture plans (002–007) have a real safety net.

This is plan **001** in the `plans/` execution order: P1, no dependencies, and a hard prerequisite for every other plan in the set.

---

## Problem Frame

Current verification baseline (confirmed live on branch `codex/eu-llm-slfg-plans`, 2026-06-19):

- `npm run typecheck` — passes.
- `npm run build` — passes (per origin audit).
- `npm run coverage:audit` — passes.
- `npm run lint` — **fails**: `lint` script is still `next lint`, invalid under this Next 16 setup.
- No `*.test.*`, `*.spec.*`, `vitest.config.*`, or `playwright.config.*` files exist.
- No `biome.json` and no `.qlty/` directory exist yet — plan 001's scope is untouched, so there is no rework risk from drift.
- `qlty` CLI is **already installed** on PATH (`~/.qlty/bin/qlty`), so the Step-2 install sub-step is a no-op verification rather than a network install.

Goal: make `npm run lint` and `npm test` both exit 0 with deterministic, agent-runnable commands, add a documented Qlty config, and leave a chat-API test scaffold that plan 002 can extend — without mass-refactoring source or touching secrets.

---

## Requirements

Traced to the origin plan's Done criteria:

- **R1** — `npm run lint` exits 0 and no longer calls the broken `next lint` (Ultracite/Biome check in non-mutating mode).
- **R2** — Ultracite config and dependencies are present and reachable via clear `package.json` script names (`lint`, `format`).
- **R3** — `.qlty/qlty.toml` exists, excludes generated/vendor dirs, and `qlty check --all` has a documented result (clean or a recorded baseline).
- **R4** — `npm test` exists and exits 0 (Vitest unit/API harness).
- **R5** — Existing gates still pass: `npm run typecheck`, `npm run build`, `npm run coverage:audit` all exit 0.
- **R6** — No secret files or secret values are committed (`.env.local` stays ignored and unprinted).
- **R7** — `plans/README.md` status row for plan 001 is updated to reflect completion.

---

## Key Technical Decisions

- **Biome via Ultracite as the single lint/format path.** Ultracite wraps Biome and was explicitly requested upstream. One canonical `npm run lint` (check/non-mutating) keeps it boring and agent-runnable; `npm run format` does write-mode. Rationale: avoids contradictory rule sets between multiple linters (origin Maintenance notes).
- **Qlty as aggregator, local-only.** Configure `.qlty/qlty.toml` to ignore `.next/**`, `node_modules/**`, `coverage/**`, `out/**`, and any future Playwright report dir. No Qlty Cloud / coverage upload in this plan. Rationale: keep the change reviewable and credential-free (origin Out-of-scope + STOP conditions).
- **Vitest for unit/API, Playwright reserved for smoke.** `playwright` is already a devDependency; Vitest is the lightest fit for this TS/React/Next app. `npm test` (= `vitest run`) must NOT depend on installed browsers — Playwright smoke is gated behind a separate `test:e2e` script. Rationale: keep the default test gate deterministic in CI/agents.
- **Extract pure helpers only when needed for testing, no behavior change.** If `src/services.ts` logic must be tested, lift pure helpers without altering behavior — do not refactor app code otherwise (origin Out-of-scope).
- **Lint-violation guardrail.** If the new lint surfaces more than ~30 source violations, STOP and report counts/categories rather than performing a broad style rewrite (origin STOP condition). Config-only fixes are in scope this plan.

---

## Implementation Units

### U1. Add Ultracite as the lint/format baseline

- **Goal:** Replace the broken `next lint` with a working Biome-based check; expose `lint` and `format` scripts.
- **Requirements:** R1, R2.
- **Dependencies:** none.
- **Files:** `package.json` (scripts/deps), `package-lock.json`, `biome.json` (Ultracite-generated), `.vscode/settings.json` and agent config files if Ultracite generates them.
- **Approach:** Run `npx ultracite init --quiet --linter biome --pm npm --frameworks next react --agents universal codex`. Inspect the generated diff. Set `lint` to the non-mutating Biome check and `format` to write-mode; keep `typecheck`, `build`, `coverage:audit`, `coverage:live-audit` intact. If Ultracite emits a different script name, wire `npm run lint` to it.
- **Execution note:** Verify the generated diff is config/deps only — if Ultracite tries to rewrite large parts of the source tree, STOP (origin STOP condition).
- **Patterns to follow:** Existing `package.json` script style (`scripts` block, npm not pnpm/bun); conventional commit history (`feat:`/`chore:`).
- **Test scenarios:**
  - Happy path: `npm run lint` exits 0 (or emits a bounded, actionable violation set ≤ ~30).
  - Edge: `npm run format` runs in write mode without erroring on a clean tree.
  - Failure guardrail: if lint reports > ~30 source violations, the unit STOPs and reports counts by category rather than mass-rewriting.
  - `Test expectation: none for the scripts themselves` — these are config; behavior is verified via the commands above, not unit tests.
- **Verification:** `npm run lint` exits 0; `package.json` no longer contains `next lint`; generated config committed.

### U2. Add Qlty local configuration

- **Goal:** Add a documented, credential-free Qlty config that ignores generated/vendor dirs.
- **Requirements:** R3.
- **Dependencies:** U1 (so Qlty aggregates over a settled lint setup).
- **Files:** `.qlty/qlty.toml`, possibly `.gitignore` (only if a Qlty cache/report dir must be ignored).
- **Approach:** `qlty` is already on PATH; confirm with `command -v qlty` (skip the `curl https://qlty.sh | sh` install). Run `qlty init`, then edit `.qlty/qlty.toml` to exclude `.next/**`, `node_modules/**`, `coverage/**`, `out/**`, and any Playwright report dir. Enable only checks that pass reliably without cloud auth. Do not configure coverage upload.
- **Execution note:** If `qlty check` demands cloud auth or a paid account for local use, STOP and report (origin STOP condition).
- **Patterns to follow:** Mirror the ignore conventions already in `.gitignore`/`.dockerignore`.
- **Test scenarios:**
  - Happy path: `qlty check --all` exits 0, OR produces a small baseline finding set that is recorded in `plans/README.md` as follow-up (not silently suppressed).
  - Edge: `qlty check --all` does not traverse `node_modules/**` or `.next/**` (ignore globs effective).
  - `Test expectation: none` — config file; verified via the `qlty check --all` command.
- **Verification:** `.qlty/qlty.toml` exists; `qlty check --all` result documented.

### U3. Add a Vitest test harness with seed tests

- **Goal:** Stand up `npm test` (Vitest) with initial unit + chat-API-scaffold tests that exit 0 deterministically.
- **Requirements:** R4.
- **Dependencies:** U1 (lint must accept new test files).
- **Files:** `vitest.config.ts`, `package.json` (test scripts + dev deps: `vitest`, `jsdom`, and RTL packages only if component tests are added), `tests/services.test.ts` (or colocated), `tests/api/chat.route.test.ts` (scaffold).
- **Approach:** Add scripts `test: "vitest run"`, `test:watch: "vitest"`, `test:e2e: "playwright test"`. Create (1) a pure-logic test around route scoring or provider/capability derivation in `src/services.ts` — extracting pure helpers without behavior change if needed; (2) a chat-route API-boundary test file that imports the module safely and documents how OpenRouter/Turso will be mocked, ready for plan 002 to extend.
- **Execution note:** If standing up tests requires major application refactors, STOP and report (origin STOP condition).
- **Patterns to follow:** `scripts/audit-coverage.ts` as the example of machine-checkable assertions; strict TS settings (`noUncheckedIndexedAccess`).
- **Test scenarios:**
  - Happy path (services): given representative route/provider input, the pure scoring/derivation helper returns the expected ordering/value.
  - Edge (services): empty input list and a single-item list both return well-formed results (no throw, no `undefined` index access).
  - Scaffold (chat route): the chat route module imports without executing network calls; the test documents the OpenRouter/Turso mock seam and asserts the exported `POST` handler is a function.
  - `npm test` exits 0 with no reliance on installed Playwright browsers.
- **Verification:** `npm test` exits 0; chat-API scaffold present and importable.

### U4. Re-run the full baseline and update plan status

- **Goal:** Prove all gates pass together and record the result.
- **Requirements:** R5, R6, R7.
- **Dependencies:** U1, U2, U3.
- **Files:** `plans/README.md` (status row for plan 001).
- **Approach:** Run `npm run typecheck`, `npm run build`, `npm run coverage:audit`, `npm run lint`, `npm test`, `qlty check --all`. Confirm none print secret values from `.env.local`. Update plan 001's status row in `plans/README.md` to DONE (or BLOCKED with a one-line reason if a STOP condition fired). If `npm audit` still reports the moderate Next/PostCSS advisory, do not fix it here — note it as dependency follow-up.
- **Patterns to follow:** Status vocabulary in `plans/README.md` (TODO | IN PROGRESS | DONE | BLOCKED | REJECTED).
- **Test scenarios:**
  - Happy path: all six commands exit 0; `coverage:audit` JSON contains `"ok": true`.
  - Failure path: if any command fails, the status row records BLOCKED with the failing command and a one-line reason rather than marking DONE.
  - `Test expectation: none` — this unit is verification + bookkeeping, not behavior.
- **Verification:** All gates green; `plans/README.md` status row updated; no secrets committed.

---

## Scope Boundaries

**In scope:** `package.json`, `package-lock.json`, Ultracite-generated config (`biome.json`, editor/agent config), `.qlty/qlty.toml`, `vitest.config.ts`, `playwright.config.ts` (only if smoke added), `tests/**` or colocated `*.test.ts(x)`, `.gitignore`/`.dockerignore` (only to ignore generated test/coverage artifacts).

**Out of scope:**
- Refactoring app code beyond tiny pure-helper exports needed solely to test existing logic.
- Broad auto-fix/format over the whole repo (prefer check mode; keep diffs reviewable).
- Touching `.env.local` or printing secret values.
- Qlty Cloud / CI coverage publishing (local CLI config only).

**Deferred to Follow-Up Work:**
- Fixing the moderate Next/PostCSS `npm audit` advisory — only if a safe Next patch is available; otherwise separate dependency-bump work.
- A Playwright smoke test (`/?tab=presentation` → click Compare → vendor content visible) is *optional* this plan and must not make the default `npm test` depend on installed browsers.

---

## Risks & Mitigations

- **Ultracite over-reach** — init rewrites large source areas. Mitigation: inspect diff; STOP if non-config changes appear.
- **Widespread lint violations** — new linter flags many existing issues. Mitigation: config-only fixes this plan; STOP and report if > ~30 source violations.
- **Qlty cloud gating** — local `qlty check` demands auth. Mitigation: STOP and report; CLI is already installed so install-time failure is unlikely.
- **Flaky/browser-coupled tests** — Playwright dependency leaks into `npm test`. Mitigation: gate e2e behind `test:e2e`; keep `npm test` = `vitest run` only.

---

## Verification

The plan is complete when, on a clean checkout of the branch:

1. `npm run lint` exits 0 (no `next lint`).
2. `npm test` exits 0 (no installed-browser dependency).
3. `npm run typecheck`, `npm run build`, `npm run coverage:audit` exit 0.
4. `.qlty/qlty.toml` exists and `qlty check --all` result is documented.
5. No secret files/values are committed.
6. `plans/README.md` plan-001 status row is updated.

---

## Sources & Research

- Origin: `plans/001-add-ultracite-qlty-and-test-baseline.md` (full step-by-step source, STOP conditions, command table).
- Ultracite init flags and Qlty quickstart: captured in the origin "External docs checked during planning" section.
- Live state verified 2026-06-19 on branch `codex/eu-llm-slfg-plans`: lint still broken, no test/qlty/biome config present, `qlty` already on PATH.
