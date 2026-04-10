/**
 * Identity Oracle (KYC) – placeholder IDV integration.
 * If confidence < threshold (default 95%), flag User profileStatus as MANUAL_REVIEW.
 */

import { prisma } from "../../lib/prisma";
import { getThresholds } from "../governance-service";

export interface KycCheckResult {
  userId: string;
  confidencePct: number;
  status: "OK" | "MANUAL_REVIEW";
  idvProvider?: string;
}

/**
 * Placeholder: call external IDV service and return confidence.
 * In production, replace with real IDV (e.g. Persona, Onfido) API call.
 */
export async function performKycCheck(
  userId: string,
  tenantId: string,
  _idvPayload?: Record<string, unknown>
): Promise<KycCheckResult> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!user) {
    throw new Error("User not found");
  }
  const { kycConfidenceMinPct } = await getThresholds(tenantId);
  // Placeholder: simulate confidence (replace with real IDV response)
  const confidencePct = _idvPayload?.confidencePct != null
    ? Number(_idvPayload.confidencePct)
    : 98;
  const needsReview = confidencePct < kycConfidenceMinPct;
  if (needsReview) {
    await prisma.user.updateMany({
      where: { id: userId, tenantId },
      data: { profileStatus: "MANUAL_REVIEW" },
    });
  }
  return {
    userId,
    confidencePct,
    status: needsReview ? "MANUAL_REVIEW" : "OK",
    idvProvider: "placeholder",
  };
}

/**
 * After human review, clear MANUAL_REVIEW (e.g. set to "active").
 */
export async function clearManualReview(userId: string, tenantId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, tenantId },
    data: { profileStatus: "active" },
  });
}
