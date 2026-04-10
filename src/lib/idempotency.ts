/**
 * Idempotency key for settlement (Task 3).
 * Same contractId + proofHash within 24h = already processed.
 */

import { createHash } from "node:crypto";
import { prisma } from "./prisma";

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function idempotencyKey(contractId: string, proofHash: string): string {
  return createHash("sha256").update(`${contractId}:${proofHash}`).digest("hex");
}

/**
 * Returns true if a successful settlement with this contractId+proofHash was already processed in the last 24 hours.
 */
export async function wasAlreadyProcessed(key: string, tenantId: string): Promise<boolean> {
  const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  const record = await prisma.settlementIdempotency.findFirst({
    where: {
      tenantId,
      idempotencyKey: key,
      status: "SUCCESS",
      createdAt: { gte: since },
    },
  });
  return Boolean(record);
}

/**
 * Log a duplicate attempt for audit (security monitoring).
 */
export async function logDuplicateAttempt(
  contractId: string,
  proofHash: string,
  tenantId: string
): Promise<void> {
  const key = idempotencyKey(contractId, proofHash);
  await prisma.settlementIdempotency.create({
    data: {
      tenantId,
      idempotencyKey: key,
      contractId,
      proofHash: proofHash.slice(0, 128),
      status: "DUPLICATE_ATTEMPT",
    },
  });
}

/**
 * Record successful settlement for idempotency (call inside same transaction as contract update).
 */
export async function recordSuccessfulSettlement(
  contractId: string,
  proofHash: string,
  tenantId: string
): Promise<void> {
  const key = idempotencyKey(contractId, proofHash);
  await prisma.settlementIdempotency.create({
    data: {
      tenantId,
      idempotencyKey: key,
      contractId,
      proofHash: proofHash.slice(0, 128),
      status: "SUCCESS",
    },
  });
}
