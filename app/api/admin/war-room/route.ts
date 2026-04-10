import { NextRequest, NextResponse } from 'next/server';
import { prismaAdmin } from '@/src/lib/prisma-admin';

export async function GET(request: NextRequest) {
  const adminContext = request.headers.get('X-Admin-Entity-Context');

  if (adminContext !== 'PEMABU_ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid admin context' },
      { status: 403 }
    );
  }

  try {
    const [
      ledgerStats,
      agentCount,
      stakingPoolData,
      auditEvidence,
      tenantCount,
      contractStats,
    ] = await Promise.all([
      prismaAdmin.ledgerEntry.aggregate({
        _sum: {
          amount: true,
        },
        _count: true,
        where: {
          status: 'SETTLED',
        },
      }),

      prismaAdmin.agent.count(),

      prismaAdmin.stakingPool.findFirst({
        select: {
          totalValueLocked: true,
          currentAPY: true,
          last30DayRevenue: true,
          rewardPoolBalance: true,
        },
      }),

      prismaAdmin.auditEvidence.findFirst({
        orderBy: {
          triggeredAt: 'desc',
        },
        select: {
          reserveRatio: true,
          systemState: true,
          triggeredAt: true,
          ledgerSum: true,
          reserveSum: true,
        },
      }),

      prismaAdmin.tenant.count(),

      prismaAdmin.contract.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const totalLedgerAmount = ledgerStats._sum.amount || 0;
    const transactionCount = ledgerStats._count || 0;

    const reserveRatio = auditEvidence?.reserveRatio
      ? parseFloat(auditEvidence.reserveRatio.toString())
      : 1.0;

    const solvencyRatio = auditEvidence?.reserveRatio
      ? parseFloat(auditEvidence.reserveRatio.toString())
      : 1.0;

    const tvl = stakingPoolData?.totalValueLocked
      ? parseFloat(stakingPoolData.totalValueLocked.toString())
      : 0;

    const apy = stakingPoolData?.currentAPY
      ? parseFloat(stakingPoolData.currentAPY.toString())
      : 0;

    const activeContracts = contractStats.find(s => s.status === 'ACTIVE')?._count || 0;
    const completedContracts = contractStats.find(s => s.status === 'COMPLETED')?._count || 0;

    return NextResponse.json({
      systemStatus: {
        database: 'operational',
        api: 'operational',
        security: 'operational',
        compliance: auditEvidence?.systemState || 'OPTIMAL',
      },
      metrics: {
        totalTransactions: transactionCount,
        totalLedgerAmount: totalLedgerAmount.toString(),
        activeAgents: agentCount,
        activeTenants: tenantCount,
        reserveRatio: reserveRatio,
        solvencyRatio: solvencyRatio,
        tsvCoverage: reserveRatio >= 1.0 ? 1.0 : reserveRatio,
      },
      staking: {
        totalValueLocked: tvl,
        currentAPY: apy,
        last30DayRevenue: stakingPoolData?.last30DayRevenue?.toString() || '0',
        rewardPoolBalance: stakingPoolData?.rewardPoolBalance?.toString() || '0',
      },
      contracts: {
        active: activeContracts,
        completed: completedContracts,
        total: activeContracts + completedContracts,
      },
      lastAudit: auditEvidence?.triggeredAt?.toISOString() || new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('War Room API Error:', error);

    return NextResponse.json({
      systemStatus: {
        database: 'degraded',
        api: 'operational',
        security: 'operational',
        compliance: 'operational',
      },
      metrics: {
        totalTransactions: 0,
        totalLedgerAmount: '0',
        activeAgents: 0,
        activeTenants: 0,
        reserveRatio: 0,
        solvencyRatio: 0,
        tsvCoverage: 0,
      },
      staking: {
        totalValueLocked: 0,
        currentAPY: 0,
        last30DayRevenue: '0',
        rewardPoolBalance: '0',
      },
      contracts: {
        active: 0,
        completed: 0,
        total: 0,
      },
      lastAudit: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      error: 'Database connection failed - using fallback data',
    }, { status: 200 });
  }
}
