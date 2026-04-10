/*
 * LEGAL REVIEW REQUIRED — Pemabu
 * Brief reference: See FLOMISMA_PLATFORM/docs/legal-review-briefs.md — Brief 7
 * Question: Do tests and naming that describe ACH/settlement failure imply Pemabu operates payment processing rather than provider-mirrored reconciliation?
 * Do not remove this header until counsel has provided written clearance and the clearance is documented in legal-review-briefs.md under "Counsel Response."
 */

/**
 * Settlement — ACH Failure & Recovery_ERP.
 * Simulate an ACH failure (LedgerEntry in FAILED_RETRY); verify Recovery_ERP moves it to PENDING_RECONCILIATION.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { moveToPendingReconciliation } from "../../src/services/recovery-erp-service";
import { createLedgerEntry } from "../../src/services/ledger-service";
import { randomUUID } from "node:crypto";

let testTenantId: string;
let testUserId: string;
let failedEntryId: string;

describe("Settlement — ACH Failure & Recovery_ERP", () => {
  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: { name: "Settlement Test Tenant" },
    });
    testTenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        email: `settlement-test-${randomUUID().slice(0, 8)}@example.com`,
        profileStatus: "ACTIVE",
      },
    });
    testUserId = user.id;

    const entry = await createLedgerEntry({
      tenantId: testTenantId,
      userId: testUserId,
      amount: 100,
      type: "AGENT_SUB_TASK",
      flomismaTxId: `ach-failed-${randomUUID()}`,
      metadata: { simulatedAchFailure: true },
      status: "FAILED_RETRY",
    });
    failedEntryId = entry.id;
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { id: failedEntryId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: testTenantId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("Recovery_ERP moves FAILED_RETRY (ACH failure) to PENDING_RECONCILIATION", async () => {
    const moved = await moveToPendingReconciliation(failedEntryId);
    expect(moved).toBe(true);

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: failedEntryId },
      select: { status: true },
    });
    expect(entry?.status).toBe("PENDING_RECONCILIATION");
  });
});
