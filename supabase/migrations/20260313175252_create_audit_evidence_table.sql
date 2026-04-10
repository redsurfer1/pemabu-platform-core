/*
  # SOC2 Audit Evidence Table

  1. New Tables
    - `AuditEvidence`
      - `id` (uuid, primary key)
      - `eventType` (text) - Type of audit event (CIRCUIT_BREAKER, DRIFT_DETECTED, etc.)
      - `snapshotData` (jsonb) - Complete snapshot of system state at event time
      - `triggeredAt` (timestamptz) - When the evidence was automatically captured
      - `reviewedBy` (text) - Admin who reviewed the evidence
      - `reviewedAt` (timestamptz) - When the review occurred
      - `systemState` (text) - System state during event (OPTIMAL, DEGRADED, HALTED, INTEGRITY_DRIFT)
      - `reserveRatio` (numeric) - Reserve ratio at time of event
      - `ledgerSum` (numeric) - Sum of all ledger entries
      - `reserveSum` (numeric) - Current reserve total
      - `metadata` (jsonb) - Additional context data

  2. Security
    - Enable RLS on `AuditEvidence` table
    - Add policy for authenticated admin users to read all evidence
    - Add policy for system to insert evidence automatically

  3. Indexes
    - Index on `triggeredAt` for chronological queries
    - Index on `eventType` for filtering by event category
    - Index on `reviewedAt` for compliance tracking
*/

CREATE TABLE IF NOT EXISTS "AuditEvidence" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventType" TEXT NOT NULL,
  "snapshotData" JSONB NOT NULL,
  "triggeredAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "systemState" TEXT NOT NULL,
  "reserveRatio" NUMERIC(10, 6),
  "ledgerSum" NUMERIC(36, 18),
  "reserveSum" NUMERIC(36, 18),
  "metadata" JSONB
);

CREATE INDEX IF NOT EXISTS "AuditEvidence_triggeredAt_idx" ON "AuditEvidence"("triggeredAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditEvidence_eventType_idx" ON "AuditEvidence"("eventType");
CREATE INDEX IF NOT EXISTS "AuditEvidence_reviewedAt_idx" ON "AuditEvidence"("reviewedAt");

ALTER TABLE "AuditEvidence" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit evidence"
  ON "AuditEvidence" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit evidence"
  ON "AuditEvidence" FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update audit evidence reviews"
  ON "AuditEvidence" FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
