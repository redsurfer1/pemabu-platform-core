/**
 * Request-scoped tenant context for RLS.
 * Set from JWT or X-Tenant-ID header in middleware; read by Prisma extension.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  tenantId: string;
  /** Optional: for audit trails */
  requestId?: string;
  /** Optional: userId when authenticated */
  userId?: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get current tenant ID. Returns null if not in a tenant scope (prevents leaky queries).
 */
export function getTenantId(): string | null {
  const ctx = tenantStorage.getStore();
  return ctx?.tenantId ?? null;
}

/**
 * Get full tenant context for audit or logging.
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Run a handler with tenant context. Use in middleware before passing to route handlers.
 * Ensures every DB call inside the handler sees the same tenantId and RLS applies.
 */
export function runWithTenant<T>(context: TenantContext, fn: () => T): T {
  return tenantStorage.run(context, fn);
}

/**
 * Async variant for use with async route handlers.
 */
export async function runWithTenantAsync<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantStorage.run(context, fn);
}
