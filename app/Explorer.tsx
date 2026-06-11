"use client";

import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Brain, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Weight, X, Zap } from "lucide-react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { filterAtom, INITIAL_FILTERS, selectedRouteAtom, type FilterState } from "@/atoms";
import type {
  Capability,
  Mode,
  MultiVendorModelView,
  ProviderCoverageSummaryView,
  ProviderCoverageView,
  RouteView,
  Tier,
  VendorScopeView,
} from "@/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TIER_META: Record<Tier, { color: string; label: string; short: string; description: string }> = {
  A: { color: "var(--tier-a)", label: "EU-sovereign", short: "A", description: "EU entity, no CLOUD Act route" },
  B: { color: "var(--tier-b)", label: "EU-residency", short: "B", description: "EU processing under US vendor" },
  C: { color: "var(--tier-c)", label: "Rejected", short: "C", description: "Not safe for sensitive data" },
};

const MODE_LABEL: Record<Mode, string> = {
  reasoning: "Reasoning",
  "non-reasoning": "Fast tasks",
  configurable: "Configurable",
};

const CAPABILITY_LABEL: Record<Capability, string> = {
  vision: "Vision",
  tools: "Tools",
  cache: "Cache",
  think: "Think",
  web: "Web",
  json: "JSON",
};

const CAPABILITY_KEYS: ReadonlyArray<Capability> = ["vision", "tools", "cache", "think", "web", "json"];

const GRADE_COLOR: Record<string, string> = {
  A: "var(--growth)",
  B: "var(--sky)",
  C: "var(--ray)",
  D: "var(--coral)",
};

const RISK_LABEL: Record<string, string> = { low: "low risk", medium: "medium risk", high: "high risk" };

const REF_BLENDED = (0.25 + 2.0) / 2;
const REF_SPEED = 101;

const money = (v: number): string => `$${v.toFixed(v < 1 ? 2 : 1)}`;
const isUrl = (value: string): boolean => value.startsWith("https://") || value.startsWith("http://");
const sliderNumber = (value: number | readonly number[], fallback: number): number => {
  if (typeof value === "number") return value;
  return value[0] ?? fallback;
};

type ChartPoint = RouteView & {
  xMetric: number;
  yCost: number;
  zReliability: number;
};

const chartConfig = {
  A: { label: "EU-sovereign", color: "var(--tier-a)" },
  B: { label: "EU-residency", color: "var(--tier-b)" },
  C: { label: "Rejected", color: "var(--tier-c)" },
} satisfies ChartConfig;

export function Explorer({
  routes,
}: {
  readonly routes: ReadonlyArray<RouteView>;
}) {
  const filters = useAtomValue(filterAtom);
  const setFilters = useAtomSet(filterAtom);
  const selectedId = useAtomValue(selectedRouteAtom);
  const setSelectedId = useAtomSet(selectedRouteAtom);
  const [providersOpen, setProvidersOpen] = useState(true);
  const [makersOpen, setMakersOpen] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(true); // true = hidden until mount check

  useEffect(() => {
    setIntroDismissed(!!localStorage.getItem("seenIntro"));
  }, []);

  const dismissIntro = useCallback(() => {
    localStorage.setItem("seenIntro", "1");
    setIntroDismissed(true);
  }, []);

  const makers = useMemo(() => Array.from(new Set(routes.map((r) => r.maker))).toSorted(), [routes]);
  const providers = useMemo(
    () => Array.from(new Set(routes.flatMap((r) => r.providers))).toSorted(),
    [routes],
  );
  const activeProviders = useMemo(
    () => Object.entries(filters.providers).filter(([, on]) => on).map(([name]) => name),
    [filters.providers],
  );
  const activeCapabilities = useMemo(
    () => CAPABILITY_KEYS.filter((capability) => filters.capabilities[capability]),
    [filters.capabilities],
  );

  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const rows = routes.filter((r) => {
      if (!filters.tiers[r.tier]) return false;
      if (!filters.modes[r.mode]) return false;
      if (Object.keys(filters.makers).length > 0 && filters.makers[r.maker] === false) return false;
      if (activeProviders.length > 0 && !r.providers.some((p) => activeProviders.includes(p))) return false;
      if (activeCapabilities.length > 0 && !activeCapabilities.every((capability) => r.capabilities.includes(capability))) {
        return false;
      }
      if (filters.openOnly && r.openness === "proprietary") return false;
      if (r.blended > filters.maxBlended) return false;
      if (r.reliabilityScore < filters.minReliability) return false;
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.maker.toLowerCase().includes(q) &&
        !r.providers.some((p) => p.toLowerCase().includes(q)) &&
        !r.route.toLowerCase().includes(q) &&
        !r.note.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    const tierOrder: Record<Tier, number> = { A: 0, B: 1, C: 2 };
    return rows.toSorted((a, b) => {
      switch (filters.sort) {
        case "reliability":
          return b.reliabilityScore - a.reliabilityScore || a.blended - b.blended;
        case "blended":
          return a.blended - b.blended || b.reliabilityScore - a.reliabilityScore;
        case "throughput":
          return b.throughput - a.throughput || a.ttft - b.ttft;
        case "ttft":
          return a.ttft - b.ttft || b.throughput - a.throughput;
        case "tier":
          return tierOrder[a.tier] - tierOrder[b.tier] || b.reliabilityScore - a.reliabilityScore;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [routes, filters, activeProviders, activeCapabilities]);

  const nonRejected = visible.filter((r) => r.tier !== "C");
  const sovereign = visible.filter((r) => r.tier === "A");
  const ranked = sovereign.slice(0, 4);
  const selected = visible.find((r) => r.id === selectedId) ?? ranked[0] ?? nonRejected[0] ?? visible[0] ?? null;
  const cheapest = nonRejected.toSorted((a, b) => a.blended - b.blended)[0] ?? null;
  const fastest = nonRejected.toSorted((a, b) => b.throughput - a.throughput)[0] ?? null;
  const bestReliability = sovereign.length > 0
    ? Math.max(...sovereign.map((r) => r.reliabilityScore))
    : nonRejected.length > 0 ? Math.max(...nonRejected.map((r) => r.reliabilityScore)) : null;

  const insightHeading = useMemo(() => {
    if (visible.length === 0) return "No routes match — try widening tiers or clearing a filter";
    if (sovereign.length > 0 && bestReliability !== null) {
      return `EU-sovereign routes lead on reliability — ${sovereign.length} route${sovereign.length !== 1 ? "s" : ""} score ${bestReliability}+`;
    }
    if (nonRejected.length > 0 && bestReliability !== null) {
      return `${nonRejected.length} usable route${nonRejected.length !== 1 ? "s" : ""} match — best reliability ${bestReliability}/100`;
    }
    return "Showing all routes including rejected";
  }, [visible.length, sovereign.length, nonRejected.length, bestReliability]);

  const insightSummary = useMemo(() => {
    if (visible.length === 0) return "No routes match — try widening tiers or clearing a capability filter";
    if (visible.length === 1) return `1 route matches · reliability ${visible[0]?.reliabilityScore ?? "-"}/100 · ${visible[0]?.tier === "A" ? "EU-sovereign" : visible[0]?.tier === "B" ? "EU-residency" : "restricted"}`;
    const sovereignCount = sovereign.length;
    const best = bestReliability ?? "-";
    return `${visible.length} routes match · best reliability ${best}/100 · ${sovereignCount} EU-sovereign`;
  }, [visible, sovereign.length, bestReliability]);

  const averageReliability =
    nonRejected.length > 0
      ? Math.round(nonRejected.reduce((sum, r) => sum + r.reliabilityScore, 0) / nonRejected.length)
      : 0;

  const patch = (p: Partial<FilterState>) => setFilters((f) => ({ ...f, ...p }));
  const toggleTier = (k: Tier) => patch({ tiers: { ...filters.tiers, [k]: !filters.tiers[k] } });
  const toggleMode = (k: Mode) => patch({ modes: { ...filters.modes, [k]: !filters.modes[k] } });
  const toggleCapability = (k: Capability) =>
    patch({ capabilities: { ...filters.capabilities, [k]: !filters.capabilities[k] } });
  const toggleMaker = (k: string) => patch({ makers: { ...filters.makers, [k]: filters.makers[k] === false } });
  const toggleProvider = (k: string) => {
    if (filters.providers[k]) {
      const next = { ...filters.providers };
      delete next[k];
      patch({ providers: next });
      return;
    }
    patch({ providers: { ...filters.providers, [k]: true } });
  };

  const applyPreset = (preset: "default" | "sovereign" | "open" | "reasoning" | "all") => {
    if (preset === "default") {
      setFilters(() => INITIAL_FILTERS);
      return;
    }
    if (preset === "sovereign") {
      patch({
        tiers: { A: true, B: false, C: false },
        modes: { reasoning: true, "non-reasoning": true, configurable: true },
        openOnly: false,
        minReliability: 70,
        maxBlended: 8,
        sort: "reliability",
      });
      return;
    }
    if (preset === "open") {
      patch({
        tiers: { A: true, B: false, C: false },
        modes: { reasoning: true, "non-reasoning": true, configurable: true },
        openOnly: true,
        minReliability: 70,
        maxBlended: 3,
        sort: "blended",
      });
      return;
    }
    if (preset === "reasoning") {
      patch({
        tiers: { A: true, B: false, C: false },
        modes: { reasoning: true, "non-reasoning": false, configurable: true },
        openOnly: false,
        minReliability: 65,
        maxBlended: 8,
        sort: "reliability",
      });
      return;
    }
    patch({
      tiers: { A: true, B: true, C: true },
      modes: { reasoning: true, "non-reasoning": true, configurable: true },
      openOnly: false,
      minReliability: 0,
      maxBlended: 8,
      sort: "tier",
    });
  };

  return (
    <section className="explorer-shell">
      {!introDismissed && (
        <div className="intro-banner" role="note">
          <span>This is the Tier-A EU-sovereign shortlist ranked by reliability — widen to Tier B or ask the chat panel to guide you.</span>
          <button className="intro-dismiss" onClick={dismissIntro} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="hero-bar">
        <div>
          <div className="eyebrow">Interactive EU AI gateway explorer</div>
          <h2>{insightHeading}</h2>
          <p className="insight-summary">{insightSummary}</p>
        </div>
        <div className="hero-actions" aria-label="Filter presets">
          <Button onClick={() => applyPreset("sovereign")}>
            <ShieldCheck aria-hidden="true" />
            Sovereign
          </Button>
          <Button variant="outline" onClick={() => applyPreset("open")}>
            <Weight aria-hidden="true" />
            Open-weight
          </Button>
          <Button variant="outline" onClick={() => applyPreset("reasoning")}>
            <Brain aria-hidden="true" />
            Reasoning
          </Button>
          <Button variant="ghost" onClick={() => applyPreset("default")} aria-label="Reset filters">
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="metric-grid" aria-label="Route summary">
        <MetricCard label="Routes shown" value={visible.length.toString()} detail={`${nonRejected.length} usable for sensitive workloads`} />
        <MetricCard label="Sovereign matches" value={sovereign.length.toString()} detail="Tier A routes in current filters" />
        <MetricCard label="Avg reliability" value={averageReliability ? averageReliability.toString() : "-"} detail="Visible non-rejected routes" />
        <MetricCard label="Fastest visible" value={fastest ? `${fastest.throughput} t/s` : "-"} detail={fastest?.name ?? "No route"} />
      </div>

      <div className="decision-grid">
        <aside className="control-rail" aria-label="Explorer filters">
          <Card>
            <CardHeader>
              <CardTitle>
                <SlidersHorizontal aria-hidden="true" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="control-stack">
              <div className="control-block">
                <label className="lbl" htmlFor="route-search">
                  Search
                </label>
                <div className="search-row">
                  <Search className="search-icon" aria-hidden="true" />
                  <Input
                    id="route-search"
                    type="text"
                    placeholder="mistral, bedrock, azure..."
                    value={filters.search}
                    onChange={(e) => patch({ search: e.target.value })}
                  />
                  {filters.search && (
                    <Button size="icon" variant="ghost" aria-label="Clear search" onClick={() => patch({ search: "" })}>
                      <X aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>

              <FilterGroup title="Sovereignty">
                {(["A", "B", "C"] as const).map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={filters.tiers[k] ? "default" : "outline"}
                    className="filter-chip"
                    style={{
                      borderColor: filters.tiers[k] ? TIER_META[k].color : "var(--line)",
                      background: filters.tiers[k]
                        ? `color-mix(in srgb, ${TIER_META[k].color} 18%, white)`
                        : "transparent",
                    }}
                    onClick={() => toggleTier(k)}
                  >
                    <span className="dot" style={{ background: TIER_META[k].color }} />
                    {k} · {TIER_META[k].label}
                  </Button>
                ))}
              </FilterGroup>

              <FilterGroup title="Workload">
                {(["non-reasoning", "configurable", "reasoning"] as const).map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={filters.modes[k] ? "default" : "outline"}
                    className="filter-chip"
                    onClick={() => toggleMode(k)}
                  >
                    {MODE_LABEL[k]}
                  </Button>
                ))}
              </FilterGroup>

              <FilterGroup title="Capabilities">
                {CAPABILITY_KEYS.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={filters.capabilities[k] ? "default" : "outline"}
                    className="filter-chip"
                    onClick={() => toggleCapability(k)}
                  >
                    {CAPABILITY_LABEL[k]}
                  </Button>
                ))}
              </FilterGroup>

              <FilterGroup title="Decision lens">
                <Button
                  type="button"
                  variant={filters.openOnly ? "default" : "outline"}
                  className="filter-chip"
                  onClick={() => patch({ openOnly: !filters.openOnly })}
                >
                  Open only
                </Button>
                <Button
                  type="button"
                  variant={filters.metric === "throughput" ? "default" : "outline"}
                  className="filter-chip"
                  onClick={() => patch({ metric: "throughput" })}
                >
                  Throughput
                </Button>
                <Button
                  type="button"
                  variant={filters.metric === "ttft" ? "default" : "outline"}
                  className="filter-chip"
                  onClick={() => patch({ metric: "ttft" })}
                >
                  TTFT
                </Button>
              </FilterGroup>

              <div className="control-block">
                <div className="slider-label">
                  <span>Max blended price</span>
                  <strong>{money(filters.maxBlended)}/1M</strong>
                </div>
                <Slider
                  min={0.1}
                  max={8}
                  step={0.05}
                  value={filters.maxBlended}
                  onValueChange={(value) => patch({ maxBlended: sliderNumber(value, filters.maxBlended) })}
                />
                <div className="note">gpt-5-mini reference: {money(REF_BLENDED)} blended</div>
              </div>

              <div className="control-block">
                <div className="slider-label">
                  <span>Min reliability</span>
                  <strong>{filters.minReliability === 0 ? "Any" : filters.minReliability}</strong>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={filters.minReliability}
                  onValueChange={(value) => patch({ minReliability: sliderNumber(value, filters.minReliability) })}
                />
                <div className="note">Composite SLA, uptime, and availability risk</div>
              </div>

              <div className="control-block">
                <label className="lbl">Sort table</label>
                <Select value={filters.sort} onValueChange={(value) => patch({ sort: value as FilterState["sort"] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reliability">Most reliable first</SelectItem>
                    <SelectItem value="blended">Cheapest first</SelectItem>
                    <SelectItem value="throughput">Fastest throughput</SelectItem>
                    <SelectItem value="ttft">Lowest TTFT</SelectItem>
                    <SelectItem value="tier">Tier first</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <Collapsible open={providersOpen} onOpenChange={setProvidersOpen}>
                <CollapsibleTrigger className="collapse-trigger">
                  <span>Providers</span>
                  <Badge variant="secondary">{activeProviders.length || "All"}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="chips vendor-list">
                  <Button size="sm" variant="outline" onClick={() => patch({ providers: {} })}>
                    All providers
                  </Button>
                  {providers.map((k) => {
                    const on = filters.providers[k] === true;
                    const n = routes.filter((r) => r.providers.includes(k)).length;
                    return (
                      <Button
                        key={k}
                        size="sm"
                        type="button"
                        variant={on ? "default" : "outline"}
                        className="filter-chip"
                        onClick={() => toggleProvider(k)}
                      >
                        {k} ({n})
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={makersOpen} onOpenChange={setMakersOpen}>
                <CollapsibleTrigger className="collapse-trigger">
                  <span>Model makers</span>
                  <Badge variant="secondary">{makers.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="chips vendor-list">
                  {makers.map((k) => {
                    const on = filters.makers[k] !== false;
                    const n = routes.filter((r) => r.maker === k).length;
                    return (
                      <Button
                        key={k}
                        size="sm"
                        type="button"
                        variant={on ? "default" : "outline"}
                        className="filter-chip"
                        onClick={() => toggleMaker(k)}
                      >
                        {k} ({n})
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>

              <Button variant="outline" onClick={() => applyPreset("all")}>
                Show rejected routes
              </Button>
            </CardContent>
          </Card>
        </aside>

        <div className="results-column">
          <Card className="rank-panel">
            <CardHeader className="section-title-row">
              <div>
                <div className="eyebrow">Recommended now</div>
                <CardTitle>{sovereign.length > 0 ? `${sovereign.length} EU-sovereign route${sovereign.length !== 1 ? "s" : ""} ranked by reliability` : "No sovereign routes match"}</CardTitle>
              </div>
              {cheapest && (
                <div className="mini-fact">
                  Cheapest visible <strong>{cheapest.name}</strong> at {money(cheapest.blended)}/1M
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="rank-grid">
                {ranked.length === 0 ? (
                  <div className="empty-state">No sovereign routes match these filters.</div>
                ) : (
                  ranked.map((r, index) => (
                    <RouteCard key={r.id} route={r} rank={index + 1} selected={selected?.id === r.id} onSelect={setSelectedId} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="analysis-grid">
            <Card className="chart-panel">
              <CardHeader className="section-title-row">
                <div>
                  <div className="eyebrow">Cost versus speed</div>
                  <CardTitle>shadcn route map</CardTitle>
                </div>
                <div className="mini-fact">{visible.length} visible</div>
              </CardHeader>
              <CardContent>
                <RouteChart rows={visible} metric={filters.metric} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
              </CardContent>
            </Card>

            <RouteDetail route={selected} />
          </div>

          <Card className="table-card">
            <CardHeader className="section-title-row">
              <div>
                <div className="eyebrow">Full matrix</div>
                <CardTitle>shadcn route table</CardTitle>
              </div>
              <Badge variant="secondary">{visible.length} rows</Badge>
            </CardHeader>
            <CardContent>
              <RouteTable rows={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
              <div className="caption">
                {visible.length} routes shown ({nonRejected.length} usable for sensitive workloads). Tier C is hidden by
                default. Prices mix USD/EUR as published; verify official pricing before production.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function ProviderCoverageSection({
  summaries,
  coverage,
  vendorScope,
  overlaps,
  provider = "All",
  setProvider = () => {},
}: {
  readonly summaries: ReadonlyArray<ProviderCoverageSummaryView>;
  readonly coverage: ReadonlyArray<ProviderCoverageView>;
  readonly vendorScope: ReadonlyArray<VendorScopeView>;
  readonly overlaps: ReadonlyArray<MultiVendorModelView>;
  readonly provider?: string;
  readonly setProvider?: (val: string) => void;
}) {
  const coverageFilters = useMemo(
    () => Array.from(new Set(coverage.flatMap((row) => [row.platform, row.provider]))).toSorted(),
    [coverage],
  );

  const [modelSearch, setModelSearch] = useState("");

  const filteredByProvider = useMemo(
    () => (provider === "All" ? coverage : coverage.filter((row) => row.platform === provider || row.provider === provider)),
    [coverage, provider],
  );

  const filtered = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return filteredByProvider;
    return filteredByProvider.filter((row) => row.model.toLowerCase().includes(q));
  }, [filteredByProvider, modelSearch]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    // Initial size
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [provider, modelSearch]);

  const rowHeight = 65; // Estimated row height for table rows
  const overscan = 10;
  const isVirtualized = filtered.length > 1000;

  const { totalHeight, topSpacerHeight, bottomSpacerHeight, visibleRows } = useMemo(() => {
    if (!isVirtualized) {
      return { totalHeight: 0, topSpacerHeight: 0, bottomSpacerHeight: 0, visibleRows: filtered };
    }
    const totalHeight = filtered.length * rowHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(filtered.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);

    const topSpacerHeight = startIndex * rowHeight;
    const bottomSpacerHeight = (filtered.length - endIndex) * rowHeight;
    const visibleRows = filtered.slice(startIndex, endIndex);

    return { totalHeight, topSpacerHeight, bottomSpacerHeight, visibleRows };
  }, [filtered, scrollTop, containerHeight, isVirtualized]);
  const selectedProviderLabel = provider === "All" ? "All vendors and platforms" : provider;
  const selectedSummary = summaries.find((summary) => summary.platform === provider || summary.provider === provider) ?? null;
  const bedrockFiltered = filtered.filter((row) => row.platform === "AWS Bedrock");
  const inRegionCount = filtered.filter((row) => row.regions.some((region) => region.inRegion)).length;
  const geoCount = filtered.filter((row) => row.regions.some((region) => region.euGeo)).length;
  const officialCount = filtered.filter((row) => row.sourceType === "official").length;
  const reportDerivedCount = filtered.length - officialCount;
  const vendorModelGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        readonly platform: string;
        readonly provider: string;
        readonly requirementFit: ProviderCoverageView["requirementFit"];
        readonly tier: Tier;
        readonly sourceType: ProviderCoverageView["sourceType"];
        readonly models: Array<ProviderCoverageView>;
      }
    >();
    for (const row of filtered) {
      const key = `${row.platform}:::${row.provider}`;
      const existing = groups.get(key);
      if (existing) {
        existing.models.push(row);
        continue;
      }
      groups.set(key, {
        platform: row.platform,
        provider: row.provider,
        requirementFit: row.requirementFit,
        tier: row.tier,
        sourceType: row.sourceType,
        models: [row],
      });
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        models: group.models.toSorted((a, b) => a.model.localeCompare(b.model)),
      }))
      .toSorted((a, b) => b.models.length - a.models.length || a.platform.localeCompare(b.platform) || a.provider.localeCompare(b.provider));
  }, [filtered]);
  const scopeCounts = useMemo(() => ({
    covered: vendorScope.filter((row) => row.status === "covered" || row.status === "covered-with-conditions").length,
    excluded: vendorScope.filter((row) => row.status === "excluded").length,
    monitor: vendorScope.filter((row) => row.status === "monitor").length,
  }), [vendorScope]);
  const [overlapQuery, setOverlapQuery] = useState("");
  const [overlapPlatform, setOverlapPlatform] = useState("All");
  const overlapPlatforms = useMemo(
    () => Array.from(new Set(overlaps.flatMap((row) => row.platforms))).toSorted(),
    [overlaps],
  );
  const filteredOverlaps = useMemo(() => {
    const q = overlapQuery.trim().toLowerCase();
    return overlaps.filter((row) => {
      if (overlapPlatform !== "All" && !row.platforms.includes(overlapPlatform)) return false;
      if (!q) return true;
      return (
        row.family.toLowerCase().includes(q) ||
        row.models.some((model) => model.toLowerCase().includes(q)) ||
        row.vendors.some((vendor) => vendor.toLowerCase().includes(q)) ||
        row.platforms.some((platform) => platform.toLowerCase().includes(q))
      );
    });
  }, [overlapPlatform, overlapQuery, overlaps]);

  return (
    <Card className="coverage-card">
      <CardHeader className="section-title-row">
        <div>
          <div className="eyebrow">Vendor requirement coverage</div>
          <CardTitle>All EU-qualifying AWS Bedrock routes plus vendor fit summary</CardTitle>
        </div>
        <Badge variant="secondary">{coverage.length} qualifying rows</Badge>
      </CardHeader>
      <CardContent>
        <div className="vendor-first-panel">
          <div>
            <div className="eyebrow">Start with vendor</div>
            <h3>Filter the European model catalog by provider or platform</h3>
            <div className="coverage-facts">
              <span>{selectedProviderLabel}</span>
              <span>{filtered.length} matching models</span>
              <span>{vendorModelGroups.length} vendor groups</span>
              <span>{inRegionCount} strict EU-region rows</span>
              <span>{geoCount} EU-geo rows</span>
            </div>
          </div>
          <Select value={provider} onValueChange={(value) => setProvider(value ?? "All")}>
            <SelectTrigger className="vendor-first-select">
              <SelectValue placeholder="Choose vendor or platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All vendors and platforms</SelectItem>
              {coverageFilters.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="vendor-quick-picks" aria-label="Common vendor filters">
            <Button size="sm" variant={provider === "All" ? "default" : "outline"} onClick={() => setProvider("All")}>
              All
            </Button>
            {summaries
              .toSorted((a, b) => b.modelCount - a.modelCount || a.platform.localeCompare(b.platform))
              .slice(0, 8)
              .map((summary) => (
                <Button
                  size="sm"
                  variant={provider === summary.platform ? "default" : "outline"}
                  key={summary.platform}
                  onClick={() => setProvider(summary.platform)}
                >
                  {summary.platform} ({summary.modelCount})
                </Button>
              ))}
          </div>
          <div className="search-row vendor-model-search" style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
            <Search className="search-icon" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search models within selected vendor (e.g. llama, claude...)"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
            />
            {modelSearch && (
              <Button size="icon" variant="ghost" aria-label="Clear model search" onClick={() => setModelSearch("")}>
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
          {selectedSummary ? (
            <div className="vendor-first-note">
              <Badge style={{ background: `color-mix(in srgb, ${TIER_META[selectedSummary.tier].color} 18%, white)`, color: "var(--core)" }}>
                Tier {selectedSummary.tier}
              </Badge>
              <span>{selectedSummary.requirementFit === "sovereign" ? "EU sovereign" : "EU residency"}</span>
              <span>{selectedSummary.evidenceNote}</span>
            </div>
          ) : (
            <div className="vendor-first-note">
              <span>Showing every currently verified European vendor route in the catalog.</span>
            </div>
          )}
        </div>

        <Separator className="coverage-separator" />

        <div className="scope-panel">
          <div className="section-title-row compact">
            <div>
              <div className="eyebrow">Vendor scope audit</div>
              <h3>Covered qualifying vendors and explicit exclusions</h3>
            </div>
            <div className="region-list">
              <Badge variant="secondary">{scopeCounts.covered} covered</Badge>
              <Badge variant="secondary">{scopeCounts.excluded} excluded</Badge>
              <Badge variant="secondary">{scopeCounts.monitor} monitor</Badge>
            </div>
          </div>
          <div className="scope-grid">
            {vendorScope.map((row) => (
              <div className="scope-row" key={`${row.platform}-${row.status}`}>
                <div className="coverage-summary-head">
                  <strong>{row.platform}</strong>
                  <div className="region-list">
                    <Badge style={{ background: `color-mix(in srgb, ${TIER_META[row.tier].color} 18%, white)`, color: "var(--core)" }}>
                      Tier {row.tier}
                    </Badge>
                    <Badge variant={row.status === "excluded" ? "destructive" : row.status === "monitor" ? "secondary" : "default"}>
                      {row.status.replaceAll("-", " ")}
                    </Badge>
                  </div>
                </div>
                <div className="note">{row.provider} · {row.category.replaceAll("-", " ")}</div>
                <div className="note">{row.modelCoverage}</div>
                <div className="note">{row.evidenceNote}</div>
                {isUrl(row.source) ? (
                  <a className="source-link" href={row.source} target="_blank" rel="noreferrer">
                    Source
                  </a>
                ) : (
                  <div className="note">{row.source}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator className="coverage-separator" />

        <div className="coverage-summary-grid">
          {summaries.map((summary) => (
            <div className="coverage-summary" key={`${summary.platform}-${summary.provider}`}>
              <div className="coverage-summary-head">
                <strong>{summary.platform}</strong>
                <div className="region-list">
                  <Badge style={{ background: `color-mix(in srgb, ${TIER_META[summary.tier].color} 18%, white)`, color: "var(--core)" }}>
                    Tier {summary.tier}
                  </Badge>
                  <Badge variant={summary.sourceType === "official" ? "default" : "secondary"}>
                    {summary.sourceType === "official" ? "Official" : "Report"}
                  </Badge>
                </div>
              </div>
              <div className="note">{summary.modelCount} qualifying model{summary.modelCount === 1 ? "" : "s"} · {summary.provider}</div>
              <div className="coverage-fit">{summary.requirementFit === "sovereign" ? "EU sovereign" : "EU residency"}</div>
              <div className="note">{summary.evidenceNote}</div>
              {isUrl(summary.source) ? (
                <a className="source-link" href={summary.source} target="_blank" rel="noreferrer">
                  Source
                </a>
              ) : (
                <div className="note">{summary.source}</div>
              )}
            </div>
          ))}
        </div>

        <Separator className="coverage-separator" />

        <div className="vendor-directory">
          <div className="section-title-row compact">
            <div>
              <div className="eyebrow">Provider model directory</div>
              <h3>All EU-available models grouped by vendor and platform</h3>
            </div>
            <Badge variant="secondary">{vendorModelGroups.length} vendor groups</Badge>
          </div>
          <div className="vendor-directory-grid">
            {vendorModelGroups.map((group) => (
              <div className="vendor-directory-row" key={`${group.platform}-${group.provider}`}>
                <div className="coverage-summary-head">
                  <div>
                    <strong>{group.provider}</strong>
                    <div className="note">{group.platform}</div>
                  </div>
                  <div className="region-list">
                    <Badge style={{ background: `color-mix(in srgb, ${TIER_META[group.tier].color} 18%, white)`, color: "var(--core)" }}>
                      Tier {group.tier}
                    </Badge>
                    <Badge variant="secondary">{group.models.length} models</Badge>
                  </div>
                </div>
                <div className="vendor-model-list">
                  {group.models.map((row) => (
                    <div className="vendor-model-row" key={`${row.platform}-${row.provider}-${row.model}`}>
                      <span>{row.model}</span>
                      <div className="region-list">
                        {row.regions.length > 0 ? (
                          row.regions.map((region) => (
                            <span className="region-chip compact" key={`${row.platform}-${row.provider}-${row.model}-${region.code}`}>
                              {region.code}
                              <small>
                                {region.inRegion ? "I" : ""}
                                {region.euGeo ? "G" : ""}
                                {region.legacyEol ? ` EOL ${region.legacyEol}` : ""}
                              </small>
                            </span>
                          ))
                        ) : (
                          <span className="region-chip compact">vendor-level</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="coverage-separator" />

        <div className="overlap-panel">
          <div className="section-title-row compact">
            <div>
              <div className="eyebrow">Multi-vendor overlap</div>
              <h3>Models and model families available through multiple qualifying vendors</h3>
            </div>
            <Badge variant="secondary">{filteredOverlaps.length} of {overlaps.length} overlaps</Badge>
          </div>
          <div className="coverage-toolbar compact">
            <div className="search-row overlap-search">
              <Search className="search-icon" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Search overlap: claude, gpt, qwen..."
                value={overlapQuery}
                onChange={(e) => setOverlapQuery(e.target.value)}
              />
              {overlapQuery && (
                <Button size="icon" variant="ghost" aria-label="Clear overlap search" onClick={() => setOverlapQuery("")}>
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
            <Select value={overlapPlatform} onValueChange={(value) => setOverlapPlatform(value ?? "All")}>
              <SelectTrigger className="coverage-select">
                <SelectValue placeholder="Filter overlap platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All overlap platforms</SelectItem>
                {overlapPlatforms.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overlap-grid">
            {filteredOverlaps.length === 0 ? (
              <div className="empty-state">No overlapping model families match this filter.</div>
            ) : null}
            {filteredOverlaps.map((row) => (
              <div className="overlap-row" key={`${row.family}-${row.platforms.join("-")}`}>
                <strong>{row.family}</strong>
                <div className="note">{row.models.join(", ")}</div>
                <div className="region-list">
                  {row.platforms.map((platform) => (
                    <span className="region-chip" key={`${row.family}-${platform}`}>{platform}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="coverage-separator" />

        <div className="coverage-toolbar">
          <div>
            <div className="eyebrow">All qualifying model rows</div>
            <div className="coverage-facts">
              <span>{filtered.length} models</span>
              <span>{inRegionCount} with strict EU In-Region</span>
              <span>{geoCount} with EU Geo routing</span>
              <span>{bedrockFiltered.length} AWS Bedrock rows</span>
              <span>{officialCount} official-source rows</span>
              {reportDerivedCount > 0 ? <span>{reportDerivedCount} report-derived rows</span> : null}
            </div>
          </div>
        </div>

        <div ref={tableContainerRef} className="tablewrap coverage-tablewrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Publisher</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>EU qualifying regions</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Fit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isVirtualized && topSpacerHeight > 0 && (
                <TableRow style={{ height: topSpacerHeight }}>
                  <TableCell colSpan={5} style={{ height: topSpacerHeight, padding: 0 }} />
                </TableRow>
              )}
              {visibleRows.map((row) => (
                <TableRow key={`${row.platform}-${row.provider}-${row.model}`}>
                  <TableCell>{row.provider}</TableCell>
                  <TableCell>
                    <div className="table-model">{row.model}</div>
                    <div className="note">{row.platform}</div>
                  </TableCell>
                  <TableCell>
                    <div className="region-list">
                      {row.regions.map((region) => (
                        <span className="region-chip" key={`${row.provider}-${row.model}-${region.code}`}>
                          {region.code}
                          <small>
                            {region.inRegion ? "I" : ""}
                            {region.euGeo ? "G" : ""}
                            {region.legacyEol ? ` EOL ${region.legacyEol}` : ""}
                          </small>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.sourceType === "official" ? "default" : "secondary"}>
                      {row.sourceType === "official" ? "Official" : "Report"}
                    </Badge>
                    {isUrl(row.source) ? (
                      <a className="source-link" href={row.source} target="_blank" rel="noreferrer">
                        Source
                      </a>
                    ) : (
                      <div className="note">{row.source}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.requirementFit === "sovereign" ? "EU sovereign" : "EU residency"}</Badge>
                    <div className="note">{row.evidenceNote}</div>
                  </TableCell>
                </TableRow>
              ))}
              {isVirtualized && bottomSpacerHeight > 0 && (
                <TableRow style={{ height: bottomSpacerHeight }}>
                  <TableCell colSpan={5} style={{ height: bottomSpacerHeight, padding: 0 }} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="caption">
          Legend: <strong>I</strong> = strict EU-region processing. <strong>G</strong> = EU geographic or EU-filtered
          processing. Rows without region chips use vendor-level evidence and must still be pinned to the qualifying
          EU endpoint before production.
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail: string }) {
  return (
    <Card className="metric-card">
      <CardContent>
        <div className="lbl">{label}</div>
        <div className="metric-value">{value}</div>
        <div className="note">{detail}</div>
      </CardContent>
    </Card>
  );
}

function FilterGroup({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="control-block">
      <div className="lbl">{title}</div>
      <div className="chips">{children}</div>
    </div>
  );
}

function CapabilityBadges({ capabilities }: { readonly capabilities: ReadonlyArray<Capability> }) {
  if (capabilities.length === 0) return <span className="note">No capability metadata</span>;
  return (
    <div className="capability-list">
      {capabilities.map((capability) => (
        <Badge className={`capability-badge capability-${capability}`} variant="secondary" key={capability}>
          {CAPABILITY_LABEL[capability]}
        </Badge>
      ))}
    </div>
  );
}

function RouteCard({
  route,
  rank,
  selected,
  onSelect,
}: {
  readonly route: RouteView;
  readonly rank: number;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
}) {
  const faster = route.throughput > REF_SPEED;
  const cheaper = route.blended < REF_BLENDED;
  return (
    <button className={`route-card${selected ? " selected" : ""}`} onClick={() => onSelect(route.id)}>
      <div className="rank-head">
        <span className="rank-number">#{rank}</span>
        <Badge style={{ background: `color-mix(in srgb, ${TIER_META[route.tier].color} 18%, white)`, color: "var(--core)" }}>
          Tier {route.tier}
        </Badge>
      </div>
      <div className="route-title">
        {route.name.replace(" (reference)", "")}
        {route.latest && <Badge variant="secondary">new</Badge>}
      </div>
      <div className="route-meta">{route.route}</div>
      <div className="route-kpis">
        <span style={{ color: cheaper ? "var(--growth)" : "var(--ink)" }}>{money(route.blended)}/1M</span>
        <span style={{ color: faster ? "var(--growth)" : "var(--ink)" }}>
          <Zap aria-hidden="true" /> {route.throughput} t/s
        </span>
        <span>{route.ttft.toFixed(2)}s TTFT</span>
      </div>
      <CapabilityBadges capabilities={route.capabilities} />
      <div className="reliability-bar" aria-label={`Reliability ${route.reliabilityScore}`}>
        <span style={{ width: `${route.reliabilityScore}%`, background: GRADE_COLOR[route.reliabilityGrade] }} />
      </div>
      <div className="note">
        {route.providers.join(", ")} · {route.maker} · {route.note}
      </div>
    </button>
  );
}

function RouteDetail({ route }: { readonly route: RouteView | null }) {
  if (!route) {
    return (
      <Card className="detail-panel">
        <CardContent>
          <div className="empty-state">Select a route to inspect the decision notes.</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="detail-panel">
      <CardHeader>
        <div className="eyebrow">Selected route</div>
        <CardTitle>{route.name.replace(" (reference)", "")}</CardTitle>
        <div className="detail-route">{route.route}</div>
      </CardHeader>
      <CardContent>
        <div className="detail-score">
          <span style={{ background: GRADE_COLOR[route.reliabilityGrade] }}>{route.reliabilityGrade}</span>
          <strong>{route.reliabilityScore}</strong>
          <small>reliability</small>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Boundary</dt>
            <dd>Tier {route.tier} · {TIER_META[route.tier].label}</dd>
          </div>
          <div>
            <dt>Providers</dt>
            <dd>{route.providers.join(", ")}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{MODE_LABEL[route.mode]}</dd>
          </div>
          <div>
            <dt>Capabilities</dt>
            <dd>
              <CapabilityBadges capabilities={route.capabilities} />
            </dd>
          </div>
          <div>
            <dt>Openness</dt>
            <dd>{route.openness}</dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd>{money(route.inputPrice)} in · {money(route.outputPrice)} out · {money(route.blended)} blended</dd>
          </div>
          <div>
            <dt>Latency</dt>
            <dd>{route.throughput} tokens/sec · {route.ttft.toFixed(2)}s TTFT</dd>
          </div>
          <div>
            <dt>SLA</dt>
            <dd>{route.slaPct !== null ? `${route.slaPct}%` : "No public SLA"} · {RISK_LABEL[route.availabilityRisk]}</dd>
          </div>
        </dl>
        <div className="detail-note">{route.reliabilityNote}</div>
      </CardContent>
    </Card>
  );
}

function RouteTable({
  rows,
  selectedId,
  onSelect,
}: {
  readonly rows: ReadonlyArray<RouteView>;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}) {
  return (
    <div className="tablewrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>EU route</TableHead>
            <TableHead>Capabilities</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Reliability</TableHead>
            <TableHead className="num">In</TableHead>
            <TableHead className="num">Out</TableHead>
            <TableHead className="num">t/s</TableHead>
            <TableHead className="num">TTFT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const faster = r.throughput > REF_SPEED;
            const cheaper = r.blended < REF_BLENDED;
            const isRef = r.name.includes("reference");
            const selected = selectedId === r.id;
            return (
              <TableRow
                key={r.id}
                data-selected={selected}
                data-reference={isRef}
                data-tier={r.tier}
                onClick={() => onSelect(r.id)}
              >
                <TableCell>
                  <div className="table-model">
                    {r.name.replace(" (reference)", "")}
                    {r.latest && <Badge variant="secondary">new</Badge>}
                  </div>
                  <div className="note">
                    {r.maker} · {r.note}
                  </div>
                </TableCell>
                <TableCell>{r.providers.join(", ")}</TableCell>
                <TableCell>{r.route}</TableCell>
                <TableCell>
                  <CapabilityBadges capabilities={r.capabilities} />
                </TableCell>
                <TableCell>
                  <Badge style={{ background: `color-mix(in srgb, ${TIER_META[r.tier].color} 18%, white)`, color: "var(--core)" }}>
                    {r.tier}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    style={{ background: `color-mix(in srgb, ${GRADE_COLOR[r.reliabilityGrade]} 22%, white)`, color: "var(--core)" }}
                    title={r.reliabilityNote}
                  >
                    {r.reliabilityGrade} · {r.reliabilityScore}
                  </Badge>
                  <div className="note">
                    {RISK_LABEL[r.availabilityRisk]}
                    {r.slaPct !== null ? ` · SLA ${r.slaPct}%` : " · no public SLA"}
                  </div>
                </TableCell>
                <TableCell className="num" style={{ color: cheaper ? "var(--growth)" : "var(--ink)" }}>
                  {money(r.inputPrice)}
                </TableCell>
                <TableCell className="num">{money(r.outputPrice)}</TableCell>
                <TableCell className="num" style={{ fontWeight: faster ? 700 : 500, color: faster ? "var(--growth)" : "var(--ink)" }}>
                  {r.throughput}
                </TableCell>
                <TableCell className="num">{r.ttft.toFixed(2)}s</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RouteChart({
  rows,
  metric,
  selectedId,
  onSelect,
}: {
  readonly rows: ReadonlyArray<RouteView>;
  readonly metric: "throughput" | "ttft";
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}) {
  const points = rows
    .filter((r) => r.tier !== "C")
    .map((r) => ({
      ...r,
      xMetric: metric === "throughput" ? r.throughput : r.ttft,
      yCost: r.blended,
      zReliability: Math.max(70, r.reliabilityScore * 1.2),
    }));
  const byTier = (tier: Tier) => points.filter((p) => p.tier === tier);
  const maxCost = Math.max(REF_BLENDED, ...points.map((p) => p.yCost), 1);

  return (
    <ChartContainer config={chartConfig} className="route-chart h-[360px] w-full">
      <ScatterChart margin={{ left: 4, right: 18, top: 10, bottom: 12 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          type="number"
          dataKey="xMetric"
          name={metric === "throughput" ? "Throughput" : "TTFT"}
          unit={metric === "throughput" ? " t/s" : "s"}
          reversed={metric === "ttft"}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          type="number"
          dataKey="yCost"
          name="Blended price"
          unit="/1M"
          domain={[0, Math.ceil(maxCost)]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ZAxis type="number" dataKey="zReliability" range={[80, 220]} />
        <ReferenceLine y={REF_BLENDED} stroke="var(--coral)" strokeDasharray="5 5" label="gpt-5-mini blended" />
        <ChartTooltip cursor={{ strokeDasharray: "4 4" }} content={<RouteTooltip />} />
        {(["A", "B"] as const).map((tier) => (
          <Scatter
            key={tier}
            name={TIER_META[tier].label}
            data={byTier(tier)}
            fill={TIER_META[tier].color}
            stroke="var(--core)"
            strokeWidth={1}
            onClick={(point) => {
              const payload = (point as { payload?: ChartPoint }).payload;
              if (payload) onSelect(payload.id);
            }}
            shape={(props: unknown) => <ChartDot {...(props as { cx?: number; cy?: number; payload?: ChartPoint })} selectedId={selectedId} />}
          />
        ))}
      </ScatterChart>
    </ChartContainer>
  );
}

function ChartDot({ cx, cy, payload, selectedId }: { readonly cx?: number; readonly cy?: number; readonly payload?: ChartPoint; readonly selectedId: string | null }) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const selected = payload.id === selectedId;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={selected ? 8 : 5.5}
      fill={TIER_META[payload.tier].color}
      stroke={selected ? "var(--core)" : GRADE_COLOR[payload.reliabilityGrade]}
      strokeWidth={selected ? 3 : 2}
      className="chart-dot"
    />
  );
}

function RouteTooltip({ active, payload }: { readonly active?: boolean; readonly payload?: ReadonlyArray<{ readonly payload?: ChartPoint }> }) {
  const route = payload?.[0]?.payload;
  if (!active || !route) return null;
  return (
    <div className="route-tooltip">
      <div className="table-model">{route.name.replace(" (reference)", "")}</div>
      <div className="note">{route.route}</div>
      <Separator />
      <div className="tooltip-grid">
        <span>Tier</span>
        <strong>{route.tier} · {TIER_META[route.tier].label}</strong>
        <span>Cost</span>
        <strong>{money(route.blended)}/1M</strong>
        <span>Speed</span>
        <strong>{route.throughput} t/s · {route.ttft.toFixed(2)}s TTFT</strong>
        <span>Reliability</span>
        <strong>{route.reliabilityGrade} · {route.reliabilityScore}</strong>
      </div>
    </div>
  );
}
