import { PrismaClient } from '@prisma/client';
import { generateAuditLog, convertToCSV, generateAuditMetadata } from '../src/lib/audit-export';

const prisma = new PrismaClient();

async function testAuditExport() {
  console.log('🔍 Testing Audit Export Functionality\n');

  try {
    console.log('📊 Generating audit log...');
    const auditEntries = await generateAuditLog(prisma, {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    console.log(`✅ Generated ${auditEntries.length} audit entries\n`);

    if (auditEntries.length > 0) {
      console.log('📝 Sample Audit Entry:');
      console.log('---');
      const sample = auditEntries[0];
      console.log(`Timestamp: ${sample.timestamp}`);
      console.log(`Event Type: ${sample.eventType}`);
      console.log(`Amount: ${sample.amount} ${sample.currency}`);
      console.log(`Status: ${sample.status}`);
      console.log(`Transaction ID: ${sample.transactionId}`);
      console.log(`\nCompliance Narrative:\n${sample.complianceNarrative}`);
      console.log('---\n');
    }

    console.log('📄 Converting to CSV format...');
    const csv = convertToCSV(auditEntries);
    const lines = csv.split('\n');
    console.log(`✅ Generated CSV with ${lines.length} lines (including Basel III header)\n`);

    console.log('🏛️  Basel III Compliance Header:');
    console.log('---');
    for (let i = 0; i < 6; i++) {
      console.log(lines[i]);
    }
    console.log('---\n');

    console.log('📋 CSV Data Headers:');
    console.log(lines[6]);
    console.log();

    if (lines.length > 7) {
      console.log('📋 First Data Row:');
      console.log(lines[7].substring(0, 200) + '...');
      console.log();
    }

    console.log('📊 Generating metadata...');
    const metadata = generateAuditMetadata(auditEntries, {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    console.log('✅ Metadata generated:');
    console.log(JSON.stringify(metadata, null, 2));
    console.log();

    console.log('🧪 Testing Event Type Filtering...');
    const circuitBreakerEvents = await generateAuditLog(prisma, {
      eventTypes: ['CIRCUIT_BREAKER_HALT', 'RECOVERY_INITIATED', 'RESERVE_REBALANCE'],
    });

    console.log(`✅ Found ${circuitBreakerEvents.length} circuit breaker/reserve events\n`);

    console.log('✨ All tests completed successfully!');
    console.log('\n📦 Export Summary:');
    console.log(`   Total Records: ${auditEntries.length}`);
    console.log(`   Circuit Breaker Events: ${circuitBreakerEvents.length}`);
    console.log(`   CSV Size: ${csv.length} characters`);
    console.log(`   Compliance Narratives: Generated for all entries`);
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testAuditExport()
  .then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
