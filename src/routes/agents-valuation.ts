/**
 * GET /agents — list agents with Mark-to-Market currentPrice for Marketplace UI.
 */

import { prisma } from "../lib/prisma";

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  if (typeof d === "object" && d !== null && typeof (d as { toNumber?: () => number }).toNumber === "function") {
    return (d as { toNumber: () => number }).toNumber();
  }
  return Number(d);
}

export interface AgentsValuationRequest {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

export interface AgentsValuationResponse {
  status: (code: number) => { json: (body: object) => void };
}

export async function handleGetAgentsValuation(
  _req: AgentsValuationRequest,
  res: AgentsValuationResponse
): Promise<void> {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        tenantId: true,
        tokenSymbol: true,
        totalSupply: true,
        circulatingSupply: true,
        currentPrice: true,
        t30Revenue: true,
        lastValuationAt: true,
      },
    });
    const list = agents.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      tokenSymbol: a.tokenSymbol,
      totalSupply: toNum(a.totalSupply),
      circulatingSupply: toNum(a.circulatingSupply),
      currentPrice: a.currentPrice != null ? toNum(a.currentPrice) : null,
      t30Revenue: a.t30Revenue != null ? toNum(a.t30Revenue) : null,
      lastValuationAt: a.lastValuationAt?.toISOString() ?? null,
    }));
    res.status(200).json({ success: true, data: list });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: message });
  }
}
