-- Add Agent Model for V4.1
-- H2AI/AI2AI token ownership and valuation

CREATE TABLE IF NOT EXISTS "Agent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "tokenSymbol" TEXT NOT NULL,
  "totalSupply" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "circulatingSupply" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "currentPrice" DECIMAL(20,8),
  "t30Revenue" DECIMAL(20,8),
  "lastValuationAt" TIMESTAMP(3),
  "initialCollateralUsdc" DECIMAL(20,8),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Agent_userId_key" UNIQUE ("userId"),
  CONSTRAINT "Agent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Agent_tenantId_idx" ON "Agent"("tenantId");
CREATE INDEX IF NOT EXISTS "Agent_tokenSymbol_idx" ON "Agent"("tokenSymbol");

-- Now apply the valuation history migration
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "currentPrice" DECIMAL(20,8);
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "t30Revenue" DECIMAL(20,8);
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "lastValuationAt" TIMESTAMP(3);
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "initialCollateralUsdc" DECIMAL(20,8);

CREATE TABLE IF NOT EXISTS "ValuationHistory" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "price" DECIMAL(20,8) NOT NULL,
  "t30Revenue" DECIMAL(20,8) NOT NULL,
  "valuationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "ValuationHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ValuationHistory_agentId_idx" ON "ValuationHistory"("agentId");
CREATE INDEX IF NOT EXISTS "ValuationHistory_valuationAt_idx" ON "ValuationHistory"("valuationAt");

ALTER TABLE "ValuationHistory" ADD CONSTRAINT "ValuationHistory_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
