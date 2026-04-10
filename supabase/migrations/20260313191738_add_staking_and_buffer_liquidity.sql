/*
  # Add Staking & Buffer Liquidity System

  1. New Tables
    - `StakingPosition`: Individual user staking positions
      - Tracks staked amount, rewards accrued, rewards claimed
      - Supports cooldown period for unstaking
      - Status tracking: ACTIVE, COOLDOWN, UNSTAKED
    
    - `StakingPool`: Global staking pool metrics per tenant
      - Total Value Locked (TVL)
      - Total rewards distributed
      - Current APY calculation
      - Last 30-day revenue tracking
      - Reward diversion rate (10% of agent revenue)
      - Cooldown period configuration (7 days)

  2. New Enum Type
    - `StakingStatus`: ACTIVE, COOLDOWN, UNSTAKED

  3. Relations
    - StakingPosition belongs to User and Tenant
    - StakingPool belongs to Tenant (one per tenant)
    - User has many StakingPositions
    - Tenant has many StakingPositions and one StakingPool

  4. Security
    - RLS policies enabled on all new tables
    - Users can only access their own staking positions
    - Pool metrics visible to all authenticated users
    - Admins can manage pool configuration

  5. Features
    - Emergency recovery liquidity buffer
    - Automated reward distribution from agent revenue
    - 7-day cooldown to prevent bank runs
    - Circuit breaker integration (HALTED state disables unstaking)
    - Real-time APY calculation based on revenue
*/

-- Create StakingStatus enum
DO $$ BEGIN
  CREATE TYPE "StakingStatus" AS ENUM ('ACTIVE', 'COOLDOWN', 'UNSTAKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create StakingPosition table
CREATE TABLE IF NOT EXISTS "StakingPosition" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  
  "stakedAmount" DECIMAL(36, 18) DEFAULT 0 NOT NULL,
  "rewardsClaimed" DECIMAL(36, 18) DEFAULT 0 NOT NULL,
  "rewardsAccrued" DECIMAL(36, 18) DEFAULT 0 NOT NULL,
  
  "stakedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "lastRewardAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "unstakeRequestedAt" TIMESTAMPTZ,
  "unstakeAvailableAt" TIMESTAMPTZ,
  
  status "StakingStatus" DEFAULT 'ACTIVE' NOT NULL,
  
  CONSTRAINT "StakingPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "StakingPosition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,
  CONSTRAINT "StakingPosition_tenantId_userId_key" UNIQUE ("tenantId", "userId")
);

-- Create indexes for StakingPosition
CREATE INDEX IF NOT EXISTS "StakingPosition_tenantId_idx" ON "StakingPosition"("tenantId");
CREATE INDEX IF NOT EXISTS "StakingPosition_status_idx" ON "StakingPosition"(status);
CREATE INDEX IF NOT EXISTS "StakingPosition_userId_idx" ON "StakingPosition"("userId");

-- Create StakingPool table
CREATE TABLE IF NOT EXISTS "StakingPool" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" TEXT UNIQUE NOT NULL,
  
  "totalValueLocked" DECIMAL(36, 18) DEFAULT 0 NOT NULL,
  "totalRewardsDistributed" DECIMAL(36, 18) DEFAULT 0 NOT NULL,
  "rewardPoolBalance" DECIMAL(36, 18) DEFAULT 0 NOT NULL,
  
  "currentAPY" DECIMAL(10, 6) DEFAULT 0 NOT NULL,
  "last30DayRevenue" DECIMAL(36, 18) DEFAULT 0 NOT NULL,
  
  "rewardDiversionRate" DECIMAL(5, 4) DEFAULT 0.10 NOT NULL,
  "cooldownPeriodDays" INTEGER DEFAULT 7 NOT NULL,
  
  "lastRewardDistribution" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  CONSTRAINT "StakingPool_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE
);

-- Enable RLS on new tables
ALTER TABLE "StakingPosition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StakingPool" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for StakingPosition
CREATE POLICY "Users can view own staking positions"
  ON "StakingPosition"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own staking positions"
  ON "StakingPosition"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own staking positions"
  ON "StakingPosition"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Admins can manage all staking positions"
  ON "StakingPosition"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User"."trustRole" = 'ADMIN'
    )
  );

-- RLS Policies for StakingPool
CREATE POLICY "Authenticated users can view staking pool"
  ON "StakingPool"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage staking pool"
  ON "StakingPool"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User"."trustRole" = 'ADMIN'
    )
  );
