"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Landmark,
  ListChecks,
  Network,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ChapterKey = "preface" | "sovereignty" | "routes" | "gateway" | "act" | "docs";

type Chapter = {
  readonly key: ChapterKey;
  readonly title: string;
  readonly eyebrow: string;
  readonly icon: typeof BookOpen;
  readonly summary: string;
  readonly pages: readonly {
    readonly title: string;
    readonly body: readonly string[];
    readonly callout?: string;
    readonly bullets?: readonly string[];
  }[];
};

const chapters: readonly Chapter[] = [
  {
    key: "preface",
    title: "Research canon",
    eyebrow: "Start here",
    icon: BookOpen,
    summary: "The research is not the pitch deck. It is the decision book behind the product and architecture choices.",
    pages: [
      {
        title: "What this book is",
        body: [
          "A navigable source of truth for EU-hosted LLM routing, AI Act gateway design, and Blinqx-wide agent governance.",
          "The presentation explains the story. This book preserves the evidence, definitions, caveats and implementation rules so product, legal, security and engineering can argue from the same page.",
        ],
        callout: "Use the deck to convince. Use the book to decide.",
      },
      {
        title: "Source bundle",
        body: [
          "The book condenses three attached research tracks: the EU-sovereign LLM comparison, the Dutch routing paper, and the deep AI Act compliant-gateway report.",
        ],
        bullets: [
          "EU-hosted model catalog and provider comparison",
          "Residency versus sovereignty legal distinction",
          "Policy-aware gateway and always-available fallback design",
          "Blinqx sector context: regulated financial and business services",
        ],
      },
    ],
  },
  {
    key: "sovereignty",
    title: "Residency vs sovereignty",
    eyebrow: "Legal boundary",
    icon: Scale,
    summary: "Residency is where data is processed. Sovereignty is which jurisdiction can compel access.",
    pages: [
      {
        title: "The distinction that matters",
        body: [
          "EU data residency means prompts and responses are processed in an EU region. If the operator is a US company, CLOUD Act exposure remains because control can sit outside the EU.",
          "EU sovereignty means the operator is an EU legal entity outside US jurisdiction. For sensitive Blinqx workflows, that difference is not academic — it changes the compliance chain.",
        ],
        callout: "Residency is a contract. Sovereignty is a jurisdiction.",
      },
      {
        title: "Three route tiers",
        body: ["The research classifies model routes into three practical tiers."],
        bullets: [
          "Tier A — EU-sovereign: Mistral, Scaleway, OVHcloud, STACKIT, IONOS, Nebius",
          "Tier B — EU-residency: AWS Bedrock EU, Google Vertex EU, Azure EU Data Zone",
          "Tier C — blocked for sensitive data: US/global-routing inference APIs without hard EU-only guarantees",
        ],
      },
    ],
  },
  {
    key: "routes",
    title: "Model route canon",
    eyebrow: "LLM selection",
    icon: Sparkles,
    summary: "Small non-reasoning models are the default. Reasoning is an explicit escalation path.",
    pages: [
      {
        title: "Default model posture",
        body: [
          "Most agent tasks — classification, extraction, first drafts, retrieval and admin assistance — do not need chain-of-thought. Turning reasoning on by default burns latency and money without buying reliability.",
          "The research points to Mistral Small 4, Ministral 3, and gpt-oss-20b/120b on sovereign hosts as the practical workhorse layer.",
        ],
        bullets: ["Fast path: Mistral Small 4 / Ministral 3", "Cheap path: OVH gpt-oss-20b", "Reasoning path: Mistral Medium 3.5 / Magistral / gpt-oss-120b"],
      },
      {
        title: "Routing rule",
        body: [
          "Tier-A fallbacks stay inside Tier A. Tier-B routes are not failovers; they are named escalation paths with logging, transfer rationale and task justification.",
        ],
        callout: "Availability must never silently beat compliance.",
      },
    ],
  },
  {
    key: "gateway",
    title: "Gateway control plane",
    eyebrow: "Architecture",
    icon: Network,
    summary: "The gateway is where identity, policy, tools, routing, logging and fallback meet.",
    pages: [
      {
        title: "Gateway ≠ router",
        body: [
          "A compliant gateway decides what is allowed before choosing a model. It should classify data, determine intended purpose, apply sector policy, then route to a model or degraded fallback.",
          "For Blinqx, that control plane has to serve accountancy, legal, consultancy, insurance/mortgage, finance and HR — each with different impact and oversight needs.",
        ],
      },
      {
        title: "Fallback ladder",
        body: ["The safest fallback is not always the strongest model. It is the strongest allowed behavior for the data class and task risk."],
        bullets: [
          "EU provider A → EU provider B",
          "Local / retrieval-only / rules-engine degraded mode",
          "Human queue for high-impact legal, finance, HR or insurance decisions",
          "Audit event for every fallback, denial and escalation",
        ],
      },
    ],
  },
  {
    key: "act",
    title: "AI Act operating notes",
    eyebrow: "Regulation",
    icon: Landmark,
    summary: "The AI Act maps obligations by role, risk class and intended purpose — not by whether something is called a gateway.",
    pages: [
      {
        title: "Role mapping",
        body: [
          "A gateway is not a standalone AI Act category. It has to be functionally mapped: infrastructure layer, deployer-controlled AI system, or provider-like wrapper depending on who determines the intended purpose and how much AI behavior is packaged.",
        ],
      },
      {
        title: "Operational timeline",
        body: ["The practical dates from the research are the ones teams need to design around."],
        bullets: [
          "Feb 2025 — prohibited practices and AI literacy",
          "Aug 2025 — GPAI provider obligations",
          "Aug 2026 — Article 50 transparency obligations",
          "Dec 2026 — machine-readable marking grace deadline",
          "Dec 2027 — standalone Annex III high-risk obligations, per provisional Omnibus timeline",
        ],
      },
    ],
  },
  {
    key: "docs",
    title: "Implementation docs",
    eyebrow: "Engineering handoff",
    icon: FileText,
    summary: "The book should become the long-lived implementation guide, not another static research dump.",
    pages: [
      {
        title: "What belongs here",
        body: [
          "Keep architectural decisions, route policies, vendor caveats, DPIA/FRIA notes, model benchmarks and sector-specific patterns in this book-like experience.",
          "Keep the presentation clean and persuasive. Keep the compare/explorer surfaces operational. Keep the book detailed and auditable.",
        ],
      },
      {
        title: "Next useful expansions",
        body: ["The current book is the shell and distilled canon. The obvious next move is adding deeper pages for each source document and sector appendix."],
        bullets: [
          "Appendix A — provider-by-provider route evidence",
          "Appendix B — Blinqx sector risk matrix",
          "Appendix C — LiteLLM / gateway config examples",
          "Appendix D — AI Act and GDPR evidence checklist",
        ],
      },
    ],
  },
];

export function ResearchBook() {
  const [chapterKey, setChapterKey] = useState<ChapterKey>("preface");
  const [pageIndex, setPageIndex] = useState(0);
  const [query, setQuery] = useState("");

  const filteredChapters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((chapter) =>
      [chapter.title, chapter.eyebrow, chapter.summary, ...chapter.pages.flatMap((page) => [page.title, ...page.body, ...(page.bullets ?? []), page.callout ?? ""])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const activeChapter = chapters.find((chapter) => chapter.key === chapterKey) ?? chapters[0]!;
  const activePage = activeChapter.pages[pageIndex] ?? activeChapter.pages[0]!;
  const ActiveIcon = activeChapter.icon;

  const selectChapter = (key: ChapterKey) => {
    setChapterKey(key);
    setPageIndex(0);
  };

  const move = (direction: 1 | -1) => {
    const currentChapterIndex = chapters.findIndex((chapter) => chapter.key === chapterKey);
    const nextPage = pageIndex + direction;
    if (nextPage >= 0 && nextPage < activeChapter.pages.length) {
      setPageIndex(nextPage);
      return;
    }
    const nextChapter = chapters[currentChapterIndex + direction];
    if (!nextChapter) return;
    setChapterKey(nextChapter.key);
    setPageIndex(direction > 0 ? 0 : nextChapter.pages.length - 1);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") move(1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="book-shell" aria-label="Interactive research and documentation book">
      <aside className="book-sidebar">
        <div className="book-brand">
          <BookOpen aria-hidden="true" />
          <div>
            <span>Interactive book</span>
            <strong>Research & Docs</strong>
          </div>
        </div>
        <label className="book-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chapters…" />
        </label>
        <nav className="book-toc" aria-label="Book chapters">
          {filteredChapters.map((chapter) => {
            const Icon = chapter.icon;
            return (
              <button key={chapter.key} className={chapter.key === activeChapter.key ? "active" : ""} onClick={() => selectChapter(chapter.key)}>
                <Icon aria-hidden="true" />
                <span>{chapter.eyebrow}</span>
                <strong>{chapter.title}</strong>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="book-reader">
        <div className="book-topline">
          <span>Chapter {chapters.findIndex((chapter) => chapter.key === activeChapter.key) + 1} / {chapters.length}</span>
          <span>Page {pageIndex + 1} / {activeChapter.pages.length}</span>
        </div>
        <article className="book-spread">
          <section className="book-page book-page-left">
            <div className="book-chapter-mark"><ActiveIcon aria-hidden="true" /></div>
            <div className="eyebrow">{activeChapter.eyebrow}</div>
            <h2>{activeChapter.title}</h2>
            <p className="book-summary">{activeChapter.summary}</p>
            <div className="book-margin-note">
              <ShieldCheck aria-hidden="true" />
              <span>Canonical, auditable, separate from the pitch narrative.</span>
            </div>
          </section>

          <section className="book-page book-page-right">
            <div className="eyebrow">Reading page</div>
            <h3>{activePage.title}</h3>
            {activePage.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {activePage.callout ? <blockquote>{activePage.callout}</blockquote> : null}
            {activePage.bullets ? (
              <ul className="book-bullets">
                {activePage.bullets.map((bullet) => <li key={bullet}><ListChecks aria-hidden="true" />{bullet}</li>)}
              </ul>
            ) : null}
          </section>
        </article>

        <div className="book-controls">
          <Button variant="outline" onClick={() => move(-1)} disabled={activeChapter.key === chapters[0]!.key && pageIndex === 0}>
            <ArrowLeft aria-hidden="true" /> Previous page
          </Button>
          <div className="book-progress" aria-hidden="true">
            {activeChapter.pages.map((_, index) => <span key={index} className={index === pageIndex ? "active" : ""} />)}
          </div>
          <Button variant="outline" onClick={() => move(1)} disabled={activeChapter.key === chapters[chapters.length - 1]!.key && pageIndex === activeChapter.pages.length - 1}>
            Next page <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </main>
    </section>
  );
}
