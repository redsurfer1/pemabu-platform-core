-- STEP 1 A5 — founding_provider on User (manual)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS founding_provider BOOLEAN NOT NULL DEFAULT FALSE;
