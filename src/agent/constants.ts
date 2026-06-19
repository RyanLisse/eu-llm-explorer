import type { Capability, Mode, Tier } from "../domain";

export const CAPABILITY_KEYS: ReadonlyArray<Capability> = ["vision", "tools", "cache", "think", "web", "json"];

export type RouteSortKey = "reliability" | "blended" | "throughput" | "ttft" | "tier" | "name";
export type RouteMetricKey = "throughput" | "ttft";

export interface AgentFilterState {
  readonly tiers: Record<Tier, boolean>;
  readonly modes: Record<Mode, boolean>;
  readonly capabilities: Record<Capability, boolean>;
  readonly makers: Record<string, boolean>;
  readonly providers: Record<string, boolean>;
  readonly openOnly: boolean;
  readonly maxBlended: number;
  readonly metric: RouteMetricKey;
  readonly sort: RouteSortKey;
  readonly minReliability: number;
  readonly search: string;
}

export const INITIAL_FILTERS: AgentFilterState = {
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

export const ALLOWED_SQL_TABLES = [
  "model_routes",
  "provider_coverage",
  "coverage_regions",
  "provider_coverage_summaries",
  "vendor_scope",
] as const;

export type AllowedSqlTable = (typeof ALLOWED_SQL_TABLES)[number];

export const APP_TABS = ["compare", "presentation", "explorer", "research"] as const;
export type AppTab = (typeof APP_TABS)[number];

export const UI_THEMES = ["light", "dark"] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export const AZURE_COMPARE_VENDOR_KEY = "Azure AI Foundry";
export const MAX_COMPARE_VENDORS = 4;

export const DEFAULT_COMPARE_VENDOR_KEYS = [
  AZURE_COMPARE_VENDOR_KEY,
  "Mistral La Plateforme",
  "Scaleway Generative APIs",
  "OVHcloud AI Endpoints",
] as const;

export interface CompareMatrixFilters {
  readonly reasoning: boolean;
  readonly openOnly: boolean;
  readonly vision: boolean;
  readonly tools: boolean;
  readonly sovereignOnly: boolean;
  readonly hideAzureOnly: boolean;
}

export const DEFAULT_COMPARE_MATRIX_FILTERS: CompareMatrixFilters = {
  reasoning: false,
  openOnly: false,
  vision: false,
  tools: false,
  sovereignOnly: false,
  hideAzureOnly: true,
};

export interface CompareState {
  readonly primaryVendor: string;
  readonly selectedVendorKeys: ReadonlyArray<string>;
  readonly selectedModelKey: string | null;
  readonly modelSearch: string;
  readonly matrixFilters: CompareMatrixFilters;
}

export const DEFAULT_COMPARE_STATE: CompareState = {
  primaryVendor: "Mistral La Plateforme",
  selectedVendorKeys: [...DEFAULT_COMPARE_VENDOR_KEYS],
  selectedModelKey: null,
  modelSearch: "",
  matrixFilters: DEFAULT_COMPARE_MATRIX_FILTERS,
};

export interface UiState {
  readonly activeTab: AppTab;
  readonly chatOpen: boolean;
  readonly theme: UiTheme;
}

export const DEFAULT_UI_STATE: UiState = {
  activeTab: "compare",
  chatOpen: false,
  theme: "dark",
};

export interface WorkspaceContext {
  readonly activeTab: AppTab;
  readonly chatOpen: boolean;
  readonly theme: UiTheme;
  readonly selectedRouteId: string | null;
  readonly routeCount: number;
  readonly visibleRouteCount: number;
  readonly usableRouteCount: number;
  readonly sovereignRouteCount: number;
  readonly compareState: CompareState;
}
