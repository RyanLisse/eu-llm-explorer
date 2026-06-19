"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Brain, Check, Eye, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Weight, Wrench, X } from "lucide-react";
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

const AZURE_KEY = "Azure AI Foundry";
const MAX_SELECTED_VENDORS = 4;
const DEFAULT_COMPARE_KEYS = [
  AZURE_KEY,
  "Mistral La Plateforme",
  "Scaleway Generative APIs",
  "OVHcloud AI Endpoints",
] as const;

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

interface VendorStats {
  readonly modelCount: number;
  readonly benchCount: number;
  readonly cheapest: RouteView | null;
  readonly fastest: RouteView | null;
  readonly bestReliability: number | null;
}

interface MatrixFilters {
  readonly reasoning: boolean;
  readonly openOnly: boolean;
  readonly vision: boolean;
  readonly tools: boolean;
  readonly sovereignOnly: boolean;
  readonly hideAzureOnly: boolean;
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

const vendorStats = (vm: VendorVM): VendorStats => {
  const cheapest = vm.benchmarks.toSorted((a, b) => a.blended - b.blended)[0] ?? null;
  const fastest = vm.benchmarks.toSorted((a, b) => b.throughput - a.throughput)[0] ?? null;
  const bestReliability =
    vm.benchmarks.length > 0 ? Math.max(...vm.benchmarks.map((r) => r.reliabilityScore)) : null;
  return {
    modelCount: vm.coverageRows.length,
    benchCount: vm.benchmarks.length,
    cheapest,
    fastest,
    bestReliability,
  };
};

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

const rowMatchesFilters = (row: ComparisonRow, search: string, filters: MatrixFilters): boolean => {
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
  const vendors = useMemo(() => buildVendors(summaries, coverage, routes), [summaries, coverage, routes]);
  const azureVM = vendors.find((v) => v.isCurrent) ?? null;
  const defaultSelectedKeys = useMemo(() => {
    const keys: Array<string> = [];
    const add = (key: string | undefined) => {
      if (!key || keys.includes(key) || !vendors.some((v) => v.key === key)) return;
      keys.push(key);
    };

    add(AZURE_KEY);
    add(vendor);
    DEFAULT_COMPARE_KEYS.forEach(add);
    for (const option of vendors) {
      if (keys.length >= MAX_SELECTED_VENDORS) break;
      if (option.tier === "A") add(option.key);
    }
    for (const option of vendors) {
      if (keys.length >= MAX_SELECTED_VENDORS) break;
      add(option.key);
    }

    return keys.slice(0, MAX_SELECTED_VENDORS);
  }, [vendors, vendor]);

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

  useEffect(() => {
    setSelectedVendorKeys((current) => {
      const valid = current.filter((key) => vendors.some((v) => v.key === key));
      if (valid.length === 0) return defaultSelectedKeys;
      const withAzure = valid.includes(AZURE_KEY) || !azureVM ? valid : [AZURE_KEY, ...valid];
      if (vendor && vendors.some((v) => v.key === vendor) && !withAzure.includes(vendor)) {
        return [...withAzure, vendor].slice(0, MAX_SELECTED_VENDORS);
      }
      return withAzure.slice(0, MAX_SELECTED_VENDORS);
    });
  }, [azureVM, defaultSelectedKeys, vendor, vendors]);

  const activeVendorKeys = selectedVendorKeys.length > 0 ? selectedVendorKeys : defaultSelectedKeys;
  const selectedVendors = useMemo(
    () => activeVendorKeys
      .map((key) => vendors.find((v) => v.key === key))
      .filter((v): v is VendorVM => Boolean(v)),
    [activeVendorKeys, vendors],
  );

  const selected = selectedVendors.find((v) => v.key === vendor) ?? selectedVendors.find((v) => !v.isCurrent) ?? selectedVendors[0] ?? null;
  const comparisonRows = useMemo(() => buildComparisonRows(selectedVendors), [selectedVendors]);
  const hiddenAzureOnlyCount = useMemo(
    () => comparisonRows.filter((row) => row.hasAzure && row.availabilityCount === 1).length,
    [comparisonRows],
  );
  const filteredRows = useMemo(
    () => comparisonRows.filter((row) => rowMatchesFilters(row, modelSearch, matrixFilters)),
    [comparisonRows, modelSearch, matrixFilters],
  );

  if (!selected) return null;

  const sovereign = selected.tier === "A";
  const selectedStats = selectedVendors.map((v) => ({ vendor: v, stats: vendorStats(v) }));

  const updateFilter = (key: keyof MatrixFilters) => {
    setMatrixFilters((current) => ({ ...current, [key]: !current[key] }));
  };

  const syncPrimaryVendor = (keys: ReadonlyArray<string>) => {
    const nextPrimary = keys.find((key) => key !== AZURE_KEY);
    if (nextPrimary && nextPrimary !== vendor) setVendor(nextPrimary);
  };

  const toggleVendor = (key: string) => {
    if (key === AZURE_KEY) return;
    const selectedNow = activeVendorKeys.includes(key);
    if (selectedNow) {
      if (activeVendorKeys.length <= 2) return;
      const next = activeVendorKeys.filter((item) => item !== key);
      setSelectedVendorKeys(next);
      if (key === vendor) syncPrimaryVendor(next);
      return;
    }
    if (activeVendorKeys.length >= MAX_SELECTED_VENDORS) return;
    const next = [...activeVendorKeys, key];
    setSelectedVendorKeys(next);
    setVendor(key);
  };

  const heading = selected.isCurrent
    ? "Compare models across EU vendors — Azure stays as baseline"
    : sovereign
      ? `Compare ${selected.label} against Azure and sovereign alternatives`
      : `Compare ${selected.label} against Azure and EU-sovereign alternatives`;

  return (
    <section className="compare-shell">
      <div className="hero-bar">
        <div>
          <div className="eyebrow">Model-level comparison · baseline: Azure AI Foundry</div>
          <h2>{heading}</h2>
          <p className="insight-summary">
            {selectedVendors.length} vendors selected · {filteredRows.length} model rows · Azure-only rows
            {matrixFilters.hideAzureOnly ? ` hidden (${hiddenAzureOnlyCount})` : " visible"}
          </p>
        </div>
      </div>

      <div className="compare-tray">
        <div className="compare-tray-head">
          <div>
            <div className="eyebrow">Vendor compare tray</div>
            <strong>Choose 2-4 vendors for the matrix</strong>
          </div>
          <Badge variant="secondary">{selectedVendors.length}/{MAX_SELECTED_VENDORS} selected</Badge>
        </div>
        <div className="vendor-picker compact" role="list" aria-label="Choose platforms to compare">
          {vendors.map((v) => {
            const isSel = activeVendorKeys.includes(v.key);
            const disabled = !isSel && activeVendorKeys.length >= MAX_SELECTED_VENDORS;
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={isSel}
                aria-disabled={disabled || v.isCurrent}
                className={`vendor-pick-card${isSel ? " selected" : ""}${v.isCurrent ? " current" : ""}${disabled ? " disabled" : ""}`}
                onClick={() => toggleVendor(v.key)}
              >
                <div className="vendor-pick-head">
                  <strong>{v.label}</strong>
                  {isSel && <Check size={14} aria-hidden="true" />}
                </div>
                <div className="vendor-pick-meta">
                  <span className="dot" style={{ background: TIER_COLOR[v.tier] }} />
                  {v.isCurrent ? "Azure baseline" : v.fit === "sovereign" ? "EU-sovereign" : "EU-residency"}
                </div>
                <div className="vendor-pick-count">
                  {v.coverageRows.length} models{v.benchmarks.length > 0 ? ` · ${v.benchmarks.length} benchmarked` : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="vendor-summary-strip" aria-label="Selected vendor summary">
        {selectedStats.map(({ vendor: v, stats: s }) => (
          <div className="vendor-summary-item" key={v.key}>
            <span className="dot" style={{ background: TIER_COLOR[v.tier] }} />
            <strong>{v.label}</strong>
            <small>
              {v.isCurrent ? "baseline" : v.fit === "sovereign" ? "sovereign" : "residency"} · {s.modelCount} models
              {s.cheapest ? ` · ${money(s.cheapest.blended)}/1M` : ""}
            </small>
          </div>
        ))}
      </div>

      <Card className="table-card matrix-card">
        <CardHeader className="section-title-row matrix-title-row">
          <div>
            <div className="eyebrow">Model-level matrix</div>
            <CardTitle>
              {filteredRows.length} comparable model{filteredRows.length === 1 ? "" : "s"} across selected vendors
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
              onChange={(e) => setModelSearch(e.target.value)}
            />
            {modelSearch && (
              <Button size="icon" variant="ghost" aria-label="Clear search" onClick={() => setModelSearch("")}>
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
          <div className="tablewrap compare-tablewrap matrix-tablewrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="matrix-model-head">Model</TableHead>
                  {selectedVendors.map((v) => (
                    <TableHead className="matrix-vendor-head" key={v.key}>
                      <span>{v.label}</span>
                      {v.isCurrent && <Badge variant="secondary">baseline</Badge>}
                    </TableHead>
                  ))}
                  <TableHead>Best fit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedVendors.length + 2}>
                      <div className="empty-state">No models match these vendor and model filters.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="matrix-model-cell">
                        <div className="table-model">{row.family}</div>
                        <div className="note">{row.publishers.join(", ") || "Unknown publisher"}</div>
                        {row.models.length > 1 && <div className="matrix-variant-note">{row.models.length} variants grouped</div>}
                      </TableCell>
                      {selectedVendors.map((v) => (
                        <TableCell className="matrix-vendor-cell" key={v.key}>
                          <VendorModelCell cell={row.cells[v.key] ?? null} />
                        </TableCell>
                      ))}
                      <TableCell className="matrix-best-cell">
                        {row.bestCell ? (
                          <>
                            <Badge style={{ background: `color-mix(in srgb, ${TIER_COLOR[row.bestCell.tier]} 18%, var(--bg-card))`, color: "var(--ink)" }}>
                              Tier {row.bestCell.tier}
                            </Badge>
                            <strong>{row.bestCell.vendor.label}</strong>
                            <span>{row.bestCell.bench ? `Reliability ${row.bestCell.bench.reliabilityScore}` : "EU catalog match"}</span>
                          </>
                        ) : (
                          <span className="note">No fit</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="caption">
            Each row groups the same normalized model across selected vendors. Benchmarked cells show price, speed and
            reliability; catalog-only cells confirm EU availability but still need pricing verification before production.
          </div>
        </CardContent>
      </Card>

      {!selected.isCurrent && azureVM && <VsAzure selected={selected} azure={azureVM} />}

      <div className={`verdict-panel ${sovereign ? "ok" : "warn"}`} role="note">
        {sovereign ? <ShieldCheck size={20} aria-hidden="true" /> : <ShieldAlert size={20} aria-hidden="true" />}
        <div>
          <strong>
            {sovereign
              ? `${selected.label} is fully EU-sovereign: EU entity and EU infrastructure — outside CLOUD Act reach.`
              : `${selected.label} is EU data residency only: prompts stay in EU regions, but the US parent company remains subject to the CLOUD Act.`}
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

function VendorModelCell({ cell }: { readonly cell: ModelCell | null }) {
  if (!cell) return <span className="matrix-empty">—</span>;
  const bench = cell.bench;
  return (
    <div className={`matrix-cell-stack${bench ? " benchmarked" : ""}`}>
      <div className="matrix-cell-head">
        <strong>{bench ? "Benchmarked" : "Available"}</strong>
        <span className="dot" style={{ background: TIER_COLOR[cell.tier] }} />
      </div>
      <div className="matrix-cell-model">{cell.modelLabel}</div>
      <RegionCell regions={cell.regions} />
      {bench ? (
        <div className="matrix-cell-metrics">
          <span>{money(bench.blended)}/1M</span>
          <span>{bench.throughput} t/s</span>
          <span>{bench.ttft.toFixed(2)}s</span>
          <Badge variant="secondary" title={bench.reliabilityNote}>
            {bench.reliabilityGrade} · {bench.reliabilityScore}
          </Badge>
        </div>
      ) : (
        <div className="note">No benchmark yet</div>
      )}
    </div>
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

function VsAzure({ selected, azure }: { readonly selected: VendorVM; readonly azure: VendorVM }) {
  const a = vendorStats(selected);
  const b = vendorStats(azure);

  const rows: ReadonlyArray<{
    readonly label: string;
    readonly left: string;
    readonly right: string;
    readonly winner: "left" | "right" | null;
  }> = [
    {
      label: "Sovereignty",
      left: selected.tier === "A" ? "EU-sovereign (Tier A)" : "EU-residency (Tier B)",
      right: azure.tier === "A" ? "EU-sovereign (Tier A)" : "EU-residency (Tier B)",
      winner: selected.tier === "A" && azure.tier !== "A" ? "left" : null,
    },
    {
      label: "EU models available",
      left: String(a.modelCount),
      right: String(b.modelCount),
      winner: a.modelCount === b.modelCount ? null : a.modelCount > b.modelCount ? "left" : "right",
    },
    {
      label: "Cheapest benchmarked",
      left: a.cheapest ? `${money(a.cheapest.blended)}/1M · ${a.cheapest.name.replace(" (reference)", "")}` : "—",
      right: b.cheapest ? `${money(b.cheapest.blended)}/1M · ${b.cheapest.name.replace(" (reference)", "")}` : "—",
      winner:
        a.cheapest && b.cheapest
          ? a.cheapest.blended === b.cheapest.blended
            ? null
            : a.cheapest.blended < b.cheapest.blended
              ? "left"
              : "right"
          : null,
    },
    {
      label: "Fastest benchmarked",
      left: a.fastest ? `${a.fastest.throughput} t/s · ${a.fastest.name.replace(" (reference)", "")}` : "—",
      right: b.fastest ? `${b.fastest.throughput} t/s · ${b.fastest.name.replace(" (reference)", "")}` : "—",
      winner:
        a.fastest && b.fastest
          ? a.fastest.throughput === b.fastest.throughput
            ? null
            : a.fastest.throughput > b.fastest.throughput
              ? "left"
              : "right"
          : null,
    },
    {
      label: "Best reliability score",
      left: a.bestReliability !== null ? `${a.bestReliability}/100` : "—",
      right: b.bestReliability !== null ? `${b.bestReliability}/100` : "—",
      winner:
        a.bestReliability !== null && b.bestReliability !== null
          ? a.bestReliability === b.bestReliability
            ? null
            : a.bestReliability > b.bestReliability
              ? "left"
              : "right"
          : null,
    },
  ];

  return (
    <Card className="vs-card">
      <CardHeader className="section-title-row">
        <div>
          <div className="eyebrow">Head to head</div>
          <CardTitle>
            {selected.label} vs Azure AI Foundry
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="vs-grid">
          <div className="vs-row vs-head">
            <span />
            <strong>{selected.label}</strong>
            <strong>Azure AI Foundry (current)</strong>
          </div>
          {rows.map((row) => (
            <div className="vs-row" key={row.label}>
              <span className="vs-label">{row.label}</span>
              <span className={row.winner === "left" ? "vs-win" : ""}>{row.left}</span>
              <span className={row.winner === "right" ? "vs-win" : ""}>{row.right}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
