# Sprint 5 migration guide

This guide covers applying the **manual** SQL plan that removes Prisma fields marked `@deprecated` (Sprint 4 clean model) **after** a licensed payment provider is integrated and mirrored in the application.

**Related file:** `prisma/migrations/manual/002_sprint5_remove_deprecated_fields.sql`  
**Do not run** that script until the prerequisites below are satisfied.

---

## Prerequisites before running migrations

- Licensed provider integration is live in staging.
- `provider_reference_id` (and equivalent hold identifiers) is populated for all active agreements that still need reconciliation (verify with a read-only query).
- `provider_status` is being updated via webhooks or polling from the provider.
- Lead developer has reviewed `002_sprint5_remove_deprecated_fields.sql`.
- Backup of production database taken.

---

## Stripe-specific migration steps

### Step 1: Add Stripe / provider mirror columns (before removing deprecated monetary columns)

Run in Supabase SQL editor (adjust only if your migration tooling already applied these via Prisma):

```sql
ALTER TABLE "Contract"
  ADD COLUMN IF NOT EXISTS "provider_reference_id" TEXT,
  ADD COLUMN IF NOT EXISTS "provider_status" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" TEXT;
```

`provider_reference_id` / `provider_status` are generic mirrors; `stripe_*` are Stripe-specific IDs for query convenience.

### Step 2: Remove deprecated columns

Run `prisma/migrations/manual/002_sprint5_remove_deprecated_fields.sql` only after prerequisites in this guide are satisfied.

### Step 3: Prisma

Update `prisma/schema.prisma` to match the live database, then run `npx prisma generate` (do **not** run `migrate` / `db push` in this sprint task unless operators approve).

### Step 4: Verify

Exercise Stripe test webhooks (CLI or dashboard) against `POST /api/webhooks/stripe` and confirm `Contract` rows update when `metadata.agreement_id` matches a row `id`.

---

## Migration steps (in order)

1. Enable maintenance mode (operator-facing surfaces).
2. Deploy Sprint 5 provider integration code (concrete adapter + verified webhook path).
3. Run `002_sprint5_remove_deprecated_fields.sql` in the Supabase SQL editor (or your PostgreSQL admin tool) against the target database.
4. Deploy application code that no longer reads or writes the removed columns (Prisma schema updated in the same release train).
5. Verify the application with smoke tests (agreement lifecycle, ledger mirror reads, search, auth).
6. Disable maintenance mode.

---

## Rollback plan

If migration causes issues:

- Restore from backup.
- Re-deploy the pre-migration application and Prisma client revision.
- Provider hold IDs remain valid at the partner; reversing schema drops does not invalidate provider-side objects.

---

## Models affected

Deprecated monetary or authority-implying fields targeted by `002_sprint5_remove_deprecated_fields.sql`:

| Prisma model | Deprecated fields (planned drop) | Replaced by / notes |
|--------------|----------------------------------|---------------------|
| `Tenant` | `overnightCap`, `currentBalanceEOD` | Provider or operator policy; not platform ledger. |
| `AssetVault` | `valuation`, `leaseRate` | Quotes / provider metadata; display-only outside provider. |
| `Agent` | `totalSupply`, `circulatingSupply`, `currentPrice`, `t30Revenue`, `initialCollateralUsdc` | Reporting from provider or retired product surface. |
| `ValuationHistory` | `price`, `t30Revenue` | Optional provider audit export tables. |
| `User` | `walletAddress` | Provider connected-account or external wallet references only. |
| `LedgerEntry` | `amount`, `currency`, `flomismaTxId` | Provider transfer / event IDs and mirrored status. |
| `ReserveLedgerEntry` | `amount` | Partner reserve reporting. |
| `Contract` | `escrowAmount` | Provider hold configuration + display. |
| `Milestone` | `amount` | Provider payout schedule + display. |
| `GovernanceThreshold` | `autoSettlementLimitUsd`, `treasuryDiscrepancyMaxPct`, `driftVarianceMax` | Ops config / provider dashboard. |
| `AuditEvidence` | `reserveRatio`, `ledgerSum`, `reserveSum` | Non-monetary audit payloads or provider exports. |
| `CreditDecision` | `financialProfileHash` | Optional full table drop — see commented section in SQL file. |
| `ComplianceAuditLog` | `variance` | Statistical payloads without monetary columns. |
| `AgenticTender` | `amount` | Bid display / provider quote. |
| `AgentEquity` | `totalSupply`, `circulatingSupply`, `dividendYield` | Optional full table drop — see SQL comments. |
| `StakingPosition` | `stakedAmount`, `rewardsClaimed`, `rewardsAccrued` | Optional full table drop — see SQL comments. |
| `StakingPool` | `totalValueLocked`, `totalRewardsDistributed`, `rewardPoolBalance`, `currentAPY`, `last30DayRevenue`, `rewardDiversionRate` | Optional full table drop — see SQL comments. |

**Schema note:** Models marked entirely `@deprecated` in `schema.prisma` (`CreditDecision`, `AgentEquity`, `StakingPosition`, `StakingPool`) have **optional** `DROP TABLE` statements commented out at the bottom of the SQL file. Enable only after data export and counsel review.

---

*Engineering planning only. Not legal advice.*
