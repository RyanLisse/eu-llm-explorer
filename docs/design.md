# Blinqx / HippoLine Design Systeem & Interface Architectuur

Dit document beschrijft de visuele identiteit, design tokens en interface-architectuur van de **EU-Sovereign LLM Explorer**. De user interface is ontworpen conform het **Blinqx / HippoLine** design system, geverifieerd tegenover de live productiesite [accountancy.blinqx.tech](https://accountancy.blinqx.tech/).

---

## 1. Design Tokens & Kleurenpalet (CSS Variabelen)

Alle kleuren, oppervlakken en typografische tokens zijn gecentraliseerd in [app/globals.css](file:///Users/cortex-air/Developer/ex/eu-llm-explorer/app/globals.css). Het systeem gebruikt twee token-sets: `:root` voor light mode en `html.dark, .dark` voor dark mode. De actieve class wordt via een blocking inline script in `app/layout.tsx` vóór hydration gezet (geen flash-of-wrong-theme).

### Blinqx Brand Kleuren (identiek in beide themes)
* **Hoofdkleur**: `--blinqx: #ffcd00;` (Blinqx Geel — #1 meest gebruikte kleur op de live site)
* **Gedimd geel**: `--blinqx-dim` (`#c9a200` light / `#ffdb33` dark)
* **Carbon**: `--carbon: #000000;`
* **Cloud**: `--cloud: #e8f0f8;`

### Light Mode Surfaces (geverifieerd vs. accountancy.blinqx.tech)
* **Base Background**: `--bg: #f4f7f9;` (Blinqx dag-achtergrond, hex van live site)
* **Soft Background**: `--bg-soft: #edf2f7;`
* **Cards**: `--bg-card: #ffffff;`
* **Raised Elements**: `--bg-raised: #cad5e3;` (light border-gray van live site)
* **Inputs**: `--bg-input: #ffffff;`

### Dark Mode Surfaces (Blinqx nacht-familie)
* **Base Background**: `--bg: #000a18;` (diep nachtblauw)
* **Soft Background**: `--bg-soft: #001023;` (live site `#001023`)
* **Cards**: `--bg-card: #001a35;`
* **Raised Elements**: `--bg-raised: #00203f;`

### Functionele & Core Kleuren
| Token | Light | Dark | Gebruik |
|---|---|---|---|
| `--sky` | `#3a8ca6` | `#6da6b9` | Highlights, Tier B (live site sky) |
| `--growth` | `#029a80` | `#04b698` | Tier A / EU-sovereign |
| `--coral` | `#b93c3c` | `#d15858` | Risico / Excluded / Tier C |
| `--lavender` | `#475569` | `#cad5e3` | Secundaire accenten |

### Soevereiniteit & Tier Encodering
* **Tier A (EU-sovereign)**: `var(--tier-a)` → `var(--growth)`
* **Tier B (EU-residency / CLOUD Act risico)**: `var(--tier-b)` → `var(--sky)`
* **Tier C (Restricted / Excluded)**: `var(--tier-c)` → `var(--coral)`

---

## 2. Typografie

De live Blinqx site gebruikt **Metropolis** (Semi Bold, Bold, Regular) met Helvetica/Arial/Lucida als fallback. De Explorer gebruikt een equivalente open-font stack:

* **Koppen (H1, H2, H3)**: `--font-head` → Syne (display, 600–800 weight), fallback `sans-serif`
* **Lopende tekst**: `--font-body` → Geist, fallback `sans-serif`
* **Data-weergave**: `--font-data` → IBM Plex Mono, fallback `monospace`

Alle fonts worden via `next/font/google` ingeladen in `app/layout.tsx` zonder externe CDN-verzoeken op runtime.

---

## 3. Thema-toggle & Flash-preventie

Het licht/donker-thema wordt bepaald door de `dark` class op `<html>`. De initialisatiestrategie:

1. **Blocking inline script** (`app/layout.tsx`, vóór hydration): leest `localStorage.getItem('theme')`, valt terug op `prefers-color-scheme: dark`, en zet de class synchroon.
2. **`suppressHydrationWarning`** op `<html>`: voorkomt React hydration mismatch door de class-wijziging.
3. **`PageShell.tsx`** (client owner): leest de reeds-gezette class in `useEffect` en toont de toggle-knop pas ná mount om een mismatch te vermijden.

---

## 4. Visuele Effecten

* **SVG Grain Overlay**: subtiele fractale ruis op `body::before`, `opacity: 0.025`. Werkt in beide themes.
* **Glassmorphism / backdrop-filter**: `blur(12px)` op modals en chatpaneel. In light mode valt dit terug op een `--bg-card` achtergrond.
* **Glow / Ray**: `--glow: rgba(255,205,0,…)` is theme-aware (sterker in dark, zachter in light).
* **Body gradient**: `--body-bg` is een radial-gradient met Blinqx-geel en growth-groen accenten, afgestemd per theme.

---

## 5. Interface & Layout Architectuur

De applicatie is gebouwd als een responsieve **Split-Pane Layout** (`app/PageShell.tsx`):

1. **Linker Paneel (Explorer & Analytics)** — tabs: Explorer, Coverage, Chains, Research
   * **Explorer tab**: declaratieve heading die meebeweegt met de actieve filters ("EU-sovereign routes lead on reliability — N routes score X+"), live insight-summary regel, eerste-bezoek welkomstbanner (dismissible, `localStorage.seenIntro`).
   * **Coverage tab**: provider coverage overzicht.
   * **Chains tab**: aanbevolen failover-ketens per workload.
   * **Research tab**: ResearchBriefing component.

2. **Rechter Paneel (Agent-Native Chat)** — inklapbaar chatpaneel
   * Starter-prompt chips bij lege conversatie (one-click voorbeeldvragen).
   * De agent kan filters en routes direct aanpassen via `set_filters` / `select_route` tools.
   * Filterstatus wordt per bericht meegestuurd als context.

---

## 6. State & Interactie

* **Effect Atoms**: filters en geselecteerde route via `@effect-atom/atom-react` in `src/atoms.ts` (module-level, geen provider).
* **Tool-driven UI**: `set_filters` spiegelt `FilterState` 1:1 — veldnamen in `FilterState` mogen niet worden hernoemd zonder de chat-route te updaten.
* **Server/client split**: `app/page.tsx` is een pure server data-loader; `app/PageShell.tsx` is de client layout-owner.
