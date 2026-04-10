/**
 * Agentic Settlement – speed limit + HITL.
 * If agenticProof valid AND amount < threshold → FlomismaService.releaseEscrow.
 * If amount >= threshold → route to ApprovalQueue.
 */

import { prisma } from "../../lib/prisma";
import { getThresholds, isWithinAutoSettlementLimit, enqueueApproval } from "../governance-service";
import { settlementService } from "../settlement-service";
import { verifyAgenticProof } from "../verification-service";

export interface SettlementAutomationResult {
  action: "AUTO_SETTLED" | "QUEUED_FOR_APPROVAL";
  contractId: string;
  queueId?: string;
  settlementResult?: { success: boolean; transactionId: string | null; status: string };
}

/**
 * Runs settlement through governance: auto-settle if below threshold, else enqueue.
 * Assumes proof is already validated (caller may have run verifyAgenticProof format check).
 */
export async function runSettlementWithGovernance(
  contractId: string,
  submittedProof: string,
  tenantId: string
): Promise<SettlementAutomationResult> {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: { employee: true },
  });
  if (!contract) {
    throw new Error("Contract not found");
  }
  if (contract.status !== "ACTIVE") {
    throw new Error(`Contract not ACTIVE: ${contract.status}`);
  }
  const amountUsd = Number(contract.escrowAmount);
  const withinLimit = await isWithinAutoSettlementLimit(tenantId, amountUsd);
  if (withinLimit) {
    const result = await verifyAgenticProof(contractId, submittedProof, tenantId);
    if (!result.success) {
      throw new Error(result.error ?? "Verification failed");
    }
    const settlement = await settlementService.releaseEscrow(contractId, tenantId);
    return {
      action: "AUTO_SETTLED",
      contractId,
      settlementResult: {
        success: settlement.success,
        transactionId: settlement.transactionId,
        status: settlement.status,
      },
    };
  }
  const queueId = await enqueueApproval(tenantId, "SETTLEMENT_OVER_THRESHOLD", {
    contractId,
    amountUsd,
    agenticProof: submittedProof,
    employeeId: contract.employeeId,
  });
  return {
    action: "QUEUED_FOR_APPROVAL",
    contractId,
    queueId,
  };
}

/**
 * Process an approved queue item: execute settlement for SETTLEMENT_OVER_THRESHOLD.
 */
export async function executeApprovedSettlement(queueId: string, tenantId: string): Promise<void> {
  const item = await prisma.approvalQueue.findFirst({
    where: { id: queueId, tenantId, status: "APPROVED", actionType: "SETTLEMENT_OVER_THRESHOLD" },
  });
  if (!item) {
    throw new Error("Approval queue item not found or not approved");
  }
  const payload = item.payload as { contractId: string; agenticProof: string };
  await verifyAgenticProof(payload.contractId, payload.agenticProof, tenantId);
  await settlementService.releaseEscrow(payload.contractId, tenantId);
}
