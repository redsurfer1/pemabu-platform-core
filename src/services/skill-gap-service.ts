/**
 * Skill-Gap Loop – when a contract is marked FAILED, create LearnToEarn suggestion.
 */

import { prisma } from "../lib/prisma";

/**
 * Call when a contract transitions to FAILED. Creates a LearnToEarn suggestion for the employee.
 */
export async function onContractFailed(contractId: string, tenantId: string): Promise<void> {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: { employee: true },
  });
  if (!contract || contract.status !== "FAILED") return;
  await prisma.learnToEarnSuggestion.create({
    data: {
      userId: contract.employeeId,
      contractId,
      suggestionType: "EXAM",
      metadata: {
        reason: "contract_failed",
        contractId,
        suggestedAt: new Date().toISOString(),
      },
    },
  });
}

/**
 * List LearnToEarn suggestions for a user.
 */
export async function getSuggestionsForUser(userId: string): Promise<unknown[]> {
  return prisma.learnToEarnSuggestion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
