/**
 * Admin Prisma client without tenant isolation.
 * Use ONLY for admin endpoints that need cross-tenant visibility.
 * Regular endpoints should use the tenant-scoped prisma client.
 *
 * WebContainer Compatible: Uses PostgreSQL driver adapter for edge runtime.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrismaAdmin = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined;
  poolAdmin: Pool | undefined;
};

function createAdminClient() {
  if (!globalForPrismaAdmin.poolAdmin) {
    globalForPrismaAdmin.poolAdmin = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  const adapter = new PrismaPg(globalForPrismaAdmin.poolAdmin);

  return new PrismaClient({ adapter });
}

export const prismaAdmin = globalForPrismaAdmin.prismaAdmin ?? createAdminClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrismaAdmin.prismaAdmin = prismaAdmin;
}
