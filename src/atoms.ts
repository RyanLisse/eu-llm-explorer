import { Atom } from "@effect-atom/atom-react";
import {
  DEFAULT_COMPARE_STATE,
  DEFAULT_UI_STATE,
  INITIAL_FILTERS,
  type AgentFilterState,
  type AppTab,
  type CompareState,
  type UiState,
} from "@/agent/constants";

/**
 * Client filter state. One keep-alive atom holds the whole filter object so the
 * explorer survives re-mounts; components read with useAtomValue and write with
 * useAtomSet (never mutate imperatively).
 */
export type FilterState = AgentFilterState;
export { INITIAL_FILTERS };

export const filterAtom = Atom.make(INITIAL_FILTERS).pipe(Atom.keepAlive);

export const selectedRouteAtom = Atom.make<string | null>(null).pipe(Atom.keepAlive);

export const activeTabAtom = Atom.make<AppTab>(DEFAULT_UI_STATE.activeTab).pipe(Atom.keepAlive);

export const uiStateAtom = Atom.make<UiState>(DEFAULT_UI_STATE).pipe(Atom.keepAlive);

export const compareStateAtom = Atom.make<CompareState>(DEFAULT_COMPARE_STATE).pipe(Atom.keepAlive);
