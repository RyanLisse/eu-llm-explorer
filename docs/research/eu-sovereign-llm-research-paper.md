  
**EU-SOEVEREINE LLM-ROUTES**

Modelkeuze voor een AI Mail Agent onder de eis dat alle data binnen de EU blijft

*Kosten · snelheid (TTFT & throughput) · reasoning vs non-reasoning · open-weight · soevereiniteit · EU AI Act*

**Research paper**  
Versie 1.0  ·  3 juni 2026

Context: solo AI-engineer, Almere (NL) · LiteLLM (proxy \+ SDK) als multi-vendor gateway met failover

# **Inhoudsopgave**

# **Managementsamenvatting**

Dit paper consolideert het onderzoek naar een snellere, kosteneffectieve modelkeuze voor een AI-mailagent, met als **harde eis dat alle klantdata binnen de EU wordt verwerkt**. Het beantwoordt drie vragen die in de loop van het onderzoek zijn gestapeld: (1) welke modellen evenaren gpt-5-mini qua kosten maar zijn sneller; (2) welke daarvan zijn Europees of EU-conform te hosten; en (3) hoe verhouden EU-*residency* en echte EU-*soevereiniteit* zich onder GDPR, de CLOUD Act en de EU AI Act.

| Beslissing in één zin Draai een EU-first router met een soevereine kern — Mistral La Plateforme als primaire EU-vendor, met Scaleway en OVHcloud als soevereine fallbacks, en STACKIT/IONOS/Nebius voor open-weight — en val alleen terug op EU-*residency* routes van Amerikaanse hyperscalers (AWS Bedrock EU, Google Vertex EU, Azure EU Data Zone) wanneer je een capaciteit nodig hebt die de soevereine kern niet biedt. |
| :---- |

**Kernconclusies:**

* **Snelheid van gpt-5-mini is een reasoning-probleem, geen prijsprobleem.** Op 'high' reasoning is de time-to-first-token tientallen seconden; op 'minimal' zakt dat naar \~1s. De meeste snelheidswinst komt simpelweg van reasoning uitzetten.

* **Beste snelle, goedkope én soevereine keuze:** Mistral Small 4 ($0,10/$0,30, Apache 2.0) voor classificatie/extractie/concepten; Ministral 3 8B als goedkoopste; gpt-oss-20b op OVHcloud (€0,04/€0,15) voor de laagste EUR-prijs.

* **Beste reasoning binnen EU-soevereiniteit:** Magistral Medium (dedicated) of Mistral Medium 3.5 (configureerbaar) bij Mistral; gpt-oss-120b op Scaleway/OVH als goedkoopste capabele redeneerder.

* **Residency ≠ soevereiniteit.** AWS, Google, Microsoft en Anthropic bieden EU-dataverwerking, maar blijven onder de Amerikaanse CLOUD Act vallen. Mistral, Scaleway, OVHcloud, STACKIT, IONOS en Nebius vallen daar niet onder.

* **Te plannen hiaten:** nieuwere GPT-5.4-mini/nano staan nog niet in Azure EU Data Zone; Claude heeft geen EU-residency op Azure Foundry (gebruik Bedrock Frankfurt/Ierland of Vertex EU); Groq en Cerebras blijven VS-entiteiten ondanks EU-hardware.

# **1\. Residency versus soevereiniteit**

Het belangrijkste onderscheid in dit hele paper is dat tussen **data-residency** en **soevereiniteit**. Ze worden vaak door elkaar gebruikt, maar juridisch verschillen ze wezenlijk.

* **EU data-residency (Amerikaanse vendor):** prompts en responses worden in een EU-regio verwerkt, maar de operator is een Amerikaans bedrijf. Onder de **US CLOUD Act** (2018) kan zo'n bedrijf gedwongen worden data te verstrekken die het in bezit, beheer of controle heeft — ook als die fysiek in de EU staat. Je leunt dan op contracten (DPA, EU Data Boundary, zero-data-retention) en bedrijfsstructuur, niet op jurisdictie.

* **Echte EU-soevereiniteit (EU-vendor):** de operator is een EU-entiteit buiten Amerikaanse jurisdictie (Mistral, Scaleway, OVHcloud, STACKIT/Schwarz, IONOS, Nebius). De CLOUD Act reikt hier niet.

**Waarom dit voor een Nederlandse ZZP'er telt.** Een mailagent verwerkt onvermijdelijk persoonsgegevens (namen, e-mailadressen, berichtinhoud). Onder de GDPR vereist dat een rechtsgrond en passende waarborgen voor toegang van buiten de EER. Het latente conflict tussen de CLOUD Act en de GDPR is door de EDPB herhaaldelijk benoemd. Voor gevoelige mailboxdata is een soevereine route daarom niet alleen 'netjes', maar verkleint het je verwerkersketen tot één jurisdictie en één DPA.

| Let op: 'sovereign cloud' van een hyperscaler ≠ CLOUD Act-immuniteit AWS European Sovereign Cloud (algemeen beschikbaar sinds 15 januari 2026, regio Brandenburg, eusc-de-east-1) wordt door EU-personeel onder Duits recht beheerd, maar blijft een 100%-dochter van Amazon.com Inc. Behandel het als verbeterde residency, niet als jurisdictionele immuniteit. |
| :---- |

## **1.1 Drie-tier routeclassificatie**

De routes vallen in drie tiers. Tier A is EU-native/soeverein; tier B is EU-residency bij een Amerikaanse vendor; tier C wordt afgewezen voor gevoelige maildata.

| Tier | Route | Waarom | Hard-EU status |
| :---- | :---- | :---- | :---- |
| **A** | STACKIT AI Model Serving | Duitse cloud (Schwarz), OpenAI-compatible, open-weight catalogus | Soeverein — EU01 / Germany |
| **A** | OVHcloud AI Endpoints | Franse cloud, 40+ open-weight modellen, geen training op klantdata | Soeverein — FR |
| **A** | Scaleway Generative APIs | Franse cloud, open-weight, Europese opslag | Soeverein — FR |
| **A** | Mistral La Plateforme | Europese modelmaker, sterke GDPR/enterprise fit | Soeverein — FR (DPA/ZDR vastleggen) |
| **A** | Nebius Token Factory | Amsterdam-HQ, EU-DC's (FI/FR), zero-retention, 40+ open-weight | Soeverein — NL/EU |
| **B** | AWS Bedrock EU | Veel modelmakers via één control plane | Sterk mits In-Region of EU-Geo profiel |
| **B** | Google Vertex AI EU | Gemini, Claude, Mistral, open models | Sterk mits europe-west / EU multi-region |
| **B** | Azure EU Data Zone | OpenAI/Foundry \+ Mistral onder MS-governance | Sterk mits Data Zone / EU regional |
| **C** | Groq, Cerebras, SambaNova, Together, Fireworks, OpenRouter | Snel/goedkoop maar VS-entiteit of global routing | Afwijzen voor gevoelige maildata |

# **2\. De kosten/snelheid-basislijn**

Het uitgangspunt was de observatie dat gpt-5-mini traag aanvoelde. De prijs ($0,25 in / $2,00 uit per 1M tokens) is niet het probleem — de **reasoning-overhead** is dat. Dezelfde modellen met reasoning op 'minimal' zijn een orde van grootte responsiever.

| Model (referentie/baseline) | In $/1M | Uit $/1M | TTFT | Throughput |
| :---- | :---- | :---- | :---- | :---- |
| gpt-5-mini — high reasoning | $0,25 | $2,00 | \~70–104 s | \~90 t/s |
| gpt-5-mini — minimal reasoning | $0,25 | $2,00 | \~1,0 s | \~101 t/s |
| gpt-5-nano | $0,05 | $0,40 | \~0,85 s | \~150 t/s |
| gpt-5.4-mini (mrt 2026\) | $0,75 | $4,50 | \~0,9 s | \~210 t/s |
| gpt-5.4-nano (mrt 2026\) | $0,20 | $1,25 | \~0,7 s | \~230 t/s |

**Belangrijkste les voor de mailagent:** classificatie, extractie, concepten en HITL-antwoorden hebben géén chain-of-thought nodig. Houd die paden non-reasoning (of expliciet reasoning\_effort: minimal / thinkingBudget: 0). Reasoning is een escalatiepad, geen default. Bij configureerbare modellen als Gemini 2.5 Flash móét je thinking expliciet uitzetten, anders spiken latency én output-kosten op het 'snelle' pad.

# **3\. Reasoning-modellen (EU-gehost)**

Onder 'reasoning' vallen zowel dedicated denkmodellen als hybride/configureerbare modellen waarbij chain-of-thought aan/uit kan. Die laatste zijn voor jou het interessantst: je draait één model voor zowel snelle antwoorden (effort: none) als diepe agentische runs (effort: high). Prijzen per 1M tokens.

| Model | Type | In $/1M | Uit $/1M | EU-route & status |
| :---- | :---- | :---- | :---- | :---- |
| Magistral Medium | Dedicated | $2,00 | $5,00 | Mistral La Plateforme — soeverein (FR) |
| Magistral Small | Dedicated (open weight) | $0,50 | $1,50 | Mistral / Scaleway — soeverein (FR) |
| Mistral Medium 3.5 | Configureerbaar | $1,50 | $7,50 | Mistral/Scaleway soeverein · ook Bedrock/Azure EU residency |
| gpt-oss-120b | Configureerbaar (Apache 2.0) | €0,08–0,17 | €0,40–0,71 | OVH/Scaleway/STACKIT/IONOS/Nebius soeverein · ook Bedrock/Vertex EU |
| Qwen3.5-397B-A17B | Frontier (Apache 2.0) | €0,60 | €3,60 | OVHcloud / Scaleway — soeverein (FR) |
| DeepSeek-R1-Distill-Llama-70B | Dedicated (open weight) | laag | laag | Scaleway soeverein · Vertex EU residency |
| Claude Sonnet / Opus 4.x | Hybride (extended thinking) | $3 / $5 | $15 / $25 | AWS Bedrock EU · Vertex EU — residency (VS-vendor) |
| Gemini 2.5 Pro / 3.x | Configureerbaar (thinkingBudget) | variabel | variabel | Vertex europe-west4 / EU multi-region — residency |
| GPT-5 / 5.1 (reasoning) | reasoning\_effort | variabel | variabel | Azure EU Data Zone (Sweden Central) — residency |

| Reasoning-discipline Gebruik reasoning alleen voor: compliance-/contractbeoordeling, multi-step agentplanning en complexe concepten. Houd het weg bij intake, classificatie, JSON-extractie en eerste-versie antwoorden — daar kost het alleen latency en geld. |
| :---- |

# **4\. Non-reasoning / snelle modellen (EU-gehost)**

Dit is het werkpaard-segment voor de mailagent: lage TTFT, hoge throughput, lage prijs. De soevereine opties (groen in de tier-tabel) dekken het overgrote deel van de taken af.

| Model | Openheid | In $/1M | Uit $/1M | EU-route & status |
| :---- | :---- | :---- | :---- | :---- |
| Ministral 3 3B | Open weight | $0,10 | $0,10 | Mistral / OVH — soeverein (FR), TTFT \~0,50 s |
| Ministral 3 8B | Open weight | $0,15 | $0,15 | Mistral La Plateforme — soeverein (FR) |
| Mistral Small 4 | Apache 2.0 | $0,10 | $0,30 | Mistral/Scaleway/OVH — soeverein (FR) |
| Mistral Small 3.2 | Apache 2.0 | €0,09 | €0,28 | OVHcloud / Scaleway — soeverein (FR) |
| gpt-oss-20b | Apache 2.0 | €0,04–0,15 | €0,15–0,25 | OVH/STACKIT/Scaleway — soeverein |
| Llama 3.3 70B | Llama Community | €0,45–0,72 | €0,65–0,79 | OVH/STACKIT/IONOS/Scaleway soeverein · Bedrock EU residency |
| Mistral Small 24B | Open weight | $0,11 | $0,33 | IONOS — soeverein (DE) |
| Amazon Nova Lite / Micro | Proprietary | $0,06 / $0,035 | $0,24 / $0,14 | AWS Bedrock EU — residency (VS-vendor) |
| gpt-5-mini / 5-nano | Proprietary | variabel | variabel | Azure EU Data Zone — residency (VS-vendor) |
| Gemini 2.5 Flash-Lite | Proprietary | $0,10 | $0,40 | Vertex europe-west4 — residency (thinking uit) |

# **5\. Open-weight modellen op EU-soevereine routes**

Het open-weight ecosysteem wordt goed gedekt door soevereine hosts. Onderstaande tabel vat per route de catalogus, prijsindicatie en API-stijl samen — alle zijn OpenAI-compatible, dus inwisselbaar in LiteLLM via de mistral/- of openai/-provider met een eigen api\_base.

| Route (soeverein) | Notabele open-weight modellen | Prijsindicatie | API |
| :---- | :---- | :---- | :---- |
| **Mistral La Plateforme** | Large 3, Medium 3.5, Small 4, Ministral 3 3B/8B/14B, Magistral Small, Devstral, Mixtral | Small 4 $0,10/$0,30 · gratis experimenteertier · 50% batch | LiteLLM mistral/ provider |
| **Scaleway** | gpt-oss-120b/20b, Qwen3.x, Mistral Small/Medium/Large, Gemma 3/4, DeepSeek R1 distill, Llama 3.x | vanaf €0,20/1M · €1M-token gratis tier · Parijs | OpenAI-compat (api.scaleway.ai/v1) |
| **OVHcloud** | gpt-oss-20b/120b, Qwen3.x, Qwen3-Coder, Mistral Small 3.2/Nemo, Llama 3.3 70B | gpt-oss-20b €0,04/€0,15 · Llama 70B €0,67 · Gravelines | OpenAI-compat |
| **STACKIT** | Qwen3-VL 235B, Llama 3.3 70B, gpt-oss-120b, Gemma 3 27B, gpt-oss-20b, embeddings | 4 tiers: €0,15/€0,25 → €1,50/€1,75 · DE+AT | OpenAI-compat (één base-URL) |
| **IONOS** | Llama 3.1/3.3/405B, Mistral Nemo/Small 24B, gpt-oss-120b, Qwen3-Coder 80B | Llama 3.1 8B $0,17 · Mistral Small 24B $0,11/$0,33 | OpenAI-compat |
| **Nebius** | gpt-oss-120b, Qwen3.5, DeepSeek V3.2/V4, Kimi, GLM, Llama, Nemotron (41 modellen) | vanaf \~$0,13/1M input · zero-retention · EU-DC's | OpenAI-compat |

**STACKIT prijsdetail** (officiële prijslijst, 7 mei 2026): vier tiers per 1M tokens — Premium €1,50/€1,75 (Qwen3-VL 235B); Plus €0,45/€0,65 (Llama 3.3 70B, gpt-oss-120b, Gemma 3 27B); Standard €0,15/€0,25 (gpt-oss-20b); Embedding €0,02–€0,08. Eén OpenAI-compatible base-URL en één token voor alle modellen.

| Waarschuwing — Aleph Alpha is geen pure-EU meer Aleph Alpha (Duitsland) is in april 2026 met Cohere (Canada) gefuseerd; de gecombineerde entiteit is transatlantisch. Behandel Aleph Alpha / PhariaAI niet langer als zuiver EU-soeverein zonder eigen toetsing. T-Systems / Open Telekom Cloud blijft soevereine infrastructuur, maar is geen kant-en-klare LLM-as-a-service zoals de zes hierboven. |
| :---- |

# **6\. Snelle-inference vendors: Groq, Cerebras, Nebius**

Drie gespecialiseerde inference-spelers verdienen een aparte beoordeling, omdat ze ofwel extreme snelheid bieden, ofwel recent een EU-voetafdruk hebben aangekondigd. De vraag is steeds: verandert dat hun tier voor gevoelige maildata?

## **6.1 Groq — EU-datacenter, maar VS-entiteit**

Groq opende in juli 2025 zijn eerste Europese datacenter in **Helsinki** (via Equinix), wat inference dichter bij Europese gebruikers brengt met lagere latency en sterkere data governance. Toch blijft Groq een **Amerikaans bedrijf onder de CLOUD Act**, en het draait binnen Equinix-colocatie, niet als afgescheiden soevereine entiteit. Cruciaal: de publieke api.groq.com garandeert niet dat verkeer uitsluitend via Helsinki loopt; EU-only routing vereist een dedicated Equinix Fabric private/sovereign deployment.

* **Verdict:** blijft tier C op de publieke API voor gevoelige maildata. Promoveerbaar naar tier B− uitsluitend bij een dedicated EU-deployment via Equinix Fabric. Bruikbaar op de publieke API voor niet-gevoelige synthetic/testdata.

## **6.2 Cerebras — 'for Nations' is geen publieke EU-API**

Cerebras lanceerde in november 2025 **'Cerebras for Nations'**, maar dat is geen publieke EU-inference-API: het is een programma waarbij Cerebras met overheden en hun datacenter-/cloud-ecosystemen soevereine systemen on-premise of via secure cloud inzet. De Europese realisatie loopt via Aleph Alpha (infrastructuur voor de Duitse strijdkrachten) — overheids-/defensieschaal, on-premise CS-3 hardware.

* **Verdict:** niet toegankelijk voor een solo-engineer met een mailagent. De publieke Cerebras inference cloud blijft VS-gehost. Blijft tier C.

## **6.3 Nebius — wél een soevereine kandidaat**

Nebius (Amsterdam-HQ, Nasdaq-genoteerd, EU-datacenters in Finland/Frankrijk) biedt via Token Factory 40+ open-weight modellen, OpenAI-compatible, met zero-retention modus. Dit is een volwaardige **tier A soevereine kandidaat** die naast STACKIT/OVH/Scaleway past en in de eerdere matrix ontbrak.

# **7\. Aanbeveling en router-architectuur**

## **7.1 Modelkeuze per taak**

| Taak | Default modeltype | Reasoning? | Aanbevolen EU-routes |
| :---- | :---- | :---- | :---- |
| Intake / classificatie | Klein non-reasoning | Nee | STACKIT gpt-oss-20b / Llama 8B · Mistral Small · Vertex Flash-Lite |
| Extractie naar JSON | Non-reasoning \+ schema | Nee | Scaleway JSON mode · Mistral Small · Azure gpt-5-nano |
| RAG over mailbox | Non-reasoning \+ embeddings | Meestal nee | STACKIT/OVH/Scaleway embeddings \+ Mistral/Llama |
| Concept-antwoord | Fast non-reasoning | Alleen complexe cases | Mistral Small/Medium · Gemini Flash · Claude via Bedrock/Vertex EU |
| Compliance / contract | Reasoning | Ja | Magistral / Mistral Medium 3.5 · Claude Sonnet Bedrock EU |
| Multi-step agentplanning | Reasoning \+ budgetlimiet | Ja, selectief | gpt-oss-120b STACKIT · Claude Sonnet Bedrock/Vertex EU |
| Bulkverwerking | Goedkoop non-reasoning | Nee | Scaleway/OVH/STACKIT open-weight · batch-API (50% korting) |

## **7.2 Aanbevolen router-volgorde**

1. **Default goedkoop & soeverein:** Mistral Small 4 (of STACKIT gpt-oss-20b / Llama 3.3 70B) voor classificatie, extractie en RAG.

2. **EU-vendor quality path:** Mistral Small/Medium via La Plateforme, of Scaleway/OVH/STACKIT-hosting waar passend.

3. **Soevereine fallbacks:** Scaleway → OVHcloud → Nebius (alle OpenAI-compatible, alle EU).

4. **Gemini speed path (residency):** Gemini 2.5 Flash-Lite via Vertex europe-west4, met thinking uit.

5. **Claude escalation (residency):** Claude via AWS Bedrock EU In-Region/EU-Geo of Vertex EU — nooit global/US.

6. **OpenAI compatibility (residency):** gpt-5-nano/gpt-5-mini via Azure EU Data Zone.

## **7.3 Inpassen in LiteLLM (proxy en SDK)**

De stack gebruikt **LiteLLM**, niet de Vercel AI SDK. Dat past zelfs beter bij de harde EU-eis: je dwingt routing, fallbacks en region-pinning centraal af in config.yaml (proxy) of in een Router\-object (Python SDK), in plaats van per call in applicatiecode. Beide leveren één OpenAI-vormig endpoint op.

**Kernontwerp voor harde tier-A default:** groepeer modellen onder logische model\_name\-aliassen (mail-fast, mail-cheap, mail-quality, mail-reason). Alle deployments binnen zo'n groep zijn tier-A soeverein, en **fallbacks blijven binnen die laag**. Tier-B (Bedrock EU / Vertex EU / Azure EU Data Zone) staat bewust NIET in de fallback-lijst — die bereik je alleen via aparte escalate-\* aliassen die je expliciet aanroept en logt. Zo lekt gevoelige maildata nooit stilzwijgend naar een CLOUD-Act-route.

**Provider-mapping in LiteLLM:** Mistral via de native mistral/ provider (met reasoning\_effort); Scaleway/OVHcloud/STACKIT/IONOS/Nebius via de openai/\-prefix met expliciete api\_base; Claude via bedrock/eu.\<model\> met aws\_region\_name: eu-central-1; Gemini via vertex\_ai/ met vertex\_location: europe-west4. Optioneel dwing je met tag-routing (enable\_tag\_filtering) af dat 'sensitive'-getagde requests nooit een tier-B alias raken.

**Voorbeeld — kern van** config.yaml (tier-A groep \+ soevereine fallbacks):

model\_list:  
  \- model\_name: mail-fast            \# tier A, non-reasoning werkpaard  
    litellm\_params:  
      model: mistral/mistral-small-latest      \# Mistral Small 4, FR  
      api\_key: os.environ/MISTRAL\_API\_KEY  
    model\_info: { tier: A-eu-sovereign, reasoning: non-reasoning }  
  \- model\_name: mail-fast            \# fallback BINNEN tier A  
    litellm\_params:  
      model: openai/mistral-small-3.2-24b-instruct-2506   \# Scaleway  
      api\_base: https://api.scaleway.ai/v1  
      api\_key: os.environ/SCW\_SECRET\_KEY  
      order: 2  
  \- model\_name: escalate-claude      \# tier B — NIET in fallbacks  
    litellm\_params:  
      model: bedrock/eu.anthropic.claude-sonnet-4-20250514-v1:0  
      aws\_region\_name: eu-central-1            \# Frankfurt, EU-Geo

router\_settings:  
  fallbacks:                          \# blijven binnen tier A  
    \- { mail-fast: \["mail-cheap"\] }  
    \- { mail-quality: \["mail-fast"\] }  
  num\_retries: 2  
 

# **8\. EU AI Act-overwegingen (medio 2026\)**

De Act trad op 1 augustus 2024 in werking. De relevante tijdlijn en verplichtingen voor jou als deployer:

* **GPAI-verplichtingen liggen bij de modelaanbieder.** Transparantie, trainingsdata-samenvatting en copyrightbeleid gelden sinds 2 augustus 2025 voor OpenAI/Mistral/Google/Anthropic; handhaving vanaf 2 augustus 2026\. Als deployer erf je die alleen bij een 'significante wijziging' (een lichte fine-tune van Ministral voor classificatie blijft daar vermoedelijk onder — documenteer dit wel).

* **Artikel 50 transparantie** (van toepassing vanaf 2 augustus 2026): als de agent direct met mensen interacteert of content voor derden produceert, moet je (i) AI-interactie bij eerste contact melden en (ii) AI-gegenereerde content markeren. Voor een puur interne concept-assistent waar een mens reviewt en verstuurt, is de last lichter.

* **Watermerk-deadline.** Per het 'Digital Omnibus on AI' (voorlopig akkoord 7 mei 2026\) is de respijtperiode voor machine-leesbare markering verkort van zes naar drie maanden: nieuwe deadline 2 december 2026\.

* **High-risk / Annex III.** Een mailagent is vrijwel zeker niet high-risk. Standalone Annex III-verplichtingen zijn in hetzelfde Omnibus-akkoord uitgesteld naar 2 december 2027\. Houd taken die individuen beoordelen architectonisch gescheiden van de mailagent, zodat de lichte mailagent niet in high-risk scope wordt getrokken.

| Praktische winst van een EU-vendor Naast residency verkort een EU-vendor je compliance-keten: één jurisdictie, één DPA, geen CLOUD Act-analyse per subprocessor, en transparante trainingsdocumentatie. Voor een solo-engineer is dat minder administratieve last per klant. |
| :---- |

# **9\. Kanttekeningen**

* Prijzen en beschikbaarheid wijzigen snel; cijfers zijn vastgelegd in mei–juni 2026\. Verifieer op de officiële prijspagina vóór productie-commitment.

* TTFT/throughput zijn mediaan-benchmarks (Artificial Analysis, OpenRouter, vendor) en variëren met regio, load en promptlengte. EU-regio-prestaties kunnen afwijken van de (vaak VS-)endpoints waarop benchmarks draaien.

* 'Blended' prijs (1:1 input/output) is een ruwe proxy; voor mail-werk met korte input en langere output telt de output-prijs zwaarder.

* 'EU-soeverein' rust op bedrijfsstructuur; toets altijd de DPA en subprocessor-lijst. Aleph Alpha's fusie met Cohere (apr 2026\) maakt het transatlantisch.

* AWS European Sovereign Cloud (GA jan 2026, Brandenburg) is EU-beheerd maar een Amazon-dochter — verbeterde residency, geen CLOUD Act-immuniteit.

* Het 'Digital Omnibus on AI' (voorlopig akkoord 7 mei 2026\) vereist nog formele aanname; bevestig de definitieve data.

# **Bronnen**

* AWS Bedrock regional availability & inference profiles — docs.aws.amazon.com/bedrock

* AWS European Sovereign Cloud launch (15 jan 2026\) — press.aboutamazon.com

* Google Vertex AI generative AI data residency — cloud.google.com/vertex-ai

* Azure data residency & Foundry model/region availability — learn.microsoft.com

* STACKIT AI Model Serving & shared models — stackit.com, docs.stackit.cloud

* OVHcloud AI Endpoints — ovhcloud.com/public-cloud/ai-endpoints

* Scaleway Generative APIs & supported models — scaleway.com/generative-apis

* Mistral pricing & deployment — mistral.ai/pricing, docs.mistral.ai

* OpenAI GPT-5.4 mini/nano pricing — openai.com, developers.openai.com

* Groq European data center, Helsinki (jul 2025\) — groq.com/newsroom, prnewswire.com

* Cerebras for Nations (nov 2025\) — cerebras.ai/press-release/cerebrasfornations

* Aleph Alpha × Cohere / Cerebras sovereign AI — datacenterdynamics.com

* EU AI Act timeline, GPAI guidelines, Digital Omnibus — digital-strategy.ec.europa.eu

* Benchmarks (TTFT, throughput) — artificialanalysis.ai, openrouter.ai