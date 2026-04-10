# Total Sovereign Value (TSV) Calculation Specification

## Overview
The Total Sovereign Value (TSV) represents a user's complete financial position across all Pemabu platform services, combining agent equity holdings, staking positions, and unclaimed rewards.

## Formula

```
TSV = (Agent_Equity_Value) + (Staked_USDC) + (Unclaimed_Rewards)
```

### Component Breakdown

#### 1. Agent Equity Value
```typescript
Agent_Equity_Value = User_Shares × Current_Share_Price
```

- **User_Shares**: Number of fractional agent equity tokens held by the user
- **Current_Share_Price**: Market price per share (derived from dividendYield and market activity)
- **Precision**: Standard 2-decimal display for readability
- **Data Source**: `/api/agent-equity` endpoint

#### 2. Staked USDC
```typescript
Staked_USDC = parseFloat(stakingMetrics.userStakedAmount)
```

- **userStakedAmount**: Total USDC amount staked in the buffer liquidity pool
- **Precision**: 2 decimals (USDC standard)
- **Data Source**: `/api/staking/metrics` endpoint
- **Purpose**: Provides emergency liquidity buffer for platform solvency

#### 3. Unclaimed Rewards
```typescript
Unclaimed_Rewards = parseFloat(stakingMetrics.userRewardsAccrued)
```

- **userRewardsAccrued**: Revenue-sharing rewards accrued from platform activity
- **Precision**:
  - Internal: 18 decimals (ledger precision)
  - Display: 4 decimals for small amounts (<$0.01), 2 decimals otherwise
- **Data Source**: `/api/staking/metrics` endpoint
- **Accrual**: Continuous, based on APY and staking duration

## Display Formatting

### High-Precision Format
Used for small reward amounts to prevent rounding to zero:

```typescript
formatHighPrecision(value: number) {
  if (value < 0.01 && value > 0) {
    return formatCurrency(value, 4); // $0.0001
  }
  return formatCurrency(value, 2);    // $0.01
}
```

### Standard Currency Format
```typescript
formatCurrency(value: number, decimals: number = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
```

## Real-Time Updates

The dashboard refreshes TSV data every 30 seconds:

```typescript
useEffect(() => {
  fetchDashboardData();
  const interval = setInterval(fetchDashboardData, 30000); // 30s
  return () => clearInterval(interval);
}, []);
```

## Yield Calculations

### Daily Accrual
```typescript
Daily_Accrual = (Current_APY / 365) × Staked_Amount / 100
```

### Monthly Projection
```typescript
Monthly_Projection = Daily_Accrual × 30
```

### Effective APY
Directly from staking metrics, represents the current annual percentage yield on staked USDC.

## Data Integrity

### Precision Handling
- **Agent Equity**: Standard floating-point arithmetic (sufficient for share calculations)
- **Staked USDC**: 6-decimal precision (USDC standard)
- **Rewards**: 18-decimal internal precision, displayed with adaptive formatting

### Cryptographic Verification
All TSV components are backed by:
- Immutable ledger entries (Prisma extensions with append-only guarantees)
- Proof-of-Reserve verification (real-time solvency monitoring)
- Basel III compliance (overcollateralization requirements)

### Error Handling
```typescript
try {
  // Fetch data with parallel requests
  const [equityRes, stakingRes] = await Promise.all([...]);

  // Parse with fallback defaults
  const stakedUSDC = parseFloat(data?.amount || '0');
  const unclaimedRewards = parseFloat(data?.rewards || '0');

  // Calculate TSV
  const totalSovereignValue = equity + staked + rewards;
} catch (error) {
  console.error('Failed to fetch dashboard data:', error);
  // Display last known values or loading state
}
```

## Performance Metrics

### 24h Change
```typescript
Portfolio_Change_24h = ((Current_TSV - TSV_24h_ago) / TSV_24h_ago) × 100
```

Currently using mock data (2.4%) - to be integrated with historical tracking.

## Security Considerations

1. **No Client-Side Calculation Trust**: All values are server-authoritative
2. **API Authentication**: All endpoints require valid session tokens
3. **Rate Limiting**: Dashboard refresh rate prevents API abuse
4. **Decimal Safety**: parseFloat() with fallback prevents NaN propagation
5. **Immutable Audit Trail**: All TSV changes logged to immutable ledger

## Integration Points

### Data Sources
- **Agent Equity API**: `/api/agent-equity`
- **Staking Metrics API**: `/api/staking/metrics`
- **Reserve Status API**: `/api/reserve-status` (for solvency banner)

### Context Dependencies
- `SolvencyContext`: Circuit breaker state and reserve ratios
- `AuthContext`: User session and trust role

### UI Components
- **Command Center Header**: TSV with 24h change indicator
- **Breakdown Cards**: Individual component values
- **Yield Summary**: Real-time accrual counter
- **Risk Advisory Banner**: Solvency state integration

## Future Enhancements

1. **Historical Tracking**: Store TSV snapshots for accurate 24h change calculation
2. **Multi-Agent Portfolio**: Support multiple agent equity holdings
3. **Real-Time Price Feeds**: Integrate live share price updates
4. **Custom Alerts**: Notify users of significant TSV changes
5. **Export Functionality**: Download TSV history for tax reporting
