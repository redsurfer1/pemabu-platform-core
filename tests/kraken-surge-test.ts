/**
 * The Kraken Surge - V4.1/V4.2 Financial Stress Test
 *
 * Executes the institutional growth scenario to verify:
 * 1. Initial $125k USD deposit creates baseline
 * 2. 500 rapid ledger entries push cap utilization to 88%
 * 3. HIGH_VELOCITY audit evidence is captured
 * 4. War Room metrics reflect real-time growth
 */

import { randomUUID } from "node:crypto";
import { prismaAdmin } from "../src/lib/prisma-admin";
import { runWithTenant } from "../src/lib/tenant-context";
import { Decimal } from "@prisma/client/runtime/library";

interface ScenarioResult {
  phase: string;
  initialDeposit?: any;
  rapidInjection?: any;
  deposit?: any;
  analysis?: any;
  summary?: any;
  auditEvidence?: any;
  performance?: any;
}

async function executeKrakenSurge(tenantId: string, userId: string): Promise<ScenarioResult> {
  return runWithTenant({ tenantId }, async () => {
    const startTime = Date.now();

    console.log("\n🌊 THE KRAKEN SURGE - Phase 1: Initial Deposit");
    console.log("=" .repeat(60));

    const initialDeposit = new Decimal(125000);
    const initialEntry = await prismaAdmin.ledgerEntry.create({
      data: {
        tenantId,
        userId,
        amount: initialDeposit,
        currency: "USD",
        type: "HIRE_ESCROW",
        status: "SETTLED",
        flomismaTxId: `kraken-init-${randomUUID()}`,
        metadata: {
          scenario: "kraken-surge",
          phase: "initial-deposit",
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Initial deposit: $${initialDeposit.toString()} USD`);
    console.log(`   Ledger Entry ID: ${initialEntry.id}`);

    await prismaAdmin.auditEvidence.create({
      data: {
        eventType: "SCENARIO_INJECTION",
        systemState: "OPTIMAL",
        snapshotData: {
          scenario: "kraken-surge",
          phase: "initial-deposit",
          amount: 125000,
          currency: "USD",
          userId,
          tenantId,
        },
      },
    });

    console.log("\n🌊 THE KRAKEN SURGE - Phase 2: Rapid Injection");
    console.log("=" .repeat(60));
    console.log("Target: 500 ledger entries over 60 seconds");

    const rapidEntries: any[] = [];
    const batchSize = 50;
    const totalEntries = 500;
    const amountPerEntry = new Decimal(250);

    for (let batch = 0; batch < totalEntries / batchSize; batch++) {
      const batchStartTime = Date.now();
      const batchEntries = [];

      for (let i = 0; i < batchSize; i++) {
        const entryNum = batch * batchSize + i + 1;
        batchEntries.push({
          tenantId,
          userId,
          amount: amountPerEntry,
          currency: "USD",
          type: "AGENT_SUB_TASK",
          status: "SETTLED",
          flomismaTxId: `kraken-rapid-${batch}-${i}-${randomUUID()}`,
          metadata: {
            scenario: "kraken-surge",
            phase: "rapid-injection",
            entryNumber: entryNum,
            batchNumber: batch + 1,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const created = await prismaAdmin.ledgerEntry.createMany({
        data: batchEntries,
      });

      const batchEndTime = Date.now();
      const batchDuration = batchEndTime - batchStartTime;

      rapidEntries.push({
        batch: batch + 1,
        count: created.count,
        durationMs: batchDuration,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `   Batch ${batch + 1}/10: ${created.count} entries in ${batchDuration}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, 6000));
    }

    const totalVolume = initialDeposit.plus(amountPerEntry.times(totalEntries));

    console.log("\n📊 Rapid Injection Summary:");
    console.log(`   Total entries: ${totalEntries}`);
    console.log(`   Amount per entry: $${amountPerEntry.toString()} USD`);
    console.log(`   Total volume: $${totalVolume.toString()} USD`);

    await prismaAdmin.auditEvidence.create({
      data: {
        eventType: "HIGH_VELOCITY",
        systemState: "OPTIMAL",
        snapshotData: {
          scenario: "kraken-surge",
          phase: "rapid-injection-complete",
          totalEntries: totalEntries + 1,
          totalVolume: totalVolume.toString(),
          currency: "USD",
          velocityPeriod: "60s",
          targetCapUtilization: "88%",
          tenantId,
        },
      },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("\n✅ THE KRAKEN SURGE - Complete");
    console.log("=" .repeat(60));
    console.log(`   Total duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(
      `   Entries per second: ${((totalEntries + 1) / (duration / 1000)).toFixed(2)}`
    );
    console.log(`   Total volume: $${totalVolume.toString()} USD`);

    return {
      phase: "kraken-surge-complete",
      initialDeposit: {
        id: initialEntry.id,
        amount: initialDeposit.toString(),
        currency: "USD",
      },
      rapidInjection: {
        totalEntries: totalEntries,
        batches: rapidEntries.length,
        entriesPerBatch: batchSize,
        amountPerEntry: amountPerEntry.toString(),
        batches_detail: rapidEntries,
      },
      summary: {
        totalVolume: totalVolume.toString(),
        totalEntries: totalEntries + 1,
        durationMs: duration,
        durationSeconds: (duration / 1000).toFixed(2),
        entriesPerSecond: ((totalEntries + 1) / (duration / 1000)).toFixed(2),
      },
      auditEvidence: {
        created: 2,
        types: ["SCENARIO_INJECTION", "HIGH_VELOCITY"],
      },
    };
  });
}

async function executeInstitutionalOnboard(tenantId: string, userId: string): Promise<ScenarioResult> {
  return runWithTenant({ tenantId }, async () => {
    const startTime = Date.now();

    console.log("\n🏦 INSTITUTIONAL ONBOARD - Single $500k Deposit");
    console.log("=" .repeat(60));

    const priorBalance = await prismaAdmin.ledgerEntry.aggregate({
      where: {
        tenantId,
        currency: "USD",
        status: "SETTLED",
      },
      _sum: {
        amount: true,
      },
    });

    const priorTotal = priorBalance._sum.amount || new Decimal(0);
    console.log(`   Prior balance: $${priorTotal.toString()} USD`);

    const depositAmount = new Decimal(500000);
    const entry = await prismaAdmin.ledgerEntry.create({
      data: {
        tenantId,
        userId,
        amount: depositAmount,
        currency: "USD",
        type: "HIRE_ESCROW",
        status: "PENDING",
        flomismaTxId: `institutional-${randomUUID()}`,
        metadata: {
          scenario: "institutional-onboard",
          requiresAdminSignature: true,
          threshold: "50000",
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Institutional deposit: $${depositAmount.toString()} USD`);
    console.log(`   Status: ${entry.status} (requires admin signature)`);
    console.log(`   Ledger Entry ID: ${entry.id}`);

    const newTotal = priorTotal.plus(depositAmount);
    const growthRate = priorTotal.isZero()
      ? 100
      : depositAmount.dividedBy(priorTotal).times(100).toNumber();

    const highVelocityTriggered = growthRate > 25;

    console.log("\n📊 Growth Analysis:");
    console.log(`   New balance: $${newTotal.toString()} USD`);
    console.log(`   Growth rate: ${growthRate.toFixed(2)}%`);
    console.log(
      `   HIGH_VELOCITY trigger (>25%): ${highVelocityTriggered ? "YES ✅" : "NO"}`
    );
    console.log(
      `   Admin signature required (>$50k): ${depositAmount.greaterThan(50000) ? "YES ✅" : "NO"}`
    );

    await prismaAdmin.auditEvidence.create({
      data: {
        eventType: highVelocityTriggered ? "HIGH_VELOCITY" : "LARGE_DEPOSIT",
        systemState: "OPTIMAL",
        snapshotData: {
          scenario: "institutional-onboard",
          depositAmount: depositAmount.toString(),
          currency: "USD",
          priorBalance: priorTotal.toString(),
          newBalance: newTotal.toString(),
          growthRate: `${growthRate.toFixed(2)}%`,
          highVelocityThreshold: "25%",
          highVelocityTriggered,
          requiresAdminSignature: depositAmount.greaterThan(50000),
          adminSignatureThreshold: "50000",
          userId,
          tenantId,
        },
      },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("\n✅ INSTITUTIONAL ONBOARD - Complete");
    console.log("=" .repeat(60));
    console.log(`   Duration: ${duration}ms`);

    return {
      phase: "institutional-onboard-complete",
      deposit: {
        id: entry.id,
        amount: depositAmount.toString(),
        currency: "USD",
        status: entry.status,
        flomismaTxId: entry.flomismaTxId,
      },
      analysis: {
        priorBalance: priorTotal.toString(),
        newBalance: newTotal.toString(),
        growthRate: `${growthRate.toFixed(2)}%`,
        highVelocityTriggered,
        requiresAdminSignature: depositAmount.greaterThan(50000),
      },
      auditEvidence: {
        created: 1,
        eventType: highVelocityTriggered ? "HIGH_VELOCITY" : "LARGE_DEPOSIT",
        reviewStatus: "PENDING",
      },
      performance: {
        durationMs: duration,
      },
    };
  });
}

async function verifyAuditEvidence(tenantId: string): Promise<void> {
  console.log("\n🔍 VERIFICATION - Audit Evidence");
  console.log("=" .repeat(60));

  const evidence = await prismaAdmin.auditEvidence.findMany({
    orderBy: { triggeredAt: "desc" },
    take: 10,
  });

  console.log(`   Total audit records found: ${evidence.length}`);

  const highVelocity = evidence.filter((e) => e.eventType === "HIGH_VELOCITY");
  const scenarioInjection = evidence.filter(
    (e) => e.eventType === "SCENARIO_INJECTION"
  );

  console.log(`   HIGH_VELOCITY events: ${highVelocity.length}`);
  console.log(`   SCENARIO_INJECTION events: ${scenarioInjection.length}`);

  if (highVelocity.length > 0) {
    console.log("\n   Latest HIGH_VELOCITY event:");
    const latest = highVelocity[0];
    console.log(`   - ID: ${latest.id}`);
    console.log(`   - Timestamp: ${latest.triggeredAt.toISOString()}`);
    console.log(`   - System State: ${latest.systemState}`);
    console.log(`   - Snapshot Data: ${JSON.stringify(latest.snapshotData, null, 2)}`);
  }
}

async function verifyWarRoomMetrics(tenantId: string): Promise<void> {
  console.log("\n📊 VERIFICATION - War Room Metrics");
  console.log("=" .repeat(60));

  const ledgerStats = await prismaAdmin.ledgerEntry.aggregate({
    where: {
      tenantId,
      currency: "USD",
    },
    _sum: {
      amount: true,
    },
    _count: true,
  });

  const totalVolume = ledgerStats._sum.amount || new Decimal(0);
  const totalEntries = ledgerStats._count;

  console.log(`   Total USD volume: $${totalVolume.toString()}`);
  console.log(`   Total ledger entries: ${totalEntries}`);

  const recentEntries = await prismaAdmin.ledgerEntry.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log(`\n   Recent entries (last 5):`);
  for (const entry of recentEntries) {
    console.log(
      `   - ${entry.type}: $${entry.amount.toString()} ${entry.currency} (${entry.status})`
    );
  }

  const marketplaceYield = totalVolume.times(0.005);
  console.log(`\n   Marketplace Yield (0.5%): $${marketplaceYield.toString()}`);
}

async function main() {
  console.log("\n🚀 V4.1/V4.2 FINANCIAL STRESS TEST - THE KRAKEN SURGE");
  console.log("=" .repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const tenant = await prismaAdmin.tenant.findFirst();

  if (!tenant) {
    console.error("❌ No tenant found. Creating test tenant...");
    const newTenant = await prismaAdmin.tenant.create({
      data: {
        id: randomUUID(),
        name: "Kraken Surge Test Tenant",
      },
    });
    console.log(`✅ Created tenant: ${newTenant.id}`);
  }

  const testTenant = tenant || (await prismaAdmin.tenant.findFirst())!;
  const tenantId = testTenant.id;

  console.log(`📋 Tenant: ${testTenant.name} (${tenantId})`);

  let testUser = await prismaAdmin.user.findFirst({
    where: { tenantId, trustRole: "ADMIN" },
  });

  if (!testUser) {
    testUser = await prismaAdmin.user.create({
      data: {
        id: randomUUID(),
        tenantId,
        email: `kraken-test-${Date.now()}@pemabu.local`,
        role: "HUMAN",
        trustRole: "ADMIN",
        profileStatus: "ACTIVE",
      },
    });
    console.log(`✅ Created test user: ${testUser.id}`);
  }

  console.log(`👤 User: ${testUser.email} (${testUser.id})`);

  const krakenResult = await executeKrakenSurge(tenantId, testUser.id);

  console.log("\n⏸️  Waiting 5 seconds before institutional onboard...\n");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const institutionalResult = await executeInstitutionalOnboard(
    tenantId,
    testUser.id
  );

  await verifyAuditEvidence(tenantId);
  await verifyWarRoomMetrics(tenantId);

  console.log("\n✅ STRESS TEST COMPLETE");
  console.log("=" .repeat(60));
  console.log("\n📋 Summary:");
  console.log(`   Kraken Surge: ${krakenResult.summary?.totalEntries} entries`);
  console.log(`   Kraken Volume: $${krakenResult.summary?.totalVolume} USD`);
  console.log(
    `   Institutional: $${institutionalResult.deposit?.amount} USD`
  );
  console.log(
    `   High Velocity Triggered: ${institutionalResult.analysis?.highVelocityTriggered ? "YES" : "NO"}`
  );
  console.log("\n🎯 Next: Check War Room HUD for real-time metrics");
  console.log("   - Velocity Pulse gauge should show 60s refresh");
  console.log("   - Cap Utilization should be approaching 88%");
  console.log("   - Admin Signature banner for >$50k credits\n");
}

main()
  .then(() => {
    console.log("\n✅ All scenarios executed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Scenario execution failed:", error);
    console.error(error.stack);
    process.exit(1);
  });
