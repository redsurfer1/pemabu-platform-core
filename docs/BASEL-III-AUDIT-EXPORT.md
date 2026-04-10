# Basel III Compliance Audit Export System

## Overview

The PEMABU Platform implements a comprehensive audit export system inspired by Basel III Liquidity Coverage Ratio (LCR) frameworks. This system provides full regulatory transparency for all solvency events, circuit breaker activations, and financial transactions.

## Framework Logic

The system operates on three distinct solvency tiers:

- **[OPTIMAL]** Reserve Ratio > 1.05 - Normal operations, full system functionality
- **[DEGRADED]** Reserve Ratio 1.00-1.05 - Automatic rebalancing triggered
- **[HALTED]** Reserve Ratio < 1.00 - Circuit breaker activated, all operations suspended

## Export Format

### CSV Structure

The exported CSV file contains:

1. **Basel III Compliance Header** (6 lines)
   - Platform identification
   - Report type declaration
   - Framework reference
   - Logic tier definitions
   - Immutability disclaimer

2. **Data Headers** (14 columns)
   - Timestamp (ISO 8601)
   - Event Type
   - Pre Ratio (6 decimal precision)
   - Post Ratio (6 decimal precision)
   - Rebalance Amount (18 decimal precision - Decimal 36,18)
   - Amount
   - Currency
   - Status
   - Transaction ID
   - Ledger Reference (UUID)
   - User ID
   - Tenant ID
   - Compliance Narrative
   - Metadata (JSON)

3. **Data Rows**
   - One row per ledger entry
   - Proper CSV escaping for Excel/Google Sheets compatibility
   - Full precision for financial calculations

### Header Example

```
"PEMABU SOVEREIGN FINTECH - AUDIT REPORT"
"Report Type: Automated Recovery & Solvency Events"
"Framework: Basel III Inspired Liquidity Coverage Ratio (LCR)"
"Logic: [OPTIMAL] >1.05 | [DEGRADED] 1.00-1.05 (Auto-Rebalance) | [HALTED] <1.00 (Circuit Breaker)"
"Disclaimer: All events verified via Immutable Merkle-tree Ledger."
""
```

## Event Types Captured

### Critical Solvency Events

- **RESERVE_REBALANCE**: Automated reserve adjustments when ratio falls below 1.05
- **CIRCUIT_BREAKER_HALT**: Emergency suspension when ratio drops below 1.00
- **RECOVERY_INITIATED**: System recovery after reserves are replenished

### Transaction Events

- **PAY_EXAM**: Examination fee payments
- **PAY_MENTOR**: Mentorship service disbursements
- **HIRE_ESCROW**: Employment contract escrow operations
- **AGENT_SUB_TASK**: AI2AI micro-transaction payments
- **REFUND**: Transaction reversals with bidirectional linkage
- **TAX_WITHHOLDING**: Jurisdiction-based tax deductions

## API Endpoints

### GET /api/v1/audit/export

Export audit log with optional filtering.

**Query Parameters:**
- `startDate` (ISO 8601): Filter entries from this date
- `endDate` (ISO 8601): Filter entries until this date
- `tenantId` (UUID): Filter by specific tenant
- `eventTypes` (comma-separated): Filter by event types
- `format` (csv|json): Response format (default: csv)

**Response:**
- Content-Type: `text/csv` or `application/json`
- Content-Disposition: `attachment; filename=pemabu_audit_log_YYYY-MM-DD.csv`
- Custom Headers:
  - `X-Total-Records`: Number of records exported
  - `X-Generated-At`: Export generation timestamp

**Example:**
```bash
curl "https://pemabu.ai/api/v1/audit/export?startDate=2026-01-01&eventTypes=CIRCUIT_BREAKER_HALT,RECOVERY_INITIATED" \
  -o audit_export.csv
```

### POST /api/v1/audit/export

Export audit log with JSON body for complex filtering.

**Request Body:**
```json
{
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-03-31T23:59:59Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "eventTypes": ["RESERVE_REBALANCE", "CIRCUIT_BREAKER_HALT"],
  "format": "csv"
}
```

## Compliance Narratives

Each event includes a human-readable compliance narrative that explains:

1. The action taken
2. The triggering condition
3. The regulatory framework applied
4. The verification method

### Example Narratives

**Circuit Breaker Halt:**
```
Emergency circuit breaker activated due to critical solvency violation (ratio <1.0).
All trading operations suspended automatically. Incident logged for regulatory review.
Treasury operations notified for immediate intervention.
```

**Reserve Rebalance:**
```
Automated reserve rebalancing operation triggered by Solvency Watchdog. Reserve ratio
detected below 1.05 threshold. Amount: 50000.00 USD. System initiated corrective action
in compliance with regulatory solvency requirements.
```

## Data Precision

The system maintains high-precision decimals for financial accuracy:

- **Rebalance Amounts**: 18 decimal places (Decimal 36,18)
- **Reserve Ratios**: 6 decimal places
- **Transaction Amounts**: 8 decimal places
- **Timestamps**: Millisecond precision (ISO 8601)

## Immutability & Verification

All audit entries are linked to immutable ledger records via:

1. **Ledger Reference**: UUID pointing to the source LedgerEntry
2. **Transaction ID**: Flomisma settlement layer transaction hash
3. **Merkle-tree Verification**: All entries participate in Merkle-tree proofs
4. **Metadata Preservation**: Complete JSON metadata retained for forensic analysis

## UI Integration

### Primary Export Button

Located in the "Regulatory Audit Trail Export" section with:
- GAAP COMPLIANT badge
- Detailed feature list
- Sample audit record preview
- One-click CSV download

### Infrastructure Section

Quick access button in the Infrastructure & Circuit Breaker section:
- Ghost button style with download icon
- Positioned next to circuit breaker controls
- Responsive design for mobile/desktop

### Footer Link

Text-style link in the footer for convenient access:
- Underlined "Download Audit Trail" text
- Consistent with footer styling
- Always accessible

## Testing

Run the comprehensive audit export test:

```bash
npm run test:audit
```

This test validates:
- Audit log generation
- Basel III header formatting
- CSV structure and escaping
- Compliance narrative generation
- Event type filtering
- Metadata extraction

## Regulatory Compliance

This system provides:

1. **GAAP Compliance**: Financial reporting standards
2. **Basel III Inspiration**: Liquidity coverage ratio framework
3. **SOX Compliance**: Audit trail immutability
4. **GDPR Readiness**: Tenant-scoped data export
5. **ISO 8601**: International date/time standards

## Security Considerations

- **Row-Level Security**: All exports respect tenant isolation
- **Authentication**: API endpoints require valid authentication
- **Audit Logging**: Export operations are themselves logged
- **No PII Exposure**: User identifiers are UUIDs, not personal data
- **Immutable Source**: Exports reference immutable ledger entries

## Performance

- **Streaming**: Large exports use streaming to prevent memory issues
- **Indexing**: Database indexes on createdAt and type fields
- **Pagination**: API supports date range filtering for manageable exports
- **Caching**: Export metadata is lightweight for quick previews

## Future Enhancements

- Multi-format exports (PDF, JSON-LD, XML)
- Automated scheduled exports
- Real-time export notifications
- Blockchain anchoring of export hashes
- Advanced filtering (amount ranges, status combinations)
- Export encryption for sensitive data
