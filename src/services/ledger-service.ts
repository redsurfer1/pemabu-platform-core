/**
 * Ledger service: insert-only Flomisma settlement layer (SOC2).
 * No UPDATE/DELETE on LedgerEntry; refunds are new entries with type REFUND.
 * V4.1: IssueCredit path enforces sovereign liquidity ceiling (80% of USDC reserves).
 * Liquidity Runway: when High Velocity (>25% reserve growth in 24h), credit >$50k requires adminSignature.
 */

import type { EntryStatus, EntryType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { validateSovereignLiquidityCeiling } from "../lib/sovereign-cap";
import {
  isHighVelocityMode,
  HIGH_VELOCITY_CREDIT_THRESHOLD_USD,
} from "./liquidity-risk-leveling";

export interface CreateLedgerEntryInput {
  userId: string;
  tenantId: string;
  amount: number | string | Decimal;
  currency?: string;
  type: EntryType;
  flomismaTxId: string;
  metadata?: Record<string, unknown>;
  status?: EntryStatus;
  /** Required when High Velocity mode is active and amount exceeds HIGH_VELOCITY_CREDIT_THRESHOLD_USD */
  adminSignature?: string;
}

/** 403 when credit issuance exceeds $50k in High Velocity mode without admin signature */
export class HighVelocityAdminSignatureRequiredError extends Error {
  readonly code = "HIGH_VELOCITY_ADMIN_SIGNATURE_REQUIRED";
  readonly status = 403;
  constructor(public amount: number) {
    super(
      `Credit issuance of ${amount} exceeds $${HIGH_VELOCITY_CREDIT_THRESHOLD_USD.toLocaleString()}; admin signature required when reserves grew >25% in 24h (High Velocity).`
    );
    this.name = "HighVelocityAdminSignatureRequiredError";
  }
}

/**
 * Creates a single ledger entry. Use this for every financial event (exam, mentor, hire)
 * before the transaction is considered "Complete." Ledger is insert-only; no updates/deletes.
 * V4.1: Before committing, enforces (Current Total Credits + amount) <= sovereign cap (80% USDC).
 * REFUND entries do not increase credits issued, so they are not subject to the ceiling.
 */
export async function createLedgerEntry(input: CreateLedgerEntryInput) {
  const amount = typeof input.amount === "number" ? new Decimal(input.amount) : input.amount instanceof Decimal ? input.amount : new Decimal(String(input.amount));
  const amountNum = Number(amount);

  // High Velocity: reserves grew >25% in 24h → require admin signature for issuance >$50k
  if (input.type !== "REFUND" && amountNum >= HIGH_VELOCITY_CREDIT_THRESHOLD_USD) {
    const highVelocity = await isHighVelocityMode();
    if (highVelocity && !input.adminSignature?.trim()) {
      throw new HighVelocityAdminSignatureRequiredError(amountNum);
    }
  }

  // Credit-issuing types: block if would breach sovereign liquidity ceiling
  if (input.type !== "REFUND" && amount.gt(0)) {
    await validateSovereignLiquidityCeiling(amount);
  }
  return prisma.ledgerEntry.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      amount,
      currency: input.currency ?? "USD",
      type: input.type,
      status: input.status ?? "PENDING",
      flomismaTxId: input.flomismaTxId,
      metadata: input.metadata ?? undefined,
    },
  });
}

export interface CreateRefundInput {
  originalFlomismaTxId: string;
  userId: string;
  tenantId: string;
  amount: number | string | Decimal;
  currency?: string;
  reason?: string;
  /** If not provided, a deterministic id is generated for the refund tx */
  refundFlomismaTxId?: string;
}

/**
 * Creates a refund as a new LedgerEntry (insert-only). Does not modify the original
 * record. Metadata stores refundOfFlomismaTxId for audit and Flomisma reconciliation.
 */
export async function createRefund(input: CreateRefundInput) {
  const amount = typeof input.amount === "number" ? new Decimal(input.amount) : input.amount instanceof Decimal ? input.amount : new Decimal(String(input.amount));
  const flomismaTxId = input.refundFlomismaTxId ?? `refund-${input.originalFlomismaTxId}-${randomUUID().slice(0, 8)}`;
  return prisma.ledgerEntry.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      amount,
      currency: input.currency ?? "USD",
      type: "REFUND",
      status: "PENDING",
      flomismaTxId,
      metadata: {
        refundOfFlomismaTxId: input.originalFlomismaTxId,
        reason: input.reason,
      },
    },
  });
}

/**
 * Ensures a ledger entry exists for the financial event before completing the operation.
 * Call this before marking a contract/order as "Complete" so the audit trail is complete.
 */
export async function ensureLedgerEntryThenComplete<T>(
  entryInput: CreateLedgerEntryInput,
  completeFn: () => Promise<T>
): Promise<T> {
  await createLedgerEntry(entryInput);
  return completeFn();
}
