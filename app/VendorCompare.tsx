"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Brain, Check, Eye, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Weight, Wrench, X } from "lucide-react";
import {
  AZURE_COMPARE_VENDOR_KEY,
  DEFAULT_COMPARE_VENDOR_KEYS,
  type CompareMatrixFilters,
} from "@/agent/constants";
import { compareStateAtom } from "@/atoms";
import type {
  Capability,
  CoverageRegionView,
  Mode,
  Openness,
  ProviderCoverageSummaryView,
  ProviderCoverageView,
  RouteView,
  Tier,
} from "@/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Model-first comparison view: Azure remains the current-platform baseline, but
 * the main workflow compares normalized model families across 2-4 selected EU
 * vendors so users no longer have to scroll through one vendor's full catalog.
 */

const TIER_COLOR: Record<Tier, string> = {
  A: "var(--tier-a)",
  B: "var(--tier-b)",
  C: "var(--tier-c)",
};

const AZURE_KEY = AZURE_COMPARE_VENDOR_KEY;

/** Maps a summary platform to the provider tag used on benchmark routes. */
const PLATFORM_TO_ROUTE_TAG: Record<string, string> = {
  "Mistral La Plateforme": "Mistral",
  "Scaleway Generative APIs": "Scaleway",
  "OVHcloud AI Endpoints": "OVHcloud",
  "STACKIT AI Model Serving": "STACKIT",
  "IONOS AI Model Hub": "IONOS",
  "Nebius Token Factory": "Nebius",
  "Google Vertex AI EU": "Google Vertex",
  "AWS Bedrock EU": "AWS Bedrock",
  [AZURE_KEY]: "Azure",
};

/** Summary platform -> platform string(s) used on coverage rows. */
const PLATFORM_TO_COVERAGE: Record<string, ReadonlyArray<string>> = {
  "AWS Bedrock EU": ["AWS Bedrock"],
  [AZURE_KEY]: ["Azure AI Foundry EU Data Zone", "Azure AI Foundry EU Regional"],
};

const money = (v: number): string => `$${v.toFixed(v < 1 ? 2 : 1)}`;
const isUrl = (value: string): boolean => value.startsWith("https://") || value.startsWith("http://");

const normModel = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\s*\((reference|groq)\)\s*/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9. ]+/g, "")
    .replace(/\b(instruct|it|chat|preview)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const uniq = <T,>(items: ReadonlyArray<T>): ReadonlyArray<T> => Array.from(new Set(items));

const uniqueRegions = (items: ReadonlyArray<CoverageRegionView>): ReadonlyArray<CoverageRegionView> => {
  const byCode = new Map<string, CoverageRegionView>();
  for (const item of items) byCode.set(item.code, item);
  return Array.from(byCode.values());
};

interface VendorVM {
  readonly key: string;
  readonly label: string;
  readonly company: string;
  readonly tier: Tier;
  readonly fit: "sovereign" | "eu-residency" | "rejected";
  readonly coverageRows: ReadonlyArray<ProviderCoverageView>;
  readonly benchmarks: ReadonlyArray<RouteView>;
  readonly evidenceNote: string;
  readonly source: string;
  readonly isCurrent: boolean;
}

interface ModelCell {
  readonly vendor: VendorVM;
  readonly modelLabel: string;
  readonly publisher: string;
  readonly regions: ReadonlyArray<CoverageRegionView>;
  readonly coverage: ProviderCoverageView | null;
  readonly bench: RouteView | null;
  readonly tier: Tier;
  readonly requirementFit: "sovereign" | "eu-residency" | "rejected";
}

interface ComparisonRow {
  readonly key: string;
  readonly family: string;
  readonly models: ReadonlyArray<string>;
  readonly publishers: ReadonlyArray<string>;
  readonly cells: Record<string, ModelCell>;
  readonly bestCell: ModelCell | null;
  readonly availabilityCount: number;
  readonly hasAzure: boolean;
  readonly hasSovereign: boolean;
  readonly modes: ReadonlyArray<Mode>;
  readonly capabilities: ReadonlyArray<Capability>;
  readonly openness: ReadonlyArray<Openness>;
}

interface MutableComparisonRow {
  readonly key: string;
  readonly models: Set<string>;
  readonly publishers: Set<string>;
  readonly cells: Record<string, ModelCell>;
}

const buildVendors = (
  summaries: ReadonlyArray<ProviderCoverageSummaryView>,
  coverage: ReadonlyArray<ProviderCoverageView>,
  routes: ReadonlyArray<RouteView>,
): ReadonlyArray<VendorVM> => {
  const vms: Array<VendorVM> = [];

  const make = (
    key: string,
    label: string,
    company: string,
    tier: Tier,
    fit: "sovereign" | "eu-residency" | "rejected",
    evidenceNote: string,
    source: string,
  ): VendorVM => {
    const coveragePlatforms = PLATFORM_TO_COVERAGE[key] ?? [key];
    const tag = PLATFORM_TO_ROUTE_TAG[key];
    return {
      key,
      label,
      company,
      tier,
      fit,
      coverageRows: coverage.filter((row) => coveragePlatforms.includes(row.platform)),
      benchmarks: tag ? routes.filter((r) => r.tier !== "C" && r.providers.includes(tag)) : [],
      evidenceNote,
      source,
      isCurrent: key === AZURE_KEY,
    };
  };

  const azure = summaries.find((s) => s.provider === "Microsoft Azure");
  if (azure) {
    vms.push(
      make(
        AZURE_KEY,
        "Azure AI Foundry",
        "Microsoft Azure",
        azure.tier,
        azure.requirementFit,
        "Only EU Data Zone or EU regional deployments qualify. Quota is not guaranteed capacity, and the newest models lag EU rollout.",
        azure.source,
      ),
    );
  }

  for (const s of summaries) {
    if (s.provider === "Microsoft Azure") continue;
    vms.push(
      make(
        s.platform,
        s.platform.replace(/ (EU|Generative APIs|AI Endpoints|AI Model Serving|AI Model Hub|Token Factory)$/, ""),
        s.provider,
        s.tier,
        s.requirementFit,
        s.evidenceNote,
        s.source,
      ),
    );
  }

  const tierOrder: Record<Tier, number> = { A: 0, B: 1, C: 2 };
  return vms.toSorted((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return (
      tierOrder[a.tier] - tierOrder[b.tier] ||
      b.coverageRows.length + b.benchmarks.length - (a.coverageRows.length + a.benchmarks.length)
    );
  });
};

const betterBench = (a: RouteView | null, b: RouteView | null): RouteView | null => {
  if (!a) return b;
  if (!b) return a;
  const score =
    b.reliabilityScore - a.reliabilityScore ||
    a.blended - b.blended ||
    b.throughput - a.throughput;
  return score > 0 ? b : a;
};

const mergeCell = (
  vendor: VendorVM,
  existing: ModelCell | undefined,
  coverage: ProviderCoverageView | null,
  bench: RouteView | null,
): ModelCell => {
  const bestBench = betterBench(existing?.bench ?? null, bench);
  const regions = uniqueRegions([...(existing?.regions ?? []), ...(coverage?.regions ?? [])]);
  return {
    vendor,
    modelLabel: bestBench?.name.replace(" (reference)", "") ?? coverage?.model ?? existing?.modelLabel ?? "Unknown model",
    publisher: coverage?.provider ?? bestBench?.maker ?? existing?.publisher ?? vendor.company,
    regions,
    coverage: coverage ?? existing?.coverage ?? null,
    bench: bestBench,
    tier: bestBench?.tier ?? coverage?.tier ?? existing?.tier ?? vendor.tier,
    requirementFit: coverage?.requirementFit ?? existing?.requirementFit ?? vendor.fit,
  };
};

const chooseBestCell = (cells: ReadonlyArray<ModelCell>): ModelCell | null => {
  const tierOrder: Record<Tier, number> = { A: 0, B: 1, C: 2 };
  return cells.toSorted((a, b) => {
    const aReliability = a.bench?.reliabilityScore ?? -1;
    const bReliability = b.bench?.reliabilityScore ?? -1;
    const aCost = a.bench?.blended ?? Number.POSITIVE_INFINITY;
    const bCost = b.bench?.blended ?? Number.POSITIVE_INFINITY;
    return (
      tierOrder[a.tier] - tierOrder[b.tier] ||
      bReliability - aReliability ||
      aCost - bCost ||
      a.vendor.label.localeCompare(b.vendor.label)
    );
  })[0] ?? null;
};

const buildComparisonRows = (vendors: ReadonlyArray<VendorVM>): ReadonlyArray<ComparisonRow> => {
  const rows = new Map<string, MutableComparisonRow>();
  const ensure = (key: string): MutableComparisonRow => {
    const existing = rows.get(key);
    if (existing) return existing;
    const row: MutableComparisonRow = { key, models: new Set(), publishers: new Set(), cells: {} };
    rows.set(key, row);
    return row;
  };

  for (const vendor of vendors) {
    for (const coverage of vendor.coverageRows) {
      const key = normModel(coverage.model);
      if (!key) continue;
      const row = ensure(key);
      row.models.add(coverage.model);
      row.publishers.add(coverage.provider);
      row.cells[vendor.key] = mergeCell(vendor, row.cells[vendor.key], coverage, null);
    }

    for (const bench of vendor.benchmarks) {
      const key = normModel(bench.name);
      if (!key) continue;
      const row = ensure(key);
      row.models.add(bench.name.replace(" (reference)", ""));
      row.publishers.add(bench.maker);
      row.cells[vendor.key] = mergeCell(vendor, row.cells[vendor.key], null, bench);
    }
  }

  return Array.from(rows.values()).map((row) => {
    const cells = Object.values(row.cells);
    const benches = cells.flatMap((cell) => cell.bench ? [cell.bench] : []);
    const models = Array.from(row.models).toSorted((a, b) => a.length - b.length || a.localeCompare(b));
    const family = models[0] ?? row.key;
    return {
      key: row.key,
      family,
      models,
      publishers: Array.from(row.publishers).toSorted(),
      cells: row.cells,
      bestCell: chooseBestCell(cells),
      availabilityCount: cells.length,
      hasAzure: Boolean(row.cells[AZURE_KEY]),
      hasSovereign: cells.some((cell) => cell.tier === "A"),
      modes: uniq(benches.map((bench) => bench.mode)),
      capabilities: uniq(benches.flatMap((bench) => bench.capabilities)),
      openness: uniq(benches.map((bench) => bench.openness)),
    } satisfies ComparisonRow;
  }).toSorted((a, b) => {
    const aTier = a.bestCell?.tier ?? "C";
    const bTier = b.bestCell?.tier ?? "C";
    const tierOrder: Record<Tier, number> = { A: 0, B: 1, C: 2 };
    return (
      tierOrder[aTier] - tierOrder[bTier] ||
      b.availabilityCount - a.availabilityCount ||
      a.family.localeCompare(b.family)
    );
  });
};

const rowMatchesFilters = (row: ComparisonRow, search: string, filters: CompareMatrixFilters): boolean => {
  const q = search.trim().toLowerCase();
  if (q) {
    const haystack = [
      row.family,
      ...row.models,
      ...row.publishers,
      ...Object.values(row.cells).map((cell) => cell.vendor.label),
    ].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.reasoning && !row.modes.some((mode) => mode === "reasoning" || mode === "configurable")) return false;
  if (filters.openOnly && !row.openness.some((openness) => openness !== "proprietary")) return false;
  if (filters.vision && !row.capabilities.includes("vision")) return false;
  if (filters.tools && !row.capabilities.includes("tools")) return false;
  if (filters.sovereignOnly && !row.hasSovereign) return false;
  if (filters.hideAzureOnly && row.hasAzure && row.availabilityCount === 1) return false;
  return true;
};

export function VendorCompare({
  routes,
  summaries,
  coverage,
  vendor,
  setVendor,
}: {
  readonly routes: ReadonlyArray<RouteView>;
  readonly summaries: ReadonlyArray<ProviderCoverageSummaryView>;
  readonly coverage: ReadonlyArray<ProviderCoverageView>;
  readonly vendor: string;
  readonly setVendor: (val: string) => void;
}) {
  const compareState = useAtomValue(compareStateAtom);
  const setCompareState = useAtomSet(compareStateAtom);
  const vendors = useMemo(() => buildVendors(summaries, coverage, routes), [summaries, coverage, routes]);
  const modelSearch = compareState.modelSearch;
  const matrixFilters = compareState.matrixFilters;
  const comparisonRows = useMemo(() => buildComparisonRows(vendors), [vendors]);
  const hiddenAzureOnlyCount = useMemo(
    () => comparisonRows.filter((row) => row.hasAzure && row.availabilityCount === 1).length,
    [comparisonRows],
  );
  const filteredRows = useMemo(
    () => comparisonRows.filter((row) => rowMatchesFilters(row, modelSearch, matrixFilters)),
    [comparisonRows, modelSearch, matrixFilters],
  );
  const selectedModel =
    filteredRows.find((row) => row.key === compareState.selectedModelKey) ??
    comparisonRows.find((row) => row.key === compareState.selectedModelKey) ??
    filteredRows[0] ??
    comparisonRows[0] ??
    null;
  const providerOptions = useMemo(() => {
    if (!selectedModel) return [];
    const tierOrder: Record<Tier, number> = { A: 0, B: 1, C: 2 };
    return Object.values(selectedModel.cells).toSorted((a, b) => {
      const aBench = a.bench;
      const bBench = b.bench;
      return (
        tierOrder[a.tier] - tierOrder[b.tier] ||
        Number(Boolean(bBench)) - Number(Boolean(aBench)) ||
        (bBench?.reliabilityScore ?? -1) - (aBench?.reliabilityScore ?? -1) ||
        (aBench?.blended ?? Number.POSITIVE_INFINITY) - (bBench?.blended ?? Number.POSITIVE_INFINITY) ||
        (aBench?.ttft ?? Number.POSITIVE_INFINITY) - (bBench?.ttft ?? Number.POSITIVE_INFINITY) ||
        a.vendor.label.localeCompare(b.vendor.label)
      );
    });
  }, [selectedModel]);
  const selected = providerOptions[0]?.vendor ?? vendors.find((v) => v.key === vendor) ?? vendors[0] ?? null;

  useEffect(() => {
    setCompareState((current) => {
      const validVendorKeys = current.selectedVendorKeys.filter((key) => vendors.some((v) => v.key === key));
      const nextKeys = validVendorKeys.length > 0 ? validVendorKeys : DEFAULT_COMPARE_VENDOR_KEYS.filter((key) => vendors.some((v) => v.key === key));
      const nextPrimary = current.primaryVendor || vendor;
      const nextModelKey =
        current.selectedModelKey && comparisonRows.some((row) => row.key === current.selectedModelKey)
          ? current.selectedModelKey
          : filteredRows[0]?.key ?? comparisonRows[0]?.key ?? null;
      if (
        nextPrimary === current.primaryVendor &&
        nextModelKey === current.selectedModelKey &&
        nextKeys.length === current.selectedVendorKeys.length &&
        nextKeys.every((key, index) => key === current.selectedVendorKeys[index])
      ) {
        return current;
      }
      return {
        ...current,
        primaryVendor: nextPrimary,
        selectedVendorKeys: nextKeys,
        selectedModelKey: nextModelKey,
      };
    });
  }, [comparisonRows, filteredRows, setCompareState, vendor, vendors]);

  if (!selected) return null;

  const sovereign = selected.tier === "A";

  const updateFilter = (key: keyof CompareMatrixFilters) => {
    setCompareState((current) => ({
      ...current,
      matrixFilters: { ...current.matrixFilters, [key]: !current.matrixFilters[key] },
    }));
  };

  const selectModel = (row: ComparisonRow) => {
    setCompareState((current) => ({ ...current, selectedModelKey: row.key }));
    const nextVendor = row.bestCell?.vendor.key;
    if (nextVendor && nextVendor !== vendor) setVendor(nextVendor);
  };

  const heading = selectedModel
    ? `Select ${selectedModel.family} by provider, price and latency`
    : "Select a model first, then choose the provider route";

  return (
    <section className="compare-shell">
      <div className="hero-bar">
        <div>
          <div className="eyebrow">Model-first routing decision</div>
          <h2>{heading}</h2>
          <p className="insight-summary">
            {filteredRows.length} model families match · {providerOptions.length} real provider option{providerOptions.length === 1 ? "" : "s"} for the selected model
            {matrixFilters.hideAzureOnly ? ` · ${hiddenAzureOnlyCount} Azure-only rows hidden` : ""}
          </p>
        </div>
      </div>

      <Card className="table-card matrix-card">
        <CardHeader className="section-title-row matrix-title-row">
          <div>
            <div className="eyebrow">Choose model</div>
            <CardTitle>
              Find the model family first; compare only providers that actually offer it
            </CardTitle>
            {matrixFilters.hideAzureOnly && hiddenAzureOnlyCount > 0 && (
              <div className="matrix-hidden-note">{hiddenAzureOnlyCount} Azure-only rows hidden to keep alternatives visible.</div>
            )}
          </div>
          <div className="search-row compare-model-search">
            <Search className="search-icon" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search model or maker..."
              value={modelSearch}
              onChange={(e) => setCompareState((current) => ({ ...current, modelSearch: e.target.value }))}
            />
            {modelSearch && (
              <Button size="icon" variant="ghost" aria-label="Clear search" onClick={() => setCompareState((current) => ({ ...current, modelSearch: "" }))}>
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="matrix-filter-row" aria-label="Model filters">
            <FilterToggle active={matrixFilters.reasoning} onClick={() => updateFilter("reasoning")} icon={<Brain size={14} aria-hidden="true" />} label="Reasoning" />
            <FilterToggle active={matrixFilters.openOnly} onClick={() => updateFilter("openOnly")} icon={<Weight size={14} aria-hidden="true" />} label="Open" />
            <FilterToggle active={matrixFilters.vision} onClick={() => updateFilter("vision")} icon={<Eye size={14} aria-hidden="true" />} label="Vision" />
            <FilterToggle active={matrixFilters.tools} onClick={() => updateFilter("tools")} icon={<Wrench size={14} aria-hidden="true" />} label="Tools" />
            <FilterToggle active={matrixFilters.sovereignOnly} onClick={() => updateFilter("sovereignOnly")} icon={<ShieldCheck size={14} aria-hidden="true" />} label="Tier A" />
            <FilterToggle active={matrixFilters.hideAzureOnly} onClick={() => updateFilter("hideAzureOnly")} icon={<SlidersHorizontal size={14} aria-hidden="true" />} label="Hide Azure-only" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="vendor-picker compact" role="list" aria-label="Choose model family">
            {filteredRows.slice(0, 18).map((row) => (
              <button
                key={row.key}
                type="button"
                aria-pressed={selectedModel?.key === row.key}
                className={`vendor-pick-card${selectedModel?.key === row.key ? " selected" : ""}`}
                onClick={() => selectModel(row)}
              >
                <div className="vendor-pick-head">
                  <strong>{row.family}</strong>
                  {selectedModel?.key === row.key && <Check size={14} aria-hidden="true" />}
                </div>
                <div className="vendor-pick-meta">
                  <span className="dot" style={{ background: TIER_COLOR[row.bestCell?.tier ?? "C"] }} />
                  {row.availabilityCount} provider{row.availabilityCount === 1 ? "" : "s"} · best Tier {row.bestCell?.tier ?? "C"}
                </div>
                <div className="vendor-pick-count">
                  {row.bestCell?.bench
                    ? `${money(row.bestCell.bench.blended)}/1M · ${row.bestCell.bench.ttft.toFixed(2)}s TTFT · ${row.bestCell.bench.throughput} t/s`
                    : "Catalog availability only"}
                </div>
              </button>
            ))}
          </div>

          {selectedModel ? (
            <div className="vendor-summary-strip" aria-label="Selected model summary">
              <div className="vendor-summary-item">
                <span className="dot" style={{ background: TIER_COLOR[selectedModel.bestCell?.tier ?? "C"] }} />
                <strong>{selectedModel.family}</strong>
                <small>{selectedModel.models.join(", ")}</small>
              </div>
              <div className="vendor-summary-item">
                <strong>{providerOptions.length} provider options</strong>
                <small>{selectedModel.publishers.join(", ") || "Unknown publisher"}</small>
              </div>
              <div className="vendor-summary-item">
                <strong>{selectedModel.bestCell?.vendor.label ?? "No best fit"}</strong>
                <small>{selectedModel.bestCell?.bench ? `Benchmark ${selectedModel.bestCell.bench.reliabilityScore}/100` : "No benchmark yet"}</small>
              </div>
            </div>
          ) : null}

          <div className="tablewrap compare-tablewrap matrix-tablewrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Latency / speed</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Fit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providerOptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="empty-state">No provider options match this model and filter set.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  providerOptions.map((cell) => (
                    <TableRow key={cell.vendor.key}>
                      <TableCell>
                        <div className="table-model">{cell.vendor.label}</div>
                        <div className="note">{cell.vendor.company}</div>
                      </TableCell>
                      <TableCell>
                        <div className="matrix-cell-model">{cell.modelLabel}</div>
                        <RegionCell regions={cell.regions} />
                      </TableCell>
                      <TableCell>
                        {cell.bench ? <strong>{money(cell.bench.blended)}/1M</strong> : <span className="note">No price benchmark</span>}
                      </TableCell>
                      <TableCell>
                        {cell.bench ? (
                          <div className="matrix-cell-metrics">
                            <span>{cell.bench.ttft.toFixed(2)}s TTFT</span>
                            <span>{cell.bench.throughput} t/s</span>
                          </div>
                        ) : (
                          <span className="note">No latency benchmark</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cell.bench ? (
                          <Badge variant="secondary" title={cell.bench.reliabilityNote}>
                            {cell.bench.reliabilityGrade} · {cell.bench.reliabilityScore}/100
                          </Badge>
                        ) : (
                          <span className="note">Catalog only</span>
                        )}
                      </TableCell>
                      <TableCell className="matrix-best-cell">
                        <Badge style={{ background: `color-mix(in srgb, ${TIER_COLOR[cell.tier]} 18%, var(--bg-card))`, color: "var(--ink)" }}>
                          Tier {cell.tier}
                        </Badge>
                        <strong>{cell.vendor.fit === "sovereign" ? "EU-sovereign" : cell.vendor.fit === "eu-residency" ? "EU-residency" : "Rejected"}</strong>
                        <span>{cell.bench ? "Benchmarked route" : "Availability only"}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="caption">
            Select a model first. The provider table only lists real availability for that model family; benchmarked rows
            show cost, TTFT, throughput and reliability, while catalog-only rows still need pricing and latency verification.
          </div>
        </CardContent>
      </Card>

      <div className={`verdict-panel ${sovereign ? "ok" : "warn"}`} role="note">
        {sovereign ? <ShieldCheck size={20} aria-hidden="true" /> : <ShieldAlert size={20} aria-hidden="true" />}
        <div>
          <strong>
            {sovereign
              ? `${selected.label} is the current best provider option for this model family and is fully EU-sovereign.`
              : `${selected.label} is the current best provider option for this model family, but it is EU data residency rather than full EU sovereignty.`}
          </strong>
          <div className="note">
            {selected.evidenceNote}{" "}
            {isUrl(selected.source) && (
              <a className="source-link" href={selected.source} target="_blank" rel="noreferrer">
                Source
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterToggle({
  active,
  onClick,
  icon,
  label,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly icon: ReactNode;
  readonly label: string;
}) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} className="matrix-filter-chip" onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

function RegionCell({ regions }: { readonly regions: ReadonlyArray<CoverageRegionView> }) {
  if (regions.length === 0) return <span className="region-chip compact">EU vendor-level</span>;
  const shown = regions.slice(0, 4);
  const rest = regions.length - shown.length;
  return (
    <div className="region-list" title={regions.map((r) => r.name || r.code).join(", ")}>
      {shown.map((r) => (
        <span className="region-chip compact" key={r.code}>
          {r.code}
        </span>
      ))}
      {rest > 0 && <span className="region-chip compact">+{rest}</span>}
    </div>
  );
}
