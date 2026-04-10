-- Mark-to-Market: Agent currentPrice, t30Revenue, lastValuationAt, initialCollateralUsdc; ValuationHistory for SOC2

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
