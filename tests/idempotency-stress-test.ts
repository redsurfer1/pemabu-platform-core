/**
 * Double-spend proof & idempotency stress test (Task 3 + 4).
 * Run: npx tsx tests/idempotency-stress-test.ts
 * Prereq: npm run db:generate, DB migrated, then npx tsx tests/seed-stress-test.ts
 *
 * Success criteria:
 * - Race: exactly one request returns success true + SETTLED; others duplicate or 400.
 * - Cross-tenant: 403 or "Contract not found" when Tenant_B tries to settle Tenant_A's contract.
 * - Immutable ledger: exactly one LedgerEntry for the settled contract after the race.
 */

import { runWithTenantAsync } from "../src/lib/tenant-context";
import { prisma } from "../src/lib/prisma";
import { verifyAgenticProof } from "../src/services/verification-service";
import {
  STRESS_TENANT_A_ID,
  STRESS_TENANT_B_ID,
  STRESS_CONTRACT_ID,
} from "./seed-stress-test";

const AGENTIC_PROOF = "a".repeat(64); // Valid SHA-256 hex length
const RACE_CONCURRENCY = 5;

async function raceConditionTest(): Promise<{ passed: boolean; detail: string }> {
  const results = await Promise.all(
    Array.from({ length: RACE_CONCURRENCY }, () =>
      runWithTenantAsync(
        { tenantId: STRESS_TENANT_A_ID },
        () =>
          verifyAgenticProof(STRESS_CONTRACT_ID, AGENTIC_PROOF, STRESS_TENANT_A_ID)
      )
    )
  );

  const settled = results.filter((r) => r.success && r.status === "SETTLED");
  const duplicates = results.filter((r) => r.duplicate === true);
  const failed = results.filter((r) => !r.success);

  const exactlyOneSettled = settled.length === 1;
  const othersDuplicateOr400 =
    duplicates.length + failed.length >= RACE_CONCURRENCY - 1 &&
    settled.length + duplicates.length + failed.length === RACE_CONCURRENCY;

  const passed = exactlyOneSettled && othersDuplicateOr400;
  return {
    passed,
    detail: `Settled: ${settled.length}, Duplicates: ${duplicates.length}, Failed: ${failed.length}. Results: ${JSON.stringify(results.map((r) => ({ success: r.success, status: r.status, duplicate: r.duplicate })))}`,
  };
}

async function crossTenantLeakTest(): Promise<{ passed: boolean; detail: string }> {
  const result = await runWithTenantAsync(
    { tenantId: STRESS_TENANT_B_ID },
    () =>
      verifyAgenticProof(STRESS_CONTRACT_ID, AGENTIC_PROOF, STRESS_TENANT_B_ID)
  );

  const contractNotFound =
    !result.success && (result.error === "Contract not found" || result.error?.toLowerCase().includes("not found"));
  const passed = contractNotFound;
  return {
    passed,
    detail: `Expected "Contract not found" or 403. Got: success=${result.success}, error=${result.error}`,
  };
}

async function immutableLedgerTest(): Promise<{ passed: boolean; detail: string }> {
  const entries = await runWithTenantAsync(
    { tenantId: STRESS_TENANT_A_ID },
    async () => {
      const list = await prisma.ledgerEntry.findMany({
        where: { tenantId: STRESS_TENANT_A_ID },
      });
      return list.filter(
        (e) =>
          (e.metadata as Record<string, unknown> | null)?.contractId ===
          STRESS_CONTRACT_ID
      );
    }
  );

  const count = entries.length;
  const passed = count === 1;
  return {
    passed,
    detail: `Expected 1 LedgerEntry for contract ${STRESS_CONTRACT_ID}. Found: ${count}.`,
  };
}

async function main() {
  console.log("PEMABU Idempotency & Double-Spend Stress Test\n");

  const envOk =
    process.env.DATABASE_URL &&
    process.env.FLOMISMA_BASE_URL != null &&
    process.env.JWT_SECRET_OR_PUBLIC_KEY != null;
  if (!envOk) {
    console.warn("Warning: DATABASE_URL, FLOMISMA_*, JWT_* should be set. Proceeding anyway for local test.\n");
  }

  let allPassed = true;

  console.log("1. Race condition test (5 simultaneous settle requests, same contractId + proof)...");
  const race = await raceConditionTest();
  console.log(race.passed ? "   PASS" : "   FAIL:", race.detail);
  if (!race.passed) allPassed = false;

  console.log("\n2. Cross-tenant leak test (Tenant_B tries to settle Tenant_A contract)...");
  const cross = await crossTenantLeakTest();
  console.log(cross.passed ? "   PASS" : "   FAIL:", cross.detail);
  if (!cross.passed) allPassed = false;

  console.log("\n3. Immutable ledger check (exactly one LedgerEntry for the transaction)...");
  const ledger = await immutableLedgerTest();
  console.log(ledger.passed ? "   PASS" : "   FAIL:", ledger.detail);
  if (!ledger.passed) allPassed = false;

  console.log("\n---");
  if (allPassed) {
    console.log("All tests PASSED. prisma.$transaction block successfully caught the race condition; RLS enforces cross-tenant isolation; ledger is single-entry.");
  } else {
    console.log("One or more tests FAILED.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Test run failed:", e);
  process.exit(1);
});
