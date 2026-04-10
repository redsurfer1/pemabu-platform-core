/**
 * Prisma extension: LedgerEntry is insert-only (SOC2 / fintech immutability).
 * Throws on any UPDATE or DELETE so the audit trail is never modified.
 */

import { Prisma } from "@prisma/client";

export const ledgerImmutableExtension = Prisma.defineExtension((prisma) =>
  prisma.$extends({
    name: "ledger-immutable",
    query: {
      ledgerEntry: {
        update: () => {
          throw new Error(
            "LedgerEntry is insert-only for SOC2 compliance. Use createRefund() for refunds."
          );
        },
        updateMany: () => {
          throw new Error(
            "LedgerEntry is insert-only for SOC2 compliance. Use createRefund() for refunds."
          );
        },
        delete: () => {
          throw new Error("LedgerEntry cannot be deleted; audit trail is immutable.");
        },
        deleteMany: () => {
          throw new Error("LedgerEntry cannot be deleted; audit trail is immutable.");
        },
      },
    },
  })
);
