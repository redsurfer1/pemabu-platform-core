# Approach C replacement — Pemabu ledger, recovery, Flomisma client

## Sprint 5 update — 2026-04-02

**Stripe** webhook receiver added at `app/api/webhooks/stripe` with signature verification and **mirror-only** updates to `Contract.provider_*` / `stripe_*` fields when `agreement_id` metadata is present. **Hold lifted** for **provider selection** at the integration scaffold; monetary Prisma columns remain `@deprecated` until SQL migration is applied.

---

## What the held area currently does

Pemabu persists **ledger rows** with amounts and statuses, updates statuses in **recovery** flows when failures are detected, and uses a **Flomisma HTTP client** to send payloads that describe **settlement**-style activity.

## Why it is on hold

If Pemabu’s database is the **system of record** for **customer money**, or if APIs **initiate** settlement without a licensed provider as execution layer, the operator risks **MSB / processor** classification.

## The replacement architecture

### External provider role

**Authoritative** ledger for funds: authorization, capture, payout, refund, disputes. Pemabu receives **webhooks** and **reconciliation files**.

### Platform role after replacement

- **Append-only event ingestion** (or **status mirror** updated **only** from webhooks).  
- **recovery-erp:** moves rows between **internal ops queues** that **do not** imply money moved—e.g. `NEEDS_OPS_REVIEW` vs `CONFIRMED_WITH_PROVIDER`.  
- **flomisma-client:** either **retired** for money movement or restricted to **non-monetary** APIs (e.g. identity, task proof); **settlement** calls become **provider client**.

### Integration surface

- `POST /v1/payment_intents` (illustrative)  
- `POST /v1/transfers`  
- `GET /v1/transfers/{id}`  
- Webhooks: `transfer.paid`, `transfer.failed`  
- Nightly **SFTP/CSV** reconciliation optional

### Provider selection criteria

Licensed **marketplace payments** or **payfac + bank** model suitable for **B2B** and **agent** flows; **SOC2** reports available; **multi-tenant** or **connected accounts** for sellers.

### Data model changes (Prisma — Sprint 4)

- `LedgerEntry`: add `providerTransferId`, `providerStatus`, `providerSyncedAt`; make amount fields **mirror** with `source=PROVIDER_WEBHOOK`.  
- Consider **immutable** `LedgerEvent` table; `LedgerEntry` becomes **materialized view** or **latest snapshot**.

### Code changes (outline)

- `createLedgerEntry` → `recordProviderEvent(event)`  
- `recovery-erp-service` → only when **provider** says failed **or** internal **non-payment** error  
- New `ProviderSettlementClient` replacing settlement POST in `flomisma-client`

### Rollout sequence

1. Brief 7 clearance.  
2. Backfill provider IDs for historical rows (ops).  
3. Dual-write: old row + webhook row (short window).  
4. Read path switches to provider-sourced fields.  
5. Remove HOLD.

---

*Not legal advice.*
