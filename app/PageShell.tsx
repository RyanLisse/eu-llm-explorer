"use client";

import { useState } from "react";
import type { ExplorerData } from "@/services";
import type { ChainView } from "@/domain";
import { Explorer, ProviderCoverageSection } from "./Explorer";
import { Chat } from "./Chat";
import { ResearchBriefing } from "./ResearchBriefing";
import { MessageSquare, SlidersHorizontal, Globe, GitBranch, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PageShell({ data }: { readonly data: ExplorerData }) {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="page-root">
      <header className="topbar">
        <img className="brand-mark" src="/brand/blinqx-icon.png" alt="" />
        <div>
          <h1>
            EU AI Gateway Explorer <span className="accent">·</span> Provider Router
          </h1>
          <div className="sub">
            General workload routing · provider-selectable · sovereign-first · reports updated June 2026
          </div>
        </div>
        <Button
          variant="outline"
          className="chat-toggle-btn"
          onClick={() => setChatOpen(!chatOpen)}
        >
          <MessageSquare size={16} />
          <span style={{ marginLeft: 6 }}>{chatOpen ? "Hide Agent" : "Show Agent"}</span>
        </Button>
      </header>

      <div className="page-body">
        <main className="page-main">
          <Tabs defaultValue="explorer" className="main-tabs">
            <div className="main-tabs-bar">
              <TabsList>
                <TabsTrigger value="explorer">
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  Explorer
                </TabsTrigger>
                <TabsTrigger value="coverage">
                  <Globe size={13} aria-hidden="true" />
                  Coverage
                </TabsTrigger>
                <TabsTrigger value="chains">
                  <GitBranch size={13} aria-hidden="true" />
                  Chains
                </TabsTrigger>
                <TabsTrigger value="research">
                  <FlaskConical size={13} aria-hidden="true" />
                  Research
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="explorer" className="main-tab-panel">
              <div className="wrap">
                <Explorer routes={data.routes} />
              </div>
            </TabsContent>

            <TabsContent value="coverage" className="main-tab-panel">
              <div className="wrap">
                <ProviderCoverageSection
                  summaries={data.providerCoverageSummaries}
                  coverage={data.providerCoverage}
                  vendorScope={data.vendorScope}
                  overlaps={data.multiVendorModels}
                />
              </div>
            </TabsContent>

            <TabsContent value="chains" className="main-tab-panel">
              <div className="wrap">
                <details className="callout brand context-card" open>
                  <summary>
                    <span className="eyebrow">The shape of an always-available EU router</span>
                    <strong>Sovereign core, residency only on explicit escalation</strong>
                  </summary>
                  <p>
                    The weak link among sovereigns is <strong>single-vendor concentration</strong>{" "}
                    (Mistral La Plateforme&apos;s own
                    uptime is the softest of the group). The fix isn&apos;t to leave the EU — it&apos;s to fail over to a{" "}
                    <em>different sovereign host of the same open weights</em> (Scaleway, OVHcloud, Nebius, STACKIT, IONOS all
                    publish 99.8–99.9% SLAs). Tier-B residency routes (Bedrock/Vertex EU) stay out of auto-fallback and are reached
                    only by an explicit, logged call — so sensitive workload data never silently crosses into CLOUD-Act scope.
                  </p>
                </details>

                <details className="callout warn context-card">
                  <summary>
                    <span className="eyebrow">Why Azure Europe is off the critical path</span>
                    <strong>Azure EU is structural risk, not a config issue</strong>
                  </summary>
                  <ul>
                    <li>
                      <strong>Capacity ≠ quota.</strong> Azure Data Zone Standard grants quota, not guaranteed capacity —
                      deployments can fail outright, and the whole EU data zone shares one quota pool, so you contend with every
                      other tenant and get 429s under burst.
                    </li>
                    <li>
                      <strong>The newest models aren&apos;t there.</strong> GPT-5.2 is limited to Central/East US; GPT-5.4-mini /
                      -nano are only on <em>Global Standard</em>{" "}
                      (worldwide routing, not EU-safe) — Microsoft won&apos;t confirm
                      EU Data Zone before gpt-4.1-mini retires in Oct 2026.
                    </li>
                    <li>
                      <strong>No Claude EU residency on Foundry.</strong>{" "}
                      Claude on Microsoft Foundry still runs on
                      Anthropic-hosted infra (&quot;Coming 2026&quot;) — for Claude in the EU you must use Bedrock Frankfurt/Ireland or
                      Vertex EU regardless.
                    </li>
                    <li>
                      <strong>Verdict:</strong> keep Azure visible for comparison and explicit selection, but avoid putting it in
                      automatic fallback chains for sensitive workloads. The reliability score below grades Azure EU routes
                      conservatively.
                    </li>
                  </ul>
                </details>

                <div className="section-title-row" style={{ marginTop: 22 }}>
                  <div>
                    <div className="eyebrow">Failover design</div>
                    <h3>Recommended workload chains</h3>
                  </div>
                  <div className="mini-fact">General aliases with sovereign hops and explicit residency escalations</div>
                </div>
                <div className="chains">
                  {data.chains.map((c) => (
                    <ChainCard key={c.alias} chain={c} />
                  ))}
                </div>

                <p className="caption" style={{ marginTop: 28 }}>
                  Built with Next.js (App Router) + Effect-TS. The dataset is decoded, scored, and routed through Effect services
                  (ModelCatalog → Reliability → Recommendation). Reliability scoring is a documented heuristic, not a vendor
                  guarantee — see README.md. Themed to the Blinqx / HippoLine design system.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="research" className="main-tab-panel">
              <div className="wrap">
                <ResearchBriefing />
              </div>
            </TabsContent>
          </Tabs>
        </main>

        <Chat routes={data.routes} open={chatOpen} />
      </div>
    </div>
  );
}

function ChainCard({ chain }: { readonly chain: ChainView }) {
  return (
    <div className="chaincard">
      <div className="alias">
        {chain.alias}
        {chain.reasoning && <span className="badge">reasoning</span>}
      </div>
      <div className="task">{chain.task}</div>
      {chain.hops.map((h, i) => (
        <div className="hop" key={h.route.id}>
          <div className="step">{i + 1}</div>
          <div className="body">
            <div className="name">
              {h.route.name} — <span style={{ color: "var(--ink-faint)" }}>{h.route.route}</span>{" "}
              <span style={{ color: "var(--growth)", fontWeight: 600 }}>({h.route.reliabilityGrade})</span>
            </div>
            <div className="why">{h.rationale}</div>
          </div>
        </div>
      ))}
      {chain.escalation.length > 0 && (
        <div className="escalate">
          <div className="lbl">escalate-{chain.alias} (explicit, logged · residency)</div>
          {chain.escalation.map((h) => (
            <div className="hop" key={h.route.id} style={{ borderTop: "none", paddingTop: 2 }}>
              <div className="body">
                <div className="name">
                  {h.route.name} — <span style={{ color: "var(--ink-faint)" }}>{h.route.route}</span>
                </div>
                <div className="why">{h.rationale}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
