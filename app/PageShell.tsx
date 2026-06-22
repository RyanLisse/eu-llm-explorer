"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import type { ExplorerData } from "@/services";
import { APP_TABS, AZURE_COMPARE_VENDOR_KEY, DEFAULT_COMPARE_STATE, type AppTab, type UiTheme } from "@/agent/constants";
import { activeTabAtom, compareStateAtom, uiStateAtom } from "@/atoms";
import { Explorer } from "./Explorer";
import { Chat } from "./Chat";
import { AgentPresentation } from "./AgentPresentation";
import { ResearchBook } from "./ResearchBook";
import { MessageSquare, SlidersHorizontal, BookOpen, Sun, Moon, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PageShell({ data }: { readonly data: ExplorerData }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("tab") || "explorer";
  const requestedTab = (APP_TABS as ReadonlyArray<string>).includes(rawTab) ? (rawTab as AppTab) : "explorer";
  // "compare" is merged into the model-first explorer; alias legacy links/agent calls.
  const tabParam: AppTab = requestedTab === "compare" ? "explorer" : requestedTab;
  const vendorParam = searchParams.get("vendor") || "Mistral La Plateforme";

  const activeTab = useAtomValue(activeTabAtom);
  const setActiveTab = useAtomSet(activeTabAtom);
  const uiState = useAtomValue(uiStateAtom);
  const setUiState = useAtomSet(uiStateAtom);
  const compareState = useAtomValue(compareStateAtom);
  const setCompareState = useAtomSet(compareStateAtom);
  const [mounted, setMounted] = useState(false);

  const chatOpen = uiState.chatOpen;
  const theme = uiState.theme;
  const vendor = compareState.primaryVendor;
  const compareVendorKeys = useMemo(
    () =>
      Array.from(
        new Set([
          AZURE_COMPARE_VENDOR_KEY,
          ...data.providerCoverageSummaries
            .filter((summary) => summary.provider !== "Microsoft Azure")
            .map((summary) => summary.platform),
        ]),
      ),
    [data.providerCoverageSummaries],
  );
  const fallbackVendor =
    compareVendorKeys.find((key) => key === DEFAULT_COMPARE_STATE.primaryVendor) ??
    compareVendorKeys.find((key) => key !== AZURE_COMPARE_VENDOR_KEY) ??
    AZURE_COMPARE_VENDOR_KEY;
  const normalizedVendorParam = compareVendorKeys.includes(vendorParam) ? vendorParam : fallbackVendor;

  useEffect(() => {
    setMounted(true);
    // Derive from what the blocking script already applied
    const isDark = document.documentElement.classList.contains("dark");
    setUiState((current) => ({ ...current, theme: isDark ? "dark" : "light" }));
  }, [setUiState]);

  const applyTheme = (nextTheme: UiTheme) => {
    setUiState((current) => ({ ...current, theme: nextTheme }));
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const toggleTheme = () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    setActiveTab(tabParam);
    setUiState((current) => ({ ...current, activeTab: tabParam }));
  }, [setActiveTab, setUiState, tabParam]);

  useEffect(() => {
    setCompareState((current) =>
      current.primaryVendor === normalizedVendorParam ? current : { ...current, primaryVendor: normalizedVendorParam },
    );
    if (vendorParam !== normalizedVendorParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("vendor", normalizedVendorParam);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [normalizedVendorParam, pathname, router, searchParams, setCompareState, vendorParam]);

  const handleTabChange = (tab: AppTab) => {
    // "compare" is merged into the model-first explorer.
    const resolved: AppTab = tab === "compare" ? "explorer" : tab;
    setActiveTab(resolved);
    setUiState((current) => ({ ...current, activeTab: resolved }));
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", resolved);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setVendor = (val: string) => {
    const normalizedVendor = compareVendorKeys.includes(val) ? val : fallbackVendor;
    setCompareState((current) =>
      current.primaryVendor === normalizedVendor ? current : { ...current, primaryVendor: normalizedVendor },
    );
    const params = new URLSearchParams(searchParams.toString());
    params.set("vendor", normalizedVendor);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="page-root">
      <header className="topbar">
        <img className="brand-mark" src="/brand/blinqx-icon.png" alt="" />
        <div>
          <h1>
            EU AI Gateway Explorer <span className="accent">·</span> Agent Strategy
          </h1>
          <div className="sub">
            General agent workloads across Blinqx sectors · EU model routing, sovereignty, fallback and governance · June 2026
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          <Button
            variant="outline"
            className="chat-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <Sun size={16} />}
            <span style={{ marginLeft: 6 }}>{mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Light Mode"}</span>
          </Button>
          <Button
            variant="outline"
            className="chat-toggle-btn"
            onClick={() => setUiState((current) => ({ ...current, chatOpen: !current.chatOpen }))}
          >
            <MessageSquare size={16} />
            <span style={{ marginLeft: 6 }}>{chatOpen ? "Hide Agent" : "Show Agent"}</span>
          </Button>
        </div>
      </header>

      <div className="page-body">
        <main className="page-main">
          <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as AppTab)} className="main-tabs">
            <div className="main-tabs-bar">
              <TabsList>
                <TabsTrigger value="explorer" onClick={() => handleTabChange("explorer")}>
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  Models
                </TabsTrigger>
                <TabsTrigger value="presentation" onClick={() => handleTabChange("presentation")}>
                  <Presentation size={13} aria-hidden="true" />
                  Presentation
                </TabsTrigger>
                <TabsTrigger value="research" onClick={() => handleTabChange("research")}>
                  <BookOpen size={13} aria-hidden="true" />
                  Book
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="main-tab-panel" hidden={activeTab !== "explorer"}>
              {activeTab === "explorer" ? (
                <div className="wrap">
                  <Explorer
                    routes={data.routes}
                    chains={data.chains}
                    summaries={data.providerCoverageSummaries}
                    coverage={data.providerCoverage}
                    vendorScope={data.vendorScope}
                    vendor={vendor}
                    setVendor={setVendor}
                  />
                </div>
              ) : null}
            </div>

            <div className="main-tab-panel" hidden={activeTab !== "presentation"}>
              {activeTab === "presentation" ? (
                <div className="wrap presentation-wrap">
                  <AgentPresentation />
                </div>
              ) : null}
            </div>

            <div className="main-tab-panel" hidden={activeTab !== "research"}>
              {activeTab === "research" ? (
                <div className="wrap book-wrap">
                  <ResearchBook />
                </div>
              ) : null}
            </div>
          </Tabs>
        </main>

        <Chat
          routes={data.routes}
          open={chatOpen}
          setActiveTab={handleTabChange}
          setChatOpen={(open) => setUiState((current) => ({ ...current, chatOpen: open }))}
          setTheme={applyTheme}
          setVendor={setVendor}
          compareVendorKeys={compareVendorKeys}
        />
      </div>
    </div>
  );
}
