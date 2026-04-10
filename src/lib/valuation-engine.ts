/**
 * Mark-to-Market Valuation Engine for Agent Equity.
 * Updates agent price based on revenue in the Flomisma/Pemabu ledger.
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./prisma";

const SECTOR_MULTIPLE = 20.0; // Sovereign Agents default
const T30_DAYS = 30;

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  return Number(d);
}

export interface ValuationResult {
  agentId: string;
  currentPrice: number;
  t30Revenue: number;
  annualizedRevenue: number;
  totalSupply: number;
  usedFloorPrice: boolean;
}

/**
 * Sum all CREDIT entries (revenue) in LedgerEntry for the agent's linked user over the last 30 days.
 * Annualize (T30 * 12), apply Sector_Multiple, divide by totalSupply.
 * Safety: if T30 revenue is 0, use Floor Price from initialCollateralUsdc (per-share from totalSupply if set).
 */
export async function calculateAgentValuation(agentId: string): Promise<ValuationResult | null> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      userId: true,
      totalSupply: true,
      initialCollateralUsdc: true,
    },
  });
  if (!agent) return null;

  const since = new Date();
  since.setDate(since.getDate() - T30_DAYS);

  let t30Revenue = 0;

  if (agent.userId) {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        userId: agent.userId,
        createdAt: { gte: since },
        amount: { gt: 0 },
      },
      select: { amount: true },
    });
    for (const e of entries) {
      t30Revenue += toNum(e.amount);
    }
  }

  const totalSupply = toNum(agent.totalSupply);
  const initialCollateral = toNum(agent.initialCollateralUsdc);

  let currentPrice: number;

  if (t30Revenue === 0) {
    if (initialCollateral > 0 && totalSupply > 0) {
      currentPrice = initialCollateral / totalSupply;
    } else {
      currentPrice = 0;
    }
    return {
      agentId: agent.id,
      currentPrice,
      t30Revenue: 0,
      annualizedRevenue: 0,
      totalSupply,
      usedFloorPrice: true,
    };
  }

  const annualizedRevenue = t30Revenue * 12;
  const totalValuation = annualizedRevenue * SECTOR_MULTIPLE;
  currentPrice = totalSupply > 0 ? totalValuation / totalSupply : 0;

  return {
    agentId: agent.id,
    currentPrice,
    t30Revenue,
    annualizedRevenue,
    totalSupply,
    usedFloorPrice: false,
  };
}

/**
 * Update Agent row and append ValuationHistory. Call after calculateAgentValuation.
 */
export async function applyValuationAndRecordHistory(result: ValuationResult): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.agent.update({
      where: { id: result.agentId },
      data: {
        currentPrice: new Decimal(result.currentPrice),
        t30Revenue: new Decimal(result.t30Revenue),
        lastValuationAt: now,
      },
    }),
    prisma.valuationHistory.create({
      data: {
        agentId: result.agentId,
        price: new Decimal(result.currentPrice),
        t30Revenue: new Decimal(result.t30Revenue),
        valuationAt: now,
      },
    }),
  ]);
}
