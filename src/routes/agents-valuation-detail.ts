/**
 * GET /agents/:agentId — single agent with ValuationHistory (last 30 days) for sparkline.
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

export interface AgentsValuationDetailRequest {
  params: { agentId: string } | Promise<{ agentId: string }>;
  headers: Record<string, string | string[] | undefined>;
}

export interface AgentsValuationDetailResponse {
  status: (code: number) => { json: (body: object) => void };
}

const VALUATION_HISTORY_DAYS = 30;

export async function handleGetAgentValuationDetail(
  req: AgentsValuationDetailRequest,
  res: AgentsValuationDetailResponse
): Promise<void> {
  const params = await Promise.resolve(req.params);
  const agentId = params?.agentId;
  if (!agentId) {
    res.status(400).json({ success: false, error: "agentId required" });
    return;
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - VALUATION_HISTORY_DAYS);

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
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
    if (!agent) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const history = await prisma.valuationHistory.findMany({
      where: { agentId, valuationAt: { gte: since } },
      orderBy: { valuationAt: "asc" },
      select: { price: true, valuationAt: true },
    });

    const data = {
      id: agent.id,
      tenantId: agent.tenantId,
      tokenSymbol: agent.tokenSymbol,
      totalSupply: toNum(agent.totalSupply),
      circulatingSupply: toNum(agent.circulatingSupply),
      currentPrice: agent.currentPrice != null ? toNum(agent.currentPrice) : null,
      t30Revenue: agent.t30Revenue != null ? toNum(agent.t30Revenue) : null,
      lastValuationAt: agent.lastValuationAt?.toISOString() ?? null,
      valuationHistory: history.map((h) => ({
        price: toNum(h.price),
        valuationAt: h.valuationAt.toISOString(),
      })),
    };
    res.status(200).json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: message });
  }
}
