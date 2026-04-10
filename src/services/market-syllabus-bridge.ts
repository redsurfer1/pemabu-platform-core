/**
 * Market-Syllabus Bridge — link Flomisma market gaps to Pemabu syllabus.
 * Polls Flomisma High Velocity / metrics; on surge in Supply Chain Finance errors
 * or Spice Trade transactions, increases weight of Trade Finance Compliance and sets isTrending.
 */

import {
  setModuleWeight,
  setCourseTrending,
  TRADE_FINANCE_COMPLIANCE_SLUG,
} from "./syllabus";

const FLOMISMA_METRICS_URL = process.env.FLOMISMA_METRICS_URL ?? "http://localhost:3000/api/metrics";

export type FlomismaMetrics = {
  supplyChainFinanceErrorSurge?: boolean;
  spiceTradeTransactionSurge?: boolean;
  supplyChainFinanceErrors24h?: number;
  spiceTradeTransactions24h?: number;
  highVelocityEventCount?: number;
  sampledAt?: string;
};

const DEFAULT_WEIGHT = 1;
const SURGE_WEIGHT = 2.5;

/**
 * Poll Flomisma metrics and, if surge detected, update Trade Finance Compliance
 * weight and isTrending so it appears at the top of the user's feed.
 */
export async function runMarketSyllabusBridge(): Promise<{
  surgeDetected: boolean;
  weightUpdated: boolean;
  isTrendingSet: boolean;
  metrics?: FlomismaMetrics;
}> {
  let metrics: FlomismaMetrics;
  try {
    const res = await fetch(FLOMISMA_METRICS_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { surgeDetected: false, weightUpdated: false, isTrendingSet: false };
    }
    metrics = (await res.json()) as FlomismaMetrics;
  } catch {
    return { surgeDetected: false, weightUpdated: false, isTrendingSet: false };
  }

  const surge =
    metrics.supplyChainFinanceErrorSurge === true ||
    metrics.spiceTradeTransactionSurge === true;

  if (!surge) {
    return {
      surgeDetected: false,
      weightUpdated: false,
      isTrendingSet: false,
      metrics,
    };
  }

  await setModuleWeight(TRADE_FINANCE_COMPLIANCE_SLUG, SURGE_WEIGHT);
  await setCourseTrending(TRADE_FINANCE_COMPLIANCE_SLUG, true);

  return {
    surgeDetected: true,
    weightUpdated: true,
    isTrendingSet: true,
    metrics,
  };
}
