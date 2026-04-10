-- STEP 1 A3 — Notification log (manual; apply in Supabase SQL editor)
CREATE TABLE IF NOT EXISTS "NotificationLog" (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS "NotificationLog_entity_type_id_type_idx"
  ON "NotificationLog" (entity_type, entity_id, type);
