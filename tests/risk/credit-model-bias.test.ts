/**
 * AI Bias & Fair Lending — Model Stress Test.
 * 1) Run 1,000 synthetic applications with identical financial profile, varied protected class.
 * 2) Approval variance > 2% fails the build and generates a Model Bias Report.
 * 3) Every decision must have a Model Card (reasonCode) in CreditDecision.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import {
  runBiasStressTest,
  computeApprovalVariance,
  generateModelBiasReport,
  type CreditApplication,
  type FinancialProfile,
} from "../../src/services/credit-model-service";
import * as fs from "node:fs";
import * as path from "node:path";

const BIAS_THRESHOLD_PCT = 2;
const NUM_APPLICATIONS = 1000;

const BASE_FINANCIAL: FinancialProfile = {
  incomeUsd: 50_000,
  debtToIncomePct: 25,
  creditScore: 700,
};

const PROTECTED_CLASS_VARIANTS: Array<{ race?: string; gender?: string; ageBand?: string }> = [
  { race: "A", gender: "X", ageBand: "25-34" },
  { race: "B", gender: "Y", ageBand: "35-44" },
  { race: "C", gender: "X", ageBand: "45-54" },
  { race: "A", gender: "Y", ageBand: "55-64" },
  { race: "B", gender: "X", ageBand: "18-24" },
  { race: "C", gender: "Y", ageBand: "65+" },
];

function buildApplications(): CreditApplication[] {
  const applications: CreditApplication[] = [];
  for (let i = 0; i < NUM_APPLICATIONS; i++) {
    const meta = PROTECTED_CLASS_VARIANTS[i % PROTECTED_CLASS_VARIANTS.length];
    applications.push({
      applicationId: `bias-stress-${Date.now()}-${i}`,
      financialProfile: { ...BASE_FINANCIAL },
      protectedClassMetadata: { ...meta },
    });
  }
  return applications;
}

describe("Credit Model Bias & Fair Lending Stress Test", () => {
  beforeAll(async () => {
    await prisma.creditDecision.deleteMany({
      where: { applicationId: { startsWith: "bias-stress-" } },
    });
  });

  afterAll(async () => {
    await prisma.creditDecision.deleteMany({
      where: { applicationId: { startsWith: "bias-stress-" } },
    });
    await prisma.$disconnect();
  });

  it("runs 1,000 synthetic applications with identical financials and varied protected class", async () => {
    const applications = buildApplications();
    const { decisions, approvalRatesByGroup } = await runBiasStressTest(applications);

    expect(decisions.length).toBe(NUM_APPLICATIONS);

    const variancePct = computeApprovalVariance(approvalRatesByGroup);
    const passed = variancePct <= BIAS_THRESHOLD_PCT;

    const report = generateModelBiasReport(approvalRatesByGroup, variancePct, passed);
    const reportPath = path.join(process.cwd(), "Model-Bias-Report.md");
    fs.writeFileSync(reportPath, report, "utf8");

    expect(variancePct, `Approval variance ${variancePct.toFixed(4)}% exceeds ${BIAS_THRESHOLD_PCT}%. Model Bias Report: ${reportPath}`).toBeLessThanOrEqual(BIAS_THRESHOLD_PCT);
  });

  it("every decision has a Model Card (reasonCode) in CreditDecision", async () => {
    const applications = buildApplications();
    await runBiasStressTest(applications);

    const ids = applications.map((a) => a.applicationId);
    const records = await prisma.creditDecision.findMany({
      where: { applicationId: { in: ids } },
      select: { applicationId: true, reasonCode: true },
    });

    expect(records.length).toBe(applications.length);
    for (const r of records) {
      expect(r.reasonCode).toBeDefined();
      expect(typeof r.reasonCode).toBe("string");
      expect(r.reasonCode.length).toBeGreaterThan(0);
      expect(["INCOME_THRESHOLD_MET", "INCOME_BELOW_THRESHOLD"]).toContain(r.reasonCode);
    }
  });
});
