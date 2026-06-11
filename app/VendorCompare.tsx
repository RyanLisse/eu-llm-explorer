"use client";

import { useMemo, useState } from "react";
import { Search, ShieldAlert, ShieldCheck, X } from "lucide-react";
import type {
  CoverageRegionView,
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
 * Vendor-first comparison view: pick a platform (AWS Bedrock, Vertex, Scaleway…)
 * and immediately see its EU model catalog, prices, speed, and a sovereignty
 * verdict — side by side with the Azure AI Foundry baseline you run today.
 */

const TIER_COLOR: Record<Tier, string> = {
  A: "var(--tier-a)",
  B: "var(--tier-b)",
  C: "var(--tier-c)",
};

const AZURE_KEY = "Azure AI Foundry";

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

/** Summary platform → platform string(s) used on coverage rows. */
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

interface ModelRow {
  readonly model: string;
  readonly publisher: string;
  readonly regions: ReadonlyArray<CoverageRegionView>;
  readonly bench: RouteView | null;
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

  // Merge the two Azure Foundry summaries into the single "current platform" baseline.
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
    vms.push(make(s.platform, s.platform.replace(/ (EU|Generative APIs|AI Endpoints|AI Model Serving|AI Model Hub|Token Factory)$/, ""), s.provider, s.tier, s.requirementFit, s.evidenceNote, s.source));
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

const buildModelRows = (vm: VendorVM): ReadonlyArray<ModelRow> => {
  const benchByName = new Map(vm.benchmarks.map((r) => [normModel(r.name), r]));
  const used = new Set<string>();

  const rows: Array<ModelRow> = vm.coverageRows.map((row) => {
    const key = normModel(row.model);
    const bench = benchByName.get(key) ?? null;
    if (bench) used.add(key);
    return { model: row.model, publisher: row.provider, regions: row.regions, bench };
  });

  // Benchmarked routes without a coverage row (e.g. curated routes) still belong in the list.
  for (const r of vm.benchmarks) {
    if (used.has(normModel(r.name))) continue;
    rows.push({ model: r.name.replace(" (reference)", ""), publisher: r.maker, regions: [], bench: r });
  }

  return rows.toSorted((a, b) => {
    if (!!a.bench !== !!b.bench) return a.bench ? -1 : 1;
    if (a.bench && b.bench) return a.bench.blended - b.bench.blended;
    return a.model.localeCompare(b.model);
  });
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

  const selected = vendors.find((v) => v.key === vendor) ?? vendors.find((v) => v.key === "AWS Bedrock EU") ?? vendors[0] ?? null;

  const [modelSearch, setModelSearch] = useState("");

  const modelRows = useMemo(() => (selected ? buildModelRows(selected) : []), [selected]);
  const filteredRows = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return modelRows;
    return modelRows.filter(
      (row) => row.model.toLowerCase().includes(q) || row.publisher.toLowerCase().includes(q),
    );
  }, [modelRows, modelSearch]);

  if (!selected) return null;
  const stats = vendorStats(selected);
  const sovereign = selected.tier === "A";

  const heading = selected.isCurrent
    ? "Azure AI Foundry — your current platform baseline"
    : sovereign
      ? `${selected.label} is fully EU-sovereign — ${stats.modelCount} EU models available`
      : `${selected.label} keeps data in the EU, but is not sovereign — CLOUD Act applies`;

  return (
    <section className="compare-shell">
      <div className="hero-bar">
        <div>
          <div className="eyebrow">EU vendor comparison · baseline: Azure AI Foundry</div>
          <h2>{heading}</h2>
          <p className="insight-summary">
            {stats.modelCount} EU models · {stats.benchCount} benchmarked routes
            {stats.cheapest ? ` · cheapest ${money(stats.cheapest.blended)}/1M` : ""}
            {stats.fastest ? ` · fastest ${stats.fastest.throughput} t/s` : ""}
          </p>
        </div>
      </div>

      <div className="vendor-picker" role="tablist" aria-label="Choose a platform">
        {vendors.map((v) => {
          const isSel = v.key === selected.key;
          return (
            <button
              key={v.key}
              role="tab"
              aria-selected={isSel}
              className={`vendor-pick-card${isSel ? " selected" : ""}${v.isCurrent ? " current" : ""}`}
              onClick={() => setVendor(v.key)}
            >
              <div className="vendor-pick-head">
                <strong>{v.label}</strong>
                {v.isCurrent && <Badge variant="secondary">current</Badge>}
              </div>
              <div className="vendor-pick-meta">
                <span className="dot" style={{ background: TIER_COLOR[v.tier] }} />
                {v.fit === "sovereign" ? "EU-sovereign" : "EU-residency"}
              </div>
              <div className="vendor-pick-count">
                {v.coverageRows.length} models{v.benchmarks.length > 0 ? ` · ${v.benchmarks.length} benchmarked` : ""}
              </div>
            </button>
          );
        })}
      </div>

      <div className={`verdict-panel ${sovereign ? "ok" : "warn"}`} role="note">
        {sovereign ? <ShieldCheck size={20} aria-hidden="true" /> : <ShieldAlert size={20} aria-hidden="true" />}
        <div>
          <strong>
            {sovereign
              ? "Fully EU-sovereign: EU entity and EU infrastructure — outside CLOUD Act reach."
              : "EU data residency only: prompts stay in EU regions, but the US parent company remains subject to the CLOUD Act."}
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

      {!selected.isCurrent && azureVM && <VsAzure selected={selected} azure={azureVM} />}

      <Card className="table-card">
        <CardHeader className="section-title-row">
          <div>
            <div className="eyebrow">EU model catalog</div>
            <CardTitle>
              {filteredRows.length} model{filteredRows.length === 1 ? "" : "s"} on {selected.label} in the EU
            </CardTitle>
          </div>
          <div className="search-row compare-model-search">
            <Search className="search-icon" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search models…"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
            />
            {modelSearch && (
              <Button size="icon" variant="ghost" aria-label="Clear search" onClick={() => setModelSearch("")}>
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="tablewrap compare-tablewrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>EU regions</TableHead>
                  <TableHead className="num">In $/1M</TableHead>
                  <TableHead className="num">Out $/1M</TableHead>
                  <TableHead className="num">t/s</TableHead>
                  <TableHead className="num">TTFT</TableHead>
                  <TableHead>Reliability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={`${row.publisher}-${row.model}`} data-benchmarked={!!row.bench}>
                    <TableCell>
                      <div className="table-model">{row.model}</div>
                      <div className="note">{row.publisher}</div>
                    </TableCell>
                    <TableCell>
                      <RegionCell regions={row.regions} />
                    </TableCell>
                    <TableCell className="num">{row.bench ? money(row.bench.inputPrice) : "—"}</TableCell>
                    <TableCell className="num">{row.bench ? money(row.bench.outputPrice) : "—"}</TableCell>
                    <TableCell className="num">{row.bench ? row.bench.throughput : "—"}</TableCell>
                    <TableCell className="num">{row.bench ? `${row.bench.ttft.toFixed(2)}s` : "—"}</TableCell>
                    <TableCell>
                      {row.bench ? (
                        <Badge variant="secondary" title={row.bench.reliabilityNote}>
                          {row.bench.reliabilityGrade} · {row.bench.reliabilityScore}
                        </Badge>
                      ) : (
                        <span className="note">not benchmarked</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="caption">
            Price and speed come from the curated benchmark set (vendor pricing pages + Artificial Analysis medians,
            mixed USD/EUR). “—” means the model is EU-available but not yet benchmarked — check the vendor pricing page
            before production.
          </div>
        </CardContent>
      </Card>
    </section>
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
