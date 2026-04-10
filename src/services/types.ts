/**
 * API response standardization (Task 4).
 * Unified JSON shape for front-end and Bolt.new UI state.
 */

export interface StandardSettlementResponse {
  success: boolean;
  transactionId: string | null;
  status: "SETTLED" | "FAILED_RETRY" | "COMPLETED";
  timestamp: string;
  /** Optional: contractId for reference */
  contractId?: string;
  /** Optional: error message when success is false */
  error?: string;
  /** Optional: true when request was idempotent duplicate */
  duplicate?: boolean;
}
