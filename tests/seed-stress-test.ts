/**
 * Seed data for idempotency stress test.
 * Run with: npx tsx tests/seed-stress-test.ts
 * Requires: DATABASE_URL. Uses a raw PrismaClient (no tenant extension) so RLS may block
 * inserts unless the DB user is table owner or RLS is disabled for tests.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const STRESS_TENANT_A_ID = "11111111-1111-4111-a111-111111111111";
export const STRESS_TENANT_B_ID = "22222222-2222-4222-a222-222222222222";
export const STRESS_CONTRACT_ID = "33333333-3333-4333-a333-333333333333";
export const STRESS_EMPLOYER_ID = "44444444-4444-4444-a444-444444444444";
export const STRESS_EMPLOYEE_ID = "55555555-5555-4555-a555-555555555555";

async function seed() {
  await prisma.tenant.upsert({
    where: { id: STRESS_TENANT_A_ID },
    create: { id: STRESS_TENANT_A_ID, name: "Stress Test Tenant A" },
    update: { name: "Stress Test Tenant A" },
  });
  await prisma.tenant.upsert({
    where: { id: STRESS_TENANT_B_ID },
    create: { id: STRESS_TENANT_B_ID, name: "Stress Test Tenant B" },
    update: { name: "Stress Test Tenant B" },
  });

  await prisma.user.upsert({
    where: { id: STRESS_EMPLOYER_ID },
    create: {
      id: STRESS_EMPLOYER_ID,
      tenantId: STRESS_TENANT_A_ID,
      email: "employer@stress-a.test",
      role: "HUMAN",
      profileStatus: "active",
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: STRESS_EMPLOYEE_ID },
    create: {
      id: STRESS_EMPLOYEE_ID,
      tenantId: STRESS_TENANT_A_ID,
      email: "employee@stress-a.test",
      role: "AI_AGENT",
      profileStatus: "active",
      walletAddress: "0xstressemployee",
    },
    update: { walletAddress: "0xstressemployee" },
  });

  await prisma.contract.upsert({
    where: { id: STRESS_CONTRACT_ID },
    create: {
      id: STRESS_CONTRACT_ID,
      tenantId: STRESS_TENANT_A_ID,
      employerId: STRESS_EMPLOYER_ID,
      employeeId: STRESS_EMPLOYEE_ID,
      status: "ACTIVE",
      escrowAmount: 100,
    },
    update: { status: "ACTIVE", escrowAmount: 100 },
  });

  console.log("Stress test seed OK:", { STRESS_TENANT_A_ID, STRESS_TENANT_B_ID, STRESS_CONTRACT_ID });
}

seed()
  .catch((e) => {
    console.error("Seed failed (RLS may block; run as table owner or disable RLS for test DB):", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
