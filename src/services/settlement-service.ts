/**
 * CLEAN MODEL — Pemabu does not initiate settlement or write monetary ledger authority here.
 * See: FLOMISMA_PLATFORM/docs/dual-entity-operating-boundary.md
 */

class SettlementService {
  /**
   * Escrow release and payout are executed only by the licensed payment provider.
   */
  async releaseEscrow(_contractId: string, _tenantId: string): Promise<{
    success: boolean;
    transactionId: string | null;
    status: "SETTLED" | "FAILED_RETRY";
    error?: string;
  }> {
    return {
      success: false,
      transactionId: null,
      status: "FAILED_RETRY",
      error:
        "CLEAN_MODEL: Escrow release is not performed by Pemabu software. Use the licensed payment provider.",
    };
  }
}

export const settlementService = new SettlementService();
