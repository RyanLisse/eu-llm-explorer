"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CAPABILITY_KEYS } from "@/agent/constants";
import type { Capability, RouteView } from "@/domain";

/**
 * Requesty.ai/models-style dense, dark, filterable catalog of EU-only routes.
 * Pure client view over the `routes` already loaded by the server — no fetching.
 */

type SortKey = "name" | "inputPrice" | "outputPrice" | "contextWindow";

const TOKEN_FORMAT = new Intl.NumberFormat("en-US");

/** Tokens → grouped integer string (e.g. 262144 → "262,144"). */
const formatTokens = (n: number): string => TOKEN_FORMAT.format(n);

/** USD per 1M tokens → "$0.60". */
const formatPrice = (n: number): string => `$${n.toFixed(2)}`;

const CAPABILITY_LABEL: Record<Capability, string> = {
  vision: "Vision",
  tools: "Tools",
  cache: "Caching",
  think: "Reasoning",
  web: "Web",
  json: "JSON",
};

const capabilityLabel = (cap: Capability): string => CAPABILITY_LABEL[cap];

/**
 * Deterministic HSL color per maker so a provider's dot/legend stays stable
 * across renders without maintaining a hand-keyed color map.
 */
const makerColor = (maker: string): string => {
  let hash = 0;
  for (let i = 0; i < maker.length; i += 1) {
    hash = (hash * 31 + maker.charCodeAt(i)) % 360;
  }
  const hue = hash % 360;
  return `hsl(${hue} 70% 55%)`;
};

const SORT_OPTIONS: ReadonlyArray<{
  readonly key: SortKey;
  readonly label: string;
}> = [
  { key: "name", label: "Name" },
  { key: "inputPrice", label: "Input price" },
  { key: "outputPrice", label: "Output price" },
  { key: "contextWindow", label: "Context" },
];

/** Toggle membership of `value` in an immutable Set, returning a new Set. */
const toggleInSet = <T,>(set: ReadonlySet<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

export function ModelCatalog({
  routes,
}: {
  readonly routes: ReadonlyArray<RouteView>;
}) {
  // EU-only: Tier A (sovereign) + Tier B (EU residency). All downstream logic
  // operates on this subset.
  const euRoutes = useMemo(
    () => routes.filter((r) => r.tier === "A" || r.tier === "B"),
    [routes]
  );

  const makers = useMemo(
    () =>
      Array.from(new Set(euRoutes.map((r) => r.maker))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [euRoutes]
  );

  const [search, setSearch] = useState("");
  const [activeMakers, setActiveMakers] = useState<ReadonlySet<string>>(
    new Set()
  );
  const [activeCaps, setActiveCaps] = useState<ReadonlySet<Capability>>(
    new Set()
  );
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = euRoutes.filter((r) => {
      // Search matches model name OR maker (case-insensitive substring).
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.maker.toLowerCase().includes(q)
      )
        return false;
      // Provider chips: OR within the provider group.
      if (activeMakers.size > 0 && !activeMakers.has(r.maker)) return false;
      // Capability chips: OR within the capability group — a model matches if it
      // has ANY selected capability (typical catalog filter behavior). Provider
      // and capability groups combine with AND.
      if (activeCaps.size > 0 && !r.capabilities.some((c) => activeCaps.has(c)))
        return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "inputPrice":
          return a.inputPrice - b.inputPrice;
        case "outputPrice":
          return a.outputPrice - b.outputPrice;
        case "contextWindow":
          return b.contextWindow - a.contextWindow;
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [euRoutes, search, activeMakers, activeCaps, sortKey]);

  return (
    <div className="model-catalog">
      <div className="mc-filterbar">
        <div className="mc-searchrow">
          <div className="mc-search">
            <Search aria-hidden="true" size={14} />
            <input
              aria-label="Search models"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search model or provider…"
              type="search"
              value={search}
            />
          </div>
          <label className="mc-sort">
            <span>Sort</span>
            <select
              aria-label="Sort models"
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              value={sortKey}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <span className="mc-count">{visible.length} EU models</span>
        </div>

        <div className="mc-group">
          <span className="mc-group-label">Providers</span>
          <div className="mc-chips">
            {makers.map((maker) => (
              <button
                aria-pressed={activeMakers.has(maker)}
                className={`mc-chip${activeMakers.has(maker) ? " is-active" : ""}`}
                key={maker}
                onClick={() =>
                  setActiveMakers((prev) => toggleInSet(prev, maker))
                }
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="mc-dot"
                  style={{ background: makerColor(maker) }}
                />
                {maker}
              </button>
            ))}
          </div>
        </div>

        <div className="mc-group">
          <span className="mc-group-label">Capabilities</span>
          <div className="mc-chips">
            {CAPABILITY_KEYS.map((cap) => (
              <button
                aria-pressed={activeCaps.has(cap)}
                className={`mc-chip mc-chip-cap cap-${cap}${activeCaps.has(cap) ? " is-active" : ""}`}
                key={cap}
                onClick={() => setActiveCaps((prev) => toggleInSet(prev, cap))}
                type="button"
              >
                {capabilityLabel(cap)}
              </button>
            ))}
          </div>
        </div>

        <div className="mc-group">
          <span className="mc-group-label">Region</span>
          <div className="mc-chips">
            <span aria-disabled="true" className="mc-chip mc-region is-active">
              EU
            </span>
          </div>
        </div>
      </div>

      <div className="mc-table-scroll">
        <table className="mc-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Provider</th>
              <th className="mc-num">Context</th>
              <th className="mc-num">Max output</th>
              <th className="mc-num">Input/1M</th>
              <th className="mc-num">Output/1M</th>
              <th>Capabilities</th>
              <th>Region</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr className="mc-empty">
                <td colSpan={8}>No EU models match the current filters.</td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id}>
                  <td className="mc-model">{r.name}</td>
                  <td className="mc-provider">
                    <span
                      aria-hidden="true"
                      className="mc-dot"
                      style={{ background: makerColor(r.maker) }}
                    />
                    {r.maker}
                  </td>
                  <td className="mc-num">{formatTokens(r.contextWindow)}</td>
                  <td className="mc-num">
                    {r.maxOutput === null ? "—" : formatTokens(r.maxOutput)}
                  </td>
                  <td className="mc-num">{formatPrice(r.inputPrice)}</td>
                  <td className="mc-num">{formatPrice(r.outputPrice)}</td>
                  <td>
                    <div className="mc-badges">
                      {r.capabilities.map((cap) => (
                        <span className={`mc-badge cap-${cap}`} key={cap}>
                          {capabilityLabel(cap)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="mc-badge mc-region-badge">EU</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
