import { StakingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface AgentWorkProof {
  agentId: string;
  taskId: string;
  outcomeHash: string;
  revenueGenerated: number;
  verifiedAt: Date;
  blockNumber?: number;
}

export interface OutcomeMetrics {
  systemUptime: number;
  taskVolume: number;
  verifiedWorkProofs: number;
  totalRevenueVerified: number;
}

export class UnderwritingService {
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async distributeOutcomeBasedFees(
    tenantId: string,
    workProof: AgentWorkProof
  ): Promise<void> {
    const pool = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    if (!pool) {
      return;
    }

    const isVerified = await this.verifyWorkProof(workProof);
    if (!isVerified) {
      console.warn('Work proof verification failed, skipping fee distribution');
      return;
    }

    const metrics = await this.getOutcomeMetrics(tenantId);

    const uptimeMultiplier = metrics.systemUptime / 100;
    const taskVolumeBonus = Math.min(metrics.taskVolume / 1000, 0.5);

    const diversionRate = Number(pool.rewardDiversionRate);
    const baseReward = workProof.revenueGenerated * diversionRate;

    const outcomeAdjustedReward = baseReward * uptimeMultiplier * (1 + taskVolumeBonus);

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        rewardPoolBalance: {
          increment: new Decimal(outcomeAdjustedReward),
        },
        last30DayRevenue: {
          increment: new Decimal(workProof.revenueGenerated),
        },
      },
    });

    await this.recordWorkProof(tenantId, workProof);

    await this.distributeToUnderwriters(tenantId, outcomeAdjustedReward);
  }

  private async verifyWorkProof(workProof: AgentWorkProof): Promise<boolean> {
    if (!workProof.outcomeHash || workProof.outcomeHash.length < 32) {
      return false;
    }

    if (workProof.revenueGenerated <= 0) {
      return false;
    }

    if (!workProof.verifiedAt || workProof.verifiedAt > new Date()) {
      return false;
    }

    const existingProof = await this.prisma.agentWorkProof?.findFirst({
      where: {
        taskId: workProof.taskId,
        outcomeHash: workProof.outcomeHash,
      },
    });

    if (existingProof) {
      return false;
    }

    return true;
  }

  private async recordWorkProof(tenantId: string, workProof: AgentWorkProof): Promise<void> {
    try {
      await this.prisma.agentWorkProof?.create({
        data: {
          tenantId,
          agentId: workProof.agentId,
          taskId: workProof.taskId,
          outcomeHash: workProof.outcomeHash,
          revenueGenerated: new Decimal(workProof.revenueGenerated),
          verifiedAt: workProof.verifiedAt,
          blockNumber: workProof.blockNumber,
        },
      });
    } catch (error) {
      console.error('Failed to record work proof:', error);
    }
  }

  private async distributeToUnderwriters(tenantId: string, totalFees: number): Promise<void> {
    const pool = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    if (!pool || Number(pool.totalValueLocked) === 0) {
      return;
    }

    const activePositions = await this.prisma.stakingPosition.findMany({
      where: {
        tenantId,
        status: StakingStatus.ACTIVE,
      },
    });

    const tvl = Number(pool.totalValueLocked);

    for (const position of activePositions) {
      const userShare = Number(position.stakedAmount) / tvl;
      const userFee = totalFees * userShare;

      await this.prisma.stakingPosition.update({
        where: { id: position.id },
        data: {
          rewardsAccrued: {
            increment: new Decimal(userFee),
          },
          lastRewardAt: new Date(),
        },
      });
    }

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        rewardPoolBalance: {
          decrement: new Decimal(totalFees),
        },
        totalRewardsDistributed: {
          increment: new Decimal(totalFees),
        },
        lastRewardDistribution: new Date(),
      },
    });
  }

  async getOutcomeMetrics(tenantId: string): Promise<OutcomeMetrics> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const workProofs = await this.prisma.agentWorkProof?.findMany({
      where: {
        tenantId,
        verifiedAt: {
          gte: last24Hours,
        },
      },
    }) || [];

    const systemUptime = await this.calculateSystemUptime(tenantId);

    const totalRevenueVerified = workProofs.reduce(
      (sum: number, proof: any) => sum + Number(proof.revenueGenerated),
      0
    );

    return {
      systemUptime,
      taskVolume: workProofs.length,
      verifiedWorkProofs: workProofs.length,
      totalRevenueVerified,
    };
  }

  private async calculateSystemUptime(tenantId: string): Promise<number> {
    const systemHealthChecks = await this.prisma.systemHealthCheck?.findMany({
      where: {
        tenantId,
        checkedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        checkedAt: 'asc',
      },
    }) || [];

    if (systemHealthChecks.length === 0) {
      return 99.9;
    }

    const totalChecks = systemHealthChecks.length;
    const healthyChecks = systemHealthChecks.filter((check: any) => check.isHealthy).length;

    return (healthyChecks / totalChecks) * 100;
  }

  async calculateUnderwritingFeeRate(tenantId: string): Promise<number> {
    const pool = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    if (!pool || Number(pool.totalValueLocked) === 0) {
      return 0;
    }

    const metrics = await this.getOutcomeMetrics(tenantId);
    const tvl = Number(pool.totalValueLocked);

    const annualizedRevenue = (metrics.totalRevenueVerified / 1) * 365;
    const diversionRate = Number(pool.rewardDiversionRate);
    const annualFees = annualizedRevenue * diversionRate;

    const uptimeAdjustment = metrics.systemUptime / 100;

    const underwritingFeeRate = (annualFees / tvl) * 100 * uptimeAdjustment;

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        currentAPY: new Decimal(underwritingFeeRate),
      },
    });

    return underwritingFeeRate;
  }
}
