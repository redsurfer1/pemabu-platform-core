# Regulatory scrub report — Pemabu Platform

## Date of scrub

2026-04-02

## Platforms covered

- `PEMABU_PLATFORM` (root app, `src/`, `prisma/`, `docs/`, `portal/docs/`)

## Regulatory lines assessed

MSB, payments processor, fiduciary (same framework as Flomisma report).

## Scan methodology

Identical to `FLOMISMA_PLATFORM/docs/regulatory-scrub-report.md` (shared `grep` groups and exclusions).

## Approximate match counts

See Flomisma report for **before/after** group tallies; Pemabu contributes a subset (ledger, tests, README, UI).

## Summary table

| Category | Notes |
|----------|--------|
| **REMEDIATE (executed)** | `app/page.tsx` demo button label; `src/services/recovery-erp-service.ts` docstrings; `README.md` reconciliation framing; `portal/docs/search-upgrade-design.md` + `adr/001-search-architecture.md` entitlement language |
| **APPROACH C (HOLD)** | `src/lib/flomisma-client.ts` → `portal/docs/regulatory-hold-ledger-and-recovery.md` |
| **LEGAL_REVIEW** | `LedgerEntry` semantics; OpenAPI `/contracts/settle` descriptions; finance tests naming (`settlement.test.ts`) — **counsel** + product to align language with delegated processor |

## Compliance docs added/updated

- `portal/docs/compliance/Model-Card-V1.md` — synced to post-scrub Model Card (access engine framing).  
- `portal/docs/compliance/Incentive-Remediation-V1.md` — **new** incentive / remediation policy text.

## Files with `REGULATORY HOLD`

- `src/lib/flomisma-client.ts` → `portal/docs/regulatory-hold-ledger-and-recovery.md`

## Attestation block

This scrub was performed by automated agent analysis. It is not a legal opinion. Items marked **LEGAL_REVIEW** require review by qualified legal counsel before production deployment. Items marked **REGULATORY HOLD** must not be deployed until replaced with a **licensed external integration** as described in the hold document.

---

*End of report.*

## Sprint 4 update — Clean model applied 2026-04-02

### Changes applied this sprint

- **`src/lib/flomisma-client.ts`** — `callFlomismaSettlement` is a **CLEAN_MODEL** stub (no live settlement call).
- **`src/services/settlement-service.ts`** — `releaseEscrow` returns **CLEAN_MODEL** error; no Flomisma bridge or ledger write.
- **`prisma/schema.prisma`** — **`/// @deprecated`** on `LedgerEntry` monetary fields, `ReserveLedgerEntry.amount`, `Contract.escrowAmount`, `Milestone.amount`, `Tenant` overnight snapshot fields (structure unchanged).
- **`portal/docs/compliance/Model-Card-V1.md`** — **Platform Access Engine** rewrite; ECOA/Reg B clarification paragraph in Intended Use.
- **`portal/docs/compliance/Incentive-Remediation-V1.md`** — Access-only framing; slash rate and 72-hour review language clarified as **non-monetary**.
- **`portal/docs/clean-api-surface.md`** — New SAFE route reference.

### Remaining holds (Approach C — licensed provider required)

- **`app/api/staking/*`**, **`agent-equity`**, **`admin/war-room`** — Review for **custodial** or **token distribution** semantics vs reporting-only; Sprint 5 after provider selection.
- **OpenAPI / UI copy** referencing `/contracts/settle` or “withdraw” — align with provider-led funds language.

### Items resolved without provider (clean model removal)

- Pemabu-initiated **Flomisma settlement** path removed at the service boundary (stub + early failure).

---

*Sprint 4 appendix — not a legal opinion.*
