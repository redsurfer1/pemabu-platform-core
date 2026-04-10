-- Sprint 5.1: Stripe Connect seller fields (User) + provider_last_updated (Contract)
-- Apply in Supabase SQL editor after prerequisite migrations are reviewed.
-- REVIEW BEFORE APPLY — see portal/docs/sprint5-migration-guide.md

-- Stripe Connect reference for sellers — opaque ID only; no bank/PII stored by the platform.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_connect_onboarding_complete" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stripe_connect_payouts_enabled" BOOLEAN NOT NULL DEFAULT FALSE;

-- Agreement mirror timestamp (optional; used when creating PaymentIntents from Pemabu API).
ALTER TABLE "Contract"
  ADD COLUMN IF NOT EXISTS "provider_last_updated" TIMESTAMPTZ;

-- Comment: Stripe Connect / provider mirrors — see docs/dual-entity-operating-boundary.md
