# Model-Level Vendor Compare

Date: 2026-06-19

## Problem

The Compare tab is currently vendor-first: selecting Azure or another platform shows one long model catalog. This makes Azure visually dominate the workflow and forces users to scroll before they can understand what competing vendors offer at the model level.

## Scope

Build the first iteration of a model-first comparison view inside `app/VendorCompare.tsx`:

- Keep Azure AI Foundry as the current baseline, but stop rendering it as the default long catalog.
- Add a compact vendor compare tray with multi-select chips.
- Default to Azure plus strong EU-sovereign alternatives.
- Render a model-level matrix where rows are normalized model families and columns are selected vendors.
- Add model-first filters: search, reasoning, open-weight, vision, tools, only EU-sovereign, and hide Azure-only.
- Keep the existing Azure head-to-head comparison, but move it below the matrix.
- Preserve existing app shell, tabs, data loading, theme tokens, and URL-driven vendor state.

## Non-Goals

- No data model or schema changes.
- No live vendor catalog refresh.
- No new dependencies.
- No redesign of the Advanced, Presentation, Book, or Chat surfaces.

## Files

- `app/VendorCompare.tsx`
- `app/PageShell.tsx`
- `app/globals.css`
- `docs/design.md` if a short architecture note needs updating

## Existing Patterns

- Reuse `ProviderCoverageView`, `ProviderCoverageSummaryView`, and `RouteView`.
- Keep platform-to-route mapping local to `VendorCompare.tsx`.
- Use existing Blinqx tokens and compact operational UI styles from `app/globals.css`.
- Keep URL `?vendor=` compatibility by syncing the primary selected vendor with the first non-Azure selected vendor.

## Implementation Units

### 1. Vendor Selection Model

Add a selected-vendor set in `VendorCompare`, seeded from Azure plus the current `vendor` URL param and preferred sovereign vendors when available.

Verification:
- Azure is included by default.
- The URL-selected vendor is included when present.
- Users can toggle vendors without losing the current matrix state.

### 2. Model Comparison Rows

Create normalized model rows that group coverage rows and benchmark routes across selected vendors.

Verification:
- A model with multiple vendor hosts renders once.
- Azure-only rows can be hidden.
- Benchmarked route metrics appear in the correct vendor cell.

### 3. Model-First Controls

Add controls for search, workload/capability/open filters, Tier A-only, and hide Azure-only.

Verification:
- Filters apply to the matrix rows rather than only to one vendor list.
- Empty states remain readable.

### 4. Layout And Styling

Replace the large vendor card grid as the primary control with a compact sticky tray and matrix table.

Verification:
- No nested cards are introduced.
- The matrix stays scannable on desktop and remains horizontally scrollable on small screens.
- Existing dark/light theme tokens continue to work.

### 5. Regression Checks

Run typecheck/build and a browser smoke test on the Compare tab.

Verification:
- TypeScript passes.
- The Compare tab renders without a runtime error.
- Vendor toggles and filters update the table.
