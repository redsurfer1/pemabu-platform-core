-- SPRINT 5 MIGRATION PLAN
-- Apply after licensed provider integration is
-- confirmed and provider_reference_id /
-- provider_status fields are populated.
-- Review with lead developer before applying.
-- Do NOT apply until provider integration is
-- live and tested in staging.
--
-- PostgreSQL / Prisma table names match generated migrations (quoted identifiers).
-- Each DROP is IF EXISTS to support partial replays during dry runs.
-- Replacing removed semantics: display-only or provider-mirrored data should live in
-- provider_reference_id / provider_status (or equivalent) on agreement and ledger
-- projections — not in platform-held balance columns below.

-- ─── Tenant ───────────────────────────────────────────────────────────────
-- overnightCap, currentBalanceEOD: replaced by provider-side limits / mirrors; not platform ledger.
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "overnightCap";
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "currentBalanceEOD";

-- ─── AssetVault ─────────────────────────────────────────────────────────────
-- valuation, leaseRate: monetary display moved to provider quotes or non-authoritative UI config.
ALTER TABLE "AssetVault" DROP COLUMN IF EXISTS "valuation";
ALTER TABLE "AssetVault" DROP COLUMN IF EXISTS "leaseRate";

-- ─── Agent ──────────────────────────────────────────────────────────────────
-- Equity / supply / revenue surrogates: provider or operator reporting; not platform custody fields.
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "totalSupply";
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "circulatingSupply";
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "currentPrice";
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "t30Revenue";
ALTER TABLE "Agent" DROP COLUMN IF EXISTS "initialCollateralUsdc";

-- ─── ValuationHistory ───────────────────────────────────────────────────────
-- price, t30Revenue: historical monetary marks — replace with provider-sourced audit exports if needed.
ALTER TABLE "ValuationHistory" DROP COLUMN IF EXISTS "price";
ALTER TABLE "ValuationHistory" DROP COLUMN IF EXISTS "t30Revenue";

-- ─── User ───────────────────────────────────────────────────────────────────
-- walletAddress: custody reference removed from platform schema; link via provider account ids only.
ALTER TABLE "User" DROP COLUMN IF EXISTS "walletAddress";

-- ─── LedgerEntry ────────────────────────────────────────────────────────────
-- amount, currency: not authoritative ledger of record; mirror via provider_transfer_id pattern (Sprint 5).
-- flomismaTxId: correlation id that implied platform settlement authority — replace with provider event ids.
ALTER TABLE "LedgerEntry" DROP COLUMN IF EXISTS "amount";
ALTER TABLE "LedgerEntry" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "LedgerEntry" DROP COLUMN IF EXISTS "flomismaTxId";

-- ─── ReserveLedgerEntry ───────────────────────────────────────────────────────
-- amount: reserve / float semantics delegated to licensed banking or provider partner.
ALTER TABLE "ReserveLedgerEntry" DROP COLUMN IF EXISTS "amount";

-- ─── Contract ───────────────────────────────────────────────────────────────
-- escrowAmount: display or provider mirror only — not platform-held escrow balance.
ALTER TABLE "Contract" DROP COLUMN IF EXISTS "escrowAmount";

-- ─── Milestone ───────────────────────────────────────────────────────────────
-- amount: milestone payment amounts belong in provider hold configuration / display layer.
ALTER TABLE "Milestone" DROP COLUMN IF EXISTS "amount";

-- ─── GovernanceThreshold ──────────────────────────────────────────────────────
-- autoSettlementLimitUsd, treasuryDiscrepancyMaxPct, driftVarianceMax: settlement thresholds belong in ops config or provider dashboard.
ALTER TABLE "GovernanceThreshold" DROP COLUMN IF EXISTS "autoSettlementLimitUsd";
ALTER TABLE "GovernanceThreshold" DROP COLUMN IF EXISTS "treasuryDiscrepancyMaxPct";
ALTER TABLE "GovernanceThreshold" DROP COLUMN IF EXISTS "driftVarianceMax";

-- ─── AuditEvidence ────────────────────────────────────────────────────────────
-- reserveRatio, ledgerSum, reserveSum: monetary aggregates — replace with provider reconciliation snapshots.
ALTER TABLE "AuditEvidence" DROP COLUMN IF EXISTS "reserveRatio";
ALTER TABLE "AuditEvidence" DROP COLUMN IF EXISTS "ledgerSum";
ALTER TABLE "AuditEvidence" DROP COLUMN IF EXISTS "reserveSum";

-- ─── CreditDecision ─────────────────────────────────────────────────────────
-- financialProfileHash: deprecated monetary-profile surrogate; entire model flagged for removal — see optional DROP TABLE below.
ALTER TABLE "CreditDecision" DROP COLUMN IF EXISTS "financialProfileHash";

-- ─── ComplianceAuditLog ───────────────────────────────────────────────────────
-- variance: monetary/statistical drift field — non-monetary audit payloads only post-provider.
ALTER TABLE "ComplianceAuditLog" DROP COLUMN IF EXISTS "variance";

-- ─── AgenticTender ───────────────────────────────────────────────────────────
-- amount: bid amounts are display/provider quote; not platform balance.
ALTER TABLE "AgenticTender" DROP COLUMN IF EXISTS "amount";

-- ─── AgentEquity ──────────────────────────────────────────────────────────────
-- totalSupply, circulatingSupply, dividendYield: legacy monetary-equity fields; remove or replace with access-tier flags.
ALTER TABLE "AgentEquity" DROP COLUMN IF EXISTS "totalSupply";
ALTER TABLE "AgentEquity" DROP COLUMN IF EXISTS "circulatingSupply";
ALTER TABLE "AgentEquity" DROP COLUMN IF EXISTS "dividendYield";

-- ─── StakingPosition ─────────────────────────────────────────────────────────
-- stakedAmount, rewardsClaimed, rewardsAccrued: staking float — out of scope for platform ledger post-provider.
ALTER TABLE "StakingPosition" DROP COLUMN IF EXISTS "stakedAmount";
ALTER TABLE "StakingPosition" DROP COLUMN IF EXISTS "rewardsClaimed";
ALTER TABLE "StakingPosition" DROP COLUMN IF EXISTS "rewardsAccrued";

-- ─── StakingPool ──────────────────────────────────────────────────────────────
-- Pool TVL / rewards / APY: provider or defi partner reporting only.
ALTER TABLE "StakingPool" DROP COLUMN IF EXISTS "totalValueLocked";
ALTER TABLE "StakingPool" DROP COLUMN IF EXISTS "totalRewardsDistributed";
ALTER TABLE "StakingPool" DROP COLUMN IF EXISTS "rewardPoolBalance";
ALTER TABLE "StakingPool" DROP COLUMN IF EXISTS "currentAPY";
ALTER TABLE "StakingPool" DROP COLUMN IF EXISTS "last30DayRevenue";
ALTER TABLE "StakingPool" DROP COLUMN IF EXISTS "rewardDiversionRate";

-- Optional (entire model @deprecated in schema.prisma): counsel + data migration review required before uncommenting.
-- DROP TABLE IF EXISTS "CreditDecision";
-- DROP TABLE IF EXISTS "AgentEquity";
-- DROP TABLE IF EXISTS "StakingPosition";
-- DROP TABLE IF EXISTS "StakingPool";
