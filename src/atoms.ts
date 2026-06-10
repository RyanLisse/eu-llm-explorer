import { Atom } from "@effect-atom/atom-react";
import type { Capability, Mode, Tier } from "@/domain";

/**
 * Client filter state. One keep-alive atom holds the whole filter object so the
 * explorer survives re-mounts; components read with useAtomValue and write with
 * useAtomSet (never mutate imperatively).
 */
export interface FilterState {
  readonly tiers: Record<Tier, boolean>;
  readonly modes: Record<Mode, boolean>;
  readonly capabilities: Record<Capability, boolean>;
  readonly makers: Record<string, boolean>;
  readonly providers: Record<string, boolean>;
  readonly openOnly: boolean;
  readonly maxBlended: number;
  /** x-axis metric for the scatter plot. */
  readonly metric: "throughput" | "ttft";
  readonly sort: "reliability" | "blended" | "throughput" | "ttft" | "tier" | "name";
  /** Minimum reliability score (0 = show all). */
  readonly minReliability: number;
  readonly search: string;
}

export const INITIAL_FILTERS: FilterState = {
  tiers: { A: true, B: true, C: false },
  modes: { reasoning: true, "non-reasoning": true, configurable: true },
  capabilities: { vision: false, tools: false, cache: false, think: false, web: false, json: false },
  makers: {},
  providers: {},
  openOnly: false,
  maxBlended: 8,
  metric: "throughput",
  sort: "reliability",
  minReliability: 0,
  search: "",
};

export const filterAtom = Atom.make(INITIAL_FILTERS).pipe(Atom.keepAlive);

export const selectedRouteAtom = Atom.make<string | null>(null).pipe(Atom.keepAlive);
