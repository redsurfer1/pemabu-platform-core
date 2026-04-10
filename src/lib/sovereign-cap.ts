/**
 * V4.1 / V4.2 Dynamic Overnight Balance Cap & Velocity Engine.
 * Sovereign cap = Total USDC reserves × LIQUIDITY_SAFETY_MARGIN (80%).
 * Real-time streaming sovereignty: capacity scales with USDC inflows; no EOD cron.
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./prisma";

/** 80% of live USDC liquidity — max credits issued allowed on ledger */
export const LIQUIDITY_SAFETY_MARGIN = 0.8;

/** V4.2: Cache TTL for USDC sum to avoid DB thrashing while keeping real-time feel (seconds) */
export const USDC_SUM_CACHE_TTL_SECONDS = 60;

/** In-memory cache for ReserveLedgerEntry USDC sum (single process; 60s TTL) */
let usdcSumCache: { value: Decimal; expiresAt: number } | null = null;

/** HTTP 403 when issuing credit would breach sovereign liquidity ceiling */
export class SovereignLiquidityCeilingError extends Error {
  readonly code = "SOVEREIGN_LIQUIDITY_CEILING";
  readonly status = 403;
  constructor(
    public currentTotalCredits: Decimal,
    public sovereignCap: Decimal,
    public requestedAmount: Decimal
  ) {
    super(
      `SOVEREIGN_LIQUIDITY_CEILING: (Current Credits ${currentTotalCredits} + ${requestedAmount}) exceeds sovereign cap ${sovereignCap} (80% of USDC reserves)`
    );
    this.name = "SovereignLiquidityCeilingError";
  }
}

/**
 * Total USDC from ReserveLedgerEntry (sum of amount).
 * V4.2: 60-second cache to prevent DB thrashing; fresh sum after TTL so deposits expand capacity within ~1 min.
 */
export async function getTotalReserveUsdc(): Promise<Decimal> {
  const now = Date.now();
  const expiresAt = now + USDC_SUM_CACHE_TTL_SECONDS * 1000;
  if (usdcSumCache && now < usdcSumCache.expiresAt) {
    return usdcSumCache.value;
  }
  const result = await prisma.reserveLedgerEntry.aggregate({
    where: { currency: "USDC" },
    _sum: { amount: true },
  });
  const sum = result._sum?.amount ?? new Decimal(0);
  const value = sum.lt(0) ? new Decimal(0) : sum;
  usdcSumCache = { value, expiresAt };
  return value;
}

/**
 * Live calculated cap = Total USDC × LIQUIDITY_SAFETY_MARGIN (80%).
 * Called on every IssueCredit request; uses cached USDC sum when within TTL.
 * Example: $100k USDC deposited at 2:00 PM → cap expands by $80k within ~60s.
 */
export async function calculateSovereignCap(): Promise<Decimal> {
  const totalUsdc = await getTotalReserveUsdc();
  return totalUsdc.mul(LIQUIDITY_SAFETY_MARGIN);
}

/**
 * Invalidate USDC sum cache (e.g. after a reserve deposit in the same process).
 * Optional; cache auto-expires after USDC_SUM_CACHE_TTL_SECONDS.
 */
export function invalidateUsdcSumCache(): void {
  usdcSumCache = null;
}

/**
 * Current total credits issued across all tenants (LedgerEntry PENDING + SETTLED).
 */
export async function getCurrentTotalCreditsIssued(): Promise<Decimal> {
  const result = await prisma.ledgerEntry.aggregate({
    where: { status: { in: ["PENDING", "SETTLED"] } },
    _sum: { amount: true },
  });
  return result._sum?.amount ?? new Decimal(0);
}

/**
 * V4.2 Velocity interceptor: (Current Total Credits + newAmount) <= Live Calculated Cap.
 * Cap is always the live sovereign cap (USDC × 0.80), NOT Tenant.overnightCap.
 * Called on every IssueCredit; capacity scales with USDC inflows within cache TTL (~60s).
 * @throws SovereignLiquidityCeilingError (403) if ceiling would be breached
 */
export async function validateSovereignLiquidityCeiling(
  newAmount: Decimal | number
): Promise<void> {
  const amount = typeof newAmount === "number" ? new Decimal(newAmount) : newAmount;
  const [currentCredits, liveCap] = await Promise.all([
    getCurrentTotalCreditsIssued(),
    calculateSovereignCap(),
  ]);
  const projected = currentCredits.add(amount);
  if (projected.gt(liveCap)) {
    throw new SovereignLiquidityCeilingError(currentCredits, liveCap, amount);
  }
}

/**
 * War-room metrics: totalReserves, overnightCap, capUtilization (0–100%).
 */
export async function getSovereignCapMetrics(): Promise<{
  totalReserves: number;
  overnightCap: number;
  capUtilization: number;
  currentTotalCredits: number;
}> {
  const [totalUsdc, cap, currentCredits] = await Promise.all([
    getTotalReserveUsdc(),
    calculateSovereignCap(),
    getCurrentTotalCreditsIssued(),
  ]);
  const totalReserves = Number(totalUsdc);
  const overnightCap = Number(cap);
  const currentTotalCredits = Number(currentCredits);
  const capUtilization =
    overnightCap > 0 ? Math.min(100, (currentTotalCredits / overnightCap) * 100) : 0;
  return {
    totalReserves,
    overnightCap,
    capUtilization,
    currentTotalCredits,
  };
}
