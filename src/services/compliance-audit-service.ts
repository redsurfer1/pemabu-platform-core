/**
 * Drift Monitor – SOC2 fairness.
 * Logs statistical distribution of "Matches" to detect algorithmic bias;
 * alerts GovernanceHub if variance exceeds defined SOC2 fairness parameters.
 */

import { prisma } from "../lib/prisma";
import { getThresholds, enqueueApproval } from "./governance-service";

export interface MatchDistributionPayload {
  dimension: string;
  counts: Record<string, number>;
  total: number;
  variance: number;
}

/**
 * Record a match distribution (e.g. by demographic, region) and optionally alert.
 */
export async function logMatchDistribution(
  tenantId: string | null,
  payload: MatchDistributionPayload
): Promise<void> {
  const { driftVarianceMax } = await getThresholds(tenantId ?? "");
  const variance = payload.variance;
  const alerted = driftVarianceMax != null && variance > driftVarianceMax;
  await prisma.complianceAuditLog.create({
    data: {
      tenantId: tenantId ?? undefined,
      eventType: "MATCH_DISTRIBUTION",
      payload,
      variance,
      alerted,
    },
  });
  if (alerted && tenantId) {
    await enqueueApproval(tenantId, "OTHER", {
      alert: "DRIFT_BIAS",
      dimension: payload.dimension,
      variance,
      threshold: driftVarianceMax,
      message: "Variance exceeds SOC2 fairness parameters",
    });
  }
}

/**
 * Compute variance of a distribution (e.g. Chi-squared style or std dev of proportions).
 */
export function computeDistributionVariance(counts: Record<string, number>, total: number): number {
  if (total === 0) return 0;
  const keys = Object.keys(counts);
  const expected = total / keys.length;
  let sumSq = 0;
  for (const k of keys) {
    const diff = (counts[k] ?? 0) - expected;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / keys.length) / total;
}
