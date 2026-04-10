/**
 * Programmable Vaults — Check agent spending allowance before any PMB/credit transfer.
 */

import { prisma } from "./prisma";

function decimalToNumber(d: unknown): number {
  if (typeof d === "number" && !Number.isNaN(d)) return d;
  if (typeof d === "object" && d !== null && typeof (d as { toNumber?: () => number }).toNumber === "function") {
    return (d as { toNumber: () => number }).toNumber();
  }
  return Number(d);
}

const PERIOD_MS: Record<string, number> = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};

export type CheckAllowanceResult =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: "NO_ALLOWANCE" | "EXCEEDED_LIMIT"; remaining: number };

export async function checkSpendingAllowance(
  tenantId: string,
  agentId: string,
  amount: number
): Promise<CheckAllowanceResult> {
  if (amount <= 0) return { allowed: true, remaining: 0 };

  let row = await prisma.spendingAllowance.findUnique({
    where: { tenantId_agentId: { tenantId, agentId } },
  });
  if (!row) return { allowed: false, reason: "NO_ALLOWANCE", remaining: 0 };

  const periodMs = PERIOD_MS[row.period] ?? PERIOD_MS.DAILY;
  const now = Date.now();
  const periodStart = row.periodStartAt.getTime();
  if (now - periodStart >= periodMs) {
    await prisma.spendingAllowance.update({
      where: { id: row.id },
      data: { usedInPeriod: 0, periodStartAt: new Date() },
    });
    row = await prisma.spendingAllowance.findUnique({ where: { id: row.id } });
    if (!row) return { allowed: false, reason: "NO_ALLOWANCE", remaining: 0 };
  }

  const limit = decimalToNumber(row.amountLimit);
  const used = decimalToNumber(row.usedInPeriod);
  const remaining = Math.max(0, limit - used);
  if (used + amount > limit) return { allowed: false, reason: "EXCEEDED_LIMIT", remaining };
  return { allowed: true, remaining: remaining - amount };
}

export async function recordSpending(tenantId: string, agentId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await prisma.spendingAllowance.updateMany({
    where: { tenantId, agentId },
    data: { usedInPeriod: { increment: amount }, updatedAt: new Date() },
  });
}
