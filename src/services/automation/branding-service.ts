/**
 * Dynamic Identity (Branding) – metadata-driven UI configuration.
 * AI suggests partner branding; status remains PENDING_APPROVAL until human admin signs off.
 */

import { prisma } from "../../lib/prisma";
import { enqueueApproval } from "../governance-service";

export interface BrandingUIConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  partnerName?: string;
  [key: string]: unknown;
}

/**
 * Proposes a new partner branding (AI-suggested). Status = PENDING_APPROVAL.
 */
export async function suggestBranding(
  tenantId: string,
  uiConfig: BrandingUIConfig
): Promise<string> {
  const row = await prisma.partnerBranding.create({
    data: {
      tenantId,
      uiConfig,
      status: "PENDING_APPROVAL",
    },
  });
  await enqueueApproval(tenantId, "BRANDING_APPROVAL", { brandingId: row.id, uiConfig });
  return row.id;
}

/**
 * Lists branding configs for a tenant (optionally by status).
 */
export async function listBranding(
  tenantId: string,
  status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
) {
  return prisma.partnerBranding.findMany({
    where: { tenantId, ...(status && { status }) },
    orderBy: { suggestedAt: "desc" },
  });
}

/**
 * Human admin approves or rejects a branding suggestion.
 */
export async function resolveBranding(
  brandingId: string,
  tenantId: string,
  approved: boolean,
  approvedBy: string
): Promise<void> {
  await prisma.partnerBranding.updateMany({
    where: { id: brandingId, tenantId, status: "PENDING_APPROVAL" },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

/**
 * Returns the current effective UI config for a tenant (latest APPROVED).
 */
export async function getEffectiveBranding(tenantId: string): Promise<BrandingUIConfig | null> {
  const row = await prisma.partnerBranding.findFirst({
    where: { tenantId, status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
  });
  return row ? (row.uiConfig as BrandingUIConfig) : null;
}
