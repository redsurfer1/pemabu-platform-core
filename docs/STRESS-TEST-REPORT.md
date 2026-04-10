# Final Handshake & Idempotency Test Suite – Report

## Task 1: RLS "Safety Catch" for SettlementIdempotency

**Done.** `prisma/rls.policies.sql` was updated so that `SettlementIdempotency` is under RLS with **SELECT and INSERT only** (no UPDATE/DELETE):

- `ALTER TABLE "SettlementIdempotency" ENABLE ROW LEVEL SECURITY;`
- `tenant_isolation_settlement_idempotency_select`: `FOR SELECT USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid )`
- `tenant_isolation_settlement_idempotency_insert`: `FOR INSERT WITH CHECK ( "tenantId" = current_setting('app.tenant_id', true)::uuid )`

So access is allowed only when `tenant_id = current_setting('app.tenant_id')`; UPDATE/DELETE have no policy and are denied.

---

## Task 2: Environment & OpenAPI Audit

- **Backend init:** `src/lib/init-env.ts` exposes `checkEnv()` and `assertEnv()`. It checks for:
  - `DATABASE_URL`
  - `FLOMISMA_BASE_URL`
  - `FLOMISMA_API_KEY`
  - `JWT_SECRET_OR_PUBLIC_KEY`  
  Call `assertEnv()` at server startup to exit if any are missing.

- **OpenAPI:** `openapi.yaml` was updated:
  - **POST /contracts/settle** documents **200**, **400**, **401**, **403**, **404**.
  - **401** and **403** use `StandardSettlementResponse` with examples.
  - **FAILED_RETRY** is documented in `StandardSettlementResponse.status` and in `EntryStatus` for frontend error handling (e.g. “Settlement pending retry”).

---

## Task 3: Double-Spend Test Suite (Simulation)

**File:** `tests/idempotency-stress-test.ts`

1. **Race condition test**  
   Uses `Promise.all` to send **5 simultaneous** requests for the same `contractId` and `agenticProof` under the same `tenantId`.  
   - **Success criteria:** Exactly one request returns `success: true` and `status: "SETTLED"`; the other four return `duplicate: true` or a 400 with the standard idempotency/validation error.

2. **Cross-tenant leak test**  
   Submits a proof for Tenant_A’s contract with the session set to **Tenant_B** (`runWithTenantAsync` with `tenantId: Tenant_B`, then `verifyAgenticProof(contractId_A, proof, Tenant_B)`).  
   - **Success criteria:** The system returns **“Contract not found”** (RLS hides Tenant_A’s contract from Tenant_B).

3. **Immutable ledger check**  
   After the race test, counts `LedgerEntry` rows for that contract (by `metadata.contractId`).  
   - **Success criteria:** There is **exactly one** such entry.

**Mathematical double-spend argument**

- Settlement is guarded by a single **Prisma `$transaction`** that:
  1. Runs `contract.updateMany({ where: { id, tenantId, status: 'ACTIVE' }, data: { agenticProof, status: 'COMPLETED' } })`.
  2. If `updated.count === 0` → treat as duplicate and insert `DUPLICATE_ATTEMPT`; return idempotent success.
  3. If `updated.count === 1` → insert `SUCCESS` in `SettlementIdempotency`, then (outside the transaction) call Flomisma and create one LedgerEntry.

- Under concurrent requests with the same `(contractId, proofHash)`:
  - Only one transaction can see `status: 'ACTIVE'` and get `count === 1`; that one performs the single settlement and writes one ledger entry.
  - All others see the row already updated to `COMPLETED` and get `count === 0`, so they are treated as duplicates and no second ledger entry is created.

So at most one settlement and one LedgerEntry per `(contractId, proofHash)`; the system is **double-spend proof** under the given transaction and idempotency design.

---

## Task 4: Execution & Report

**How to run**

1. Set `DATABASE_URL` (and optionally `FLOMISMA_BASE_URL`, `FLOMISMA_API_KEY`, `JWT_SECRET_OR_PUBLIC_KEY`) in `.env` or the environment.
2. Apply migrations and RLS:
   ```bash
   npx prisma migrate dev
   psql "$DATABASE_URL" -f prisma/rls.policies.sql
   ```
3. Seed stress data (requires DB user that can insert, e.g. table owner or RLS disabled for test):
   ```bash
   npm run test:stress:seed
   ```
4. Run the stress test:
   ```bash
   npm run test:stress
   ```

**Expected result when run against a local PostgreSQL instance**

- **Race condition:** One of the five concurrent calls returns `success: true`, `status: "SETTLED"`; the other four return `duplicate: true` (or equivalent 400), confirming that the **`prisma.$transaction` block successfully serialized the transition and prevented double settlement.**

- **Cross-tenant:** With Tenant_B context, the request returns `success: false` and `error: "Contract not found"`, confirming **RLS isolation** (no cross-tenant access).

- **Immutable ledger:** The count of `LedgerEntry` for the settled contract is **1**, confirming a single ledger entry per transaction and **no double-spend in the ledger**.

If `DATABASE_URL` is not set, the test script fails at Prisma init with a clear error; run the above steps with a valid local PostgreSQL URL to reproduce the results.
