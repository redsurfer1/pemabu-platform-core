/**
 * POST /cron/update-prices — run every 24 hours.
 * Runs Mark-to-Market valuation for all agents, updates Agent and ValuationHistory.
 */

import { runScheduledValuationUpdate } from "../cron/update-prices";

export interface CronUpdatePricesRequest {
  headers: Record<string, string | string[] | undefined>;
}

export interface CronUpdatePricesResponse {
  status: (code: number) => { json: (body: object) => void };
}

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function handleCronUpdatePrices(
  req: CronUpdatePricesRequest,
  res: CronUpdatePricesResponse
): Promise<void> {
  const authHeader = Array.isArray(req.headers["authorization"]) ? req.headers["authorization"][0] : req.headers["authorization"];
  const expected = CRON_SECRET ? `Bearer ${CRON_SECRET}` : null;
  if (expected && authHeader !== expected) {
    res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    return;
  }

  try {
    const result = await runScheduledValuationUpdate();
    res.status(200).json({
      success: true,
      data: { processed: result.processed, errors: result.errors },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: message });
  }
}
