/**
 * Single-Purpose Vault Service — Chef Equipment Leasing (Spice Krewe).
 * Autonomous revenue collection: X% of chef revenue moves into AssetVault as lease payment.
 * Scoped to Spice Krewe tenant only (Temporal Firewall for niche products).
 */

import { Decimal } from "@prisma/client/runtime/library";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";

/** Temporal Firewall: only this tenant can use the culinary equipment vault. */
export const SPICE_KREWE_TENANT_NAME = "Spice Krewe";

export type ProcessLeasePaymentResult =
  | { success: true; ledgerEntryId: string; leaseAmount: number; assetVaultId: string }
  | { success: false; error: "TENANT_NOT_SPICE_KREWE" | "TENANT_NOT_FOUND" | "NO_VAULT" | "CHEF_NOT_IN_TENANT" | "INVALID_AMOUNT" };

/**
 * Process a lease payment: move X% of the chef's revenue into the AssetVault as a lease payment.
 * Creates a LedgerEntry (type EQUIPMENT_LEASE) scoped to the tenant.
 * Only runs when tenant is Spice Krewe (Temporal Firewall).
 */
export async function processLeasePayment(
  tenantId: string,
  chefId: string,
  revenueAmount: number
): Promise<ProcessLeasePaymentResult> {
  if (revenueAmount <= 0) {
    return { success: false, error: "INVALID_AMOUNT" };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });
  if (!tenant) {
    return { success: false, error: "TENANT_NOT_FOUND" };
  }

  if (tenant.name !== SPICE_KREWE_TENANT_NAME) {
    return { success: false, error: "TENANT_NOT_SPICE_KREWE" };
  }

  const chef = await prisma.user.findFirst({
    where: { id: chefId, tenantId },
    select: { id: true },
  });
  if (!chef) {
    return { success: false, error: "CHEF_NOT_IN_TENANT" };
  }

  const vault = await prisma.assetVault.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });
  if (!vault) {
    return { success: false, error: "NO_VAULT" };
  }

  const rate = Number(vault.leaseRate);
  const leaseAmount = Math.round(revenueAmount * rate * 100) / 100;
  if (leaseAmount <= 0) {
    return { success: false, error: "NO_VAULT" };
  }

  const flomismaTxId = `lease-${vault.id}-${chefId}-${randomUUID().slice(0, 8)}`;
  const entry = await prisma.ledgerEntry.create({
    data: {
      tenantId,
      userId: chefId,
      amount: new Decimal(leaseAmount),
      currency: "USD",
      type: "EQUIPMENT_LEASE",
      status: "SETTLED",
      flomismaTxId,
      metadata: {
        assetVaultId: vault.id,
        assetName: vault.assetName,
        revenueAmount,
        leaseRate: rate,
        source: "vault-service",
      },
    },
  });

  return {
    success: true,
    ledgerEntryId: entry.id,
    leaseAmount,
    assetVaultId: vault.id,
  };
}
