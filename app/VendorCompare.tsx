"use client";

import { ArrowDown, ArrowUp, Search, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { RouteView, Tier } from "@/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

/**
 * Model-first comparison. Every EU model is scored against ONE pinned Azure
 * baseline (the model Blinqx runs today), so the question is never "vendor A vs
 * vendor B" — it is "does this model beat what we already pay for, and where".
 *
 * Layout follows the clean operational-dashboard pattern: a status block up top
 * (the baseline + the headline counts), then one scannable table. No vendor
 * pairing, no nested cards, no empty matrix cells.
 */

const AZURE_TAG = "Azure";
const DEFAULT_BASELINE_ID = "azure-gpt-5-nano";

const TIER_LABEL: Record<Tier, string> = {
  A: "EU-sovereign",
  B: "EU-residency",
  C: "Rejected",
};
const TIER_COLOR: Record<Tier, string> = {
  A: "var(--tier-a)",
  B: "var(--tier-b)",
  C: "var(--tier-c)",
};

type BenchmarkKey = "intelligenceIndex" | "codingIndex" | "reasoningScore";
type SortKey = "fit" | "cost" | "throughput" | "ttft" | "reliability" | BenchmarkKey | "name";

const SORT_LABEL: Record<SortKey, string> = {
  fit: "Best replacement first",
  cost: "Cheapest first",
  throughput: "Fastest first",
  ttft: "Lowest TTFT",
  reliability: "Most reliable",
  intelligenceIndex: "Highest intelligence",
  codingIndex: "Highest coding",
  reasoningScore: "Highest reasoning",
  name: "Name",
};

type BenchmarkedRouteView = RouteView & {
  readonly intelligenceIndex?: number | null;
  readonly codingIndex?: number | null;
  readonly reasoningScore?: number | null;
  readonly benchmarkSource?: string;
};

const BENCHMARK_HELP: Record<BenchmarkKey, string> = {
  intelligenceIndex: "Artificial Analysis Intelligence Index or equivalent public benchmark",
  codingIndex: "Coding/SWE benchmark composite",
  reasoningScore: "GPQA Diamond or equivalent reasoning benchmark",
};

interface CompareFilters {
  readonly search: string;
  readonly sort: SortKey;
  readonly sovereignOnly: boolean;
  readonly openOnly: boolean;
  readonly reasoningOnly: boolean;
  readonly showRejected: boolean;
}

const INITIAL_FILTERS: CompareFilters = {
  search: "",
  sort: "fit",
  sovereignOnly: false,
  openOnly: false,
  reasoningOnly: false,
  showRejected: false,
};

const money = (v: number): string => `$${v.toFixed(v < 1 ? 2 : 1)}`;
const cleanName = (s: string): string => s.replace(" (reference)", "");
const pct = (value: number, base: number): number => (base === 0 ? 0 : ((value - base) / base) * 100);
const score = (row: RouteView, key: BenchmarkKey): number | null => {
  const value = (row as BenchmarkedRouteView)[key];
  return typeof value === "number" ? value : null;
};
const benchmarkSource = (row: RouteView): string => (row as BenchmarkedRouteView).benchmarkSource ?? "";
const scoreDelta = (row: RouteView, base: RouteView, key: BenchmarkKey): number | null => {
  const rowScore = score(row, key);
  const baseScore = score(base, key);
  return rowScore === null || baseScore === null ? null : rowScore - baseScore;
};

interface Delta {
  readonly cheaper: boolean;
  readonly faster: boolean;
  readonly lowerLatency: boolean;
  readonly moreReliable: boolean;
  readonly sovereignUpgrade: boolean;
  readonly costPct: number;
  readonly speedPct: number;
  readonly ttftPct: number;
  readonly reliabilityDelta: number;
  readonly intelligenceDelta: number | null;
  readonly codingDelta: number | null;
  readonly reasoningDelta: number | null;
}

const deltaVs = (row: RouteView, base: RouteView): Delta => ({
  cheaper: row.blended < base.blended,
  faster: row.throughput > base.throughput,
  lowerLatency: row.ttft < base.ttft,
  moreReliable: row.reliabilityScore > base.reliabilityScore,
  sovereignUpgrade: row.tier === "A" && base.tier !== "A",
  costPct: pct(row.blended, base.blended),
  speedPct: pct(row.throughput, base.throughput),
  ttftPct: pct(row.ttft, base.ttft),
  reliabilityDelta: row.reliabilityScore - base.reliabilityScore,
  intelligenceDelta: scoreDelta(row, base, "intelligenceIndex"),
  codingDelta: scoreDelta(row, base, "codingIndex"),
  reasoningDelta: scoreDelta(row, base, "reasoningScore"),
});

/** Higher = better replacement for the baseline. Sovereignty dominates. */
const fitScore = (d: Delta): number =>
  (d.sovereignUpgrade ? 4 : 0) +
  (d.cheaper ? 2 : 0) +
  (d.moreReliable ? 1 : 0) +
  (d.faster ? 1 : 0) +
  (d.lowerLatency ? 1 : 0) +
  (d.intelligenceDelta !== null && d.intelligenceDelta > 0 ? 0.5 : 0) +
  (d.codingDelta !== null && d.codingDelta > 0 ? 0.5 : 0) +
  (d.reasoningDelta !== null && d.reasoningDelta > 0 ? 0.5 : 0);

const benchmarkDeltaOf = (delta: Delta, key: BenchmarkKey): number | null => {
  switch (key) {
    case "intelligenceIndex":
      return delta.intelligenceDelta;
    case "codingIndex":
      return delta.codingDelta;
    case "reasoningScore":
      return delta.reasoningDelta;
    default:
      return null;
  }
};

const numericScore = (row: RouteView, key: BenchmarkKey): number => score(row, key) ?? Number.NEGATIVE_INFINITY;

const routeMatches = (row: RouteView, baseline: RouteView, filters: CompareFilters): boolean => {
  if (row.id === baseline.id) return false;
  if (!filters.showRejected && row.tier === "C") return false;
  if (filters.sovereignOnly && row.tier !== "A") return false;
  if (filters.openOnly && row.openness === "proprietary") return false;
  if (filters.reasoningOnly && row.mode !== "reasoning" && row.mode !== "configurable") return false;

  const q = filters.search.trim().toLowerCase();
  if (!q) return true;

  return (
    row.name.toLowerCase().includes(q) ||
    row.maker.toLowerCase().includes(q) ||
    row.route.toLowerCase().includes(q) ||
    row.providers.some((p) => p.toLowerCase().includes(q))
  );
};

export function VendorCompare({
  routes,
  vendor,
  setVendor,
}: {
  readonly routes: ReadonlyArray<RouteView>;
  readonly vendor: string;
  readonly setVendor: (val: string) => void;
}) {
  const [filters, setFilters] = useState<CompareFilters>(INITIAL_FILTERS);
  const patch = (p: Partial<CompareFilters>) => setFilters((f) => ({ ...f, ...p }));

  const azureModels = useMemo(
    () => routes.filter((r) => r.providers.includes(AZURE_TAG)).toSorted((a, b) => a.blended - b.blended),
    [routes],
  );

  const [baselineId, setBaselineId] = useState<string>(
    azureModels.some((r) => r.id === DEFAULT_BASELINE_ID) ? DEFAULT_BASELINE_ID : (azureModels[0]?.id ?? ""),
  );
  const baseline = azureModels.find((r) => r.id === baselineId) ?? azureModels[0] ?? null;

  const rows = useMemo(() => {
    if (!baseline) return [];
    const filtered = routes.filter((r) => routeMatches(r, baseline, filters));
    return filtered
      .map((r) => ({ row: r, delta: deltaVs(r, baseline) }))
      .toSorted((a, b) => {
        switch (filters.sort) {
          case "cost":
            return a.row.blended - b.row.blended;
          case "throughput":
            return b.row.throughput - a.row.throughput;
          case "ttft":
            return a.row.ttft - b.row.ttft;
          case "reliability":
            return b.row.reliabilityScore - a.row.reliabilityScore;
          case "intelligenceIndex":
          case "codingIndex":
          case "reasoningScore":
            return numericScore(b.row, filters.sort) - numericScore(a.row, filters.sort);
          case "name":
            return cleanName(a.row.name).localeCompare(cleanName(b.row.name));
          default:
            return fitScore(b.delta) - fitScore(a.delta) || a.row.blended - b.row.blended;
        }
      });
  }, [routes, baseline, filters]);

  if (!baseline) return null;

  const cheaperCount = rows.filter((r) => r.delta.cheaper).length;
  const fasterCount = rows.filter((r) => r.delta.faster).length;
  const sovereignCount = rows.filter((r) => r.delta.sovereignUpgrade).length;

  return (
    <section className="mf-shell">
      <header className="mf-head">
        <h2>Model comparison</h2>
        <p>Every EU model measured against the Azure model you run today — cost, latency, reliability and sovereignty.</p>
      </header>

      <div className="mf-status">
        <div className="mf-status-head">
          <div>
            <div className="mf-eyebrow">Current Azure baseline</div>
            <div className="mf-baseline-name">{cleanName(baseline.name)}</div>
          </div>
          <div className="mf-baseline-pick">
            <span>Baseline</span>
            <Select value={baseline.id} onValueChange={(value) => value && setBaselineId(value)}>
              <SelectTrigger className="mf-baseline-trigger">
                <span data-slot="select-value">
                  {cleanName(baseline.name)} · {money(baseline.blended)}/1M
                </span>
              </SelectTrigger>
              <SelectContent>
                {azureModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {cleanName(m.name)} · {money(m.blended)}/1M
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mf-baseline-metrics">
          <BaseStat label="Blended" value={`${money(baseline.blended)}/1M`} />
          <BaseStat label="Speed" value={`${baseline.throughput} t/s`} />
          <BaseStat label="TTFT" value={`${baseline.ttft.toFixed(2)}s`} />
          <BaseStat label="Reliability" value={`${baseline.reliabilityGrade} · ${baseline.reliabilityScore}`} />
          <BaseStat label="Intelligence" value={formatScore(score(baseline, "intelligenceIndex"))} />
          <BaseStat label="Coding" value={formatScore(score(baseline, "codingIndex"))} />
          <BaseStat label="Reasoning" value={formatScore(score(baseline, "reasoningScore"))} />
          <BaseStat label="Host" value={baseline.route} />
        </div>

        <div className="mf-baseline-note" role="note">
          <ShieldAlert size={15} aria-hidden="true" />
          <span>
            {TIER_LABEL[baseline.tier]} (Tier {baseline.tier}). {baseline.reliabilityNote}
          </span>
        </div>

        <div className="mf-counts">
          <Count value={cheaperCount} label="cheaper" />
          <Count value={fasterCount} label="faster" />
          <Count value={sovereignCount} label="sovereign upgrades" highlight />
          <Count value={rows.length} label="models compared" />
        </div>
      </div>

      <div className="mf-controls">
        <div className="mf-search">
          <Search size={15} className="mf-search-icon" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search model, maker or host…"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
          />
          {filters.search && (
            <Button size="icon" variant="ghost" aria-label="Clear search" onClick={() => patch({ search: "" })}>
              <X size={14} aria-hidden="true" />
            </Button>
          )}
        </div>
        <div className="mf-chips">
          <Chip active={filters.sovereignOnly} onClick={() => patch({ sovereignOnly: !filters.sovereignOnly })}>
            EU-sovereign only
          </Chip>
          <Chip active={filters.openOnly} onClick={() => patch({ openOnly: !filters.openOnly })}>
            Open-weight
          </Chip>
          <Chip active={filters.reasoningOnly} onClick={() => patch({ reasoningOnly: !filters.reasoningOnly })}>
            Reasoning
          </Chip>
          <Chip active={filters.showRejected} onClick={() => patch({ showRejected: !filters.showRejected })}>
            Show rejected
          </Chip>
        </div>
        <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as SortKey })}>
          <SelectTrigger className="mf-sort">
            <span data-slot="select-value">{SORT_LABEL[filters.sort]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fit">Best replacement first</SelectItem>
            <SelectItem value="cost">Cheapest first</SelectItem>
            <SelectItem value="throughput">Fastest first</SelectItem>
            <SelectItem value="ttft">Lowest TTFT</SelectItem>
            <SelectItem value="reliability">Most reliable</SelectItem>
            <SelectItem value="intelligenceIndex">Highest intelligence</SelectItem>
            <SelectItem value="codingIndex">Highest coding</SelectItem>
            <SelectItem value="reasoningScore">Highest reasoning</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mf-tablewrap">
        <table className="mf-table">
          <thead>
            <tr>
              <th className="mf-col-model">Model</th>
              <th>Provider</th>
              <th className="mf-num">
                <SortHead active={filters.sort === "intelligenceIndex"} onClick={() => patch({ sort: "intelligenceIndex" })}>
                  Intelligence
                </SortHead>
              </th>
              <th className="mf-num">
                <SortHead active={filters.sort === "codingIndex"} onClick={() => patch({ sort: "codingIndex" })}>
                  Coding
                </SortHead>
              </th>
              <th className="mf-num">
                <SortHead active={filters.sort === "reasoningScore"} onClick={() => patch({ sort: "reasoningScore" })}>
                  Reasoning
                </SortHead>
              </th>
              <th className="mf-num">
                <SortHead active={filters.sort === "cost"} onClick={() => patch({ sort: "cost" })}>
                  Cost / 1M
                </SortHead>
              </th>
              <th className="mf-num">
                <SortHead active={filters.sort === "throughput"} onClick={() => patch({ sort: "throughput" })}>
                  Speed
                </SortHead>
              </th>
              <th className="mf-num">
                <SortHead active={filters.sort === "ttft"} onClick={() => patch({ sort: "ttft" })}>
                  TTFT
                </SortHead>
              </th>
              <th className="mf-num">
                <SortHead active={filters.sort === "reliability"} onClick={() => patch({ sort: "reliability" })}>
                  Reliability
                </SortHead>
              </th>
              <th>Sovereignty</th>
              <th>Vs baseline</th>
            </tr>
          </thead>
          <tbody>
            <tr className="mf-baseline-row">
              <td className="mf-col-model">
                <div className="mf-model-name">{cleanName(baseline.name)}</div>
                <div className="mf-model-sub">{baseline.maker}</div>
              </td>
              <td>{baseline.providers.join(", ")}</td>
              <BenchmarkCell row={baseline} baseline={baseline} benchmarkKey="intelligenceIndex" />
              <BenchmarkCell row={baseline} baseline={baseline} benchmarkKey="codingIndex" />
              <BenchmarkCell row={baseline} baseline={baseline} benchmarkKey="reasoningScore" />
              <td className="mf-num">{money(baseline.blended)}</td>
              <td className="mf-num">{baseline.throughput} t/s</td>
              <td className="mf-num">{baseline.ttft.toFixed(2)}s</td>
              <td className="mf-num">{baseline.reliabilityGrade} · {baseline.reliabilityScore}</td>
              <td>
                <TierBadge tier={baseline.tier} />
              </td>
              <td>
                <span className="mf-pill mf-pill-base">Current baseline</span>
              </td>
            </tr>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="mf-empty">No models match these filters.</div>
                </td>
              </tr>
            ) : (
              rows.map(({ row, delta }) => {
                const isActive = row.providers.includes(vendor) || row.maker === vendor;
                return (
                  <tr
                    key={row.id}
                    className={isActive ? "mf-row-active" : undefined}
                    onClick={() => setVendor(row.providers[0] ?? row.maker)}
                  >
                    <td className="mf-col-model">
                      <div className="mf-model-name">
                        {cleanName(row.name)}
                        {row.latest && <span className="mf-tag-new">new</span>}
                      </div>
                      <div className="mf-model-sub">{row.maker} · {row.route}</div>
                    </td>
                    <td>{row.providers.join(", ")}</td>
                    <BenchmarkCell row={row} baseline={baseline} benchmarkKey="intelligenceIndex" delta={delta} />
                    <BenchmarkCell row={row} baseline={baseline} benchmarkKey="codingIndex" delta={delta} />
                    <BenchmarkCell row={row} baseline={baseline} benchmarkKey="reasoningScore" delta={delta} />
                    <td className="mf-num">
                      <div>{money(row.blended)}</div>
                      <DeltaNote value={delta.costPct} good="down" />
                    </td>
                    <td className="mf-num">
                      <div>{row.throughput} t/s</div>
                      <DeltaNote value={delta.speedPct} good="up" />
                    </td>
                    <td className="mf-num">
                      <div>{row.ttft.toFixed(2)}s</div>
                      <DeltaNote value={delta.ttftPct} good="down" />
                    </td>
                    <td className="mf-num">
                      <div>{row.reliabilityGrade} · {row.reliabilityScore}</div>
                      <span className={`mf-delta ${delta.reliabilityDelta > 0 ? "good" : delta.reliabilityDelta < 0 ? "bad" : ""}`}>
                        {delta.reliabilityDelta > 0 ? "+" : ""}{delta.reliabilityDelta}
                      </span>
                    </td>
                    <td>
                      <TierBadge tier={row.tier} />
                    </td>
                    <td>
                      <Verdict delta={delta} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mf-caption">
        Deltas are relative to {cleanName(baseline.name)}. Prices mix USD/EUR as published — verify official pricing before
        production. Tier C (public, non-EU) is hidden by default.
      </p>
      <p className="mf-caption">
        Benchmark columns use public 0-100 scores when available; blank cells mean the shared catalog has no sourced score yet.
      </p>
    </section>
  );
}

function BaseStat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="mf-basestat">
      <span className="mf-basestat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Count({ value, label, highlight }: { readonly value: number; readonly label: string; readonly highlight?: boolean }) {
  return (
    <div className={`mf-count${highlight ? " highlight" : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Chip({ active, onClick, children }: { readonly active: boolean; readonly onClick: () => void; readonly children: React.ReactNode }) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} className="mf-chip" onClick={onClick}>
      {children}
    </Button>
  );
}

function SortHead({ active, onClick, children }: { readonly active: boolean; readonly onClick: () => void; readonly children: React.ReactNode }) {
  return (
    <button type="button" className={`mf-sort-head${active ? " active" : ""}`} onClick={onClick}>
      {children}
      {active ? <ArrowDown size={11} aria-hidden="true" /> : null}
    </button>
  );
}

function formatScore(value: number | null): string {
  return value === null ? "—" : value.toFixed(value % 1 === 0 ? 0 : 1);
}

function BenchmarkCell({
  row,
  baseline,
  benchmarkKey,
  delta,
}: {
  readonly row: RouteView;
  readonly baseline: RouteView;
  readonly benchmarkKey: BenchmarkKey;
  readonly delta?: Delta;
}) {
  const value = score(row, benchmarkKey);
  const baseValue = score(baseline, benchmarkKey);
  const source = benchmarkSource(row);
  const benchmarkDelta = delta ? benchmarkDeltaOf(delta, benchmarkKey) : 0;
  const help = source || BENCHMARK_HELP[benchmarkKey];

  return (
    <td className="mf-num mf-benchmark-cell" title={help}>
      <div>{formatScore(value)}</div>
      {value === null ? (
        <span className="mf-delta">No score</span>
      ) : baseValue === null && row.id !== baseline.id ? (
        <span className="mf-delta">Baseline n/a</span>
      ) : benchmarkDelta === null ? (
        <span className="mf-delta">No delta</span>
      ) : row.id === baseline.id ? (
        <span className="mf-delta">Baseline</span>
      ) : (
        <ScoreDelta value={benchmarkDelta} />
      )}
    </td>
  );
}

function TierBadge({ tier }: { readonly tier: Tier }) {
  return (
    <span className="mf-tier">
      <span className="mf-dot" style={{ background: TIER_COLOR[tier] }} />
      {tier} · {TIER_LABEL[tier]}
    </span>
  );
}

function DeltaNote({ value, good, suffix = "" }: { readonly value: number; readonly good: "up" | "down"; readonly suffix?: string }) {
  const rounded = Math.round(value);
  if (rounded === 0) return <span className="mf-delta">±0%{suffix}</span>;
  const isGood = good === "down" ? rounded < 0 : rounded > 0;
  const Arrow = rounded > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`mf-delta ${isGood ? "good" : "bad"}`}>
      <Arrow size={11} aria-hidden="true" />
      {Math.abs(rounded)}%{suffix}
    </span>
  );
}

function ScoreDelta({ value }: { readonly value: number }) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return <span className="mf-delta">±0 pts</span>;
  return (
    <span className={`mf-delta ${rounded > 0 ? "good" : "bad"}`}>
      {rounded > 0 ? "+" : ""}
      {rounded.toFixed(Math.abs(rounded) % 1 === 0 ? 0 : 1)} pts
    </span>
  );
}

function Verdict({ delta }: { readonly delta: Delta }) {
  const wins: Array<string> = [];
  if (delta.sovereignUpgrade) wins.push("Sovereign");
  if (delta.cheaper) wins.push("Cheaper");
  if (delta.faster) wins.push("Faster");
  if (delta.lowerLatency) wins.push("Lower TTFT");
  if (delta.moreReliable) wins.push("More reliable");

  if (wins.length === 0) {
    return <span className="mf-pill mf-pill-flat">No edge vs baseline</span>;
  }
  const strong = delta.sovereignUpgrade || wins.length >= 2;
  return (
    <span className={`mf-pill ${strong ? "mf-pill-good" : "mf-pill-soft"}`}>
      {delta.sovereignUpgrade ? <ShieldCheck size={12} aria-hidden="true" /> : null}
      {wins.join(" · ")}
    </span>
  );
}
