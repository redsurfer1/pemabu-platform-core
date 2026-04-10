# Agent Staking & Buffer Liquidity System

## Overview

The PEMABU Platform introduces a DeFi-style staking mechanism that allows users to stake USDC to strengthen the Solvency Buffer and provide emergency recovery liquidity. Stakers earn rewards from a portion of agent revenue, creating a sustainable incentive structure that enhances system resilience.

## Core Concepts

### Solvency Buffer

The Solvency Buffer is a liquidity pool that absorbs temporary variances in the ledger-to-reserve ratio. When agents earn revenue or users transact, small timing differences can cause the system to drift from perfect 1:1 backing. The buffer ensures uninterrupted operations during these micro-events.

### Staking Mechanics

Users stake USDC into the buffer pool to:
1. Provide emergency recovery liquidity
2. Strengthen system resilience during degraded states
3. Earn passive income from agent performance
4. Support the platform's economic stability

### Revenue Diversion

**Default Configuration**: 10% of all agent revenue is automatically diverted to the staking reward pool.

**Example Flow**:
```
Agent earns 1,000 USDC in contract revenue
↓
900 USDC → Agent's account (90%)
100 USDC → Staking Reward Pool (10%)
↓
Distributed proportionally to all active stakers
```

## Database Schema

### StakingPosition

Individual user staking positions with full lifecycle tracking.

```prisma
model StakingPosition {
  id                String    @id @default(uuid())
  userId            String
  tenantId          String

  stakedAmount      Decimal   @db.Decimal(36, 18) @default(0)
  rewardsClaimed    Decimal   @db.Decimal(36, 18) @default(0)
  rewardsAccrued    Decimal   @db.Decimal(36, 18) @default(0)

  stakedAt          DateTime  @default(now())
  lastRewardAt      DateTime  @default(now())
  unstakeRequestedAt DateTime?
  unstakeAvailableAt DateTime?

  status            StakingStatus @default(ACTIVE)
}
```

**Fields**:
- `stakedAmount`: Current USDC staked by user
- `rewardsClaimed`: Total rewards withdrawn (historical)
- `rewardsAccrued`: Pending rewards available to claim
- `unstakeRequestedAt`: Timestamp of unstake request
- `unstakeAvailableAt`: When cooldown completes
- `status`: ACTIVE, COOLDOWN, or UNSTAKED

### StakingPool

Global metrics for the entire staking ecosystem per tenant.

```prisma
model StakingPool {
  id                  String   @id @default(uuid())
  tenantId            String   @unique

  totalValueLocked    Decimal  @db.Decimal(36, 18) @default(0)
  totalRewardsDistributed Decimal @db.Decimal(36, 18) @default(0)
  rewardPoolBalance   Decimal  @db.Decimal(36, 18) @default(0)

  currentAPY          Decimal  @db.Decimal(10, 6) @default(0)
  last30DayRevenue    Decimal  @db.Decimal(36, 18) @default(0)

  rewardDiversionRate Decimal  @db.Decimal(5, 4) @default(0.10)
  cooldownPeriodDays  Int      @default(7)

  lastRewardDistribution DateTime @default(now())
}
```

**Key Metrics**:
- `totalValueLocked`: Sum of all staked USDC (TVL)
- `currentAPY`: Real-time annual percentage yield
- `last30DayRevenue`: Rolling 30-day agent revenue for APY calculation
- `rewardDiversionRate`: Percentage of agent revenue → staking (10%)
- `cooldownPeriodDays`: Unstaking cooldown period (7 days)

### StakingStatus Enum

```prisma
enum StakingStatus {
  ACTIVE           // Actively earning rewards
  COOLDOWN         // 7-day cooldown period active
  UNSTAKED         // Fully withdrawn
}
```

## Staking Service API

### Core Operations

#### 1. Initialize Staking Pool

```typescript
async initializeStakingPool(tenantId: string): Promise<void>
```

Creates a new staking pool for a tenant if one doesn't exist. Called automatically on first stake.

**Default Configuration**:
- TVL: 0
- APY: 0%
- Reward diversion: 10%
- Cooldown period: 7 days

#### 2. Stake USDC

```typescript
async stake(userId: string, tenantId: string, amount: number): Promise<void>
```

Stakes USDC into the buffer pool.

**Process**:
1. Check for existing position
2. If exists, increment `stakedAmount`
3. If new, create position with ACTIVE status
4. Update pool's `totalValueLocked`
5. Reset any pending unstake requests

**Effects**:
- Increases user's staked amount
- Increases pool TVL
- Resets status to ACTIVE if was in COOLDOWN
- Clears unstake timestamps

#### 3. Request Unstake

```typescript
async requestUnstake(userId: string, tenantId: string): Promise<Date>
```

Initiates the unstaking cooldown period.

**Process**:
1. Calculate `unstakeAvailableAt` = now + cooldownPeriodDays
2. Update position status to COOLDOWN
3. Set `unstakeRequestedAt` to now
4. Return cooldown completion date

**Restrictions**:
- Cannot unstake if system state is HALTED
- Cannot unstake if solvency ratio < 90%
- User must have an active staking position

#### 4. Cancel Unstake Request

```typescript
async cancelUnstakeRequest(userId: string, tenantId: string): Promise<void>
```

Cancels an in-progress unstake request.

**Process**:
1. Update status back to ACTIVE
2. Clear `unstakeRequestedAt`
3. Clear `unstakeAvailableAt`
4. Resume earning rewards

#### 5. Complete Unstake

```typescript
async completeUnstake(userId: string, tenantId: string): Promise<number>
```

Completes the unstaking process after cooldown expires.

**Validations**:
- Position must be in COOLDOWN status
- Current date must be >= `unstakeAvailableAt`

**Process**:
1. Calculate total = `stakedAmount` + `rewardsAccrued`
2. Update position status to UNSTAKED
3. Set `stakedAmount` to 0
4. Add `rewardsAccrued` to `rewardsClaimed`
5. Set `rewardsAccrued` to 0
6. Decrease pool's `totalValueLocked`
7. Return total amount withdrawn

#### 6. Claim Rewards

```typescript
async claimRewards(userId: string, tenantId: string): Promise<number>
```

Claims accrued rewards without unstaking principal.

**Process**:
1. Get current `rewardsAccrued`
2. Set `rewardsAccrued` to 0
3. Add amount to `rewardsClaimed`
4. Return reward amount

**Note**: Does not affect staked position or TVL.

#### 7. Distribute Revenue

```typescript
async distributeRevenue(tenantId: string, agentRevenue: number): Promise<void>
```

Diverts agent revenue to staking pool and distributes to stakers.

**Process**:
1. Calculate reward = `agentRevenue` × `rewardDiversionRate` (10%)
2. Add reward to `rewardPoolBalance`
3. Update `last30DayRevenue` for APY calculation
4. Call `distributeRewardsToStakers()`

**Distribution Logic**:
```typescript
For each ACTIVE staker:
  userShare = userStakedAmount / totalValueLocked
  userReward = totalRewards × userShare
  Add userReward to user's rewardsAccrued
```

#### 8. Calculate APY

```typescript
async calculateAPY(tenantId: string): Promise<number>
```

Calculates real-time APY based on last 30 days of revenue.

**Formula**:
```
annualizedRevenue = (last30DayRevenue / 30) × 365
annualRewards = annualizedRevenue × rewardDiversionRate
APY = (annualRewards / totalValueLocked) × 100
```

**Example**:
```
Last 30-day revenue: 300,000 USDC
Daily average: 10,000 USDC
Annualized: 3,650,000 USDC
Diversion (10%): 365,000 USDC rewards/year
TVL: 5,000,000 USDC
APY = (365,000 / 5,000,000) × 100 = 7.3%
```

### Risk Management

#### Get Risk Level

```typescript
async getRiskLevel(solvencyRatio: number): Promise<RiskLevel>
```

Returns risk assessment based on current solvency ratio.

**Risk Tiers**:

| Level | Solvency Ratio | Description | Color |
|-------|---------------|-------------|-------|
| LOW | >= 100% | Fully collateralized | Green |
| MEDIUM | 95-99.9% | Minor deficit, buffer absorbing | Yellow |
| HIGH | 90-94.9% | Degraded state, cooldown enforced | Orange |
| CRITICAL | < 90% | Circuit breaker engaged | Red |

#### Can Unstake Check

```typescript
async canUnstake(systemState: string, solvencyRatio: number): Promise<boolean>
```

Determines if unstaking is currently allowed.

**Rules**:
- ❌ If `systemState === 'HALTED'`
- ❌ If `solvencyRatio < 0.90`
- ✅ Otherwise allowed

## User Interface

### Staking Dashboard

**Route**: `/staking`

**Key Sections**:

#### 1. Risk Level Banner
- Visual indicator of current system health
- Solvency ratio percentage
- Risk-appropriate messaging
- Color-coded alerts

#### 2. Pool Metrics (3 cards)
- Total Value Locked (TVL)
- Current APY (real-time)
- Reward Pool Balance

#### 3. Your Position Card
- Staked Amount
- Rewards Accrued (claimable)
- Total Claimed (historical)
- Position Status badge
- Cooldown countdown (if applicable)
- Claim Rewards button

#### 4. Stake/Unstake Card
- Amount input field
- Stake button
- Request Unstake button
- Complete Unstake button (when cooldown done)
- Cancel Unstake button (during cooldown)
- Circuit breaker warnings

#### 5. How It Works Section
- 3-step explainer
- Visual workflow
- Educational content

### Status Indicators

**ACTIVE Position**:
```
Status: ACTIVE [Green badge]
- Earning rewards
- Can stake more
- Can claim rewards
- Can request unstake
```

**COOLDOWN Position**:
```
Status: COOLDOWN [Yellow badge]
- Countdown timer displayed
- Days remaining shown
- Can cancel unstake
- Can complete when timer expires
- Cannot stake additional funds
```

**UNSTAKED Position**:
```
Status: UNSTAKED [Gray badge]
- No active position
- Can create new stake
- Historical claims visible
```

## API Endpoints

### GET /api/staking/metrics

Fetches current staking metrics for the user.

**Response**:
```json
{
  "metrics": {
    "totalValueLocked": 5000000,
    "currentAPY": 7.3,
    "rewardPoolBalance": 150000,
    "userStakedAmount": 10000,
    "userRewardsAccrued": 73,
    "userRewardsClaimed": 450,
    "cooldownPeriodDays": 7,
    "unstakeAvailableAt": null,
    "status": "ACTIVE"
  },
  "riskLevel": {
    "level": "LOW",
    "solvencyRatio": 1.02,
    "description": "System fully collateralized",
    "color": "emerald"
  },
  "canUnstake": true
}
```

### POST /api/staking/stake

Stakes USDC into the pool.

**Request**:
```json
{
  "amount": 1000
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully staked 1000 USDC"
}
```

### POST /api/staking/unstake-request

Initiates unstaking cooldown.

**Response**:
```json
{
  "success": true,
  "message": "Unstake request initiated",
  "unstakeAvailableAt": "2026-03-20T12:00:00Z"
}
```

### POST /api/staking/unstake-cancel

Cancels unstaking request.

**Response**:
```json
{
  "success": true,
  "message": "Unstake request cancelled"
}
```

### POST /api/staking/unstake-complete

Completes unstaking after cooldown.

**Response**:
```json
{
  "success": true,
  "message": "Unstake completed successfully",
  "amount": 10073
}
```

### POST /api/staking/claim

Claims accrued rewards.

**Response**:
```json
{
  "success": true,
  "message": "Rewards claimed successfully",
  "amount": 73
}
```

### POST /api/staking/distribute-revenue

Distributes agent revenue to stakers (internal).

**Request**:
```json
{
  "tenantId": "tenant-001",
  "agentRevenue": 10000
}
```

**Response**:
```json
{
  "success": true,
  "message": "Revenue distributed successfully",
  "divertedToStaking": 1000,
  "currentAPY": 7.3
}
```

## Circuit Breaker Integration

### When System is HALTED

**Restrictions**:
- ❌ All unstaking disabled (both request and complete)
- ❌ Staking disabled (to prevent manipulation)
- ✅ Reward claims still allowed
- ✅ Position viewing still allowed

**UI Behavior**:
```
[Circuit Breaker Engaged]
Unstaking disabled until system recovery.
```

### When Solvency < 90%

**Restrictions**:
- ❌ Unstaking disabled
- ✅ Staking still allowed (helps recovery)
- ✅ Reward claims allowed
- ⚠️ High risk warning displayed

**UI Behavior**:
```
[Solvency Alert]
Solvency ratio below 90%.
Unstaking disabled to protect reserves.
```

### When Solvency < 95%

**Behavior**:
- ✅ All operations allowed
- ⚠️ Medium risk warning
- 🔔 Cooldown strictly enforced

## Cooldown Period Mechanics

### Purpose
Prevents "bank runs" during degraded states. Users cannot instantly withdraw during stress events, giving the system time to rebalance.

### Default Period
**7 days** (configurable per tenant)

### Workflow

**Day 0**: User requests unstake
```
Status: ACTIVE → COOLDOWN
unstakeRequestedAt: 2026-03-13 12:00:00
unstakeAvailableAt: 2026-03-20 12:00:00
```

**Days 1-6**: Cooldown active
```
UI shows: "6 days remaining"
- Cannot complete unstake
- Can cancel and return to ACTIVE
- Still earning rewards during cooldown
```

**Day 7**: Cooldown complete
```
UI shows: "Unstake available now!"
- "Complete Unstake" button enabled
- Can withdraw stakedAmount + rewardsAccrued
- Or can cancel and return to ACTIVE
```

### During Cooldown

**What you CAN do**:
- ✅ View position
- ✅ Earn rewards
- ✅ Claim rewards
- ✅ Cancel unstake request

**What you CANNOT do**:
- ❌ Complete unstake early
- ❌ Stake additional funds
- ❌ Request another unstake

## APY Calculation Deep Dive

### Rolling 30-Day Window

APY is calculated using the most recent 30 days of agent revenue.

**Why 30 days?**
- Long enough to smooth volatility
- Short enough to reflect current performance
- Industry standard for yield products

### Update Frequency

APY recalculates on every revenue distribution event:
1. Agent completes contract
2. Revenue recorded to ledger
3. 10% diverted to staking pool
4. `last30DayRevenue` updated
5. APY recalculated
6. Updated APY displayed to users

### Edge Cases

**New Pool (< 30 days old)**:
```
Use actual days of data:
annualizedRevenue = (totalRevenue / daysSinceLaunch) × 365
```

**Zero TVL**:
```
APY = 0%
(Cannot divide by zero)
```

**Zero Revenue**:
```
APY = 0%
(No rewards to distribute)
```

## Economic Incentive Analysis

### For Stakers

**Upside**:
- Passive income from agent performance
- Higher than traditional savings rates
- Contributes to platform stability
- Governance rights (future)

**Downside**:
- 7-day lockup on withdrawal
- Exposure to solvency events
- APY fluctuates with agent activity

**Break-Even Analysis**:
```
Minimum stake duration to justify cooldown:
If APY = 7.3%, daily rate = 0.02%
7-day cooldown cost = opportunity cost
Profitable if hold > 14 days
```

### For the Platform

**Benefits**:
- Larger solvency buffer = higher resilience
- Distributed liquidity providers
- Incentive alignment with users
- Self-healing during stress events

**Costs**:
- 10% of agent revenue diverted
- Smart contract security risk
- Complexity in accounting

## Security Considerations

### Row-Level Security (RLS)

All staking tables have RLS enabled:

**StakingPosition Policies**:
```sql
-- Users can only view/modify their own positions
CREATE POLICY "Users can view own positions"
  ON "StakingPosition" FOR SELECT
  USING (auth.uid() = userId);

-- Admins can view all positions
CREATE POLICY "Admins can view all positions"
  ON "StakingPosition" FOR SELECT
  USING (user_has_role('ADMIN'));
```

**StakingPool Policies**:
```sql
-- Anyone can view pool metrics
CREATE POLICY "Public can view pool"
  ON "StakingPool" FOR SELECT
  USING (true);

-- Only admins can modify pool config
CREATE POLICY "Admins can modify pool"
  ON "StakingPool" FOR UPDATE
  USING (user_has_role('ADMIN'));
```

### Audit Trail

All staking operations are logged:
- Stake events
- Unstake requests
- Unstake completions
- Reward claims
- Revenue distributions
- APY calculations

### Immutability Checks

Critical validations:
- Cannot modify `stakedAmount` directly (must use service methods)
- Cannot skip cooldown period
- Cannot unstake during HALTED state
- Cannot claim more than `rewardsAccrued`

## Testing Strategy

### Unit Tests

Test individual service methods:
- `stake()` with various amounts
- `requestUnstake()` cooldown calculation
- `completeUnstake()` validation logic
- `distributeRevenue()` proportional split
- `calculateAPY()` formula accuracy

### Integration Tests

Test end-to-end workflows:
- Full stake → earn → claim → unstake cycle
- Revenue distribution to multiple stakers
- Cooldown timer accuracy
- Circuit breaker enforcement

### Stress Tests

Simulate extreme scenarios:
- 1000 concurrent stakers
- Sudden TVL drain (bank run)
- Zero revenue periods
- HALTED state during unstake
- Solvency ratio drops below 90%

## Production Deployment

### Pre-Launch Checklist

- [ ] Initialize staking pool for each tenant
- [ ] Set appropriate `rewardDiversionRate` (default 10%)
- [ ] Configure `cooldownPeriodDays` (default 7)
- [ ] Enable RLS policies on all tables
- [ ] Set up monitoring for TVL, APY, solvency
- [ ] Create admin dashboard for pool management
- [ ] Document emergency procedures
- [ ] Test circuit breaker integration

### Monitoring Metrics

**Critical**:
- Total Value Locked (TVL)
- Current APY
- Solvency Ratio
- Number of active stakers
- Pending unstake requests
- Reward pool balance

**Operational**:
- Average stake duration
- Claim frequency
- Cooldown completion rate
- Revenue distribution latency

### Alerting Rules

**High Priority**:
- TVL drops > 20% in 24 hours
- Solvency ratio < 90%
- APY < 2% for 7 consecutive days
- Reward pool depleted
- Circuit breaker triggered

**Medium Priority**:
- > 50 pending unstake requests
- Average stake duration < 14 days
- APY volatility > 50% week-over-week

## Future Enhancements

### Phase 2
- [ ] Governance token for stakers
- [ ] Variable cooldown based on stake size
- [ ] Tiered APY rates (longer lockup = higher yield)
- [ ] Auto-compounding rewards
- [ ] Staking pool insurance fund

### Phase 3
- [ ] Multi-asset staking (ETH, BTC, etc.)
- [ ] Liquid staking tokens (tradeable receipts)
- [ ] Cross-chain staking
- [ ] Institutional staking pools
- [ ] Delegated staking

### Phase 4
- [ ] DeFi integrations (Aave, Compound)
- [ ] Yield optimization strategies
- [ ] Staking derivatives
- [ ] Options and futures on staking positions

## Troubleshooting

### User cannot stake

**Diagnose**:
1. Check wallet balance
2. Verify input amount > 0
3. Check for API errors
4. Validate tenant context

### APY shows 0%

**Diagnose**:
1. Check `last30DayRevenue` in database
2. Verify revenue distribution is running
3. Check TVL > 0
4. Inspect APY calculation logic

### Cooldown not expiring

**Diagnose**:
1. Check `unstakeAvailableAt` timestamp
2. Verify server time is accurate
3. Check for timezone issues
4. Inspect cooldown calculation

### Rewards not accruing

**Diagnose**:
1. Check position status is ACTIVE
2. Verify revenue distribution events
3. Check `lastRewardAt` timestamp
4. Inspect distribution logic for errors

## Conclusion

The Agent Staking & Buffer Liquidity system creates a sustainable economic model that:

1. **Protects the platform** through a robust solvency buffer
2. **Rewards users** for providing liquidity
3. **Prevents bank runs** with intelligent cooldown periods
4. **Integrates with circuit breakers** to handle stress events
5. **Scales with growth** as more agents generate revenue

This system transforms passive liquidity into an active participant in platform stability, aligning incentives between users, agents, and the platform itself.
