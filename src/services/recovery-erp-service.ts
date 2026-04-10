/*
 * LEGAL REVIEW REQUIRED — Pemabu
 * Brief reference: See FLOMISMA_PLATFORM/docs/legal-review-briefs.md — Brief 7 (canonical); portal/docs/legal-review-briefs.md
 * Question: Does mutating LedgerEntry status in Pemabu create a customer money account or payment processing record independent of the licensed processor’s ledger?
 * Do not remove this header until counsel has provided written clearance and the clearance is documented in legal-review-briefs.md under "Counsel Response."
 */

/**
 * Recovery_ERP: On external payout / processor failure signals, move **local reporting**
 * ledger rows to PENDING_RECONCILIATION for manual ops review (SOC2 processing integrity).
 * REGULATORY SCRUB 2026-04-02: Does not initiate ACH, card, or chain transfers — status bookkeeping only.
 */

import { prisma } from "../lib/prisma";

/**
 * Move a ledger entry that is in FAILED_RETRY (e.g. external processor failure) to PENDING_RECONCILIATION.
 * Idempotent for already PENDING_RECONCILIATION.
 */
export async function moveToPendingReconciliation(ledgerEntryId: string): Promise<boolean> {
  const entry = await prisma.ledgerEntry.findUnique({
    where: { id: ledgerEntryId },
    select: { status: true },
  });
  if (!entry) return false;
  if (entry.status !== "FAILED_RETRY" && entry.status !== "PENDING") return false;

  await prisma.ledgerEntry.update({
    where: { id: ledgerEntryId },
    data: { status: "PENDING_RECONCILIATION" },
  });
  return true;
}

/**
 * Move all FAILED_RETRY entries (e.g. after external processor failure batch) to PENDING_RECONCILIATION.
 */
export async function moveAllFailedRetryToPendingReconciliation(): Promise<number> {
  const result = await prisma.ledgerEntry.updateMany({
    where: { status: "FAILED_RETRY" },
    data: { status: "PENDING_RECONCILIATION" },
  });
  return result.count;
}
