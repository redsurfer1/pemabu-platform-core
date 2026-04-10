/**
 * Scenario Injection API - V4.1/V4.2 Financial Stress Testing
 *
 * Provides programmatic stress test scenarios for War Room validation.
 * - The Kraken Surge: Rapid institutional growth to 88% cap utilization
 * - High-velocity deposit triggers for audit evidence
 * - Real-time HUD metric validation
 */

import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/src/lib/prisma-admin";
import { runWithTenant } from "@/src/lib/tenant-context";
import { Decimal } from "@prisma/client/runtime/library";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

interface ScenarioRequest {
  scenario: "kraken-surge" | "institutional-onboard";
  tenantId: string;
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScenarioRequest;
    const { scenario, tenantId, userId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    let result: any;

    switch (scenario) {
      case "kraken-surge":
        result = await executeKrakenSurge(tenantId, userId);
        break;
      case "institutional-onboard":
        result = await executeInstitutionalOnboard(tenantId, userId);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown scenario: ${scenario}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      scenario,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Scenario execution error:", error);
    return NextResponse.json(
      {
        error: "Scenario execution failed",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * The Kraken Surge Scenario
 * 1. Initial $125k USD deposit
 * 2. Inject 500 mock ledger entries rapidly
 * 3. Target: 88% cap utilization to trigger Amber Warning
 */
async function executeKrakenSurge(tenantId: string, userId?: string) {
  return runWithTenant({ tenantId }, async () => {
    const startTime = Date.now();

    const tenant = await prismaAdmin.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    let testUserId = userId;
    if (!testUserId) {
      const testUser = await prismaAdmin.user.findFirst({
        where: { tenantId, trustRole: "ADMIN" },
      });

      if (!testUser) {
        const newUser = await prismaAdmin.user.create({
          data: {
            id: randomUUID(),
            tenantId,
            email: `stress-test-${Date.now()}@pemabu.local`,
            role: "HUMAN",
            trustRole: "ADMIN",
            profileStatus: "ACTIVE",
          },
        });
        testUserId = newUser.id;
      } else {
        testUserId = testUser.id;
      }
    }

    const initialDeposit = new Decimal(125000);
    const initialEntry = await prismaAdmin.ledgerEntry.create({
      data: {
        tenantId,
        userId: testUserId,
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

    await prismaAdmin.auditEvidence.create({
      data: {
        eventType: "SCENARIO_INJECTION",
        systemState: "OPTIMAL",
        snapshotData: {
          scenario: "kraken-surge",
          phase: "initial-deposit",
          amount: 125000,
          currency: "USD",
          userId: testUserId,
          tenantId,
        },
      },
    });

    const rapidEntries: any[] = [];
    const batchSize = 50;
    const totalEntries = 500;
    const amountPerEntry = new Decimal(250);

    for (let batch = 0; batch < totalEntries / batchSize; batch++) {
      const batchEntries = [];

      for (let i = 0; i < batchSize; i++) {
        const entryNum = batch * batchSize + i + 1;
        batchEntries.push({
          tenantId,
          userId: testUserId,
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

      rapidEntries.push({
        batch: batch + 1,
        count: created.count,
        timestamp: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 6000 / 10));
    }

    const totalVolume = initialDeposit.plus(amountPerEntry.times(totalEntries));

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
      },
      summary: {
        totalVolume: totalVolume.toString(),
        totalEntries: totalEntries + 1,
        durationMs: duration,
        entriesPerSecond: ((totalEntries + 1) / (duration / 1000)).toFixed(2),
      },
      auditEvidence: {
        created: 2,
        types: ["SCENARIO_INJECTION", "HIGH_VELOCITY"],
      },
    };
  });
}

/**
 * Institutional Onboard Scenario
 * 1. Single $500k USD deposit
 * 2. Triggers HIGH_VELOCITY event (>25% growth)
 * 3. Requires admin signature for >$50k credit
 */
async function executeInstitutionalOnboard(tenantId: string, userId?: string) {
  return runWithTenant({ tenantId }, async () => {
    const startTime = Date.now();

    const tenant = await prismaAdmin.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    let testUserId = userId;
    if (!testUserId) {
      const testUser = await prismaAdmin.user.findFirst({
        where: { tenantId, trustRole: "ADMIN" },
      });

      if (!testUser) {
        const newUser = await prismaAdmin.user.create({
          data: {
            id: randomUUID(),
            tenantId,
            email: `institutional-${Date.now()}@pemabu.local`,
            role: "HUMAN",
            trustRole: "ADMIN",
            profileStatus: "ACTIVE",
          },
        });
        testUserId = newUser.id;
      } else {
        testUserId = testUser.id;
      }
    }

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

    const depositAmount = new Decimal(500000);
    const entry = await prismaAdmin.ledgerEntry.create({
      data: {
        tenantId,
        userId: testUserId,
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

    const newTotal = priorTotal.plus(depositAmount);
    const growthRate = priorTotal.isZero()
      ? 100
      : depositAmount.dividedBy(priorTotal).times(100).toNumber();

    const highVelocityTriggered = growthRate > 25;

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
          userId: testUserId,
          tenantId,
        },
      },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

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

export async function GET() {
  return NextResponse.json({
    scenarios: [
      {
        id: "kraken-surge",
        name: "The Kraken Surge",
        description:
          "Rapid institutional growth: $125k initial + 500 rapid entries over 60s",
        targets: [
          "88% cap utilization",
          "Amber Warning trigger",
          "HIGH_VELOCITY audit evidence",
        ],
      },
      {
        id: "institutional-onboard",
        name: "Institutional Partner Onboard",
        description: "Single $500k USD deposit to simulate major partner",
        targets: [
          ">25% growth HIGH_VELOCITY trigger",
          "Admin signature required for >$50k",
          "Real-time War Room metrics",
        ],
      },
    ],
    usage: {
      method: "POST",
      body: {
        scenario: "kraken-surge | institutional-onboard",
        tenantId: "string (required)",
        userId: "string (optional)",
      },
    },
  });
}
