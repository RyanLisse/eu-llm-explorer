import { z } from "zod";
import {
  APP_TABS,
  DEFAULT_COMPARE_MATRIX_FILTERS,
  DEFAULT_COMPARE_STATE,
  INITIAL_FILTERS,
  MAX_COMPARE_VENDORS,
  UI_THEMES,
  type AppTab,
  type AgentFilterState,
  type CompareState,
  type WorkspaceContext,
} from "./constants";

const booleanPatch = z.boolean().optional();
const hasAtLeastOneField = (value: object): boolean => Object.keys(value).length > 0;

export const queryDataInputSchema = z
  .object({
    sql: z
      .string()
      .trim()
      .min(1, "SQL query is required.")
      .describe("A read-only SELECT query against allowlisted catalog tables."),
  })
  .strict();

export const filterPatchSchema = z
  .object({
    tiers: z
      .object({
        A: booleanPatch,
        B: booleanPatch,
        C: booleanPatch,
      })
      .strict()
      .optional(),
    modes: z
      .object({
        reasoning: booleanPatch,
        "non-reasoning": booleanPatch,
        configurable: booleanPatch,
      })
      .strict()
      .optional(),
    capabilities: z
      .object({
        vision: booleanPatch,
        tools: booleanPatch,
        cache: booleanPatch,
        think: booleanPatch,
        web: booleanPatch,
        json: booleanPatch,
      })
      .strict()
      .optional(),
    makers: z.record(z.string(), z.boolean()).optional(),
    providers: z.record(z.string(), z.boolean()).optional(),
    openOnly: z.boolean().optional(),
    maxBlended: z.number().min(0.1).max(8).optional(),
    minReliability: z.number().min(0).max(100).optional(),
    metric: z.enum(["throughput", "ttft"]).optional(),
    sort: z.enum(["reliability", "blended", "throughput", "ttft", "tier", "name"]).optional(),
    search: z.string().optional(),
  })
  .strict()
  .refine(hasAtLeastOneField, "At least one filter field is required.");

export const setFiltersInputSchema = filterPatchSchema;

export const selectRouteInputSchema = z
  .object({
    routeId: z.string().trim().min(1, "routeId is required.").describe("The canonical route id from model_routes."),
  })
  .strict();

export const openTabInputSchema = z
  .object({
    tab: z.enum(APP_TABS).describe("The workspace tab to open."),
  })
  .strict();

export const setUiStateInputSchema = z
  .object({
    activeTab: z.enum(APP_TABS).optional(),
    chatOpen: z.boolean().optional(),
    theme: z.enum(UI_THEMES).optional(),
  })
  .strict()
  .refine(hasAtLeastOneField, "At least one UI state field is required.");

export const compareMatrixFiltersPatchSchema = z
  .object({
    reasoning: booleanPatch,
    openOnly: booleanPatch,
    vision: booleanPatch,
    tools: booleanPatch,
    sovereignOnly: booleanPatch,
    hideAzureOnly: booleanPatch,
  })
  .strict();

export const setCompareStateInputSchema = z
  .object({
    primaryVendor: z.string().trim().min(1).optional(),
    selectedVendorKeys: z.array(z.string().trim().min(1)).min(1).max(MAX_COMPARE_VENDORS).optional(),
    selectedModelKey: z.string().trim().min(1).nullable().optional(),
    modelSearch: z.string().optional(),
    matrixFilters: compareMatrixFiltersPatchSchema.optional(),
  })
  .strict()
  .refine(hasAtLeastOneField, "At least one compare state field is required.");

export const agentToolInputSchemas = {
  query_data: queryDataInputSchema,
  set_filters: setFiltersInputSchema,
  select_route: selectRouteInputSchema,
  open_tab: openTabInputSchema,
  set_ui_state: setUiStateInputSchema,
  set_compare_state: setCompareStateInputSchema,
} as const;

export type FilterPatch = z.infer<typeof filterPatchSchema>;
export type SetUiStateInput = z.infer<typeof setUiStateInputSchema>;
export type SetCompareStateInput = z.infer<typeof setCompareStateInputSchema>;

export const TOOL_CAPABILITIES = [
  "`query_data` reads allowlisted catalog tables with SELECT-only SQL.",
  "`set_filters` updates Advanced Explorer filters.",
  "`select_route` focuses a route by canonical `routeId`.",
  "`open_tab` navigates Compare, Presentation, Advanced, or Book.",
  "`set_ui_state` changes tab, panel visibility, or theme.",
  "`set_compare_state` updates Compare model selection, vendors, model search, and matrix filters.",
] as const;

export interface AgentToolContract {
  readonly name: keyof typeof agentToolInputSchemas;
  readonly status: "implemented" | "planned";
  readonly description: string;
}

export const AGENT_TOOL_CONTRACTS: ReadonlyArray<AgentToolContract> = [
  {
    name: "query_data",
    status: "implemented",
    description: "Run a guarded read-only SELECT against approved catalog tables.",
  },
  {
    name: "set_filters",
    status: "implemented",
    description: "Patch Explorer filters such as tier, mode, capabilities, price, reliability, and search.",
  },
  {
    name: "select_route",
    status: "implemented",
    description: "Select a route by canonical routeId for detail inspection.",
  },
  {
    name: "open_tab",
    status: "implemented",
    description: "Open one of the app tabs: compare, presentation, explorer, or research.",
  },
  {
    name: "set_ui_state",
    status: "implemented",
    description: "Patch shell UI state such as active tab, chat visibility, or light/dark theme.",
  },
  {
    name: "set_compare_state",
    status: "implemented",
    description: "Patch Compare model selection, vendor selection, primary vendor, model search, and matrix filters.",
  },
];

export function mergeFilterPatch(current: AgentFilterState, patch: FilterPatch): AgentFilterState {
  return {
    ...current,
    ...patch,
    tiers: { ...current.tiers, ...(patch.tiers ?? {}) },
    modes: { ...current.modes, ...(patch.modes ?? {}) },
    capabilities: { ...current.capabilities, ...(patch.capabilities ?? {}) },
  };
}

export function mergeCompareState(current: CompareState, patch: SetCompareStateInput): CompareState {
  return {
    ...current,
    ...patch,
    selectedVendorKeys: patch.selectedVendorKeys ?? current.selectedVendorKeys,
    matrixFilters: {
      ...current.matrixFilters,
      ...(patch.matrixFilters ?? {}),
    },
  };
}

export type ComparePatchNormalizationResult =
  | { readonly ok: true; readonly patch: SetCompareStateInput }
  | { readonly ok: false; readonly reason: string };

export function normalizeComparePatch(
  patch: SetCompareStateInput,
  validVendorKeys: ReadonlyArray<string>,
): ComparePatchNormalizationResult {
  const validVendorSet = new Set(validVendorKeys);
  if (patch.primaryVendor && !validVendorSet.has(patch.primaryVendor)) {
    return { ok: false, reason: `Unknown primaryVendor: ${patch.primaryVendor}` };
  }

  const invalidSelectedVendor = patch.selectedVendorKeys?.find((key) => !validVendorSet.has(key));
  if (invalidSelectedVendor) {
    return { ok: false, reason: `Unknown selectedVendorKey: ${invalidSelectedVendor}` };
  }

  return { ok: true, patch };
}

export function formatFilterState(filters: AgentFilterState): string {
  const tiersStr = Object.entries(filters.tiers).map(([k, v]) => `${k}=${v}`).join(" ");
  const modesStr = Object.entries(filters.modes).map(([k, v]) => `${k}=${v}`).join(" ");
  const capsStr = Object.entries(filters.capabilities).map(([k, v]) => `${k}=${v}`).join(" ");
  return [
    "Current Explorer filter state:",
    `Tiers: ${tiersStr} | Modes: ${modesStr} | Capabilities: ${capsStr}`,
    `maxBlended: $${filters.maxBlended.toFixed(2)} | minReliability: ${filters.minReliability}`,
    `metric: ${filters.metric} | Sort: ${filters.sort} | openOnly: ${filters.openOnly} | Search: "${filters.search}"`,
  ].join("\n");
}

export function formatDefaultFilters(): string {
  return [
    "Default (reset) filter state:",
    `Tiers: ${Object.entries(INITIAL_FILTERS.tiers).map(([k, v]) => `${k}=${v}`).join(" ")}`,
    `Modes: ${Object.entries(INITIAL_FILTERS.modes).map(([k, v]) => `${k}=${v}`).join(" ")}`,
    `Capabilities: ${Object.entries(INITIAL_FILTERS.capabilities).map(([k, v]) => `${k}=${v}`).join(" ")}`,
    `openOnly: ${INITIAL_FILTERS.openOnly} | maxBlended: $${INITIAL_FILTERS.maxBlended.toFixed(2)} | minReliability: ${INITIAL_FILTERS.minReliability} | sort: ${INITIAL_FILTERS.sort} | search: ""`,
    "To reset or match defaults: call set_filters with these exact values.",
  ].join("\n");
}

export function formatWorkspaceContext(context: WorkspaceContext): string {
  return [
    "Current workspace context:",
    `activeTab: ${context.activeTab} | chatOpen: ${context.chatOpen} | theme: ${context.theme}`,
    `selectedRouteId: ${context.selectedRouteId ?? "none"} | routeCount: ${context.routeCount}`,
    `visibleRouteCount: ${context.visibleRouteCount} | usableRouteCount: ${context.usableRouteCount} | sovereignRouteCount: ${context.sovereignRouteCount}`,
    `compare.primaryVendor: ${context.compareState.primaryVendor}`,
    `compare.selectedModelKey: ${context.compareState.selectedModelKey ?? "none"}`,
    `compare.selectedVendorKeys: ${context.compareState.selectedVendorKeys.join(", ")}`,
    `compare.modelSearch: "${context.compareState.modelSearch}"`,
    `compare.matrixFilters: ${JSON.stringify(context.compareState.matrixFilters)}`,
  ].join("\n");
}

export function getSlashCommandResponse(commandText: string): string | null {
  const normalized = commandText.trim().toLowerCase();
  if (normalized === "/help") {
    return [
      "I can navigate the workspace, update Explorer filters, select routes, adjust Compare vendors and model filters, and query read-only catalog data.",
      "",
      "Use `/tools` for the exact tool contract.",
    ].join("\n");
  }
  if (normalized === "/tools") {
    return ["Available agent tools:", ...TOOL_CAPABILITIES.map((item) => `- ${item}`)].join("\n");
  }
  return null;
}

export interface SlashCommandResult {
  readonly command: string;
  readonly known: boolean;
  readonly content: string;
}

export function resolveSlashCommand(commandText: string): SlashCommandResult | null {
  const trimmed = commandText.trim();
  if (!trimmed.startsWith("/")) return null;

  const command = trimmed.slice(1).split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  const response = getSlashCommandResponse(`/${command}`);
  if (response) {
    return {
      command,
      known: true,
      content: response,
    };
  }

  return {
    command,
    known: false,
    content: `Unknown command "/${command}". Try /help or /tools.`,
  };
}

export function isAppTab(value: string): value is AppTab {
  return (APP_TABS as ReadonlyArray<string>).includes(value);
}

export const DEFAULT_AGENT_CONTEXT: WorkspaceContext = {
  activeTab: "compare",
  chatOpen: false,
  theme: "dark",
  selectedRouteId: null,
  routeCount: 0,
  visibleRouteCount: 0,
  usableRouteCount: 0,
  sovereignRouteCount: 0,
  compareState: {
    ...DEFAULT_COMPARE_STATE,
    matrixFilters: DEFAULT_COMPARE_MATRIX_FILTERS,
  },
};
