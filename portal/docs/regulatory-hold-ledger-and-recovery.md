# Regulatory hold — Pemabu ledger, recovery, and Flomisma client

**Date:** 2026-04-02  
**Representative paths:** `src/services/recovery-erp-service.ts`, `src/lib/flomisma-client.ts`, settlement-related services, `LedgerEntry` mutation paths.

## What this code currently does

- Updates **internal ledger row status** (e.g. moving entries to `PENDING_RECONCILIATION`) and may call Flomisma APIs described as settlement in product docs.

## Why it is on hold

- If `LedgerEntry` is treated as **authoritative for money movement** rather than **mirroring** an external processor, regulators may view the platform as recording or controlling funds. Counsel should confirm **single source of truth** is the **licensed provider’s ledger**, with Pemabu holding **reporting copies** only.

## Delegated replacement

- All state transitions should reflect **webhooks or reconciled exports** from a licensed processor; recovery flows become **ops tooling** on **reporting** data, not initiation of ACH/card/crypto movement.

## Suggested categories

- **Bank / processor:** ACH and card acquiring through a licensed partner.  
- **Reconciliation:** accounting and ERP import from processor statements.

---

*Not legal advice.*
