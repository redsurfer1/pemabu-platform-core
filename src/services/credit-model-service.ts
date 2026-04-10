/**
 * Credit model for fair lending stress tests. Every decision produces a Model Card (reasonCode)
 * and is stored in CreditDecision. Decisions are based ONLY on financial profile — protected
 * class metadata is stored for bias auditing but must not affect the outcome.
 */

import { prisma } from "../lib/prisma";
import { randomUUID } from "node:crypto";

export interface FinancialProfile {
  incomeUsd: number;
  debtToIncomePct?: number;
  creditScore?: number;
}

export interface ProtectedClassMetadata {
  /** Simulated for bias testing only */
  race?: string;
  gender?: string;
  ageBand?: string;
}

export interface CreditApplication {
  applicationId: string;
  financialProfile: FinancialProfile;
  protectedClassMetadata?: ProtectedClassMetadata;
}

export interface CreditResult {
  applicationId: string;
  approved: boolean;
  reasonCode: string;
}

const INCOME_THRESHOLD_USD = 30_000;
const REASON_APPROVED = "INCOME_THRESHOLD_MET";
const REASON_DENIED = "INCOME_BELOW_THRESHOLD";

function hashProfile(p: FinancialProfile): string {
  return `income=${p.incomeUsd};dti=${p.debtToIncomePct ?? 0};cs=${p.creditScore ?? 0}`;
}

/**
 * Evaluate a single application. Decision is based ONLY on financialProfile (fair lending).
 * Protected class is stored for audit but not used. Every decision creates a CreditDecision row with reasonCode.
 */
export async function evaluateCredit(app: CreditApplication): Promise<CreditResult> {
  const { incomeUsd } = app.financialProfile;
  const approved = incomeUsd >= INCOME_THRESHOLD_USD;
  const reasonCode = approved ? REASON_APPROVED : REASON_DENIED;

  await prisma.creditDecision.create({
    data: {
      id: randomUUID(),
      applicationId: app.applicationId,
      approved,
      reasonCode,
      financialProfileHash: hashProfile(app.financialProfile),
      protectedClassMetadata: app.protectedClassMetadata ?? undefined,
    },
  });

  return { applicationId: app.applicationId, approved, reasonCode };
}

/**
 * Run many applications and return approval rate per protected-class group (for variance calc).
 */
export async function runBiasStressTest(
  applications: CreditApplication[]
): Promise<{ decisions: CreditResult[]; approvalRatesByGroup: Map<string, number> }> {
  const decisions: CreditResult[] = [];
  const groupKey = (a: CreditApplication) =>
    [a.protectedClassMetadata?.race ?? "unknown", a.protectedClassMetadata?.gender ?? "unknown", a.protectedClassMetadata?.ageBand ?? "unknown"].join("|");
  const groupApproved = new Map<string, number>();
  const groupTotal = new Map<string, number>();

  for (const app of applications) {
    const result = await evaluateCredit(app);
    decisions.push(result);
    const key = groupKey(app);
    groupTotal.set(key, (groupTotal.get(key) ?? 0) + 1);
    if (result.approved) groupApproved.set(key, (groupApproved.get(key) ?? 0) + 1);
  }

  const approvalRatesByGroup = new Map<string, number>();
  for (const [key, total] of groupTotal) {
    const approved = groupApproved.get(key) ?? 0;
    approvalRatesByGroup.set(key, total > 0 ? approved / total : 0);
  }
  return { decisions, approvalRatesByGroup };
}

export function computeApprovalVariance(approvalRatesByGroup: Map<string, number>): number {
  const rates = [...approvalRatesByGroup.values()];
  if (rates.length <= 1) return 0;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return (max - min) * 100; // as percentage
}

export function generateModelBiasReport(
  approvalRatesByGroup: Map<string, number>,
  variancePct: number,
  passed: boolean
): string {
  const lines: string[] = [
    "# Model Bias Report (Fair Lending Stress Test)",
    `Generated: ${new Date().toISOString()}`,
    `Variance (max - min approval rate): ${variancePct.toFixed(4)}%`,
    `Result: ${passed ? "PASS" : "FAIL"} (threshold 2%)`,
    "",
    "## Approval rate by group",
  ];
  for (const [group, rate] of approvalRatesByGroup) {
    lines.push(`- ${group}: ${(rate * 100).toFixed(2)}%`);
  }
  return lines.join("\n");
}
