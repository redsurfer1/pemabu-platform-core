/**
 * Automated Risk Leveling — Flash-Liquidity protection.
 * If totalReserves grows >25% in 24h, flag as High Velocity in AuditEvidence
 * and require secondary Admin Signature for credit issuance exceeding $50k.
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../lib/prisma";

const HIGH_VELOCITY_GROWTH_THRESHOLD = 0.25; // 25%
const WINDOW_HOURS = 24;
const HIGH_VELOCITY_EVENT_TYPE = "HIGH_VELOCITY";
/** Credit issuance above this amount requires admin signature when in High Velocity mode */
export const HIGH_VELOCITY_CREDIT_THRESHOLD_USD = 50_000;
/** How long we consider "High Velocity" active after the evidence was created (hours) */
const HIGH_VELOCITY_TTL_HOURS = 24;

/**
 * Sum of ReserveLedgerEntry amounts (USDC) as of the given time (entries created <= atTime).
 */
export async function getTotalReserveUsdcAsOf(atTime: Date): Promise<Decimal> {
  const result = await prisma.reserveLedgerEntry.aggregate({
    where: {
      currency: "USDC",
      createdAt: { lte: atTime },
    },
    _sum: { amount: true },
  });
  const sum = result._sum?.amount ?? new Decimal(0);
  return sum.lt(0) ? new Decimal(0) : sum;
}

/**
 * Returns true if the system is in High Velocity mode (reserves grew >25% in 24h recently).
 */
export async function isHighVelocityMode(): Promise<boolean> {
  const cutoff = new Date(Date.now() - HIGH_VELOCITY_TTL_HOURS * 60 * 60 * 1000);
  const evidence = await prisma.auditEvidence.findFirst({
    where: { eventType: HIGH_VELOCITY_EVENT_TYPE, triggeredAt: { gte: cutoff } },
    orderBy: { triggeredAt: "desc" },
  });
  return !!evidence;
}

/**
 * Check if reserves grew >25% in the last 24h; if so, create AuditEvidence (High Velocity)
 * and return true. Otherwise return false.
 */
export async function checkAndRecordHighVelocityIfNeeded(): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);

  const [currentSum, pastSum] = await Promise.all([
    getTotalReserveUsdcAsOf(now),
    getTotalReserveUsdcAsOf(windowStart),
  ]);

  const current = Number(currentSum);
  const past = Number(pastSum);
  const growthPct = past > 0 ? (current - past) / past : 0;

  if (growthPct <= HIGH_VELOCITY_GROWTH_THRESHOLD) return false;

  await prisma.auditEvidence.create({
    data: {
      eventType: HIGH_VELOCITY_EVENT_TYPE,
      snapshotData: {
        totalReserves: current,
        totalReserves24hAgo: past,
        growthPct: Math.round(growthPct * 10000) / 100,
        windowHours: WINDOW_HOURS,
        message: "Reserves grew >25% in 24h; admin signature required for credit issuance >$50k",
      },
      systemState: "DEGRADED",
      ledgerSum: null,
      reserveSum: currentSum,
      reserveRatio: null,
      metadata: {
        highVelocity: true,
        adminSignatureRequiredAboveUsd: HIGH_VELOCITY_CREDIT_THRESHOLD_USD,
      },
    },
  });

  return true;
}
