"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, getToolName } from "ai";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { filterAtom, selectedRouteAtom } from "@/atoms";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, ChevronRight, RefreshCw, MessageSquare, Terminal } from "lucide-react";
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
}: {
  readonly routes: ReadonlyArray<RouteView>;
  readonly open: boolean;
}) {
  const filters = useAtomValue(filterAtom);
  const setFilters = useAtomSet(filterAtom);
  const setSelectedRoute = useAtomSet(selectedRouteAtom);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, status, sendMessage, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === "set_filters") {
        const patch = toolCall.input as any;
        setFilters((f) => ({
          ...f,
          ...patch,
          tiers: { ...f.tiers, ...(patch.tiers ?? {}) },
          modes: { ...f.modes, ...(patch.modes ?? {}) },
          capabilities: { ...f.capabilities, ...(patch.capabilities ?? {}) },
        }));
        addToolOutput({
          tool: "set_filters",
          toolCallId: toolCall.toolCallId,
          output: { applied: true },
        });
      } else if (toolCall.toolName === "select_route") {
        const { routeId } = toolCall.input as { routeId: string };
        setSelectedRoute(routeId);
        addToolOutput({
          tool: "select_route",
          toolCallId: toolCall.toolCallId,
          output: { applied: true },
        });
      }
    },
  });

  // Auto-scroll to bottom of chat when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || status === "submitted" || status === "streaming") return;
    sendMessage({ text: inputValue }, { body: { currentFilters: filters } });
    setInputValue("");
  };

  const handleStarterPrompt = (prompt: string) => {
    if (status === "submitted" || status === "streaming") return;
    sendMessage({ text: prompt }, { body: { currentFilters: filters } });
  };

  return (
    <div className="chat-panel" data-open={open ? "true" : "false"}>
      <div className="chat-header">
        <MessageSquare size={18} className="chat-header-icon" />
        <div>
          <h3>Compliance Agent</h3>
          <p className="eyebrow">owl-alpha · sovereign routing</p>
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

                      if (toolName === "query_data") {
                        const sql = input?.sql;
                        let resultData: any = null;
                        let resultIsError = false;

                        if (state === "output-available") {
                          try {
                            const parsed = JSON.parse(output as string);
                            if (typeof parsed === "string" && parsed.startsWith("SQL Error")) {
                              resultIsError = true;
                              resultData = parsed;
                            } else {
                              resultData = parsed;
                            }
                          } catch {
                            resultData = String(output);
                            resultIsError = !Array.isArray(resultData);
                          }
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
