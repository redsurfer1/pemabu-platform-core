# ChromeHunt — Resource vs Live Pemabu Reconciliation

**Status:** Design / patch plan (no code merged in this session)  
**Resource:** `Developer/Resources/flomisma_ChromeHunt/ChromeHunt-main/`  
**Live:** Expected at `portal/app/(portal)/services/chrome-hunt/` per product map — **not present in this repository snapshot** (Next app root is `PEMABU_PLATFORM/app/`; no `chrome-hunt` directory found).  
**Regulatory:** Do **not** import marketplace **escrow** or **payment** copy from the resource legal placeholders.

---

## B1 — Version summaries

### Resource (`ChromeHunt-main`)

| Aspect | Detail |
|--------|--------|
| **Entry** | Vite + React: `index.tsx` → `App.tsx` |
| **Structure** | `Layout` + view switcher: `home`, `marketplace`, `sell`, `blog`, `guide`, `listing`, `pricing`, `how-it-works`, legal |
| **Gemini** | `services/geminiService.ts`: `@google/genai` `GoogleGenAI`, model **`gemini-2.5-flash`**, **structured JSON** via `responseSchema` (`extensionSchema`), optional **`googleSearch` tool** for live Chrome Web Store URLs |
| **Prompt** | Strong system rules: real CWS URLs, safety, max 3 recommendations, JSON-only |
| **UI** | `pages/Home.tsx`: hero, typewriter, fake “live activity” ticker, autocomplete suggestions, loading messages |
| **Data** | `services/mockData.ts` for marketplace/blog |
| **Risk** | `App.tsx` **LegalPage** mentions **“14-day escrow”** and **marketplace transactions** — **do not port** to Pemabu marketing/legal |

### Live Pemabu (expected / snapshot)

| Aspect | Detail |
|--------|--------|
| **Entry** | **Not found** in workspace — reconcile when `chrome-hunt` route lands under `app/` or `portal/app/` |
| **Gemini** | **Unknown in repo** — assume alignment with product: Gemini extension recommender for operator tooling |
| **UI** | **Unknown** — likely Navy/Copper + `MatchGauge` patterns elsewhere |

**Inference from repo (related, not ChromeHunt UI):** `src/lib/talenthunt-integration.ts` implements **project matching** for webhooks; **not** extension recommendations.

---

## B2 — Diff-style comparison

| Feature / behavior | Resource version | Live Pemabu version | Verdict |
|--------------------|------------------|---------------------|---------|
| Structured Gemini output (name, pros, cons, safety, CWS URL) | Yes (`extensionSchema` + JSON mime type) | Unknown | **RESOURCE_IS_BETTER** (copy **schema + prompt discipline** into shared lib) |
| Google Search tool for real `chromewebstore.google.com` links | Yes (`tools: [{ googleSearch: {} }]`) | Unknown | **MERGE** — adopt if live lacks live URL grounding |
| Fallback path without Search tool | Yes | Unknown | **MERGE** |
| Vite SPA + multi-page marketing (`marketplace`, `blog`, `pricing`) | Yes | N/A if Pemabu embeds single tool | **DIVERGED_IRRELEVANT** |
| Legal copy referencing escrow / marketplace transactions | Present | Must **not** match Pemabu regulatory posture | **LIVE_IS_BETTER** (Pemabu: omit escrow claims) |
| Mock marketplace listings / revenue | Present | Unlikely in compliance-focused portal | **DIVERGED_IRRELEVANT** |
| `MatchGauge` / design system | Not present | Pemabu standard | **LIVE_IS_BETTER** |
| Autocomplete + typewriter hero | Rich | Unknown | **MERGE** (optional UX polish — low priority) |

---

## B3 — Implementation patch plan (RESOURCE_IS_BETTER / MERGE)

| Verdict | Resource file | Target file (when live exists) | Change | Est. lines | Regression risk |
|---------|---------------|-------------------------------|--------|------------|-------------------|
| RESOURCE_IS_BETTER | `services/geminiService.ts` | `portal/lib/chromehunt/` (shared) + thin server wrapper | Extract **systemInstruction**, **extensionSchema**, **cleanJson**, two-stage **generateContent** (search on, search off) | +120 lib, ~20 wrapper | Low if API keys stay server-only |
| MERGE | `types.ts` `ExtensionRecommendation` | `portal/lib/chromehunt/types.ts` | Align TS types with structured output | ~40 | Low |
| MERGE | `pages/Home.tsx` UX patterns | Live ChromeHunt page components | Optional: autocomplete list, loading copy — **no fake escrow** | TBD | Medium (UX scope creep) |
| LIVE_IS_BETTER | `App.tsx` LegalPage escrow text | — | **Do not merge** | 0 | N/A |

**Security:** Never expose `GEMINI_API_KEY` / `API_KEY` to browser — resource uses `process.env.API_KEY`; Pemabu must use **server route** or **server action** only.

---

## B4 — Shared library (completed in repo)

See `portal/lib/chromehunt/` for **prompt + type exports** derived from the resource, **sanitized** (no escrow language).
