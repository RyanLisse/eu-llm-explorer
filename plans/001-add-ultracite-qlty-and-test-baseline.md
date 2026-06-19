# Plan 001: Add Ultracite, Qlty, and a working verification baseline

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6ebb30b..HEAD -- package.json package-lock.json next.config.ts tsconfig.json app src scripts db .gitignore .dockerignore .qlty biome.json vitest.config.ts playwright.config.ts tests`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: dx | tests
- **Planned at**: commit `6ebb30b`, 2026-06-12

## Why this matters

The repo currently has strong TypeScript and build checks, but the advertised lint command is broken and there is no automated test suite. That is backwards for a project with an agentic chat route, model-generated SQL, URL-driven tabs, and compliance-heavy UI claims. This plan adds the two tools Ryan requested — Ultracite and Qlty — and establishes a minimal test harness so later security and architecture changes have a safety net.

## Current state

Relevant files:

- `package.json` — npm scripts and dependencies.
- `app/api/chat/route.ts` — security-sensitive chat route that needs tests in later plans.
- `src/services.ts` — Effect data-loading/scoring pipeline.
- `scripts/audit-coverage.ts` — existing data invariant audit; use it as an example of machine-checkable assertions.

Current excerpts:

```jsonc
// package.json:7-16
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "lint": "next lint",
  "db:seed": "tsx scripts/seed-turso.ts",
  "db:schema": "turso db shell eu-llm-explorer < db/schema.sql",
  "coverage:audit": "tsx scripts/audit-coverage.ts",
  "coverage:live-audit": "tsx scripts/audit-live-sources.ts"
}
```

```ts
// app/api/chat/route.ts:33-40
export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    currentFilters?: typeof INITIAL_FILTERS;
  };
  const { messages } = body;
  const currentFilters = body.currentFilters ?? INITIAL_FILTERS;
```

Observed verification from the audit:

- `npm run typecheck` exits 0.
- `npm run build` exits 0.
- `npm run coverage:audit` exits 0.
- `npm run lint` fails with `Invalid project directory provided, no such directory: .../lint`.
- No `*.test.*`, `*.spec.*`, `vitest.config.*`, or `playwright.config.*` files were present.

External docs checked during planning:

- Ultracite setup: `npx ultracite init`; supports `--quiet`, `--pm npm`, `--linter biome`, `--frameworks next react`, `--agents universal codex`; quiet mode defaults to Biome and exits 0/1.
- Qlty quickstart: install CLI with `curl https://qlty.sh | sh`; initialize repo with `qlty init`; generated config lives at `.qlty/qlty.toml`; run `qlty check` or `qlty check --all`.

Repo conventions to preserve:

- TypeScript is strict (`tsconfig.json` has `strict`, `noUncheckedIndexedAccess`, and `noEmit`).
- The app uses npm (`package-lock.json` exists), not pnpm/bun/yarn.
- Commit style in history is conventional-ish, e.g. `feat: add interactive agent deck and research book`.
- Do not print or commit `.env.local`; `.gitignore` already ignores `.env*` except `.env.example`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `npm install` | exit 0; `package-lock.json` updated if deps changed |
| Ultracite init | `npx ultracite init --quiet --linter biome --pm npm --frameworks next react --agents universal codex` | exit 0; creates/updates linter config and package scripts/deps |
| Qlty install | `command -v qlty || curl https://qlty.sh | sh` | `qlty` available on PATH; if installer asks for shell reload, follow printed instruction |
| Qlty init | `qlty init` | exit 0; `.qlty/qlty.toml` exists |
| Typecheck | `npm run typecheck` | exit 0, no TS errors |
| Build | `npm run build` | exit 0, Next build succeeds |
| Coverage audit | `npm run coverage:audit` | JSON contains `"ok": true` |
| Lint | `npm run lint` | exit 0 after this plan |
| Tests | `npm test` | exit 0 after this plan |
| Qlty | `qlty check --all` | exit 0 or only documented baseline findings captured in `.qlty/qlty.toml` |

> If the odd character in the Qlty install row is rendered incorrectly, use the documented command exactly: `curl https://qlty.sh | sh`.

## Scope

**In scope**:

- `package.json`
- `package-lock.json`
- Ultracite-generated config files such as `biome.json`, `.vscode/settings.json`, or agent config files if generated
- `.qlty/qlty.toml`
- `vitest.config.ts` or equivalent test config
- `playwright.config.ts` if you add browser smoke tests
- `tests/**` or colocated `*.test.ts(x)` files
- `.gitignore` / `.dockerignore` only if required to ignore generated test/coverage artifacts

**Out of scope**:

- Do not refactor app code except tiny exports needed solely to test existing pure logic.
- Do not run broad auto-fix/format over the whole repo unless the resulting diff is limited and reviewable. Prefer check mode first.
- Do not touch `.env.local` or print secret values.
- Do not add CI publishing to Qlty Cloud in this plan. Local CLI config only.

## Git workflow

- Branch: `advisor/001-verification-baseline`
- Commit message suggestion: `chore: add ultracite qlty and test baseline`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add Ultracite as the lint/format baseline

Run:

```bash
npx ultracite init --quiet --linter biome --pm npm --frameworks next react --agents universal codex
```

Then inspect the generated diff. Update `package.json` scripts so the repo has clear commands:

- `lint`: should run the Ultracite/Biome check in non-mutating mode.
- `format`: may run formatter write mode.
- Keep `typecheck`, `build`, `coverage:audit`, and `coverage:live-audit` intact.

If Ultracite generated a different recommended script name, use its generated command but make `npm run lint` work.

**Verify**: `npm run lint` → exits 0 or produces actionable violations. If it produces violations, fix only configuration problems in this step; do not mass-refactor source. If source violations are widespread, STOP and report the count/categories.

### Step 2: Add Qlty local configuration

Install the CLI if missing:

```bash
command -v qlty || curl https://qlty.sh | sh
```

If the installer adds Qlty to a shell profile and the current shell cannot see it, follow the installer’s printed PATH instruction, then run:

```bash
qlty init
```

Review `.qlty/qlty.toml`. Configure Qlty to avoid generated/vendor directories:

- `.next/**`
- `node_modules/**`
- `coverage/**`
- `out/**`
- any Playwright report directory if added later

Enable only checks that can pass reliably in local/dev without cloud credentials. Do not configure coverage upload yet.

**Verify**: `qlty check --all` → exits 0, or produces a small baseline set of findings that you document in `plans/README.md` as follow-up. Do not suppress real issues silently.

### Step 3: Add a test harness

Add a test runner suitable for this TypeScript/React/Next app. Recommended: Vitest for unit/API boundary tests, with Playwright reserved for smoke tests because `playwright` is already in `devDependencies`.

Add scripts:

```jsonc
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

If you add Vitest, install the minimal dev dependencies needed, commonly `vitest`, `jsdom`, and React Testing Library packages if component tests are included.

Create at least these initial tests:

1. A pure data/service test around route scoring or provider/capability derivation. If necessary, extract pure helpers from `src/services.ts` without changing behavior.
2. An API-boundary test file for the chat route that can later host Plan 002 tests. At minimum it should import the module safely and document how OpenRouter/Turso will be mocked.
3. One Playwright smoke test for the happy path: load `/?tab=presentation`, click `Compare`, confirm vendor comparison content is visible. This verifies the content-tab optimization does not strand users with empty data.

**Verify**: `npm test` → exits 0. If Playwright is configured, `npm run test:e2e` → exits 0 locally or documents browser-install prerequisites without failing the default `npm test`.

### Step 4: Re-run the full baseline

Run:

```bash
npm run typecheck
npm run build
npm run coverage:audit
npm run lint
npm test
qlty check --all
```

**Verify**: all required commands exit 0. If `npm audit` still reports the moderate Next/PostCSS advisory, do not solve it here unless a safe Next patch exists; that is dependency follow-up, not this baseline plan.

## Test plan

- Add Vitest tests for at least one pure route/data behavior.
- Add a placeholder or real chat API test scaffold so Plan 002 can add request validation/SQL tests cleanly.
- Add one Playwright smoke test if feasible without making `npm test` depend on installed browsers.

## Done criteria

- [ ] `npm run lint` exits 0 and no longer calls broken `next lint`.
- [ ] Ultracite config/dependencies are present and documented by script names.
- [ ] `.qlty/qlty.toml` exists and `qlty check --all` has a documented result.
- [ ] `npm test` exists and exits 0.
- [ ] `npm run typecheck`, `npm run build`, and `npm run coverage:audit` still exit 0.
- [ ] No secret files or secret values are committed.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- Ultracite init wants to rewrite large parts of the source tree instead of just config/dependencies.
- Qlty requires cloud auth or a paid account for local `qlty check`.
- Lint reveals more than roughly 30 source violations; do not perform a broad style rewrite inside this plan.
- Adding tests requires major application refactors.
- Any command prints secret values from `.env.local`.

## Maintenance notes

Future plans depend on this one for stable checks. Reviewers should scrutinize generated config and make sure the lint/test commands are boring, deterministic, and usable by agents. If Qlty or Ultracite overlaps with other linters, prefer one clear `npm run lint` path and let Qlty aggregate rather than duplicate contradictory rules.
