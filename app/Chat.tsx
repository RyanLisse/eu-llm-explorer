"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, getToolName } from "ai";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { activeTabAtom, compareStateAtom, filterAtom, selectedRouteAtom, uiStateAtom } from "@/atoms";
import { type AppTab, type UiTheme, type WorkspaceContext } from "@/agent/constants";
import {
  mergeCompareState,
  mergeFilterPatch,
  compareStatePatchToFilterPatch,
  filterPatchSchema,
  normalizeComparePatch,
  openTabInputSchema,
  selectRouteInputSchema,
  setCompareStateInputSchema,
  setUiStateInputSchema,
} from "@/agent/tools";
import { getRouteVisibilityCounts } from "@/agent/routeFilters";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, ChevronRight, RefreshCw, MessageSquare, Terminal, PanelsTopLeft } from "lucide-react";
import type { RouteView } from "@/domain";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageResponse } from "@/components/ai-elements/message";
import { CHAT_MODEL_LABEL } from "@/chatConfig";

const markdownComponents = {
  table: Table,
  thead: TableHeader,
  tbody: TableBody,
  tr: TableRow,
  th: TableHead,
  td: TableCell,
};

const starterPrompts = [
  "Show me the safest EU-only route for coding",
  "Why is Tier C excluded?",
  "Compare Tier A vs Tier B reliability",
  "Walk me through choosing a route",
] as const;

export function Chat({
  routes,
  open,
  setActiveTab,
  setChatOpen,
  setTheme,
  setVendor,
  compareVendorKeys,
}: {
  readonly routes: ReadonlyArray<RouteView>;
  readonly open: boolean;
  readonly setActiveTab: (tab: AppTab) => void;
  readonly setChatOpen: (open: boolean) => void;
  readonly setTheme: (theme: UiTheme) => void;
  readonly setVendor: (vendor: string) => void;
  readonly compareVendorKeys: ReadonlyArray<string>;
}) {
  const filters = useAtomValue(filterAtom);
  const setFilters = useAtomSet(filterAtom);
  const activeTab = useAtomValue(activeTabAtom);
  const compareState = useAtomValue(compareStateAtom);
  const setCompareState = useAtomSet(compareStateAtom);
  const selectedRouteId = useAtomValue(selectedRouteAtom);
  const setSelectedRoute = useAtomSet(selectedRouteAtom);
  const uiState = useAtomValue(uiStateAtom);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, status, sendMessage, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === "set_filters") {
        const parsed = filterPatchSchema.safeParse(toolCall.input);
        if (parsed.success) setFilters((f) => mergeFilterPatch(f, parsed.data));
        addToolOutput({
          tool: "set_filters",
          toolCallId: toolCall.toolCallId,
          output: { applied: parsed.success, surface: activeTab === "compare" ? "compare" : "explorer" },
        });
      } else if (toolCall.toolName === "select_route") {
        const parsed = selectRouteInputSchema.safeParse(toolCall.input);
        const routeId = parsed.success ? parsed.data.routeId : "";
        const matchedRoute = routes.find((route) => route.id === routeId || route.route === routeId);
        if (matchedRoute) setSelectedRoute(matchedRoute.id);
        addToolOutput({
          tool: "select_route",
          toolCallId: toolCall.toolCallId,
          output: { applied: Boolean(matchedRoute), routeId: matchedRoute?.id, reason: matchedRoute ? undefined : "Unknown routeId" },
        });
      } else if (toolCall.toolName === "open_tab") {
        const parsed = openTabInputSchema.safeParse(toolCall.input);
        const tab = parsed.success ? parsed.data.tab : null;
        addToolOutput({
          tool: "open_tab",
          toolCallId: toolCall.toolCallId,
          output: { applied: Boolean(tab) },
        });
        if (tab) setActiveTab(tab);
      } else if (toolCall.toolName === "set_ui_state") {
        const parsed = setUiStateInputSchema.safeParse(toolCall.input);
        addToolOutput({
          tool: "set_ui_state",
          toolCallId: toolCall.toolCallId,
          output: { applied: parsed.success },
        });
        if (parsed.success) {
          if (parsed.data.activeTab) setActiveTab(parsed.data.activeTab);
          if (typeof parsed.data.theme === "string") setTheme(parsed.data.theme);
          if (typeof parsed.data.chatOpen === "boolean") setChatOpen(parsed.data.chatOpen);
        }
      } else if (toolCall.toolName === "set_compare_state") {
        const parsed = setCompareStateInputSchema.safeParse(toolCall.input);
        const normalized = parsed.success ? normalizeComparePatch(parsed.data, compareVendorKeys) : null;
        addToolOutput({
          tool: "set_compare_state",
          toolCallId: toolCall.toolCallId,
          output: { applied: Boolean(normalized?.ok), reason: normalized?.ok === false ? normalized.reason : undefined },
        });
        if (normalized?.ok) {
          setCompareState((current) => mergeCompareState(current, normalized.patch));
          setFilters((current) => mergeFilterPatch(current, compareStatePatchToFilterPatch(normalized.patch)));
          if (normalized.patch.primaryVendor) setVendor(normalized.patch.primaryVendor);
        }
      }
    },
  });

  // Auto-scroll to bottom of chat when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const routeVisibilityCounts = getRouteVisibilityCounts(routes, filters);
  const workspaceContext: WorkspaceContext = {
    activeTab,
    chatOpen: uiState.chatOpen,
    theme: uiState.theme,
    selectedRouteId,
    ...routeVisibilityCounts,
    compareState,
  };

  const requestBody = {
    currentFilters: filters,
    workspaceContext,
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || status === "submitted" || status === "streaming") return;
    sendMessage({ text: inputValue }, { body: requestBody });
    setInputValue("");
  };

  const handleStarterPrompt = (prompt: string) => {
    if (status === "submitted" || status === "streaming") return;
    sendMessage({ text: prompt }, { body: requestBody });
  };

  return (
    <div className="chat-panel" data-open={open ? "true" : "false"}>
      <div className="chat-header">
        <MessageSquare size={18} className="chat-header-icon" />
        <div>
          <h3>Compliance Agent</h3>
          <p className="eyebrow">{CHAT_MODEL_LABEL} · sovereign routing</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <Sparkles size={28} className="welcome-icon" />
            <h4>Sovereign Router Assistant</h4>
            <p>
              Ask me to filter the workspace, select compliant models, or query database metrics.
            </p>
            <div className="suggestions starter-prompts" aria-label="Starter prompts">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="starter-prompt-chip"
                  onClick={() => handleStarterPrompt(prompt)}
                  disabled={status === "submitted" || status === "streaming"}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`message-row ${isUser ? "user-row" : "assistant-row"}`}
              >
                <div className="message-avatar">
                  {isUser ? "U" : "A"}
                </div>
                <div className="message-content-container">
                  {message.parts.map((part, partIndex) => {
                    if (part.type === "text") {
                      return (
                        <div key={partIndex} className="message-bubble text-bubble">
                          <MessageResponse
                            components={markdownComponents}
                            isAnimating={status === "streaming"}
                          >
                            {part.text}
                          </MessageResponse>
                        </div>
                      );
                    }
                    if (part.type === "reasoning") {
                      return (
                        <div key={partIndex} className="reasoning-bubble">
                          <span className="reasoning-label">Thinking...</span>
                          <p>{part.text}</p>
                        </div>
                      );
                    }
                    if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                      const toolPart = part as any;
                      const toolName = getToolName(toolPart);
                      const { state, input, output, errorText } = toolPart;

                      if (toolName === "set_filters") {
                        const tiersPatch = input?.tiers;
                        let desc = "Adjusted filters";
                        if (tiersPatch) {
                          const activeTiers = Object.entries(tiersPatch)
                            .filter(([, v]) => v)
                            .map(([k]) => `Tier ${k}`)
                            .join(", ");
                          if (activeTiers) desc = `Filtered to ${activeTiers}`;
                        }
                        return (
                          <div key={partIndex} className="action-chip filter-chip-ui">
                            <Sparkles size={13} className="chip-icon" />
                            <span>
                              {state === "output-available" ? `${desc}` : `Filtering...`}
                            </span>
                          </div>
                        );
                      }

                      if (toolName === "select_route") {
                        const routeId = input?.routeId;
                        const route = routes.find(
                          (r) => r.id === routeId || r.route === routeId
                        );
                        const routeName = route ? `${route.maker} ${route.name}` : routeId;
                        return (
                          <div key={partIndex} className="action-chip route-chip-ui">
                            <ChevronRight size={13} className="chip-icon" />
                            <span>
                              {state === "output-available"
                                ? `Selected: ${routeName}`
                                : `Selecting: ${routeName}...`}
                            </span>
                          </div>
                        );
                      }

                      if (toolName === "open_tab") {
                        const tab = input?.tab;
                        return (
                          <div key={partIndex} className="action-chip route-chip-ui">
                            <PanelsTopLeft size={13} className="chip-icon" />
                            <span>{state === "output-available" ? `Opened: ${tab}` : `Opening: ${tab}...`}</span>
                          </div>
                        );
                      }

                      if (toolName === "set_ui_state") {
                        const nextTab = input?.activeTab;
                        const nextTheme = input?.theme;
                        const nextPanel = typeof input?.chatOpen === "boolean" ? (input.chatOpen ? "show agent" : "hide agent") : null;
                        const changes = [nextTab, nextTheme, nextPanel].filter(Boolean).join(", ") || "workspace state";
                        return (
                          <div key={partIndex} className="action-chip route-chip-ui">
                            <RefreshCw size={13} className="chip-icon" />
                            <span>{state === "output-available" ? `Updated: ${changes}` : `Updating: ${changes}...`}</span>
                          </div>
                        );
                      }

                      if (toolName === "set_compare_state") {
                        const parts = [
                          input?.selectedModelKey ? `model ${input.selectedModelKey}` : null,
                          input?.primaryVendor ? `vendor ${input.primaryVendor}` : null,
                          input?.modelSearch ? `search "${input.modelSearch}"` : null,
                          input?.selectedVendorKeys ? `${input.selectedVendorKeys.length} vendors` : null,
                          input?.matrixFilters ? "matrix filters" : null,
                        ].filter(Boolean);
                        const desc = parts.join(", ") || "Compare state";
                        return (
                          <div key={partIndex} className="action-chip filter-chip-ui">
                            <Sparkles size={13} className="chip-icon" />
                            <span>{state === "output-available" ? `Updated Compare: ${desc}` : `Updating Compare: ${desc}...`}</span>
                          </div>
                        );
                      }

                      if (toolName === "query_data") {
                        const sql = input?.sql;
                        let resultData: any = null;
                        let resultIsError = false;

                        if (state === "output-available") {
                          resultData = output;
                          resultIsError = output?.ok === false;
                        } else if (state === "output-error") {
                          resultIsError = true;
                          resultData = errorText;
                        }

                        return (
                          <div
                            key={partIndex}
                            className={`action-chip sql-chip-ui ${
                              resultIsError ? "sql-error-chip" : ""
                            }`}
                          >
                            <Terminal size={13} className="chip-icon" />
                            <div className="sql-chip-header">
                              <span>
                                {state === "output-available"
                                  ? resultIsError
                                    ? "Database query error"
                                    : "Queried Database"
                                  : "Querying TursoDB..."}
                              </span>
                            </div>
                            {sql && (
                              <details className="sql-query-details">
                                <summary>Show SQL Query</summary>
                                <pre className="sql-code">
                                  <code>{sql}</code>
                                </pre>
                                {state === "output-available" && (
                                  <pre className="sql-result">
                                    <code>
                                      {typeof resultData === "object"
                                        ? JSON.stringify(resultData, null, 2)
                                        : resultData}
                                    </code>
                                  </pre>
                                )}
                              </details>
                            )}
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })
        )}
        {(status === "submitted" || status === "streaming") &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === "user" && (
            <div className="message-row assistant-row typing-placeholder">
              <div className="message-avatar">A</div>
              <div className="message-bubble text-bubble loading-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={
            status === "submitted" || status === "streaming"
              ? "Agent is thinking..."
              : "Ask the sovereign compliance agent..."
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={status === "submitted" || status === "streaming"}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || status === "submitted" || status === "streaming"}
        >
          <Send size={15} />
        </Button>
      </form>
    </div>
  );
}
