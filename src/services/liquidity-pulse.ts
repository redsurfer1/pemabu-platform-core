/**
 * Liquidity Pulse Service — Hands-off expansion of credit capacity.
 * Monitors ReserveLedgerEntry for new DEPOSITs and broadcasts 'Capacity Expanded' to the War Room.
 * WebSocket servers or polling clients subscribe to receive events.
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../lib/prisma";
import { invalidateUsdcSumCache } from "../lib/sovereign-cap";
import { checkAndRecordHighVelocityIfNeeded } from "./liquidity-risk-leveling";

export type CapacityExpandedPayload = {
  event: "CAPACITY_EXPANDED";
  entryId: string;
  amount: number;
  currency: string;
  reference: string | null;
  createdAt: string; // ISO
  totalReservesAfter?: number; // Optional; set when available
};

type Subscriber = (payload: CapacityExpandedPayload) => void;

const subscribers = new Set<Subscriber>();
let lastDepositCheckAt: Date | null = null;

/**
 * Subscribe to 'Capacity Expanded' events (e.g. War Room WebSocket handler).
 * Returns an unsubscribe function.
 */
export function subscribeToLiquidityPulse(callback: Subscriber): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Broadcast a Capacity Expanded event to all subscribers (War Room, WebSockets).
 */
export function notifyCapacityExpanded(payload: CapacityExpandedPayload): void {
  for (const sub of subscribers) {
    try {
      sub(payload);
    } catch (err) {
      console.error("[LiquidityPulse] Subscriber error:", err);
    }
  }
}

/**
 * Call this when a new DEPOSIT ReserveLedgerEntry is created (e.g. from deposit API or job).
 * Invalidates sovereign cap cache, broadcasts to War Room, and runs High Velocity check.
 */
export async function onDepositCreated(entry: {
  id: string;
  amount: Decimal | number;
  currency: string;
  type: string;
  reference: string | null;
  createdAt: Date;
}): Promise<void> {
  if (entry.type !== "DEPOSIT") return;
  invalidateUsdcSumCache();
  const amount = typeof entry.amount === "number" ? entry.amount : Number(entry.amount);
  const payload: CapacityExpandedPayload = {
    event: "CAPACITY_EXPANDED",
    entryId: entry.id,
    amount,
    currency: entry.currency,
    reference: entry.reference,
    createdAt: entry.createdAt.toISOString(),
  };
  notifyCapacityExpanded(payload);
  await checkAndRecordHighVelocityIfNeeded();
}

/**
 * Poll for new DEPOSIT entries since last check. Call from a cron or interval.
 * Broadcasts each new deposit and updates lastDepositCheckAt.
 */
export async function checkForNewDeposits(): Promise<number> {
  const since = lastDepositCheckAt ?? new Date(Date.now() - 60 * 1000); // default: last 1 min
  const entries = await prisma.reserveLedgerEntry.findMany({
    where: {
      type: "DEPOSIT",
      currency: "USDC",
      createdAt: { gt: since },
    },
    orderBy: { createdAt: "asc" },
  });
  lastDepositCheckAt = new Date();
  for (const e of entries) {
    await onDepositCreated({
      id: e.id,
      amount: e.amount,
      currency: e.currency,
      type: e.type,
      reference: e.reference,
      createdAt: e.createdAt,
    });
  }
  return entries.length;
}
