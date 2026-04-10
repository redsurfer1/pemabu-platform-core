-- Row-Level Security (RLS) for multi-tenant isolation
-- Run after Prisma migrations. Requires: SET app.tenant_id = '<tenant_uuid>' per request/connection.

-- Enable RLS on tenant-scoped tables
ALTER TABLE "User"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry"    ENABLE ROW LEVEL SECURITY;

-- Tenant is visible only when selected as current tenant (e.g. superuser or tenant lookup)
ALTER TABLE "Tenant"         ENABLE ROW LEVEL SECURITY;

-- Policies: restrict to rows where tenant_id = current_setting('app.tenant_id', true)
CREATE POLICY tenant_isolation_user
  ON "User"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid );

CREATE POLICY tenant_isolation_contract
  ON "Contract"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid );

CREATE POLICY tenant_isolation_ledger
  ON "LedgerEntry"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid );

-- Tenant: allow read when id matches current tenant (for "my org" views)
CREATE POLICY tenant_isolation_tenant
  ON "Tenant"
  FOR SELECT
  USING ( id = current_setting('app.tenant_id', true)::uuid );

-- Milestone: no direct tenant_id; restrict via contract. Use subquery policy.
ALTER TABLE "Milestone"      ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_milestone
  ON "Milestone"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Contract" c
      WHERE c.id = "Milestone"."contractId"
        AND c."tenantId" = current_setting('app.tenant_id', true)::uuid
    )
  );

-- Certification / Mentorship: scope by user's tenant
ALTER TABLE "Certification"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mentorship"     ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_certification
  ON "Certification"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = "Certification"."userId"
        AND u."tenantId" = current_setting('app.tenant_id', true)::uuid
    )
  );

CREATE POLICY tenant_isolation_mentorship
  ON "Mentorship"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = "Mentorship"."userId"
        AND u."tenantId" = current_setting('app.tenant_id', true)::uuid
    )
  );

-- SettlementIdempotency (Task 3) – Safety catch: SELECT and INSERT only; no UPDATE/DELETE
ALTER TABLE "SettlementIdempotency" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_settlement_idempotency ON "SettlementIdempotency";

CREATE POLICY tenant_isolation_settlement_idempotency_select
  ON "SettlementIdempotency"
  FOR SELECT
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid );

CREATE POLICY tenant_isolation_settlement_idempotency_insert
  ON "SettlementIdempotency"
  FOR INSERT
  WITH CHECK ( "tenantId" = current_setting('app.tenant_id', true)::uuid );

-- Governance & autonomous layer
ALTER TABLE "GovernanceThreshold" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_governance_threshold
  ON "GovernanceThreshold"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid OR "tenantId" IS NULL );

ALTER TABLE "ApprovalQueue" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_approval_queue
  ON "ApprovalQueue"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid );

ALTER TABLE "PartnerBranding" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_partner_branding
  ON "PartnerBranding"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid );

ALTER TABLE "LearnToEarnSuggestion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_learn_to_earn
  ON "LearnToEarnSuggestion"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = "LearnToEarnSuggestion"."userId"
        AND u."tenantId" = current_setting('app.tenant_id', true)::uuid
    )
  );

ALTER TABLE "ComplianceAuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_compliance_audit
  ON "ComplianceAuditLog"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid OR "tenantId" IS NULL );

-- Sandbox runs (execution audit; link to governance via logs)
ALTER TABLE "SandboxRun" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sandbox_run
  ON "SandboxRun"
  FOR ALL
  USING ( "tenantId" = current_setting('app.tenant_id', true)::uuid );
