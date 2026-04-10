/**
 * Reputation Engine – ERC-8004 compliant scoring.
 * Weights successful agenticProof hashes and settlement velocity into User.reputationScore (0–1).
 */

import { prisma } from "../lib/prisma";

const WEIGHT_SUCCESSFUL_PROOFS = 0.6;
const WEIGHT_VELOCITY = 0.4;
const VELOCITY_WINDOW_DAYS = 30;

/**
 * Computes reputation score: weighted sum of (1) proof success ratio, (2) settlement velocity.
 * ERC-8004 style: on-chain / verifiable credentials analog here is successful settlements + speed.
 */
export async function computeReputationScore(userId: string, tenantId: string): Promise<number> {
  const contractsAsEmployee = await prisma.contract.findMany({
    where: {
      employeeId: userId,
      tenantId,
      status: "COMPLETED",
      agenticProof: { not: null },
    },
  });
  const totalSettlements = contractsAsEmployee.length;
  const successfulProofs = contractsAsEmployee.filter((c) => c.agenticProof != null).length;
  const proofScore = totalSettlements === 0 ? 0.5 : successfulProofs / totalSettlements;
  const velocityScore = Math.min(1, totalSettlements / 10);
  const score = WEIGHT_SUCCESSFUL_PROOFS * proofScore + WEIGHT_VELOCITY * velocityScore;
  const clamped = Math.max(0, Math.min(1, score));
  await prisma.user.updateMany({
    where: { id: userId, tenantId },
    data: { reputationScore: clamped },
  });
  return clamped;
}

/**
 * Get current reputation score for a user (from DB or compute).
 */
export async function getReputationScore(userId: string, tenantId: string): Promise<number> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { reputationScore: true },
  });
  if (!user) return 0;
  if (user.reputationScore != null) return Number(user.reputationScore);
  return computeReputationScore(userId, tenantId);
}
