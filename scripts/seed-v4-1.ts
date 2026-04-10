import { prismaAdmin } from '../src/lib/prisma-admin';

async function seedV41Database() {
  console.log('🌱 V4.1 Gold Standard Database Seed\n');
  console.log('=' .repeat(70));

  try {
    console.log('\n1️⃣  CREATING MAIN ENTITY TENANT (PEMABU)');
    console.log('-'.repeat(70));

    const pembuTenant = await prismaAdmin.tenant.create({
      data: {
        id: 'tenant-pemabu-001',
        name: 'Pemabu Platform',
        createdAt: new Date(),
      },
    });
    console.log(`✓ Created Tenant: ${pembuTenant.name} (${pembuTenant.id})`);

    console.log('\n2️⃣  CREATING ADMIN USER');
    console.log('-'.repeat(70));

    const adminUser = await prismaAdmin.user.create({
      data: {
        id: 'user-admin-pemabu',
        tenantId: pembuTenant.id,
        email: 'admin@pemabu.ai',
        role: 'HUMAN',
        trustRole: 'ADMIN',
        profileStatus: 'ACTIVE',
        reputationScore: 1.0,
      },
    });
    console.log(`✓ Created Admin User: ${adminUser.email}`);

    console.log('\n3️⃣  CREATING ALPHA AGENTS (TALENT ECOSYSTEM)');
    console.log('-'.repeat(70));

    const agents = [];

    for (let i = 1; i <= 3; i++) {
      const aiUser = await prismaAdmin.user.create({
        data: {
          id: `user-agent-alpha-${i}`,
          tenantId: pembuTenant.id,
          email: `agent-alpha-${i}@pemabu.ai`,
          role: 'AI_AGENT',
          trustRole: 'PUBLIC',
          profileStatus: 'ACTIVE',
          reputationScore: 0.85 + (i * 0.05),
        },
      });

      const agent = await prismaAdmin.agent.create({
        data: {
          id: `agent-alpha-${i}`,
          tenantId: pembuTenant.id,
          userId: aiUser.id,
          tokenSymbol: `ALPHA${i}`,
          totalSupply: 1000000,
          circulatingSupply: 250000,
          currentPrice: 0.10 + (i * 0.05),
          t30Revenue: 5000 + (i * 2000),
          lastValuationAt: new Date(),
          initialCollateralUsdc: 25000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      agents.push(agent);
      console.log(`✓ Created Agent: ${agent.tokenSymbol} - Price: $${agent.currentPrice} - T30 Rev: $${agent.t30Revenue}`);
    }

    console.log('\n4️⃣  INSERTING RESERVE LEDGER ENTRY ($125,000 USDC)');
    console.log('-'.repeat(70));

    const reserveEntry = await prismaAdmin.ledgerEntry.create({
      data: {
        id: 'ledger-reserve-001',
        tenantId: pembuTenant.id,
        userId: adminUser.id,
        amount: 125000.00,
        currency: 'USDC',
        type: 'HIRE_ESCROW',
        status: 'SETTLED',
        flomismaTxId: 'flomisma-reserve-tx-001',
        metadata: {
          type: 'reserve_deposit',
          source: 'v4.1_seed',
          description: 'Initial reserve capitalization for Pemabu Platform',
        },
        createdAt: new Date(),
      },
    });
    console.log(`✓ Reserve Entry: $${reserveEntry.amount} ${reserveEntry.currency} (${reserveEntry.status})`);

    console.log('\n5️⃣  INSERTING CREDITS ISSUED ENTRY ($100,000)');
    console.log('-'.repeat(70));

    const creditsEntry = await prismaAdmin.ledgerEntry.create({
      data: {
        id: 'ledger-credits-001',
        tenantId: pembuTenant.id,
        userId: agents[0].userId!,
        amount: -100000.00,
        currency: 'USD',
        type: 'AGENT_SUB_TASK',
        status: 'SETTLED',
        flomismaTxId: 'flomisma-credits-tx-001',
        metadata: {
          type: 'credits_issued',
          source: 'v4.1_seed',
          description: 'Credits issued to Alpha agents for task execution',
        },
        createdAt: new Date(),
      },
    });
    console.log(`✓ Credits Entry: $${Math.abs(Number(creditsEntry.amount))} USD (${creditsEntry.status})`);

    console.log('\n6️⃣  CREATING AUDIT EVIDENCE (1.25x SOLVENCY)');
    console.log('-'.repeat(70));

    const totalReserves = 125000.00;
    const totalCredits = 100000.00;
    const reserveRatio = totalReserves / totalCredits;

    const auditEvidence = await prismaAdmin.auditEvidence.create({
      data: {
        id: 'audit-v41-initial',
        eventType: 'INITIAL_CAPITALIZATION',
        snapshotData: {
          source: 'v4.1_seed',
          timestamp: new Date().toISOString(),
          agents: agents.length,
          ledgerEntries: 2,
        },
        triggeredAt: new Date(),
        systemState: 'OPTIMAL',
        reserveRatio: reserveRatio,
        ledgerSum: totalCredits,
        reserveSum: totalReserves,
        metadata: {
          calculation: `${totalReserves} / ${totalCredits} = ${reserveRatio.toFixed(4)}`,
          compliance: 'Above 1.25x threshold',
        },
      },
    });
    console.log(`✓ Audit Evidence: Reserve Ratio ${(reserveRatio * 100).toFixed(2)}% (${auditEvidence.systemState})`);

    console.log('\n7️⃣  CREATING STAKING POOL');
    console.log('-'.repeat(70));

    const stakingPool = await prismaAdmin.stakingPool.create({
      data: {
        id: 'pool-pemabu-001',
        tenantId: pembuTenant.id,
        totalValueLocked: 50000.00,
        totalRewardsDistributed: 2500.00,
        rewardPoolBalance: 7500.00,
        currentAPY: 15.00,
        last30DayRevenue: 12000.00,
        rewardDiversionRate: 0.10,
        cooldownPeriodDays: 7,
        lastRewardDistribution: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✓ Staking Pool: TVL $${stakingPool.totalValueLocked} - APY ${stakingPool.currentAPY}%`);

    console.log('\n8️⃣  CREATING SAMPLE STAKING POSITION');
    console.log('-'.repeat(70));

    const stakingPosition = await prismaAdmin.stakingPosition.create({
      data: {
        id: 'stake-admin-001',
        userId: adminUser.id,
        tenantId: pembuTenant.id,
        stakedAmount: 25000.00,
        rewardsClaimed: 1250.00,
        rewardsAccrued: 375.00,
        stakedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        lastRewardAt: new Date(),
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Staking Position: $${stakingPosition.stakedAmount} staked (${stakingPosition.status})`);

    console.log('\n' + '='.repeat(70));
    console.log('🎯 V4.1 DATABASE SEED COMPLETE\n');

    console.log('📊 Summary:');
    console.log(`   Tenant: ${pembuTenant.name}`);
    console.log(`   Users: 1 Admin + 3 AI Agents`);
    console.log(`   Agents: ${agents.length} Alpha agents`);
    console.log(`   Reserve: $${totalReserves.toLocaleString()} USDC`);
    console.log(`   Credits: $${totalCredits.toLocaleString()} USD`);
    console.log(`   Solvency Ratio: ${(reserveRatio * 100).toFixed(2)}% ✓`);
    console.log(`   Status: ${auditEvidence.systemState}`);
    console.log(`   Staking TVL: $${stakingPool.totalValueLocked.toLocaleString()}`);

    console.log('\n🛡️ Next Steps:');
    console.log('   1. Refresh War Room at /portal/war-room');
    console.log('   2. Verify Solvency Ratio displays 125%');
    console.log('   3. Confirm "Sovereign Pulse Active" status');
    console.log('   4. Test entity isolation by switching context header\n');

  } catch (error) {
    console.error('\n❌ Seed Error:', error);
    throw error;
  } finally {
    await prismaAdmin.$disconnect();
  }
}

seedV41Database()
  .then(() => {
    console.log('✓ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Seed script failed:', error);
    process.exit(1);
  });
