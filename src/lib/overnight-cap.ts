/**
 * V4.1 Overnight Balance Cap (Fed-Style Constraint)
 * Kraken 'Skinny' Fed Master Account: limit total Credits Issued on ledger overnight.
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./prisma";

/** HTTP 403 when ledger would exceed tenant overnight cap */
export class OvernightCapExceededError extends Error {
  readonly code = "OVERNIGHT_CAP_EXCEEDED";
  readonly status = 403;
  constructor(
    public tenantId: string,
    public currentCreditsIssued: Decimal,
    public overnightCap: Decimal,
    public requestedAmount: Decimal
  ) {
    super(
      `OVERNIGHT_CAP_EXCEEDED: Credits Issued (${currentCreditsIssued}) + requested (${requestedAmount}) exceeds overnightCap (${overnightCap}) for tenant ${tenantId}`
    );
    this.name = "OvernightCapExceededError";
  }
}

/**
 * Current Credits Issued = sum of LedgerEntry amounts for tenant (PENDING + SETTLED).
 */
export async function getCurrentCreditsIssued(tenantId: string): Promise<Decimal> {
  const result = await prisma.ledgerEntry.aggregate({
    where: {
      tenantId,
      status: { in: ["PENDING", "SETTLED"] },
    },
    _sum: { amount: true },
  });
  const sum = result._sum?.amount ?? new Decimal(0);
  return sum;
}

/**
 * Validates that adding `amount` to Current Credits Issued does not exceed tenant's overnightCap.
 * Call before creating any new LedgerEntry that issues credit.
 * @throws OvernightCapExceededError (403) if cap would be exceeded
 */
export async function validateOvernightCap(
  tenantId: string,
  amount: Decimal | number
): Promise<void> {
  const decimalAmount = typeof amount === "number" ? new Decimal(amount) : amount;
  const [tenant, currentCreditsIssued] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { overnightCap: true },
    }),
    getCurrentCreditsIssued(tenantId),
  ]);

  const cap = tenant.overnightCap;
  const projected = currentCreditsIssued.add(decimalAmount);
  if (projected.gt(cap)) {
    throw new OvernightCapExceededError(
      tenantId,
      currentCreditsIssued,
      cap,
      decimalAmount
    );
  }
}
