/**
 * Barrel re-export: client-safe TrustRole (defined in src/lib/auth-context.ts, no @prisma/client).
 */
export type { TrustRole } from '@/src/lib/auth-context';
export { normalizeTrustRole } from '@/src/lib/auth-context';
