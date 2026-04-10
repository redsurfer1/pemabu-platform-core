/**
 * Flomisma API bridge — clean model.
 *
 * Monetary settlement calls are removed. Use the licensed payment provider
 * for any fund movement. This module may be extended with non-monetary
 * agreement-state queries when those routes exist on Flomisma.
 *
 * See: docs/dual-entity-operating-boundary.md
 */

export interface FlomismaSettlementPayload {
  amount: string;
  currency: string;
  recipientWallet: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}

export interface FlomismaSettlementResult {
  success: boolean;
  transactionId: string | null;
  error?: string;
}

// CLEAN MODEL: Removed — endpoint was monetary-authority.
// Use provider API directly for fund operations.
export async function callFlomismaSettlement(
  _payload: FlomismaSettlementPayload
): Promise<FlomismaSettlementResult> {
  return {
    success: false,
    transactionId: null,
    error:
      'CLEAN_MODEL: settlement is not initiated by Pemabu software. Use the licensed payment provider API.',
  };
}
