import { prismaAdmin as prisma } from '../src/lib/prisma-admin';

async function diagnosticCheck() {
  console.log('🔍 V4.1 War Room Diagnostic Check\n');
  console.log('=' .repeat(60));

  console.log('\n1️⃣  DATABASE CONNECTION TEST');
  console.log('-'.repeat(60));
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ Database connection: SUCCESS');
    console.log(`  Connection URL: ${process.env.DATABASE_URL?.split('@')[1] || 'Not set'}`);
  } catch (error: any) {
    console.log('✗ Database connection: FAILED');
    console.log(`  Error: ${error.message}`);
    console.log('\n  Diagnosis: A) Database Connection (Port 5432)');
    console.log('  Solution: Verify DATABASE_URL in .env file');
    return;
  }

  console.log('\n2️⃣  LEDGER ENTRY COUNT');
  console.log('-'.repeat(60));
  try {
    const ledgerCount = await prisma.ledgerEntry.count();
    const ledgerSum = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { status: 'SETTLED' }
    });
    console.log(`✓ Ledger entries: ${ledgerCount} total`);
    console.log(`  Settled amount: $${ledgerSum._sum.amount || 0}`);

    if (ledgerCount === 0) {
      console.log('\n  ⚠️  Diagnosis: C) Empty Ledger table');
      console.log('  Solvency Ratio will show 0.00 - database is empty');
    }
  } catch (error: any) {
    console.log(`✗ Ledger query failed: ${error.message}`);
  }

  console.log('\n3️⃣  AGENT COUNT');
  console.log('-'.repeat(60));
  try {
    const agentCount = await prisma.agent.count();
    console.log(`✓ Active agents: ${agentCount}`);

    if (agentCount === 0) {
      console.log('  ⚠️  No agents in database - expected for fresh install');
    }
  } catch (error: any) {
    console.log(`✗ Agent query failed: ${error.message}`);
  }

  console.log('\n4️⃣  AUDIT EVIDENCE');
  console.log('-'.repeat(60));
  try {
    const latestAudit = await prisma.auditEvidence.findFirst({
      orderBy: { triggeredAt: 'desc' },
    });

    if (latestAudit) {
      console.log('✓ Latest audit evidence found:');
      console.log(`  Reserve Ratio: ${latestAudit.reserveRatio || 'N/A'}`);
      console.log(`  System State: ${latestAudit.systemState}`);
      console.log(`  Triggered At: ${latestAudit.triggeredAt}`);
    } else {
      console.log('⚠️  No audit evidence in database');
      console.log('  Solvency Ratio will default to 1.0');
    }
  } catch (error: any) {
    console.log(`✗ Audit query failed: ${error.message}`);
  }

  console.log('\n5️⃣  STAKING POOL');
  console.log('-'.repeat(60));
  try {
    const stakingPool = await prisma.stakingPool.findFirst();

    if (stakingPool) {
      console.log('✓ Staking pool found:');
      console.log(`  TVL: $${stakingPool.totalValueLocked}`);
      console.log(`  APY: ${stakingPool.currentAPY}%`);
      console.log(`  Reward Pool: $${stakingPool.rewardPoolBalance}`);
    } else {
      console.log('⚠️  No staking pool configured');
    }
  } catch (error: any) {
    console.log(`✗ Staking query failed: ${error.message}`);
  }

  console.log('\n6️⃣  TENANT COUNT');
  console.log('-'.repeat(60));
  try {
    const tenantCount = await prisma.tenant.count();
    console.log(`✓ Tenants: ${tenantCount}`);

    if (tenantCount === 0) {
      console.log('  ⚠️  No tenants - database needs seeding');
    }
  } catch (error: any) {
    console.log(`✗ Tenant query failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNOSTIC SUMMARY\n');

  console.log('If Solvency Ratio shows 0.00, possible causes:');
  console.log('  A) Database Connection - Check if queries above failed');
  console.log('  B) Missing ADMIN_SECRET_KEY - Not applicable for this endpoint');
  console.log('  C) Empty Ledger table - Check if ledger count is 0\n');

  console.log('War Room will display live data when:');
  console.log('  ✓ Database connection is working');
  console.log('  ✓ AuditEvidence table has records with reserveRatio');
  console.log('  ✓ LedgerEntry table has SETTLED transactions\n');

  console.log('To seed the database, run:');
  console.log('  npm run test:stress:seed\n');

  await prisma.$disconnect();
}

diagnosticCheck().catch((error) => {
  console.error('Fatal diagnostic error:', error);
  process.exit(1);
});
