/**
 * Scheduled task: run every 24 hours.
 * Iterates all active agents, runs Mark-to-Market valuation, updates Agent and creates ValuationHistory.
 */

import { calculateAgentValuation, applyValuationAndRecordHistory } from "../lib/valuation-engine";
import { prisma } from "../lib/prisma";

export interface UpdatePricesResult {
  processed: number;
  errors: { agentId: string; error: string }[];
}

export async function runScheduledValuationUpdate(): Promise<UpdatePricesResult> {
  const agents = await prisma.agent.findMany({
    select: { id: true },
  });
  const errors: { agentId: string; error: string }[] = [];
  let processed = 0;

  for (const agent of agents) {
    try {
      const result = await calculateAgentValuation(agent.id);
      if (result) {
        await applyValuationAndRecordHistory(result);
        processed++;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ agentId: agent.id, error: message });
    }
  }

  return { processed, errors };
}
