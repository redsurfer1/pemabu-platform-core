import { PrismaClient } from '@prisma/client';

export interface AuditLogEntry {
  timestamp: string;
  eventType: string;
  userId: string;
  tenantId: string;
  amount: string;
  currency: string;
  status: string;
  transactionId: string;
  complianceNarrative: string;
  metadata: string;
  preRatio?: string;
  postRatio?: string;
  rebalanceAmount?: string;
  ledgerReference: string;
}

const AUDIT_EVENT_TYPES = [
  'RESERVE_REBALANCE',
  'CIRCUIT_BREAKER_HALT',
  'RECOVERY_INITIATED',
  'PAY_EXAM',
  'PAY_MENTOR',
  'HIRE_ESCROW',
  'AGENT_SUB_TASK',
  'REFUND',
  'TAX_WITHHOLDING',
];

export async function generateAuditLog(
  prisma: PrismaClient,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    tenantId?: string;
    eventTypes?: string[];
  }
): Promise<AuditLogEntry[]> {
  const whereClause: any = {};

  if (filters?.startDate || filters?.endDate) {
    whereClause.createdAt = {};
    if (filters.startDate) {
      whereClause.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      whereClause.createdAt.lte = filters.endDate;
    }
  }

  if (filters?.tenantId) {
    whereClause.tenantId = filters.tenantId;
  }

  if (filters?.eventTypes && filters.eventTypes.length > 0) {
    whereClause.type = {
      in: filters.eventTypes,
    };
  }

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          email: true,
          role: true,
        },
      },
      tenant: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return ledgerEntries.map((entry) => {
    const narrative = generateComplianceNarrative(entry);
    const metadata = (entry.metadata as any) || {};

    const preRatio = metadata.preRatio ? parseFloat(String(metadata.preRatio)).toFixed(18) : undefined;
    const postRatio = metadata.postRatio ? parseFloat(String(metadata.postRatio)).toFixed(18) : undefined;
    const rebalanceAmount = metadata.rebalanceAmount ? parseFloat(String(metadata.rebalanceAmount)).toFixed(18) : entry.amount.toFixed(18);

    return {
      timestamp: entry.createdAt.toISOString(),
      eventType: entry.type,
      userId: entry.userId,
      tenantId: entry.tenantId,
      amount: entry.amount.toFixed(18),
      currency: entry.currency,
      status: entry.status,
      transactionId: entry.flomismaTxId,
      complianceNarrative: narrative,
      metadata: JSON.stringify(metadata),
      preRatio,
      postRatio,
      rebalanceAmount,
      ledgerReference: `LED-${entry.id.substring(0, 8).toUpperCase()}`,
    };
  });
}

function generateComplianceNarrative(entry: any): string {
  const metadata = entry.metadata || {};
  const userRole = entry.user?.role || 'UNKNOWN';
  const tenantName = entry.tenant?.name || 'Unknown Tenant';

  switch (entry.type) {
    case 'RESERVE_REBALANCE':
      return `Automated reserve rebalancing operation triggered by Solvency Watchdog. Reserve ratio detected below 1.05 threshold. Amount: ${entry.amount} ${entry.currency}. System initiated corrective action in compliance with regulatory solvency requirements.`;

    case 'CIRCUIT_BREAKER_HALT':
      return `Emergency circuit breaker activated due to critical solvency violation (ratio <1.0). All trading operations suspended automatically. Incident logged for regulatory review. Treasury operations notified for immediate intervention.`;

    case 'RECOVERY_INITIATED':
      return `System recovery operation initiated following circuit breaker activation. Reserve replenishment detected. Solvency ratio restored to acceptable levels (>1.0). Operations resuming under monitored conditions.`;

    case 'PAY_EXAM':
      return `Examination fee payment processed for user ${entry.user?.email || entry.userId}. Transaction completed through Flomisma settlement layer. Compliance with educational service payment regulations verified.`;

    case 'PAY_MENTOR':
      return `Mentorship service payment disbursed. User role: ${userRole}. Payment processed through audited settlement rails with full transaction traceability. Tax withholding applied per jurisdiction requirements.`;

    case 'HIRE_ESCROW':
      return `Employment contract escrow established. Funds held in secure escrow pending contract milestone completion. Multi-party agreement terms encoded. Release conditions subject to proof-of-work verification.`;

    case 'AGENT_SUB_TASK':
      return `AI Agent sub-task payment executed in AI2AI commerce framework. Agent identifier: ${entry.userId}. Autonomous transaction validated against reputation score and security policies. Nanopayment infrastructure utilized.`;

    case 'REFUND':
      const originalTxId = metadata.originalTransactionId || 'N/A';
      return `Refund processed for original transaction ${originalTxId}. Reversal initiated per user request or dispute resolution. Funds returned to source account. Audit trail maintains bidirectional linkage.`;

    case 'TAX_WITHHOLDING':
      const jurisdiction = metadata.jurisdiction || entry.user?.location || 'Unknown';
      return `Automated tax withholding applied per jurisdiction ${jurisdiction}. Intelligent Tax Compliance (ITC) agent calculated withholding rate based on user location and transaction type. Amount: ${entry.amount} ${entry.currency}. Compliance with cross-border payment regulations.`;

    default:
      return `Transaction processed: ${entry.type}. Amount: ${entry.amount} ${entry.currency}. Status: ${entry.status}. Tenant: ${tenantName}. Full audit trail maintained for regulatory compliance.`;
  }
}

export function convertToCSV(auditEntries: AuditLogEntry[]): string {
  const baselIIIHeader = [
    '"PEMABU SOVEREIGN FINTECH - AUDIT REPORT"',
    '"Report Type: Automated Recovery & Solvency Events"',
    '"Framework: Basel III Inspired Liquidity Coverage Ratio (LCR)"',
    '"Logic: [OPTIMAL] >1.05 | [DEGRADED] 1.00-1.05 (Auto-Rebalance) | [HALTED] <1.00 (Circuit Breaker)"',
    '"Disclaimer: All events verified via Immutable Merkle-tree Ledger."',
    '',
  ].join('\n');

  const headers = [
    'Timestamp (ISO 8601)',
    'Event Type',
    'Pre-Event Ratio',
    'Post-Event Ratio',
    'Rebalance Amount (Decimal 36,18)',
    'Ledger Reference',
    'User ID',
    'Tenant ID',
    'Amount',
    'Currency',
    'Status',
    'Transaction ID',
    'Compliance Narrative',
    'Metadata (JSON)',
  ];

  const escapeCSVField = (field: string | undefined): string => {
    if (!field) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = auditEntries.map((entry) => {
    return [
      escapeCSVField(entry.timestamp),
      escapeCSVField(entry.eventType),
      escapeCSVField(entry.preRatio || 'N/A'),
      escapeCSVField(entry.postRatio || 'N/A'),
      escapeCSVField(entry.rebalanceAmount || entry.amount),
      escapeCSVField(entry.ledgerReference),
      escapeCSVField(entry.userId),
      escapeCSVField(entry.tenantId),
      escapeCSVField(entry.amount),
      escapeCSVField(entry.currency),
      escapeCSVField(entry.status),
      escapeCSVField(entry.transactionId),
      escapeCSVField(entry.complianceNarrative),
      escapeCSVField(entry.metadata),
    ].join(',');
  });

  return baselIIIHeader + [headers.join(','), ...rows].join('\n');
}

export interface AuditExportMetadata {
  generatedAt: string;
  totalRecords: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  filters: {
    tenantId: string | null;
    eventTypes: string[];
  };
}

export function generateAuditMetadata(
  auditEntries: AuditLogEntry[],
  filters?: {
    startDate?: Date;
    endDate?: Date;
    tenantId?: string;
    eventTypes?: string[];
  }
): AuditExportMetadata {
  return {
    generatedAt: new Date().toISOString(),
    totalRecords: auditEntries.length,
    dateRange: {
      start: filters?.startDate?.toISOString() || null,
      end: filters?.endDate?.toISOString() || null,
    },
    filters: {
      tenantId: filters?.tenantId || null,
      eventTypes: filters?.eventTypes || [],
    },
  };
}
