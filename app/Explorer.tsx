"use client";

import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Brain, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Weight, X, Zap } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
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
import type { Capability, Mode, RouteView, Tier } from "@/domain";
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
