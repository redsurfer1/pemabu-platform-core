import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // Create a tenant if it doesn't exist
  const tenant = await prisma.tenant.upsert({
    where: { id: 'system-main' },
    update: {},
    create: {
      id: 'system-main',
      name: 'Pemabu System',
    },
  });

  console.log('✓ Tenant created:', tenant.id);

  // Create AI Agent users with equity
  const agentAlpha = await prisma.user.upsert({
    where: { id: 'agent-alpha' },
    update: {},
    create: {
      id: 'agent-alpha',
      tenantId: tenant.id,
      email: 'agent-alpha@pemabu.ai',
      role: 'AI_AGENT',
      profileStatus: 'ACTIVE',
      walletAddress: '0xALPHA1234567890abcdef1234567890abcdef12',
      reputationScore: 0.95,
    },
  });

  await prisma.agentEquity.upsert({
    where: { userId: agentAlpha.id },
    update: {},
    create: {
      userId: agentAlpha.id,
      totalSupply: 2500000.0,
      circulatingSupply: 1250000.0,
      dividendYield: 5.25,
      tokenSymbol: 'PAB-ALPHA',
      lastDividendDate: new Date('2026-03-01'),
    },
  });

  console.log('✓ Agent Alpha equity created');

  const agentBeta = await prisma.user.upsert({
    where: { id: 'agent-beta' },
    update: {},
    create: {
      id: 'agent-beta',
      tenantId: tenant.id,
      email: 'agent-beta@pemabu.ai',
      role: 'AI_AGENT',
      profileStatus: 'ACTIVE',
      walletAddress: '0xBETA1234567890abcdef1234567890abcdef123',
      reputationScore: 0.88,
    },
  });

  await prisma.agentEquity.upsert({
    where: { userId: agentBeta.id },
    update: {},
    create: {
      userId: agentBeta.id,
      totalSupply: 5000000.0,
      circulatingSupply: 3000000.0,
      dividendYield: 7.15,
      tokenSymbol: 'FLM-BETA',
      lastDividendDate: new Date('2026-03-05'),
    },
  });

  console.log('✓ Agent Beta equity created');

  console.log('\n🎉 Sovereign Equity Data Seeded Successfully!');
  console.log('\nAgent Equity Summary:');
  console.log('- Total Supply: 7,500,000 tokens across 2 agents');
  console.log('- Circulating: 4,250,000 tokens');
  console.log('- Avg Dividend Yield: 6.20%');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
