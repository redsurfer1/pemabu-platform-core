/**
 * Prisma Client Extension: Multi-tenant isolation (RLS).
 * Runs SET app.tenant_id = '<tenantId>' in the same PostgreSQL session as each query
 * so Row-Level Security restricts results to the current tenant.
 *
 * Security: If tenantId is missing, every query throws to prevent leaky cross-tenant access.
 */

import { Prisma } from "@prisma/client";
import { getTenantId } from "./tenant-context";

const SET_TENANT_SQL = "SELECT set_config('app.tenant_id', $1, true)";

/**
 * Runs the same operation on the transaction client so it uses the connection
 * that just had set_config applied.
 */
function runOnTx(
  tx: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  model: string | undefined,
  operation: string,
  args: unknown
): Promise<unknown> {
  if (model == null) {
    // Raw query or top-level operation; run via (tx as any).$queryRaw etc.
    return (tx as any)[operation]?.(args) ?? Promise.reject(new Error(`Unknown operation: ${operation}`));
  }
  const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
  const delegate = (tx as any)[modelKey];
  if (!delegate || typeof delegate[operation] !== "function") {
    return Promise.reject(new Error(`Tenant extension: no delegate for ${modelKey}.${operation}`));
  }
  return delegate[operation](args);
}

export function createTenantExtension(getTenantIdFn: () => string | null = getTenantId) {
  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      name: "tenant-isolation",
      query: {
        $allOperations({ model, operation, args, query }) {
          const tenantId = getTenantIdFn();
          if (tenantId == null || tenantId === "") {
            throw new Error(
              "Tenant context required: set X-Tenant-ID or run inside runWithTenant() so RLS can isolate data."
            );
          }
          return prisma.$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe(SET_TENANT_SQL, tenantId);
            return runOnTx(tx, model, operation, args);
          }) as ReturnType<typeof query>;
        },
      },
    })
  );
}

export type TenantScopedPrisma = ReturnType<ReturnType<typeof createTenantExtension>>;
