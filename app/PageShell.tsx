"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ExplorerData } from "@/services";
import { Explorer } from "./Explorer";
import { VendorCompare } from "./VendorCompare";
import { Chat } from "./Chat";
import { AgentPresentation } from "./AgentPresentation";
import { ResearchBook } from "./ResearchBook";
import { MessageSquare, SlidersHorizontal, ArrowLeftRight, BookOpen, Sun, Moon, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["compare", "presentation", "explorer", "research"] as const;

export function PageShell({ data }: { readonly data: ExplorerData }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("tab") || "compare";
  const tabParam = (TABS as ReadonlyArray<string>).includes(rawTab) ? rawTab : "compare";
  const vendorParam = searchParams.get("vendor") || "Mistral La Plateforme";

  const [activeTab, setActiveTab] = useState(tabParam);
  const [chatOpen, setChatOpen] = useState(false);
  const [vendor, setVendorState] = useState(vendorParam);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setMounted(true);
    // Derive from what the blocking script already applied
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    setVendorState(vendorParam);
  }, [vendorParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setVendor = (val: string) => {
    setVendorState(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set("vendor", val);
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
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageSquare size={16} />
            <span style={{ marginLeft: 6 }}>{chatOpen ? "Hide Agent" : "Show Agent"}</span>
          </Button>
        </div>
      </header>

      <div className="page-body">
        <main className="page-main">
          <Tabs value={activeTab} onValueChange={(value) => handleTabChange(String(value))} className="main-tabs">
            <div className="main-tabs-bar">
              <TabsList>
                <TabsTrigger value="compare" onClick={() => handleTabChange("compare")}>
                  <ArrowLeftRight size={13} aria-hidden="true" />
                  Compare
                </TabsTrigger>
                <TabsTrigger value="presentation" onClick={() => handleTabChange("presentation")}>
                  <Presentation size={13} aria-hidden="true" />
                  Presentation
                </TabsTrigger>
                <TabsTrigger value="explorer" onClick={() => handleTabChange("explorer")}>
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="research" onClick={() => handleTabChange("research")}>
                  <BookOpen size={13} aria-hidden="true" />
                  Book
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="main-tab-panel" hidden={activeTab !== "compare"}>
              {activeTab === "compare" ? (
                <div className="wrap">
                  <VendorCompare
                    routes={data.routes}
                    summaries={data.providerCoverageSummaries}
                    coverage={data.providerCoverage}
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

            <div className="main-tab-panel" hidden={activeTab !== "explorer"}>
              {activeTab === "explorer" ? (
                <div className="wrap">
                  <Explorer routes={data.routes} />
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

        <Chat routes={data.routes} open={chatOpen} />
      </div>
    </div>
  );
}
