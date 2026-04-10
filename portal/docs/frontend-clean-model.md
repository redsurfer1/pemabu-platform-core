# Frontend clean model — Pemabu app (Sprint 4F)

**Date:** 2026-04-02  
**Scope:** `PEMABU_PLATFORM/app/` UI only (Next.js App Router). **Not modified:** ChromeHunt, gig search UI, tenant configs.

---

## Framework and structure

- **Framework:** Next.js 14, React 18, TypeScript.  
- **Main UI:** `app/components/`, `app/dashboard/`, `app/jobs/`, `app/staking/`, `app/contexts/`.  
- **State:** React Context (`AuthContext`, `SolvencyContext`).  
- **API layer:** Component-level `fetch`; shared helper `app/lib/provider-pending-handler.ts`.

---

## API calls — SAFE (retained)

| Component / area | Endpoint | Notes |
|------------------|----------|--------|
| Jobs / trends | `/api/jobs`, `/api/trend-watch` | Metadata / SAFE. |
| Compliance | `/api/audit-evidence`, `/api/v1/audit/*`, `/api/audit-snapshot` | Audit / export. |
| Trust / MatchGauge area | Not altered per sprint constraint | SAFE. |

---

## API calls — No longer relied on (UI stubbed / neutralized)

| Endpoint | UI handling |
|----------|-------------|
| `/api/reserve-status` | `useSolvencyMonitor` treats **501** as provider-pending (no faux solvency crisis). |
| `/api/reconciliation-status` | `ReconciliationBadge` shows **Agreement sync: provider pending** on **501**. |
| `/api/agent-equity`, `/api/staking/metrics` | **Removed** from `dashboard/page.tsx` data load. |
| `/api/staking/*` | `StakingDashboard` / `ResiliencyUnderwritingPortal` are placeholders (no `fetch`). |
| `/api/reserve-status` (widget) | `ProofOfReserveWidget` no longer calls API. |

---

## Components removed or placeholdered

- `components/StakingDashboard.tsx` — placeholder.  
- `components/ResiliencyUnderwritingPortal.tsx` — placeholder.  
- `components/ProofOfReserveWidget.tsx` — static provider-status copy.  
- `dashboard/page.tsx` — monetary hero / portfolio table replaced with clean-model cards.

---

## Components retained (behavior/copy adjusted)

- `Navigation.tsx` — link label **Program status** (was Underwriting); icon **Zap** instead of duplicate Shield.  
- `ReconciliationBadge.tsx` — **501**-aware.  
- `TrendWatchCard`, `JobListings`, compliance dashboards — unchanged where SAFE.

---

## Display string changes (selected)

| Before | After |
|--------|--------|
| Underwriting (nav) | Program status |
| Sovereign finance dashboard | Agreements and platform access overview |
| Total Sovereign Value / yield cards | Provider-pending / agreement activity copy |
| Staking card title/body | Program status / no in-app liquidity |
| Trust Center blurb | Clarified: not platform-held reserve proof |

---

## Incentive / access-tier dashboard (F6d)

- **MatchGauge / Navy–Copper / ChromeHunt / gig search:** not modified (constraint).  
- **Remediation-style copy** on Flomisma `RemediationPanel` (if mirrored in Pemabu later) should follow same **access allocation** language; Pemabu dashboard no longer shows **credit limit** phrasing (none was present in grep).

---

## Outstanding Sprint 5 TODOs

Inline **TODO Sprint 5** comments in: `ProofOfReserveWidget`, `StakingDashboard`, `ResiliencyUnderwritingPortal`, `dashboard/page.tsx`. Count: **4+** (grep before release).

---

## Visual language

- Nav **Underwriting** → **Program status**; reduced “shield-as-product” duplication on staking link.

---

*Not legal advice. Internal engineering record.*
