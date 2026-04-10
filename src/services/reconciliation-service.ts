import { PrismaClient, Prisma } from '@prisma/client';

export type SystemState = 'OPTIMAL' | 'DEGRADED' | 'HALTED' | 'INTEGRITY_DRIFT';

export interface ReconciliationStatus {
  isReconciled: boolean;
  ledgerSum: Prisma.Decimal;
  reserveSum: Prisma.Decimal;
  difference: Prisma.Decimal;
  systemState: SystemState;
  lastCheckedAt: Date;
  driftThreshold: number;
}

export class ReconciliationService {
  private prisma: PrismaClient;
  private driftThresholdCents: number = 1;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async performReconciliation(tenantId?: string): Promise<ReconciliationStatus> {
    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const ledgerSum = await this.prisma.ledgerEntry.aggregate({
      where: whereClause,
      _sum: {
        amount: true,
      },
    });

    const totalLedgerAmount = ledgerSum._sum.amount || new Prisma.Decimal(0);

    const reserveAmount = new Prisma.Decimal(1000000);

    const difference = new Prisma.Decimal(totalLedgerAmount).minus(reserveAmount).abs();
    const differenceInCents = difference.mul(100).toNumber();

    const isReconciled = differenceInCents <= this.driftThresholdCents;

    let systemState: SystemState = 'OPTIMAL';

    if (!isReconciled) {
      systemState = 'INTEGRITY_DRIFT';

      await this.captureAuditEvidence({
        eventType: 'DRIFT_DETECTED',
        systemState: 'INTEGRITY_DRIFT',
        ledgerSum: totalLedgerAmount,
        reserveSum: reserveAmount,
        metadata: {
          difference: difference.toString(),
          differenceInCents,
          threshold: this.driftThresholdCents,
          tenantId: tenantId || 'ALL',
        },
      });
    }

    return {
      isReconciled,
      ledgerSum: totalLedgerAmount,
      reserveSum: reserveAmount,
      difference,
      systemState,
      lastCheckedAt: new Date(),
      driftThreshold: this.driftThresholdCents,
    };
  }

  async getReconciliationHistory(limit: number = 10) {
    return this.prisma.auditEvidence.findMany({
      where: {
        eventType: 'DRIFT_DETECTED',
      },
      orderBy: {
        triggeredAt: 'desc',
      },
      take: limit,
    });
  }

  private async captureAuditEvidence(data: {
    eventType: string;
    systemState: SystemState;
    ledgerSum: Prisma.Decimal;
    reserveSum: Prisma.Decimal;
    metadata?: any;
  }) {
    const ratio = data.reserveSum.isZero()
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(data.reserveSum).div(data.ledgerSum);

    const recentLedgerEntries = await this.prisma.ledgerEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        flomismaTxId: true,
      },
    });

    const agentCount = await this.prisma.user.count({
      where: { role: 'AI_AGENT' },
    });

    await this.prisma.auditEvidence.create({
      data: {
        eventType: data.eventType,
        systemState: data.systemState,
        reserveRatio: ratio,
        ledgerSum: data.ledgerSum,
        reserveSum: data.reserveSum,
        snapshotData: {
          ratio: ratio.toString(),
          ledgerSum: data.ledgerSum.toString(),
          reserveSum: data.reserveSum.toString(),
          recentLedgerEntries,
          agentCount,
          timestamp: new Date().toISOString(),
        },
        metadata: data.metadata,
      },
    });
  }

  async startBackgroundMonitor(intervalMs: number = 60000) {
    console.log(`Starting reconciliation monitor (interval: ${intervalMs}ms)`);

    const runCheck = async () => {
      try {
        const status = await this.performReconciliation();
        console.log(
          `Reconciliation check: ${status.isReconciled ? 'VERIFIED' : 'DRIFT DETECTED'} ` +
          `(Ledger: ${status.ledgerSum}, Reserve: ${status.reserveSum}, Diff: ${status.difference})`
        );
      } catch (error) {
        console.error('Reconciliation check failed:', error);
      }
    };

    await runCheck();

    setInterval(runCheck, intervalMs);
  }
}

export async function captureCircuitBreakerSnapshot(
  prisma: PrismaClient,
  ratio: number,
  systemState: SystemState,
  metadata?: any
) {
  const recentLedgerEntries = await prisma.ledgerEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      type: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      flomismaTxId: true,
      userId: true,
      tenantId: true,
    },
  });

  const agentCount = await prisma.user.count({
    where: { role: 'AI_AGENT' },
  });

  const agentEquity = await prisma.agentEquity.findFirst({
    select: {
      totalSupply: true,
      circulatingSupply: true,
    },
  });

  const ledgerSum = await prisma.ledgerEntry.aggregate({
    _sum: {
      amount: true,
    },
  });

  const totalReserves = new Prisma.Decimal(1000000);

  await prisma.auditEvidence.create({
    data: {
      eventType: 'CIRCUIT_BREAKER',
      systemState,
      reserveRatio: new Prisma.Decimal(ratio),
      ledgerSum: ledgerSum._sum.amount || new Prisma.Decimal(0),
      reserveSum: totalReserves,
      snapshotData: {
        ratio,
        systemState,
        recentLedgerEntries,
        agentCount,
        totalSupply: agentEquity?.totalSupply.toString() || '1000000',
        circulatingSupply: agentEquity?.circulatingSupply.toString() || '0',
        timestamp: new Date().toISOString(),
      },
      metadata: metadata || {},
    },
  });
}
