/**
 * Prisma client with tenant isolation extension.
 * All queries run with SET app.tenant_id from tenant context (see tenant-context.ts).
 *
 * WebContainer Compatible: Uses PostgreSQL driver adapter for edge runtime.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { ledgerImmutableExtension } from "./prisma-ledger-immutable-extension";
import { createTenantExtension } from "./prisma-tenant-extension";

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
  pool: Pool | undefined;
};

export type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

function createExtendedClient() {
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pool);

  return new PrismaClient({ adapter })
    .$extends(createTenantExtension())
    .$extends(ledgerImmutableExtension);
}

export const prisma = globalForPrisma.prisma ?? createExtendedClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
