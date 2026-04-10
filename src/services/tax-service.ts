/**
 * Intelligent Tax Agent (ITC) – real-time withholding by User.location.
 * Generates a TaxLedgerEntry (LedgerEntry type TAX_WITHHOLDING) for every settlement.
 */

import { prisma } from "../lib/prisma";
import { createLedgerEntry } from "./ledger-service";

const WITHHOLDING_RATES: Record<string, number> = {
  US: 0.24,
  DE: 0.42,
  UK: 0.20,
  FR: 0.30,
  DEFAULT: 0.20,
};

/**
 * Resolves withholding rate for a location (country code or region).
 */
function getWithholdingRate(location: string | null | undefined): number {
  if (!location) return WITHHOLDING_RATES.DEFAULT;
  const upper = location.trim().toUpperCase().slice(0, 2);
  return WITHHOLDING_RATES[upper] ?? WITHHOLDING_RATES.DEFAULT;
}

/**
 * Creates a TaxLedgerEntry (LedgerEntry with type TAX_WITHHOLDING) for a settlement amount.
 * Call after each settlement for the recipient user.
 */
export async function createTaxWithholdingForSettlement(
  tenantId: string,
  userId: string,
  settlementAmountUsd: number,
  settlementFlomismaTxId: string,
  currency: string = "USD"
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { location: true },
  });
  const rate = getWithholdingRate(user?.location ?? null);
  const withholdingAmount = settlementAmountUsd * rate;
  const flomismaTxId = `tax-withhold-${settlementFlomismaTxId}-${Date.now()}`;
  await createLedgerEntry({
    tenantId,
    userId,
    amount: withholdingAmount,
    currency,
    type: "TAX_WITHHOLDING",
    flomismaTxId,
    metadata: {
      settlementFlomismaTxId,
      rate,
      settlementAmountUsd,
    },
    status: "PENDING",
  });
}
