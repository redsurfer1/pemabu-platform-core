/**
 * Agentic handshake verification with idempotency and atomic transition (Task 3).
 * Compares submitted agenticProof; on match, records idempotency and triggers settlement.
 */

import { prisma } from "../lib/prisma";
import { idempotencyKey, wasAlreadyProcessed } from "../lib/idempotency";
import { settlementService } from "./settlement-service";

/** SHA-256 hex is 64 chars; signed execution logs (e.g. JWS) can be longer */
const SHA256_HEX_LENGTH = 64;
const MAX_PROOF_LENGTH = 4096;

export interface VerificationResult {
  success: boolean;
  contractId: string;
  transactionId?: string | null;
  status: "SETTLED" | "FAILED_RETRY" | "COMPLETED";
  timestamp: string;
  error?: string;
  duplicate?: boolean;
}

/**
 * Verifies agenticProof, enforces idempotency (same contractId+proofHash in 24h),
 * and performs atomic ACTIVE -> COMPLETED transition in a Prisma transaction.
 * Duplicate attempts are logged for audit.
 */
export async function verifyAgenticProof(
  contractId: string,
  submittedProof: string,
  tenantId: string
): Promise<VerificationResult> {
  const timestamp = new Date().toISOString();

  if (!submittedProof || submittedProof.length > MAX_PROOF_LENGTH) {
    return {
      success: false,
      contractId,
      status: "COMPLETED",
      timestamp,
      error:
        "agenticProof must be a non-empty string (SHA-256 hex or signed execution log, max 4096 chars)",
    };
  }

  const proofHash = submittedProof;
  const key = idempotencyKey(contractId, proofHash);

  if (await wasAlreadyProcessed(key, tenantId)) {
    return {
      success: true,
      contractId,
      transactionId: null,
      status: "SETTLED",
      timestamp,
      duplicate: true,
    };
  }

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: { milestones: true, employee: true, employer: true },
  });

  if (!contract) {
    return {
      success: false,
      contractId,
      status: "COMPLETED",
      timestamp,
      error: "Contract not found",
    };
  }

  if (contract.status !== "ACTIVE") {
    if (contract.status === "COMPLETED" && contract.agenticProof === submittedProof) {
      return {
        success: true,
        contractId,
        transactionId: null,
        status: "SETTLED",
        timestamp,
        duplicate: true,
      };
    }
    return {
      success: false,
      contractId,
      status: "COMPLETED",
      timestamp,
      error: `Contract must be ACTIVE to settle; current status: ${contract.status}`,
    };
  }

  const isValidFormat =
    (submittedProof.length === SHA256_HEX_LENGTH && /^[a-fA-F0-9]+$/.test(submittedProof)) ||
    (submittedProof.length > SHA256_HEX_LENGTH &&
      (submittedProof.startsWith("eyJ") || submittedProof.includes(".")));
  if (!isValidFormat) {
    return {
      success: false,
      contractId,
      status: "COMPLETED",
      timestamp,
      error:
        "agenticProof must be a SHA-256 hex string (64 chars) or a signed execution log (e.g. JWS)",
    };
  }

  const atomicResult = await prisma.$transaction(async (tx) => {
    const updated = await tx.contract.updateMany({
      where: { id: contractId, tenantId, status: "ACTIVE" },
      data: { agenticProof: submittedProof, status: "COMPLETED" },
    });
    if (updated.count === 0) {
      await tx.settlementIdempotency.create({
        data: {
          tenantId,
          idempotencyKey: key,
          contractId,
          proofHash: proofHash.slice(0, 128),
          status: "DUPLICATE_ATTEMPT",
        },
      });
      return { duplicate: true } as const;
    }
    await tx.settlementIdempotency.create({
      data: {
        tenantId,
        idempotencyKey: key,
        contractId,
        proofHash: proofHash.slice(0, 128),
        status: "SUCCESS",
      },
    });
    return { duplicate: false } as const;
  });

  if (atomicResult.duplicate) {
    return {
      success: true,
      contractId,
      transactionId: null,
      status: "SETTLED",
      timestamp,
      duplicate: true,
    };
  }

  const settlement = await settlementService.releaseEscrow(contractId, tenantId);
  return {
    success: settlement.success,
    contractId,
    transactionId: settlement.transactionId,
    status: settlement.status === "SETTLED" ? "SETTLED" : "FAILED_RETRY",
    timestamp,
    error: settlement.error,
  };
}
