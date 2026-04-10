# Internal Compliance: Fintech Security & Agentic Integration

## Security: Prisma extension and leaky queries

- **Does the Prisma extension prevent "leaky" queries where a tenant might see another's data?**
  - **Yes.** `src/lib/prisma-tenant-extension.ts` runs `SET app.tenant_id = '<tenantId>'` in the **same PostgreSQL session** as each query (via an interactive transaction). Row-Level Security (RLS) policies in `prisma/rls.policies.sql` restrict all tenant-scoped tables to `current_setting('app.tenant_id', true)::uuid`.
  - If `tenantId` is not set (e.g. missing `X-Tenant-ID` and not inside `runWithTenant()`), the extension **throws** before any query runs, so no request can accidentally run without tenant context.

## Audit: Immutable trail for every dollar moved

- **Is there a clear, unchangeable trail for every dollar moved?**
  - **Yes.** Ledger is **insert-only**:
    - `prisma-ledger-immutable-extension.ts` throws on any `LedgerEntry` UPDATE or DELETE.
    - Refunds are implemented as **new** `LedgerEntry` rows with `type: REFUND` and `metadata.refundOfFlomismaTxId` pointing to the original transaction (`ledger-service.ts` `createRefund()`).
  - Every financial state change should create a ledger entry **before** the operation is considered "Complete" (e.g. via `ensureLedgerEntryThenComplete()` or by calling `createLedgerEntry()` then completing the business action).
  - Settlement flow: `VerificationService` → `SettlementService.releaseEscrow()` creates a ledger entry with status SETTLED, then marks the contract COMPLETED.

## Interoperability: AI agent and OpenAPI

- **Can an autonomous AI agent read the OpenAPI spec and successfully submit a task for settlement?**
  - **Yes.** `openapi.yaml` (OpenAPI 3.1) defines:
    - **Security:** Bearer (JWT) and **X-Tenant-ID** header; both required so the agent knows how to authenticate and scope requests.
    - **Identity:** `UserRole` schema with `HUMAN` and `AI_AGENT` so agents understand the identity model.
    - **POST /contracts/settle** with high precision: required body `contractId`, `agenticProof` (SHA-256 hex or signed execution log, 64–4096 chars); description states it is for AI2AI verification and Flomisma release.
  - An agent can GET `/contracts`, pick a contract, then POST to `/contracts/settle` with the required proof; the backend runs `verifyAgenticProof()` and, on match, triggers `SettlementService` to release escrow and write ledger entries.
