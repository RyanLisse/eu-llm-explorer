# EU-Hosted LLMs for an AI Mail Agent: Data-Residency vs. Sovereignty Comparison (June 2026)

## TL;DR
- For a Netherlands solo engineer who must keep all data in the EU, the cleanest fully-sovereign (non-CLOUD-Act) routes are **Mistral La Plateforme (France)**, **Scaleway Generative APIs (France)**, **OVHcloud AI Endpoints (France)**, **STACKIT (Germany)**, and **IONOS AI Model Hub (Germany)** — all OpenAI-compatible and trivial to wire into a Vercel AI SDK ModelRegistry; for maximum model choice you fall back to **EU data-residency** routes from US vendors (AWS Bedrock EU, Google Vertex EU, Azure AI Foundry EU Data Zone), which keep data in EU regions but remain subject to the US CLOUD Act.
- Best picks: fast non-reasoning mail tasks → **Mistral Small 4** ($0.10/$0.30) or **Ministral 3 8B** on Mistral/Scaleway/OVH; reasoning tasks → **Magistral Medium**, **gpt-oss-120b** (configurable reasoning), or **Mistral Medium 3.5** (toggleable reasoning effort); best fully-sovereign option = **Mistral La Plateforme**, best EU-residency-with-most-choice = **AWS Bedrock Frankfurt/Ireland** (Claude, Llama, Mistral, Nova, DeepSeek).
- Key gaps to plan around: newer **GPT-5.4-mini/nano are not yet in Azure EU Data Zone Standard** (only Global Standard or US Data Zone as of mid-2026); **Claude has no EU residency on Azure Foundry** (use Bedrock Frankfurt/Ireland or Vertex EU instead); and **Gemini 3.5/3.x single-region EU endpoints lag** the global launch (the EU multi-region endpoint is the compliant path).

## Key Findings

**The residency-vs-sovereignty distinction is real and legally material.** "EU data residency" means prompts and responses are processed in an EU region, but if the operator is a US company (AWS, Google, Microsoft, Anthropic-via-hyperscaler), it remains subject to the **US CLOUD Act**, which can compel disclosure of data regardless of where it is stored. "True EU sovereignty" means the operator is an EU legal entity outside US jurisdiction (Mistral, Scaleway, OVHcloud, STACKIT/Schwarz, IONOS, Aleph Alpha, T-Systems). Even AWS's new **European Sovereign Cloud** — which reached general availability on **January 15, 2026** in Brandenburg, Germany (region `eusc-de-east-1`, backed by a ~€7.8B investment through 2040) — is, per the EUROPEAN CLOUD analysis, run by EU-resident staff but is "a 100% subsidiary of Amazon.com Inc. AWS ESC does not offer protection against the US CLOUD Act."

**Mistral La Plateforme is the strongest single sovereign option** — broadest current lineup, OpenAI-compatible, servers in France, with both fast non-reasoning and reasoning (Magistral; Medium 3.5 configurable) models.

**The open-weight ecosystem is well-covered by sovereign hosts.** gpt-oss-120b/20b, Qwen3.x, Llama 3.3, Mistral open models, and Gemma are available across Scaleway, OVHcloud, STACKIT, and IONOS at low EUR pricing.

## Details

### Residency vs. Sovereignty — why it matters for a Netherlands ZZP'er

Under **GDPR**, processing EU personal data (which a mail agent inevitably does — names, email addresses, message content) requires a lawful basis and appropriate safeguards for any transfer or access from outside the EEA. The **US CLOUD Act** (2018) lets US authorities compel US-headquartered providers to produce data in their "possession, custody, or control" even when stored on EU servers — creating a latent conflict with GDPR that EU regulators and the EDPB have repeatedly flagged. For a US-vendor EU-residency route, you are relying on contractual commitments (DPAs, EU Data Boundary, zero-data-retention) and corporate structure rather than jurisdictional immunity. For a true EU-sovereign vendor, the CLOUD Act simply does not reach them.

Practically:
- **EU residency (US vendor)**: AWS Bedrock EU, Google Vertex AI EU, Azure OpenAI / AI Foundry EU Data Zone, Anthropic Claude via Bedrock/Vertex EU. More model choice, frontier models, but CLOUD Act exposure remains.
- **EU sovereign (EU vendor)**: Mistral La Plateforme, Scaleway, OVHcloud, STACKIT, IONOS, Aleph Alpha, T-Systems/Open Telekom Cloud, Nebius (Amsterdam-HQ, Nasdaq-listed; EU DCs in Finland/France). No CLOUD Act exposure.

**EU AI Act status (mid-2026):** The Act entered into force August 1, 2024. GPAI provider obligations (transparency, copyright, training-data summaries) have applied since **August 2, 2025**; the Commission's enforcement powers over GPAI apply from **August 2, 2026**. Most remaining obligations — including **Article 50 transparency** (marking machine-readable AI-generated content; disclosing AI interaction to users) — apply from **August 2, 2026**. Per the Council of the EU's "Digital Omnibus on AI" provisional agreement of **7 May 2026**, the Article 50(2) machine-readable watermarking grace period was reduced from six months to three, setting a new deadline of **2 December 2026**; all other Article 50 obligations (including deployer disclosure) still apply from 2 August 2026. The same Omnibus agreement **defers standalone Annex III high-risk obligations from 2 August 2026 to 2 December 2027** (and Annex I product-embedded high-risk to 2 August 2028), subject to formal adoption before August 2026.

As a *deployer* building an internal mail agent on third-party models, the user is not a GPAI *provider* (those obligations sit with OpenAI/Mistral/etc.), but Article 50 deployer-side disclosure can apply if the agent's outputs are public-facing or generate content for third parties.

### Section 2 — Reasoning models (EU-hosted)

"Reasoning" includes dedicated thinking models and hybrid/configurable models where chain-of-thought can be toggled (flagged below). Prices per 1M tokens; TTFT/throughput from Artificial Analysis (Mistral first-party API figures noted).

| Model | Route | Reasoning type | Open/Prop | Input | Output | TTFT | Throughput | Residency level | EU region(s) |
|---|---|---|---|---|---|---|---|---|---|
| Magistral Medium | Mistral La Plateforme | Dedicated reasoning | Proprietary (Premier) | $2 | $5 | ~1–2s | — | EU sovereign (FR) | France |
| Magistral Small | Mistral La Plateforme | Dedicated reasoning | Open weight | $0.50 | $1.50 | — | — | EU sovereign (FR) | France |
| Mistral Medium 3.5 | Mistral La Plateforme / Scaleway / AWS Bedrock EU / Azure EU | Configurable reasoning_effort | Open weight (modified MIT) | $1.50 | $7.50 | 1.78s (Mistral API) | ~158 t/s | Sovereign (Mistral/Scaleway) or residency (AWS/Azure) | FR; Bedrock EU; Azure Sweden |
| gpt-oss-120b | Scaleway / OVHcloud / STACKIT / IONOS / AWS Bedrock EU / Vertex EU | Configurable reasoning depth | Open weight (Apache 2.0) | OVH €0.08 / Scaleway $0.15 / STACKIT €0.45 / IONOS $0.17 | OVH €0.40 / Scaleway $0.60 / STACKIT €0.65 / IONOS $0.71 | Vertex 0.37s (lowest of 22 benchmarked providers) | up to ~560 t/s (Nebius); Cerebras 1,905 t/s, non-EU | Sovereign (OVH/Scaleway/STACKIT/IONOS) or residency (AWS/Vertex) | FR; DE; Bedrock EU; Vertex EU |
| gpt-oss-20b | OVHcloud / STACKIT / Scaleway | Configurable reasoning depth | Open weight (Apache 2.0) | OVH €0.04 / STACKIT €0.15 | OVH €0.15 / STACKIT €0.25 | low | ~307 t/s | EU sovereign | FR; DE |
| Qwen3.5-397B-A17B | OVHcloud / Scaleway | Frontier reasoning | Open weight (Apache 2.0) | OVH €0.60 | OVH €3.60 | — | — | EU sovereign | FR |
| Qwen3-32B | OVHcloud | Reasoning (toggle) | Open weight (Apache 2.0) | €0.08 | €0.23 | — | — | EU sovereign | FR |
| Claude (Sonnet/Opus 4.x) | AWS Bedrock EU / Vertex EU | Hybrid extended thinking | Proprietary | Sonnet $3 / Opus $5 | Sonnet $15 / Opus $25 | — | — | EU residency (US vendor) | Bedrock Frankfurt/Ireland/Stockholm; Vertex EU |
| Gemini 2.5 Pro / 3.5 Flash | Google Vertex AI EU | Configurable thinkingBudget | Proprietary | varies | varies | — | 3.5 Flash ~289 t/s (Google claim) | EU residency (US vendor) | europe-west4 (2.5 Pro single-region); 3.5 Flash EU multi-region only |
| GPT-5 / 5.1 (reasoning) | Azure AI Foundry EU Data Zone | reasoning_effort levels | Proprietary | varies | varies | — | — | EU residency (US vendor) | Sweden Central / West Europe (Data Zone EU) |
| DeepSeek R1 distill (Llama 70B/8B) | Scaleway / Vertex EU | Dedicated reasoning | Open weight | low | low | — | — | Sovereign (Scaleway) / residency (Vertex) | FR; Vertex EU |

### Section 3 — Non-reasoning / fast models (EU-hosted)

| Model | Route | Open/Prop | Input | Output | TTFT | Throughput | Residency | EU region |
|---|---|---|---|---|---|---|---|---|
| Ministral 3 3B | Mistral / OVH | Open weight | $0.10 | $0.10 | 0.50s (fastest on Mistral) | 187 t/s | EU sovereign | FR |
| Ministral 3 8B | Mistral La Plateforme | Open weight | $0.15 | $0.15 | low | high | EU sovereign | FR |
| Mistral Small 4 | Mistral / Scaleway / OVH | Open weight (Apache 2.0) | $0.10 | $0.30 | ~0.65s | 172 t/s | EU sovereign | FR |
| Mistral Small 3.2 | OVHcloud / Scaleway | Open weight (Apache 2.0) | OVH €0.09 | OVH €0.28 | 0.65s | high | EU sovereign | FR |
| Mistral Large 3 | Mistral / Scaleway / AWS Bedrock EU / Azure EU | Open weight | $0.50 | $1.50 | 1.09s (Mistral) / 1.21s (Amazon) | 206 t/s (Amazon) / 51 t/s (Mistral) | Sovereign or residency | FR; Bedrock EU; Azure Sweden |
| Llama 3.3 70B | OVH / STACKIT / IONOS / Scaleway / Bedrock EU | Open weight (Llama Community) | OVH €0.67 / STACKIT €0.45 / IONOS $0.71 | OVH €0.67 / STACKIT €0.65 / IONOS $0.71 | — | — | Sovereign or residency | FR; DE; Bedrock EU |
| Mistral Small 24B | IONOS | Open weight | $0.11 | $0.33 | — | — | EU sovereign | DE |
| Amazon Nova Micro/Lite/Pro | AWS Bedrock EU | Proprietary | Micro $0.035 / Lite $0.06 / Pro $0.80 | Micro $0.14 / Lite $0.24 / Pro $3.20 | — | — | EU residency (US vendor) | Bedrock EU |
| GPT-5-mini / 5-nano | Azure AI Foundry EU Data Zone | Proprietary (reasoning-capable) | varies | varies | — | — | EU residency (US vendor) | Sweden Central (EU Data Zone) |
| GPT-4.1-mini | Azure AI Foundry EU Data Zone | Proprietary | varies | varies | low | — | EU residency (US vendor) | EU Data Zone (retiring Oct 2026) |
| Gemini 2.5 Flash / Flash-Lite | Vertex AI EU | Configurable thinking | Proprietary | low | low | — | — | EU residency (US vendor) | europe-west4 |

### Section 4 — Open-weight models on EU-sovereign routes

| Route | Vendor / sovereignty | Notable open-weight models | Pricing notes | API |
|---|---|---|---|---|
| **Mistral La Plateforme** | Mistral AI, France — EU sovereign | Mistral Large 3 ($0.50/$1.50), Medium 3.5 ($1.50/$7.50), Small 4 ($0.10/$0.30), Ministral 3 3B/8B/14B, Magistral Small, Devstral 2/Small 2, Mixtral 8x7B/8x22B, NeMo | Open models Apache 2.0 or modified MIT; free experimentation tier; 50% batch discount | OpenAI-compatible (`api.mistral.ai/v1`) + native `@ai-sdk/mistral` |
| **Scaleway Generative APIs** | Scaleway, France — EU sovereign | gpt-oss-120b/20b, Qwen3-235B, Qwen3.5/3.6 family, Mistral Small/Medium/Large 3, Gemma 3/4, DeepSeek R1 distill, Llama 3.x | Per-1M token, from €0.20/1M; €1M-token free tier; Paris DCs only; sub-200ms TTFT target | OpenAI-compatible (`api.scaleway.ai/v1`) |
| **OVHcloud AI Endpoints** | OVHcloud, France — EU sovereign | gpt-oss-20b (€0.04/€0.15), gpt-oss-120b (€0.08/€0.40), Qwen3.5/3.6, Qwen3-Coder, Qwen3-32B, Mistral Small 3.2/7B/Nemo, Llama 3.3 70B (€0.67) | EUR pricing, Gravelines DC; 40+ models; zero data retention | OpenAI-compatible |
| **STACKIT AI Model Serving** | Schwarz Group, Germany — EU sovereign | Qwen3-VL 235B (€1.50/€1.75, Premium tier), Llama 3.3 70B / gpt-oss-120b / Gemma 3 27B (all €0.45/€0.65, Plus tier), gpt-oss-20b (€0.15/€0.25, Standard tier), embeddings (€0.02–€0.08) | 4-tier EUR pricing; DE+AT DCs; GDPR+C5+ISO27001; no data stored or used for training | OpenAI-compatible (`api.openai-compat.model-serving.eu01.onstackit.cloud/v1`) |
| **IONOS AI Model Hub** | IONOS, Germany — EU sovereign | Llama 3.1 8B/3.3 70B/405B, Mistral Nemo/Small 24B, gpt-oss-120b, Qwen3-Coder-Next 80B; Teuken 7B (retired Apr 2026) | Llama 3.1 8B $0.17/$0.17; gpt-oss-120b $0.17/$0.71; Mistral Small 24B $0.11/$0.33 | OpenAI-compatible |
| **Nebius Token Factory** | Nebius (Amsterdam/Nasdaq) — EU sovereign, EU DCs (FI/FR) | 41 open-weight models: gpt-oss-120b, Qwen3.5, DeepSeek V3.2/V4, Kimi, GLM, Llama, Nemotron | Zero-retention mode; from ~$0.13/1M input; EU + US residency options | OpenAI-compatible |

**STACKIT pricing detail (confirmed against the official STACKIT price list PDF, v1.0.38, updated 7 May 2026):** four tiers per 1M tokens — LLM-Premium €1.50 in / €1.75 out (only Qwen3-VL 235B); LLM-Plus €0.45 / €0.65 (Llama 3.3 70B, gpt-oss-120b, Gemma 3 27B); LLM-Standard €0.15 / €0.25 (gpt-oss-20b, legacy Llama 3.1 8B); Embedding-Plus €0.08 and Embedding-Standard €0.02 (input-priced). This supersedes the older "most models €0.45/€0.65" two-tier structure. All models share one OpenAI-compatible base URL and one auth token.

**Aleph Alpha / T-Systems note:** Germany's Aleph Alpha has pivoted from selling the Luminous LLM API to its **PhariaAI** enterprise platform (sovereign, on-prem/private-cloud oriented). On **24 April 2026** Cohere (Toronto) announced the acquisition/merger of Aleph Alpha at a combined ~$20B valuation — Cohere shareholders hold ~90%, Aleph Alpha ~10%, with a $600M Schwarz Group investment in Cohere's Series E; the combined entity is expected to run on STACKIT. This makes Aleph Alpha a **transatlantic** entity going forward, so it no longer cleanly qualifies as pure-EU sovereign — monitor before relying on it. T-Systems / Open Telekom Cloud offers sovereign German hosting and partners with Google on "Sovereign Cloud" but is best treated as infrastructure rather than a turnkey LLM-as-a-service comparable to the above.

### Section 5 — Consolidated recommendation

**(a) Fast non-reasoning mail tasks (classification, drafting, extraction):**
- **Primary (sovereign):** **Mistral Small 4** ($0.10/$0.30, Apache 2.0, ~172 t/s, ~0.65s TTFT) via Mistral La Plateforme. Excellent European-language handling, OpenAI-compatible, drop-in.
- **Cheapest sovereign:** **Ministral 3 3B/8B** ($0.10/$0.10–$0.15) — fastest TTFT (0.50s) for classification/extraction; or **gpt-oss-20b on OVHcloud** (€0.04/€0.15) for the lowest EUR rate. Mistral's **Classifier API** (fine-tuned Ministral 3B/8B, $0.04–$0.10/1M) is purpose-built for mail triage/sentiment/moderation if you fine-tune.
- **Highest throughput sovereign:** gpt-oss-120b on Scaleway/OVH for high-volume drafting.

**(b) Reasoning tasks where chain-of-thought genuinely helps:**
- **Sovereign:** **Magistral Medium** (dedicated reasoning) or **Mistral Medium 3.5** (toggle reasoning_effort — best because you run one model for both quick replies and deep agentic runs). **gpt-oss-120b** (configurable reasoning depth) on Scaleway/OVH is the cheapest capable sovereign reasoner.
- **Residency (more capability):** Claude Sonnet/Opus extended thinking via Bedrock Frankfurt/Ireland; Gemini 2.5 Pro thinkingBudget via Vertex europe-west4; GPT-5/5.1 reasoning via Azure EU Data Zone.

**(c) Best fully-sovereign (non-US) vs. best EU-residency (US vendor, more choice):**
- **Best fully-sovereign:** **Mistral La Plateforme** — broadest sovereign lineup, native + OpenAI-compatible, France-hosted, covering reasoning + non-reasoning + coding + vision + OCR. **Scaleway** is the best sovereign *aggregator* if you want open-weight variety (gpt-oss, Qwen, DeepSeek, Gemma) under one French endpoint.
- **Best EU-residency (US vendor, max choice):** **AWS Bedrock in EU regions** — Frankfurt (`eu-central-1`) acts as a source region for the EU cross-region inference profile (routing stays inside EU geography), with Ireland (`eu-west-1`) and Stockholm (`eu-north-1`) offering in-region hosting. One API covers Claude, Llama, Mistral, Nova, Cohere, DeepSeek; on-demand per-token pricing matches direct provider pricing, geographic cross-region inference adds no fee, while *global* profiles run ~10% cheaper but route worldwide (not EU-safe). Google Vertex EU is the alternative if you want Gemini + Claude together.

**Vercel AI SDK ModelRegistry wiring:** Every sovereign route here is **OpenAI-compatible**, so each slots into a ModelRegistry via `@ai-sdk/openai-compatible`'s `createOpenAICompatible({ baseURL, apiKey })`. Mistral additionally has a first-party `@ai-sdk/mistral` provider exposing `reasoningEffort` ('high'/'none') and structured outputs. AWS Bedrock has `@ai-sdk/amazon-bedrock`; Vertex has `@ai-sdk/google-vertex`; Azure Foundry's non-OpenAI catalog (Llama/Mistral/Phi/Claude-3P) needs the `createOpenAICompatible` path against the `/openai/v1` surface (Claude on Foundry sits on a separate `/anthropic/v1` Messages API). Recommended failover order for a sovereign-first registry: **Mistral → Scaleway → OVHcloud** (all OpenAI-compatible, all French/EU), with **AWS Bedrock EU** as a residency-tier fallback for Claude-class capability. This matches the Anthropic/OpenAI/Google failover pattern the user already has, just re-pointed at EU endpoints.

### Section 6 — EU AI Act considerations (mid-2026)

- **GPAI obligations** (transparency, training-data summary, copyright policy) sit with the *model providers* (OpenAI, Mistral, Google, Anthropic), applicable since Aug 2, 2025; Commission enforcement from Aug 2, 2026. As a deployer the user inherits these only if they significantly modify/fine-tune a GPAI model and place it on the market (a minor fine-tune of Ministral for classification likely stays below the "significant modification" threshold, but document this).
- **Article 50 transparency** (applicable Aug 2, 2026; machine-readable marking grace period now to Dec 2, 2026): if the mail agent interacts directly with people or produces content seen by third parties, the user as deployer should (i) disclose AI interaction at first contact and (ii) ensure AI-generated content is appropriately marked/labelled. For a purely internal drafting assistant where the human reviews and sends, the disclosure burden is lighter.
- **High-risk / Annex III:** The mail agent itself is very likely **not** high-risk. However, the user's separate **STAR Group ZZP freelancer-classification pipeline** could touch **employment/worker-management** use cases in Annex III (recruitment, task allocation, or decisions affecting work relationships are explicitly high-risk). If that pipeline makes or materially informs classification decisions about individuals, assess it against Annex III obligations (risk management, logging, human oversight, transparency). Per the May 2026 Digital Omnibus provisional agreement, standalone Annex III high-risk obligations are **deferred to 2 December 2027** (from Aug 2, 2026), giving more runway — but the obligations themselves are unchanged. Keep the mail agent and the classification pipeline architecturally and legally separated so the lighter-touch mail agent isn't pulled into high-risk scope.

## Recommendations
1. **Default to a sovereign-first ModelRegistry.** Wire Mistral La Plateforme as primary (Small 4 for fast tasks, Medium 3.5 / Magistral for reasoning), Scaleway and OVHcloud as sovereign fallbacks. All OpenAI-compatible — no architectural changes from your current registry.
2. **Reserve US-vendor EU-residency routes for capability gaps.** When you genuinely need Claude-class reasoning or Gemini multimodality, use AWS Bedrock Frankfurt/Ireland (Claude) or Vertex europe-west4 — but document the CLOUD Act exposure in your DPA/records of processing, and use *geographic* (EU) inference profiles, never *global* ones.
3. **Avoid Azure for Claude and for the newest GPT minis if EU residency is hard-required:** Claude has no EU residency on Azure Foundry, and GPT-5.4-mini/nano are not yet in EU Data Zone Standard (Microsoft has given no firm ETA, and gpt-4.1-mini retires Oct 2026). Use GPT-5-mini/nano or GPT-4.1-mini in Sweden Central EU Data Zone in the interim, or pivot the fast-tier entirely to Mistral/OVH.
4. **Benchmarks/thresholds to revisit the choice:** if a fast model's TTFT exceeds ~1s or throughput drops below ~100 t/s for interactive mail drafting, switch model or route; if monthly token volume crosses into the tens of millions, evaluate OVHcloud/STACKIT EUR pricing or batch APIs (50% discount on Scaleway, Mistral, and Bedrock).
5. **Article 50 readiness before Aug 2, 2026 (marking by Dec 2, 2026):** add an AI-disclosure notice for any human recipient who interacts with the agent, and confirm whether your generative outputs need machine-readable marking before the December grace deadline.

## Caveats
- LLM pricing and model availability change frequently; several figures (especially newer Qwen/DeepSeek versions and aggregator-sourced EUR rates) were captured in May–June 2026 — verify on the official pricing page before committing. STACKIT EUR figures are from the official price list PDF (7 May 2026); Mistral USD figures from mistral.ai/pricing; OVH EUR figures from the OVHcloud catalog; benchmark figures from Artificial Analysis.
- TTFT/throughput figures are median measurements from Artificial Analysis and vary by region, load, and prompt size; EU-region performance may differ from the benchmarked (often US) endpoints. Notably, the fastest gpt-oss-120b providers (Cerebras at 1,905 t/s, Vertex at 0.37s TTFT) are not all EU-hosted.
- "EU sovereign" claims rest on corporate structure; always review each vendor's DPA and subprocessor list. Aleph Alpha's April 2026 Cohere merger turns it into a transatlantic (Canada-anchored) entity — it no longer cleanly qualifies as pure-EU.
- AWS European Sovereign Cloud (GA Jan 2026, Brandenburg, `eusc-de-east-1`) is operated by EU staff under German law but remains an Amazon subsidiary; treat it as enhanced residency, not CLOUD-Act immunity. Anthropic/Bedrock new-model releases also typically lag the direct Anthropic API by 1–4 weeks.
- The EU AI Act "Digital Omnibus on AI" (provisional agreement 7 May 2026) still requires formal adoption by Parliament and Council; confirm the final adopted text and dates before relying on the deferred high-risk timeline.