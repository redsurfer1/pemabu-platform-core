# Clean API surface — Pemabu Platform (Sprint 4 closeout)

**Purpose:** Route classifications after the clean model. **No route remains in REVIEW** in this table.

**See:** `FLOMISMA_PLATFORM/docs/dual-entity-operating-boundary.md`

**Excluded by constraint:** `app/api/v1/chromehunt/recommend`, `app/api/v1/search/gigs` — Sprint 1; do not modify.

---

## `app/api`

| Method(s) | Path | Classification |
|-----------|------|----------------|
| GET/POST | `jobs`, `jobs/[id]` | **SAFE** |
| GET | `trend-watch` | **SAFE** |
| GET/POST | `audit-evidence`, `audit-evidence/review`, `audit-snapshot` | **SAFE** |
| POST | `webhooks/certification-issued` | **SAFE** |
| POST | `webhooks/stripe` | **SAFE** (Stripe webhook receiver — `Stripe-Signature` verified; mirror-only `Contract` updates when metadata present; no fund movement initiated here) |
| POST | `stripe/connect/onboard` | **SAFE** — creates Stripe Connect account; returns Stripe-hosted URL only (no fund movement) |
| GET | `stripe/connect/status` | **SAFE** — read-only Connect account status query |
| POST | `stripe/payment/create-intent` | **SAFE** — creates PaymentIntent (manual capture); Stripe holds funds; platform stores reference ID only |
| GET | `/agreements/payment-complete` (page) | **SAFE** — payment status display after redirect; read-only |
| GET/POST | `v1/audit/*` | **SAFE** |
| GET | `v1/search/gigs` | **SAFE** (Sprint 1) |
| POST | `v1/chromehunt/recommend` | **SAFE** (Sprint 1) |
| GET | `reconciliation-status` | **STUB_501** |
| GET | `reserve-status` | **STUB_501** |
| GET | `agent-equity` | **STUB_501** |
| GET | `admin/war-room` | **STUB_501** |
| POST | `staking/stake`, `staking/claim`, `staking/distribute-revenue`, `staking/unstake-request`, `staking/unstake-complete`, `staking/unstake-cancel` | **STUB_501** |
| GET | `staking/metrics` | **STUB_501** |
| * | `cron/market-syllabus-bridge` | **SAFE** |
| GET/POST | `cron` | **SAFE** — Vercel cron; requires `Authorization: Bearer CRON_SECRET` |
| POST | `v1/concierge/submit` | **SAFE** — CLEAN MODEL |
| POST | `v1/concierge/accept` | **SAFE** — CLEAN MODEL |
| POST | `v1/concierge/provider-response` | **SAFE** — CLEAN MODEL |
| GET/POST | `v1/concierge/admin/review` | **SAFE** — admin; `X-Pemabu-Admin-Secret` |

**Application services:** `settlementService.releaseEscrow` and `flomisma-client.callFlomismaSettlement` return **CLEAN_MODEL** / non-initiating outcomes — no silent settlement.

---

*Not legal advice.*
