/**
 * V4.1 EOD Overnight Balance Cap Reconciliation
 * Runs at 5:00 PM EST to 'lock' the ledger, verify EOD balance vs cap, and log AuditEvidence for Sovereign Pulse.
 *
 * Schedule via cron (5 PM EST): 0 17 * * * TZ=America/New_York tsx scripts/eod-overnight-cap-reconciliation.ts
 * Or run manually: npx tsx scripts/eod-overnight-cap-reconciliation.ts
 */

import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

const EOD_EVENT_TYPE = "EOD_OVERNIGHT_CAP_VERIFICATION";

async function getCurrentCreditsIssued(tenantId: string): Promise<Decimal> {
  const result = await prisma.ledgerEntry.aggregate({
    where: {
      tenantId,
      status: { in: ["PENDING", "SETTLED"] },
    },
    _sum: { amount: true },
  });
  return result._sum?.amount ?? new Decimal(0);
}

function nowEastern(): string {
  return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
}

export async function runEodOvernightCapReconciliation(): Promise<void> {
  const lockedAt = nowEastern();
  console.log(`[EOD] Starting overnight cap reconciliation at ${lockedAt} (5 PM EST target).`);

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, overnightCap: true },
  });

  for (const tenant of tenants) {
    const currentCreditsIssued = await getCurrentCreditsIssued(tenant.id);
    const cap = tenant.overnightCap;
    const exceedsCap = currentCreditsIssued.gt(cap);
    const systemState = exceedsCap ? "DEGRADED" : "OPTIMAL";

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { currentBalanceEOD: currentCreditsIssued },
    });

    await prisma.auditEvidence.create({
      data: {
        eventType: EOD_EVENT_TYPE,
        snapshotData: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          lockedAtEastern: lockedAt,
          currentCreditsIssued: currentCreditsIssued.toString(),
          overnightCap: cap.toString(),
          withinCap: !exceedsCap,
        },
        systemState,
        ledgerSum: currentCreditsIssued,
        reserveRatio: null,
        reserveSum: null,
        metadata: {
          sovereignPulse: true,
          overnightCapVerification: true,
          capExceeded: exceedsCap,
        },
      },
    });

    console.log(
      `[EOD] Tenant ${tenant.name} (${tenant.id}): credits=${currentCreditsIssued}, cap=${cap}, state=${systemState}`
    );
  }

  console.log("[EOD] Overnight cap reconciliation complete.");
}

runEodOvernightCapReconciliation()
  .catch((e) => {
    console.error("[EOD] Reconciliation failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
