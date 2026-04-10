import { StakingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface StakingMetrics {
  totalValueLocked: number;
  currentAPY: number;
  rewardPoolBalance: number;
  userStakedAmount: number;
  userRewardsAccrued: number;
  userRewardsClaimed: number;
  cooldownPeriodDays: number;
  unstakeAvailableAt: Date | null;
  status: StakingStatus;
}

export interface RiskLevel {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  solvencyRatio: number;
  description: string;
  color: string;
}

export class StakingService {
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async initializeStakingPool(tenantId: string): Promise<void> {
    const existing = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      await this.prisma.stakingPool.create({
        data: {
          tenantId,
          totalValueLocked: new Decimal(0),
          rewardPoolBalance: new Decimal(0),
          totalRewardsDistributed: new Decimal(0),
          currentAPY: new Decimal(0),
          last30DayRevenue: new Decimal(0),
          rewardDiversionRate: new Decimal(0.10),
          cooldownPeriodDays: 7,
        },
      });
    }
  }

  async stake(userId: string, tenantId: string, amount: number): Promise<void> {
    await this.initializeStakingPool(tenantId);

    const existingPosition = await this.prisma.stakingPosition.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (existingPosition) {
      await this.prisma.stakingPosition.update({
        where: { id: existingPosition.id },
        data: {
          stakedAmount: {
            increment: new Decimal(amount),
          },
          status: StakingStatus.ACTIVE,
          unstakeRequestedAt: null,
          unstakeAvailableAt: null,
        },
      });
    } else {
      await this.prisma.stakingPosition.create({
        data: {
          userId,
          tenantId,
          stakedAmount: new Decimal(amount),
          rewardsAccrued: new Decimal(0),
          rewardsClaimed: new Decimal(0),
          status: StakingStatus.ACTIVE,
        },
      });
    }

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        totalValueLocked: {
          increment: new Decimal(amount),
        },
      },
    });
  }

  async requestUnstake(userId: string, tenantId: string): Promise<Date> {
    const pool = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    if (!pool) {
      throw new Error('Staking pool not found');
    }

    const cooldownDays = pool.cooldownPeriodDays;
    const unstakeAvailableAt = new Date();
    unstakeAvailableAt.setDate(unstakeAvailableAt.getDate() + cooldownDays);

    await this.prisma.stakingPosition.update({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      data: {
        status: StakingStatus.COOLDOWN,
        unstakeRequestedAt: new Date(),
        unstakeAvailableAt,
      },
    });

    return unstakeAvailableAt;
  }

  async cancelUnstakeRequest(userId: string, tenantId: string): Promise<void> {
    await this.prisma.stakingPosition.update({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      data: {
        status: StakingStatus.ACTIVE,
        unstakeRequestedAt: null,
        unstakeAvailableAt: null,
      },
    });
  }

  async completeUnstake(userId: string, tenantId: string): Promise<number> {
    const position = await this.prisma.stakingPosition.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (!position) {
      throw new Error('Staking position not found');
    }

    if (position.status !== StakingStatus.COOLDOWN) {
      throw new Error('Unstake request not initiated');
    }

    if (!position.unstakeAvailableAt || position.unstakeAvailableAt > new Date()) {
      throw new Error('Cooldown period not completed');
    }

    const totalAmount = position.stakedAmount.plus(position.rewardsAccrued);

    await this.prisma.stakingPosition.update({
      where: { id: position.id },
      data: {
        status: StakingStatus.UNSTAKED,
        stakedAmount: new Decimal(0),
        rewardsAccrued: new Decimal(0),
        rewardsClaimed: {
          increment: position.rewardsAccrued,
        },
      },
    });

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        totalValueLocked: {
          decrement: position.stakedAmount,
        },
      },
    });

    return Number(totalAmount);
  }

  async claimRewards(userId: string, tenantId: string): Promise<number> {
    const position = await this.prisma.stakingPosition.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (!position) {
      throw new Error('Staking position not found');
    }

    const rewardAmount = position.rewardsAccrued;

    await this.prisma.stakingPosition.update({
      where: { id: position.id },
      data: {
        rewardsAccrued: new Decimal(0),
        rewardsClaimed: {
          increment: rewardAmount,
        },
      },
    });

    return Number(rewardAmount);
  }

  async distributeRevenue(tenantId: string, agentRevenue: number): Promise<void> {
    const pool = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    if (!pool) {
      await this.initializeStakingPool(tenantId);
      return;
    }

    const diversionRate = Number(pool.rewardDiversionRate);
    const rewardAmount = agentRevenue * diversionRate;

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        rewardPoolBalance: {
          increment: new Decimal(rewardAmount),
        },
        last30DayRevenue: {
          increment: new Decimal(agentRevenue),
        },
      },
    });

    await this.distributeRewardsToStakers(tenantId, rewardAmount);
  }

  private async distributeRewardsToStakers(tenantId: string, totalRewards: number): Promise<void> {
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
      const userReward = totalRewards * userShare;

      await this.prisma.stakingPosition.update({
        where: { id: position.id },
        data: {
          rewardsAccrued: {
            increment: new Decimal(userReward),
          },
          lastRewardAt: new Date(),
        },
      });
    }

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        rewardPoolBalance: {
          decrement: new Decimal(totalRewards),
        },
        totalRewardsDistributed: {
          increment: new Decimal(totalRewards),
        },
        lastRewardDistribution: new Date(),
      },
    });
  }

  async calculateAPY(tenantId: string): Promise<number> {
    const pool = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    if (!pool || Number(pool.totalValueLocked) === 0) {
      return 0;
    }

    const last30DayRevenue = Number(pool.last30DayRevenue);
    const diversionRate = Number(pool.rewardDiversionRate);
    const tvl = Number(pool.totalValueLocked);

    const annualizedRevenue = (last30DayRevenue / 30) * 365;
    const annualRewards = annualizedRevenue * diversionRate;
    const apy = (annualRewards / tvl) * 100;

    await this.prisma.stakingPool.update({
      where: { tenantId },
      data: {
        currentAPY: new Decimal(apy),
      },
    });

    return apy;
  }

  async getStakingMetrics(userId: string, tenantId: string): Promise<StakingMetrics> {
    const pool = await this.prisma.stakingPool.findUnique({
      where: { tenantId },
    });

    const position = await this.prisma.stakingPosition.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    return {
      totalValueLocked: pool ? Number(pool.totalValueLocked) : 0,
      currentAPY: pool ? Number(pool.currentAPY) : 0,
      rewardPoolBalance: pool ? Number(pool.rewardPoolBalance) : 0,
      userStakedAmount: position ? Number(position.stakedAmount) : 0,
      userRewardsAccrued: position ? Number(position.rewardsAccrued) : 0,
      userRewardsClaimed: position ? Number(position.rewardsClaimed) : 0,
      cooldownPeriodDays: pool ? pool.cooldownPeriodDays : 7,
      unstakeAvailableAt: position?.unstakeAvailableAt || null,
      status: position?.status || StakingStatus.ACTIVE,
    };
  }

  async getRiskLevel(solvencyRatio: number): Promise<RiskLevel> {
    if (solvencyRatio >= 1.0) {
      return {
        level: 'LOW',
        solvencyRatio,
        description: 'System is fully collateralized. Staking rewards flowing normally.',
        color: 'emerald',
      };
    } else if (solvencyRatio >= 0.95) {
      return {
        level: 'MEDIUM',
        solvencyRatio,
        description: 'Minor reserve deficit detected. Buffer absorbing variance.',
        color: 'yellow',
      };
    } else if (solvencyRatio >= 0.90) {
      return {
        level: 'HIGH',
        solvencyRatio,
        description: 'Degraded state. Unstaking cooldown enforced.',
        color: 'orange',
      };
    } else {
      return {
        level: 'CRITICAL',
        solvencyRatio,
        description: 'Circuit breaker engaged. All unstaking disabled.',
        color: 'red',
      };
    }
  }

  async canUnstake(systemState: string, solvencyRatio: number): Promise<boolean> {
    if (systemState === 'HALTED') {
      return false;
    }

    if (solvencyRatio < 0.90) {
      return false;
    }

    return true;
  }
}
