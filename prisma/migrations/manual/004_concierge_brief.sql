-- Rank 1 — SpiceKrewe event concierge (manual; apply in Supabase SQL editor)
CREATE TABLE IF NOT EXISTS "ConciergeBrief" (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  city_slug TEXT NOT NULL DEFAULT 'memphis',
  buyer_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  theme TEXT,
  budget_cents INTEGER NOT NULL,
  event_date TIMESTAMPTZ,
  location_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  concierge_fee_charged BOOLEAN DEFAULT FALSE,
  estimated_total_cents INTEGER,
  requires_human_review BOOLEAN DEFAULT FALSE,
  human_reviewed_at TIMESTAMPTZ,
  ai_package_json JSONB,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ConciergePackage" (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL REFERENCES "ConciergeBrief"(id) ON DELETE CASCADE,
  package_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ConciergeBrief_tenant_city_status_idx"
  ON "ConciergeBrief" (tenant_id, city_slug, status);
CREATE INDEX IF NOT EXISTS "ConciergePackage_brief_id_idx" ON "ConciergePackage" (brief_id);
