# PEMABU Platform

Unified identity, Flomisma **integration layer** for task and contract models with multi-tenant isolation, security controls, and SOC2-oriented audit trails. **Monetary settlement** must be executed by **licensed external providers**; Pemabu stores **reporting and workflow state** (see `portal/docs/regulatory-scrub-report.md`).

- **API spec (AI agents):** [openapi.yaml](./openapi.yaml) – OpenAPI 3.1 with `/contracts/settle`, Bearer + `X-Tenant-ID`, and `UserRole` (HUMAN/AI_AGENT).
- **Compliance:** [docs/COMPLIANCE.md](./docs/COMPLIANCE.md) – Security, audit, and interoperability checklist.
- **Modern Family Office (MFO):** [MFO platform](#modern-family-office-mfo-platform) – Risk parity workbook ingestion, Zod validation, AI specialist instructions, and Pemabu / Flomisma separation.

## Database

- **Prisma** schema: `prisma/schema.prisma`
- **PostgreSQL** with Row-Level Security (RLS) scoped by `tenant_id`.

### Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install and generate client:
   ```bash
   npm install
   npx prisma generate
   ```
3. Apply schema:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Apply RLS policies (after first migration):
   ```bash
   psql "$DATABASE_URL" -f prisma/rls.policies.sql
   ```

### Multi-tenancy (RLS)

Every request must set the current tenant so RLS can filter rows:

```sql
SET app.tenant_id = '<tenant_uuid>';
```

In your app (e.g. middleware), run this before any Prisma queries for that request, using the same connection or by executing the raw SQL before using the client.

### Entity summary

| Layer | Models | Notes |
|-------|--------|--------|
| Identity | `User`, `Tenant` | `User.role`: HUMAN \| AI_AGENT; `apiKeys` for AI agents; `walletAddress` for Flomisma |
| Reporting / reconciliation | `LedgerEntry` | References external activity via `flomismaTxId` (not a custodial ledger) |
| Tasks | `Contract`, `Milestone` | `agenticProof` = hash for AI2AI verification and settlement |
| Support | `Certification`, `Mentorship` | Placeholders for User relations |

### External payout reporting (reconciliation)

- Hiring, exam payment, mentor booking → record a `LedgerEntry` with the appropriate `EntryType` and a `flomismaTxId` referencing the **licensed processor’s** transaction id.
- For AI2AI: when a task is verified, use `Contract.agenticProof` so a **delegated** settlement integration can complete payout **outside** this codebase’s custody.

## Startup

Before starting the server, call `assertEnv()` so the process exits if required env vars are missing:

```ts
import { assertEnv } from "./lib/init-env";
assertEnv();
```

Or run the bootstrap: `node --import tsx src/server-bootstrap.ts` (then start your HTTP app).

## Implementation (Flomisma, Auth, Idempotency)

- **Flomisma:** Set `FLOMISMA_BASE_URL` and `FLOMISMA_API_KEY` in `.env`. API calls use `src/lib/flomisma-client.ts` with retry (**REGULATORY HOLD** — see `portal/docs/regulatory-hold-ledger-and-recovery.md`); on failure, ledger entries may be marked `FAILED_RETRY` for **ops reconciliation**, not for platform-initiated money movement.
- **Auth:** Use `requireAuthAndTenant()` in `src/middleware/auth-middleware.ts` to verify Bearer JWT and run handlers inside tenant context. JWT must include `tenant_id` (or `org_id` / `organization_id`); otherwise the request is rejected with **403 Forbidden**.
- **Idempotency:** Payout handoff checks `contractId` + proof hash within 24 hours; duplicates are logged as `DUPLICATE_ATTEMPT` in `SettlementIdempotency`. Contract transition ACTIVE → COMPLETED is done inside a Prisma `$transaction` to avoid race conditions.
- **Responses:** Verification / handoff return the unified `StandardSettlementResponse` (`success`, `transactionId`, `status`, `timestamp`); see `openapi.yaml` for the exact shape.

## Idempotency & double-spend stress test

- **Report:** [docs/STRESS-TEST-REPORT.md](./docs/STRESS-TEST-REPORT.md) – RLS safety catch, env/OpenAPI audit, double-spend proof argument, and test execution.
- **Run:** `npm run test:stress:seed` (once, with DB), then `npm run test:stress`. Requires `DATABASE_URL` and a local PostgreSQL instance.

---

## Modern Family Office (MFO) platform

The MFO module is a **decision-support** layer inside Pemabu: users upload a Risk Parity workbook (`SK_Fidelity` sheet), data is parsed and **validated** before any UI or model narrative runs. **No trades** are executed through this flow.

### Components

| Path | Purpose |
|------|---------|
| `lib/mfo/parse-workbook.ts` | **ExcelJS** ingestion: 47 columns (A–AU) → `MfoRow`, assumption block rows 129–138 → `PortfolioAssumptions`. |
| `lib/mfo/schema.ts` | **Zod firewall**: `MfoRowSchema`, `PortfolioAssumptionsSchema`, `PortfolioSnapshotSchema`, `MfoSpecialistPayloadSchema` (snapshot + focus row + `peerContext`). |

### Data validation (`schema.ts`)

- **`MfoRowSchema`** — Strict shape for all workbook fields: **strings** for `rowStatus`, `symbol` (ticker), `name`, `alertPrimary`, `alertSecondary`; **numbers** (or coerced numeric strings) for prices, ranks, parity dollars, RSI, quantities, and composite score.
- **Decimal ratio fields** (Excel-style fractions: `0.0075` = 0.75%) use a shared transform so values stay **consistent as decimals**—e.g. `targetSleevePct`, `expenseRatio`, `divApy`, sleeve weights, return/volatility columns, and `change24h` / `change7d`. Display layers multiply by 100 where appropriate.
- **`weightAvgPercent`** — Numeric only (often whole-number style, e.g. `25.2`); not forced into 0–1.
- **`PortfolioAssumptionsSchema`** — `returnHorizons` (3mo–5yr) and `factors` (expense, % weight, div APY, volatility) from the workbook footer; weights normalized as decimals.
- **`PortfolioSnapshotSchema`** — `snapshotAt` (ISO-8601), `assumptions`, `rows[]`, optional `sheetName` / `priceAsOfDates`.
- **Usage:** `parsePortfolioSnapshot(unknown)` throws on failure; `safeParsePortfolioSnapshot(unknown)` for API handlers.

### Pemabu frontend ↔ Flomisma backend (“Separate Entity” strategy)

| Concern | Pemabu (`PEMABU_PLATFORM`) | Flomisma (`FLOMISMA_PLATFORM` portal) |
|--------|----------------------------|----------------------------------------|
| **Role** | **Client-facing** MFO UI, workbook upload, tenant-scoped storage, user session. | **Platform / intelligence** services: optional **Privacy Shield** scrubbing (`scrubContextForLLM`), audit evidence, shared Gemini patterns (`GoogleGenAI` + `systemInstruction`). |
| **Data flow** | Pemabu validates JSON with **`PortfolioSnapshotSchema`** and only sends **scrubbed, structured** payloads to downstream routes. | When MFO narratives are generated via Flomisma-hosted APIs, prompts pass through **Privacy Shield** where PII policies apply; responses return to Pemabu for display. |
| **Contracts & settlement** | Pemabu continues to treat **money movement** as **external / licensed** (see top of this README). MFO adds **no** order routing. | Flomisma remains the **separate operational entity** for platform-wide compliance tooling—not a custodian for MFO portfolios. |
| **API boundary** | Prefer explicit env (e.g. `FLOMISMA_MFO_NARRATIVE_URL` or existing `FLOMISMA_BASE_URL` subpaths) so Pemabu never embeds Flomisma DB credentials in the browser. | Server-to-server only; keys stay on Flomisma or Pemabu **server** routes. |

This preserves **clear separation**: Pemabu owns the **family-office UX and validated snapshot**; Flomisma supplies **reusable privacy and LLM infrastructure** without merging advisory or custody roles into either product.

---

## AI Agent System Instructions

### MFO Portfolio Specialist — system prompt (reference)

Use the following as the **`systemInstruction`** (or equivalent) for any LLM route that explains MFO signals. Replace templated slots with validated JSON only.

**Role:** Senior Risk Management Consultant for the MFO platform.

**Mission:** Provide plain-English narratives for **quantitative** portfolio signals derived from the model—never discretionary investment advice.

**Source data input (must be provided by caller):**

- Validated **`MfoRow`** for the position or comparable in focus.
- **`PortfolioAssumptions`** (return horizon weights and factor weights).
- **`PeerContext`:** array of validated peer / comparable rows (same sleeve or category as configured by the product).

**Guiding principles**

1. **The “why” over the “what”** — Explain how assumption weights (e.g. **40%** weight on 3-month momentum in the return blend) influence rankings and alerts relative to other horizons and factors.
2. **Parity focus** — Describe gaps as **allocation drift**; tie narrative to **parity dollar** levels and **`parityChangeDollars`** / sleeve targets where data exists.
3. **Technical context** — Interpret **RSI** and similar fields cautiously (e.g. elevated RSI may suggest **overextended** conditions in the model’s framing); state when a field is null or missing.
4. **Professionalism** — Use terms such as **factor exposure**, **sleeve rebalancing**, and **risk budget** appropriate to institutional family-office language.

**Safety and compliance constraints**

- **Strict no-trade policy** — Never use **“Buy”** or **“Sell.”** Use the sheet’s vocabulary: **“Consider Entry,”** **“Hold,”** **“Consider Exit,”** **“Exit Review,”** etc.
- **Mandatory footer** — Every response must end with exactly:

  *This analysis is for educational purposes only based on the quantitative model provided. Pemabu and Flomisma are not registered investment advisors. No transactions are executed through this platform.*

- **No hallucinations** — If a metric is missing, say so explicitly. Do not invent fund flows, prices, or news.

**Implementation note:** In Pemabu, run **`MfoSpecialistPayloadSchema.safeParse(...)`** (or equivalent) on the server before building the user message; optional scrub via Flomisma **Privacy Shield** when the same payload might contain user-supplied text.

---

### Related compliance

- MFO narratives are **educational** and **non-transactional**; offerors should obtain **legal review** if the product is marketed to retail or advisory clients in regulated jurisdictions.
- Keep disclaimers visible in the **UI** as well as in **model output**.
