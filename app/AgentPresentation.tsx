"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Gavel,
  Landmark,
  LockKeyhole,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SectorKey = "accountancy" | "legal" | "consultancy" | "insurance" | "finance" | "hr";
type WorkloadKey = "assist" | "extract" | "reason" | "act";

type Sector = {
  readonly key: SectorKey;
  readonly label: string;
  readonly audience: string;
  readonly icon: typeof Building2;
  readonly clientSignal: string;
  readonly moments: readonly string[];
  readonly agents: readonly string[];
  readonly risk: "Low" | "Medium" | "High";
};

const sectors: readonly Sector[] = [
  {
    key: "accountancy",
    label: "Accountancy & Tax",
    audience: "accountants, tax advisers, advisory offices",
    icon: FileCheck2,
    clientSignal: "AXP Advisors + 1,100+ accountancy offices",
    moments: ["tax intake", "KYC/compliance", "reporting", "life-event advice"],
    agents: ["client intake copilot", "document-to-tax extractor", "advisory draft agent"],
    risk: "Medium",
  },
  {
    key: "legal",
    label: "Legal",
    audience: "lawyers, jurists, legal operations",
    icon: Gavel,
    clientSignal: "VDT Advocaten reference case",
    moments: ["matter intake", "registered mail", "digital signing", "payment follow-up"],
    agents: ["case file summarizer", "deadline guard", "secure client-response drafter"],
    risk: "High",
  },
  {
    key: "consultancy",
    label: "Consultancy & Agency",
    audience: "architects, agencies, project consultancies",
    icon: Building2,
    clientSignal: "Houweling Architecten reference case",
    moments: ["proposal", "time tracking", "project handover", "billing"],
    agents: ["proposal builder", "project admin assistant", "scope-change detector"],
    risk: "Medium",
  },
  {
    key: "insurance",
    label: "Insurance & Mortgage",
    audience: "financial advisers and intermediaries",
    icon: WalletCards,
    clientSignal: "Hilverzekerd serves 20–30% more clients with eBlinqx",
    moments: ["intake", "policy management", "claims", "bank/insurer chain links"],
    agents: ["policy intake agent", "claim triage assistant", "advisor next-best-action"],
    risk: "High",
  },
  {
    key: "finance",
    label: "Finance",
    audience: "finance teams, controllers, CFO offices",
    icon: CircleDollarSign,
    clientSignal: "Peinemann reference case",
    moments: ["closing", "procurement", "reporting", "risk & control"],
    agents: ["close checklist agent", "invoice exception resolver", "management-report explainer"],
    risk: "Medium",
  },
  {
    key: "hr",
    label: "HR",
    audience: "HR managers and people operations",
    icon: UsersRound,
    clientSignal: "Blinqx HR suite for repetitive process automation",
    moments: ["hiring", "leave", "absence", "reports"],
    agents: ["employee query assistant", "policy explainer", "absence pattern monitor"],
    risk: "High",
  },
];

const workloads: Record<WorkloadKey, { readonly label: string; readonly model: string; readonly route: string; readonly guardrail: string }> = {
  assist: {
    label: "Assist",
    model: "Mistral Small 4 / Ministral 8B",
    route: "fast sovereign default",
    guardrail: "human review before external send",
  },
  extract: {
    label: "Extract",
    model: "schema JSON + small non-reasoning model",
    route: "sovereign structured-output path",
    guardrail: "validation, confidence threshold, no silent overwrite",
  },
  reason: {
    label: "Reason",
    model: "Mistral Medium 3.5 / Magistral / gpt-oss-120b",
    route: "explicit escalation only",
    guardrail: "budget cap, audit event, task rationale",
  },
  act: {
    label: "Act",
    model: "tool-using agent behind gateway policy",
    route: "policy-first control plane",
    guardrail: "approval gates for legal, financial, HR or customer-impacting actions",
  },
};

const slideTitles = [
  "Executive thesis",
  "Blinqx sector map",
  "Agent portfolio",
  "Gateway architecture",
  "Routing policy",
  "Rollout plan",
] as const;

const sources = [
  "Blinqx sectors page: six active sectors — Insurance & Mortgage, Accountancy & Tax, Consultancy & Agency, Legal, Finance, HR.",
  "Blinqx technology page: 200,000+ users, cloud-first, APIs/integrations, GenAI and Agentic AI, ISO/SOC security posture.",
  "Attached EU LLM research: sovereign-first router with Mistral → Scaleway → OVH/STACKIT/IONOS/Nebius; US-vendor EU-residency only by explicit escalation.",
  "Blinqx references page: AXP Advisors, Hilverzekerd, Peinemann, VDT Advocaten, Houweling Architecten.",
] as const;

const riskColor = (risk: Sector["risk"]) => (risk === "High" ? "var(--coral)" : risk === "Medium" ? "var(--sky)" : "var(--growth)");

export function AgentPresentation() {
  const [slide, setSlide] = useState(0);
  const [sectorKey, setSectorKey] = useState<SectorKey>("accountancy");
  const [workload, setWorkload] = useState<WorkloadKey>("assist");

  const sector = useMemo((): Sector => sectors.find((item) => item.key === sectorKey) ?? sectors[0]!, [sectorKey]);
  const workloadSpec = workloads[workload];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") setSlide((current) => Math.min(slideTitles.length - 1, current + 1));
      if (event.key === "ArrowLeft" || event.key === "PageUp") setSlide((current) => Math.max(0, current - 1));
      if (event.key === "Home") setSlide(0);
      if (event.key === "End") setSlide(slideTitles.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ActiveIcon = sector.icon;

  return (
    <section className="presentation-shell" aria-label="Interactive presentation for Blinqx agent strategy">
      <div className="presentation-stage">
        <aside className="presentation-rail" aria-label="Presentation navigation">
          <div className="rail-kicker">Interactive deck</div>
          <h2>EU AI Gateway for General Agent Use</h2>
          <p>
            Not an email bot. A governed agent layer for every Blinqx workflow where sector data, regulation and client trust matter.
          </p>
          <div className="slide-list">
            {slideTitles.map((title, index) => (
              <button key={title} className={index === slide ? "active" : ""} onClick={() => setSlide(index)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {title}
              </button>
            ))}
          </div>
          <div className="rail-footer">
            <Button variant="outline" size="sm" onClick={() => setSlide((current) => Math.max(0, current - 1))} disabled={slide === 0}>
              <ArrowLeft aria-hidden="true" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSlide((current) => Math.min(slideTitles.length - 1, current + 1))} disabled={slide === slideTitles.length - 1}>
              Next <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </aside>

        <main className="slide-canvas" aria-live="polite">
          <div className="slide-count">{slide + 1} / {slideTitles.length}</div>
          {slide === 0 && (
            <SlideFrame eyebrow="Thesis" title="Build the agent gateway once. Specialize it per sector.">
              <div className="hero-thesis-grid">
                <div className="thesis-card primary">
                  <Sparkles aria-hidden="true" />
                  <strong>One agent control plane</strong>
                  <span>Identity, policies, tools, model routing, evidence and fallback live centrally — not scattered across product teams.</span>
                </div>
                <div className="thesis-card">
                  <ShieldCheck aria-hidden="true" />
                  <strong>EU-sovereign by default</strong>
                  <span>Mistral / Scaleway / OVH / STACKIT / IONOS / Nebius as the normal path; Bedrock, Vertex or Azure EU only when explicitly approved.</span>
                </div>
                <div className="thesis-card">
                  <Bot aria-hidden="true" />
                  <strong>General agent use</strong>
                  <span>Assist, extract, reason and act across finance, legal, HR, accountancy, mortgage, insurance, consultancy and agency workflows.</span>
                </div>
              </div>
              <div className="decision-strip">
                <span>Decision</span>
                <strong>Default to small fast non-reasoning models; escalate to reasoning only for compliance, contract, planning and high-impact decisions.</strong>
              </div>
            </SlideFrame>
          )}

          {slide === 1 && (
            <SlideFrame eyebrow="Sector coverage" title="The same gateway has to understand six different operating realities.">
              <div className="sector-picker">
                {sectors.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key} className={item.key === sector.key ? "selected" : ""} onClick={() => setSectorKey(item.key)}>
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="sector-detail-card">
                <div className="sector-detail-head">
                  <ActiveIcon aria-hidden="true" />
                  <div>
                    <h3>{sector.label}</h3>
                    <p>{sector.audience}</p>
                  </div>
                  <span className="risk-pill" style={{ borderColor: riskColor(sector.risk), color: riskColor(sector.risk) }}>{sector.risk} impact</span>
                </div>
                <div className="sector-columns">
                  <FactList title="Workflow moments" items={sector.moments} />
                  <FactList title="Agent candidates" items={sector.agents} />
                  <div className="client-signal">
                    <span>Client signal</span>
                    <strong>{sector.clientSignal}</strong>
                  </div>
                </div>
              </div>
            </SlideFrame>
          )}

          {slide === 2 && (
            <SlideFrame eyebrow="Agent portfolio" title="Stop naming agents by channel. Name them by job-to-be-done.">
              <div className="workload-tabs">
                {(Object.keys(workloads) as WorkloadKey[]).map((key) => (
                  <button key={key} className={key === workload ? "selected" : ""} onClick={() => setWorkload(key)}>
                    {workloads[key].label}
                  </button>
                ))}
              </div>
              <div className="workload-panel">
                <BrainCircuit aria-hidden="true" />
                <div>
                  <div className="eyebrow">Selected workload</div>
                  <h3>{workloadSpec.label}</h3>
                  <p>{workloadSpec.model}</p>
                </div>
                <div className="route-matrix">
                  <div><span>Route</span><strong>{workloadSpec.route}</strong></div>
                  <div><span>Guardrail</span><strong>{workloadSpec.guardrail}</strong></div>
                </div>
              </div>
              <div className="agent-grid">
                {sectors.map((item) => (
                  <div key={item.key} className="agent-card">
                    <span>{item.label}</span>
                    <strong>{item.agents[0]}</strong>
                    <p>{item.moments.slice(0, 3).join(" · ")}</p>
                  </div>
                ))}
              </div>
            </SlideFrame>
          )}

          {slide === 3 && (
            <SlideFrame eyebrow="Architecture" title="The gateway is a compliance control plane, not just a router.">
              <div className="architecture-lane">
                <ArchNode icon={UsersRound} title="User / product" body="Blinqx apps, APIs, workflows, copilots" />
                <ArchNode icon={LockKeyhole} title="Policy gate" body="identity, data class, sector, intended purpose" highlight />
                <ArchNode icon={Network} title="Agent runtime" body="tools, retrieval, prompts, memory, approvals" />
                <ArchNode icon={Scale} title="Model router" body="Tier A default, Tier B escalation, no blind fallback" highlight />
                <ArchNode icon={Landmark} title="Evidence store" body="route, policy version, disclosure, human override" />
              </div>
              <div className="fallback-stack">
                <strong>Fallback order</strong>
                <span>EU provider A → EU provider B → local/retrieval-only degraded mode → human queue.</span>
              </div>
            </SlideFrame>
          )}

          {slide === 4 && (
            <SlideFrame eyebrow="Routing policy" title="Availability must never silently beat compliance.">
              <div className="policy-grid">
                <PolicyCard tier="Tier A" title="Sovereign default" body="Mistral, Scaleway, OVHcloud, STACKIT, IONOS, Nebius. Suitable for sensitive sector workflows." />
                <PolicyCard tier="Tier B" title="Explicit escalation" body="AWS Bedrock EU, Vertex EU, Azure EU Data Zone. Use only for capability gaps with transfer/risk logging." />
                <PolicyCard tier="Tier C" title="Blocked for sensitive data" body="Global or US-routed fast inference paths. Fine for demos and synthetic data, not client records." />
              </div>
              <div className="rules-list">
                <div><CheckCircle2 aria-hidden="true" /> Classification and extraction stay non-reasoning.</div>
                <div><CheckCircle2 aria-hidden="true" /> Reasoning requires explicit task class and budget cap.</div>
                <div><CheckCircle2 aria-hidden="true" /> High-impact legal, finance, HR and insurance actions require human approval.</div>
                <div><CheckCircle2 aria-hidden="true" /> Every fallback is logged with data class, provider tier and policy version.</div>
              </div>
            </SlideFrame>
          )}

          {slide === 5 && (
            <SlideFrame eyebrow="Rollout" title="A sane adoption path: prove repeatable value before spreading agents everywhere.">
              <div className="timeline-grid">
                <Phase n="01" title="Foundation" body="Model registry, policy engine, audit schema, sector data taxonomy." />
                <Phase n="02" title="Two pilot sectors" body="Accountancy + Insurance/Mortgage: high volume, clear workflows, strong reference value." />
                <Phase n="03" title="Agent portfolio" body="Ship assist/extract agents first, then reasoning and action agents behind approval gates." />
                <Phase n="04" title="Scale" body="Roll templates into Legal, Finance, HR and Consultancy with sector-specific compliance packs." />
              </div>
              <details className="source-disclosure">
                <summary>Sources used for this presentation</summary>
                <ul>{sources.map((source) => <li key={source}>{source}</li>)}</ul>
              </details>
            </SlideFrame>
          )}
        </main>
      </div>
    </section>
  );
}

function SlideFrame({ eyebrow, title, children }: { readonly eyebrow: string; readonly title: string; readonly children: React.ReactNode }) {
  return (
    <article className="slide-frame">
      <div className="slide-heading">
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

function FactList({ title, items }: { readonly title: string; readonly items: readonly string[] }) {
  return (
    <div className="fact-list">
      <span>{title}</span>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function ArchNode({ icon: Icon, title, body, highlight = false }: { readonly icon: typeof Building2; readonly title: string; readonly body: string; readonly highlight?: boolean }) {
  return (
    <div className={`arch-node${highlight ? " highlight" : ""}`}>
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function PolicyCard({ tier, title, body }: { readonly tier: string; readonly title: string; readonly body: string }) {
  return (
    <div className={`policy-card ${tier.toLowerCase().replace(" ", "-")}`}>
      <span>{tier}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function Phase({ n, title, body }: { readonly n: string; readonly title: string; readonly body: string }) {
  return (
    <div className="phase-card">
      <span>{n}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
