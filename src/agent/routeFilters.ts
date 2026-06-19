import { CAPABILITY_KEYS, type AgentFilterState } from "./constants";
import type { RouteView, Tier } from "../domain";

export interface RouteVisibilityCounts {
  readonly routeCount: number;
  readonly visibleRouteCount: number;
  readonly usableRouteCount: number;
  readonly sovereignRouteCount: number;
}

export function getVisibleRoutes(
  routes: ReadonlyArray<RouteView>,
  filters: AgentFilterState,
): ReadonlyArray<RouteView> {
  const q = filters.search.trim().toLowerCase();
  const activeProviders = Object.entries(filters.providers)
    .filter(([, on]) => on)
    .map(([name]) => name);
  const activeCapabilities = CAPABILITY_KEYS.filter((capability) => filters.capabilities[capability]);

  const rows = routes.filter((route) => {
    if (!filters.tiers[route.tier]) return false;
    if (!filters.modes[route.mode]) return false;
    if (Object.keys(filters.makers).length > 0 && filters.makers[route.maker] === false) return false;
    if (activeProviders.length > 0 && !route.providers.some((provider) => activeProviders.includes(provider))) return false;
    if (
      activeCapabilities.length > 0 &&
      !activeCapabilities.every((capability) => route.capabilities.includes(capability))
    ) {
      return false;
    }
    if (filters.openOnly && route.openness === "proprietary") return false;
    if (route.blended > filters.maxBlended) return false;
    if (route.reliabilityScore < filters.minReliability) return false;
    if (
      q &&
      !route.name.toLowerCase().includes(q) &&
      !route.maker.toLowerCase().includes(q) &&
      !route.providers.some((provider) => provider.toLowerCase().includes(q)) &&
      !route.route.toLowerCase().includes(q) &&
      !route.note.toLowerCase().includes(q)
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
}

export function getRouteVisibilityCounts(
  routes: ReadonlyArray<RouteView>,
  filters: AgentFilterState,
): RouteVisibilityCounts {
  const visibleRoutes = getVisibleRoutes(routes, filters);
  return {
    routeCount: routes.length,
    visibleRouteCount: visibleRoutes.length,
    usableRouteCount: visibleRoutes.filter((route) => route.tier !== "C").length,
    sovereignRouteCount: visibleRoutes.filter((route) => route.tier === "A").length,
  };
}
