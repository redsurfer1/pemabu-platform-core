/**
 * Governance Hub & HITL Controller.
 * Centralized "Speed Limit" controller: thresholds and approval queue.
 */

import { prisma } from "../lib/prisma";
import type { ApprovalActionType } from "@prisma/client";

export interface GovernanceThresholdInput {
  tenantId?: string | null;
  autoSettlementLimitUsd?: number;
  autoBrandingApproval?: boolean;
  kycConfidenceMinPct?: number;
  treasuryDiscrepancyMaxPct?: number;
  driftVarianceMax?: number | null;
}

const DEFAULTS = {
  autoSettlementLimitUsd: 500,
  kycConfidenceMinPct: 95,
  treasuryDiscrepancyMaxPct: 3,
};

/**
 * Resolves effective thresholds for a tenant (tenant row or global when tenantId is null).
 */
export async function getThresholds(tenantId: string): Promise<{
  autoSettlementLimitUsd: number;
  autoBrandingApproval: boolean;
  kycConfidenceMinPct: number;
  treasuryDiscrepancyMaxPct: number;
  driftVarianceMax: number | null;
}> {
  const row = await prisma.governanceThreshold.findFirst({
    where: { OR: [{ tenantId }, { tenantId: null }] },
    orderBy: { tenantId: "desc" }, // prefer tenant-specific over global
  });
  if (!row) {
    return {
      autoSettlementLimitUsd: DEFAULTS.autoSettlementLimitUsd,
      autoBrandingApproval: false,
      kycConfidenceMinPct: DEFAULTS.kycConfidenceMinPct,
      treasuryDiscrepancyMaxPct: Number(DEFAULTS.treasuryDiscrepancyMaxPct),
      driftVarianceMax: null,
    };
  }
  return {
    autoSettlementLimitUsd: Number(row.autoSettlementLimitUsd),
    autoBrandingApproval: row.autoBrandingApproval,
    kycConfidenceMinPct: row.kycConfidenceMinPct,
    treasuryDiscrepancyMaxPct: Number(row.treasuryDiscrepancyMaxPct),
    driftVarianceMax: row.driftVarianceMax != null ? Number(row.driftVarianceMax) : null,
  };
}

/**
 * Upserts GovernanceThreshold for a tenant (or global when tenantId is null).
 */
export async function setThresholds(input: GovernanceThresholdInput): Promise<void> {
  const data = {
    autoSettlementLimitUsd: input.autoSettlementLimitUsd ?? DEFAULTS.autoSettlementLimitUsd,
    autoBrandingApproval: input.autoBrandingApproval ?? false,
    kycConfidenceMinPct: input.kycConfidenceMinPct ?? DEFAULTS.kycConfidenceMinPct,
    treasuryDiscrepancyMaxPct: input.treasuryDiscrepancyMaxPct ?? DEFAULTS.treasuryDiscrepancyMaxPct,
    driftVarianceMax: input.driftVarianceMax ?? undefined,
  };
  const tenantId = input.tenantId ?? null;
  const existing = await prisma.governanceThreshold.findFirst({
    where: tenantId != null ? { tenantId } : { tenantId: null },
  });
  if (existing) {
    await prisma.governanceThreshold.update({ where: { id: existing.id }, data });
  } else {
    await prisma.governanceThreshold.create({
      data: { ...data, tenantId: tenantId ?? undefined },
    });
  }
}

/**
 * Enqueues an action for human approval. Returns the created ApprovalQueue id.
 */
export async function enqueueApproval(
  tenantId: string,
  actionType: ApprovalActionType,
  payload: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<string> {
  const row = await prisma.approvalQueue.create({
    data: {
      tenantId,
      actionType,
      payload,
      status: "PENDING_APPROVAL",
      metadata: metadata ?? undefined,
    },
  });
  return row.id;
}

/**
 * Lists approval queue items (optionally by status).
 */
export async function getApprovalQueue(
  tenantId: string,
  status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
) {
  return prisma.approvalQueue.findMany({
    where: { tenantId, ...(status && { status }) },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Approve or reject a queued action. Records approvedBy and approvedAt.
 */
export async function resolveApproval(
  queueId: string,
  tenantId: string,
  approved: boolean,
  approvedBy: string
): Promise<void> {
  await prisma.approvalQueue.updateMany({
    where: { id: queueId, tenantId, status: "PENDING_APPROVAL" },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

/**
 * Check whether an amount is within the auto-settlement speed limit.
 */
export async function isWithinAutoSettlementLimit(
  tenantId: string,
  amountUsd: number
): Promise<boolean> {
  const { autoSettlementLimitUsd } = await getThresholds(tenantId);
  return amountUsd < autoSettlementLimitUsd;
}
