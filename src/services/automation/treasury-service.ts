/**
 * Auto-Dispute & Treasury – daily "Spice Tax" sweep at 00:00 UTC.
 * If discrepancy > threshold vs. LedgerEntry totals, pause sweep and alert GovernanceHub.
 */

import { prisma } from "../../lib/prisma";
import { getThresholds, enqueueApproval } from "../governance-service";

export interface TreasurySweepResult {
  ok: boolean;
  totalFeesUsd: number;
  ledgerTotalUsd: number;
  discrepancyPct: number;
  paused: boolean;
  alertSent: boolean;
}

/**
 * Calculates 24h platform fees (placeholder: sum of a fee type from ledger or config).
 * In production, compute from LedgerEntry type = platform fee or similar.
 */
async function getExpectedFeesLast24h(tenantId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      tenantId,
      createdAt: { gte: since },
      type: { in: ["PAY_EXAM", "PAY_MENTOR", "AGENT_SUB_TASK"] },
      status: "SETTLED",
    },
  });
  // Placeholder: 2% platform fee on settled amounts
  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  return total * 0.02;
}

/**
 * Sum of LedgerEntry amounts in last 24h (for comparison).
 */
async function getLedgerTotalLast24h(tenantId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const entries = await prisma.ledgerEntry.findMany({
    where: { tenantId, createdAt: { gte: since }, status: "SETTLED" },
  });
  return entries.reduce((sum, e) => sum + Number(e.amount), 0);
}

/**
 * Run daily Spice Tax sweep. If discrepancy > threshold, pause and alert.
 */
export async function runDailySpiceTaxSweep(tenantId: string): Promise<TreasurySweepResult> {
  const { treasuryDiscrepancyMaxPct } = await getThresholds(tenantId);
  const expectedFees = await getExpectedFeesLast24h(tenantId);
  const ledgerTotal = await getLedgerTotalLast24h(tenantId);
  const discrepancyPct =
    ledgerTotal === 0 ? 0 : Math.abs(expectedFees - ledgerTotal * 0.02) / (ledgerTotal * 0.02) * 100;
  const paused = discrepancyPct > treasuryDiscrepancyMaxPct;
  let alertSent = false;
  if (paused) {
    await enqueueApproval(tenantId, "TREASURY_SWEEP", {
      expectedFeesUsd: expectedFees,
      ledgerTotalUsd: ledgerTotal,
      discrepancyPct,
      reason: "Discrepancy exceeds threshold; sweep paused",
    });
    alertSent = true;
  }
  return {
    ok: !paused,
    totalFeesUsd: expectedFees,
    ledgerTotalUsd: ledgerTotal,
    discrepancyPct,
    paused,
    alertSent,
  };
}

/**
 * Schedule entry point: call from cron at 00:00 UTC for each tenant.
 */
export async function runScheduledSpiceTaxSweep(): Promise<void> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  const results: TreasurySweepResult[] = [];
  for (const t of tenants) {
    results.push(await runDailySpiceTaxSweep(t.id));
  }
  return void results;
}
