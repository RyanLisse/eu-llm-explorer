"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldX,
  Scale,
  Landmark,
  Zap,
  Route,
  ArrowDown,
  FileText,
} from "lucide-react";

/* ── Scroll reveal hook ─────────────────────────────────────────── */

function useReveal<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, root: el.closest(".page-main") },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "in-view" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Count-up stat ──────────────────────────────────────────────── */

function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1400,
}: {
  readonly to: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly decimals?: number;
  readonly duration?: number;
}) {
  const { ref, inView } = useReveal<HTMLSpanElement>(0.6);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="count-up">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ── Data ───────────────────────────────────────────────────────── */

const TIMELINE = [
  { date: "Aug 2024", label: "AI Act in force", detail: "Regulation enters into force EU-wide", state: "past" },
  { date: "Feb 2025", label: "Prohibited practices", detail: "Bans + AI literacy obligations apply", state: "past" },
  { date: "Aug 2025", label: "GPAI obligations", detail: "Transparency, copyright & training-data summaries for model providers", state: "past" },
  { date: "Aug 2026", label: "Article 50 transparency", detail: "Disclose AI interaction · mark AI-generated content", state: "now" },
  { date: "Dec 2026", label: "Watermark deadline", detail: "Machine-readable marking (Digital Omnibus: grace cut to 3 months)", state: "future" },
  { date: "Dec 2027", label: "Annex III high-risk", detail: "Standalone high-risk obligations (deferred by Omnibus)", state: "future" },
] as const;

const TIERS = [
  {
    tier: "A",
    title: "EU-sovereign",
    icon: Shield,
    color: "var(--tier-a)",
    desc: "Operator is an EU legal entity outside US jurisdiction. The CLOUD Act does not reach them.",
    routes: "Mistral · Scaleway · OVHcloud · STACKIT · IONOS · Nebius",
    verdict: "Default + auto-fallback",
  },
  {
    tier: "B",
    title: "EU-residency",
    icon: ShieldAlert,
    color: "var(--tier-b)",
    desc: "Data processed in EU regions, but the operator is a US company — CLOUD Act exposure remains via contracts, not jurisdiction.",
    routes: "AWS Bedrock EU · Google Vertex EU · Azure EU Data Zone",
    verdict: "Explicit escalation only — never silent fallback",
  },
  {
    tier: "C",
    title: "Rejected",
    icon: ShieldX,
    color: "var(--tier-c)",
    desc: "US entity or global routing. Public APIs don't guarantee EU-only traffic, even with EU datacenters.",
    routes: "Groq · Cerebras · Together · Fireworks · OpenRouter",
    verdict: "Not for sensitive data",
  },
] as const;

const ROUTER_STEPS = [
  { n: 1, name: "Sovereign default", detail: "Mistral Small 4 — classification, extraction, RAG ($0.10/$0.30, Apache 2.0)", tier: "A" },
  { n: 2, name: "EU quality path", detail: "Mistral Medium 3.5 via La Plateforme or Scaleway hosting", tier: "A" },
  { n: 3, name: "Sovereign fallbacks", detail: "Scaleway → OVHcloud → Nebius — all OpenAI-compatible, all EU", tier: "A" },
  { n: 4, name: "Gemini speed path", detail: "Flash-Lite via Vertex europe-west4 — thinking off", tier: "B" },
  { n: 5, name: "Claude escalation", detail: "Bedrock Frankfurt/Ireland or Vertex EU — never global/US", tier: "B" },
  { n: 6, name: "OpenAI compat", detail: "gpt-5-nano/mini via Azure EU Data Zone (Sweden Central)", tier: "B" },
] as const;

/* ── Component ──────────────────────────────────────────────────── */

export function ResearchBriefing() {
  return (
    <section className="research" id="research">
      {/* Header */}
      <Reveal>
        <div className="research-head">
          <span className="eyebrow">
            <FileText size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 6 }} />
            Research briefing · June 2026
          </span>
          <h2>
            Residency is a contract.
            <br />
            <span className="research-accent">Sovereignty is a jurisdiction.</span>
          </h2>
          <p>
            Three research tracks — an EU AI Act gateway analysis, a sovereign LLM routing paper, and a
            provider comparison — distilled into the decision framework behind this explorer.
          </p>
        </div>
      </Reveal>

      {/* Stat counters */}
      <div className="research-stats">
        <Reveal delay={0}>
          <div className="research-stat">
            <div className="stat-value"><CountUp to={6} /></div>
            <div className="stat-label">sovereign EU hosts outside CLOUD Act reach</div>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="research-stat">
            <div className="stat-value"><CountUp to={40} suffix="+" /></div>
            <div className="stat-label">open-weight models on sovereign routes</div>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="research-stat">
            <div className="stat-value"><CountUp to={0.04} prefix="€" decimals={2} /></div>
            <div className="stat-label">per 1M tokens — gpt-oss-20b on OVHcloud</div>
          </div>
        </Reveal>
        <Reveal delay={300}>
          <div className="research-stat">
            <div className="stat-value"><CountUp to={0.5} suffix="s" decimals={1} /></div>
            <div className="stat-label">TTFT Ministral 3 3B — fastest sovereign route</div>
          </div>
        </Reveal>
      </div>

      {/* Residency vs sovereignty split */}
      <div className="vs-split">
        <Reveal className="vs-left" delay={0}>
          <div className="vs-panel vs-residency">
            <div className="vs-head">
              <Landmark size={18} />
              <h3>EU data-residency</h3>
            </div>
            <p className="vs-tag">US vendor · EU region</p>
            <p>
              Prompts and responses processed in an EU region — but the operator is a US company. Under the{" "}
              <strong>US CLOUD Act</strong> it can be compelled to disclose data in its
              &ldquo;possession, custody, or control&rdquo; <em>regardless of where it is stored</em>.
            </p>
            <p className="vs-verdict">You rely on contracts: DPAs, EU Data Boundary, zero-retention.</p>
          </div>
        </Reveal>
        <Reveal className="vs-right" delay={150}>
          <div className="vs-panel vs-sovereign">
            <div className="vs-head">
              <Scale size={18} />
              <h3>EU sovereignty</h3>
            </div>
            <p className="vs-tag">EU vendor · EU jurisdiction</p>
            <p>
              The operator is an EU legal entity outside US jurisdiction. The CLOUD Act{" "}
              <strong>simply does not reach them</strong>. One jurisdiction, one DPA, no per-subprocessor
              CLOUD-Act analysis.
            </p>
            <p className="vs-verdict">You rely on jurisdiction — not paperwork.</p>
          </div>
        </Reveal>
      </div>

      <Reveal>
        <div className="research-note">
          Even AWS&apos;s <strong>European Sovereign Cloud</strong> (GA Jan 2026, Brandenburg) is run by EU staff under
          German law — but remains a 100% Amazon subsidiary. Enhanced residency, not jurisdictional immunity.
        </div>
      </Reveal>

      {/* Three tiers */}
      <Reveal>
        <div className="research-subhead">
          <span className="eyebrow">Classification</span>
          <h3>Three tiers, one hard rule</h3>
        </div>
      </Reveal>
      <div className="tier-cards">
        {TIERS.map((t, i) => (
          <Reveal key={t.tier} delay={i * 130}>
            <div className="tier-card" style={{ "--tier-color": t.color } as React.CSSProperties}>
              <div className="tier-badge">
                <t.icon size={16} />
                <span>Tier {t.tier}</span>
              </div>
              <h4>{t.title}</h4>
              <p>{t.desc}</p>
              <div className="tier-routes">{t.routes}</div>
              <div className="tier-verdict">{t.verdict}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Reasoning discipline */}
      <Reveal>
        <div className="reasoning-insight">
          <div className="reasoning-icon">
            <Zap size={20} />
          </div>
          <div>
            <h4>Speed is a reasoning problem, not a price problem</h4>
            <p>
              gpt-5-mini on <code>high</code> reasoning: <strong>~70–104s</strong> to first token. The same model on{" "}
              <code>minimal</code>: <strong>~1.0s</strong>. Most of the speed win comes from turning reasoning off —
              keep classification, extraction and drafts non-reasoning, and treat chain-of-thought as an
              escalation path, not a default.
            </p>
          </div>
          <div className="ttft-bars">
            <div className="ttft-bar">
              <span className="ttft-label">high</span>
              <div className="ttft-track"><div className="ttft-fill ttft-slow" /></div>
              <span className="ttft-value">104s</span>
            </div>
            <div className="ttft-bar">
              <span className="ttft-label">minimal</span>
              <div className="ttft-track"><div className="ttft-fill ttft-fast" /></div>
              <span className="ttft-value">1.0s</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Router cascade */}
      <Reveal>
        <div className="research-subhead">
          <span className="eyebrow">Architecture</span>
          <h3>
            <Route size={18} style={{ display: "inline", verticalAlign: "-2px", marginRight: 8 }} />
            The recommended router order
          </h3>
          <p className="research-subdetail">
            Tier-A fallbacks stay inside Tier A. Tier-B routes are reachable only via explicit, logged{" "}
            <code>escalate-*</code> aliases — sensitive data never silently crosses into CLOUD-Act scope.
          </p>
        </div>
      </Reveal>
      <div className="router-cascade">
        {ROUTER_STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 110}>
            <div className={`router-step tier-${s.tier.toLowerCase()}`}>
              <div className="router-num">{s.n}</div>
              <div className="router-body">
                <div className="router-name">
                  {s.name}
                  <span className={`router-tier router-tier-${s.tier.toLowerCase()}`}>Tier {s.tier}</span>
                </div>
                <div className="router-detail">{s.detail}</div>
              </div>
              {i === 2 && (
                <div className="router-gate">
                  <ArrowDown size={12} />
                  <span>explicit escalation gate — logged, never automatic</span>
                  <ArrowDown size={12} />
                </div>
              )}
            </div>
          </Reveal>
        ))}
        <div className="cascade-pulse" aria-hidden="true" />
      </div>

      {/* AI Act timeline */}
      <Reveal>
        <div className="research-subhead">
          <span className="eyebrow">Regulation</span>
          <h3>EU AI Act — the operational timeline</h3>
        </div>
      </Reveal>
      <div className="act-timeline">
        <div className="act-line" aria-hidden="true" />
        {TIMELINE.map((m, i) => (
          <Reveal key={m.date} delay={i * 120}>
            <div className={`act-milestone act-${m.state}`}>
              <div className="act-dot" />
              <div className="act-date">{m.date}</div>
              <div className="act-label">{m.label}</div>
              <div className="act-detail">{m.detail}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="research-footnote">
          Sources: EU AI Act gateway research brief · EU-sovereign LLM routing paper v1.0 (June 2026) ·
          provider residency comparison (June 2026). Prices and availability captured May–June 2026 — verify
          before production commitment.
        </p>
      </Reveal>
    </section>
  );
}
