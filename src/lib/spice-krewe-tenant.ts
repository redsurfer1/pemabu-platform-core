import { getPrismaSystem } from '@/src/lib/prisma-system';

/** Canonical API tenant slug for Spice Krewe (underscore). */
export const SPICE_KREWE_TENANT_SLUG = 'spice_krewe';

/**
 * Resolves internal Tenant.id (UUID) for Spice Krewe marketplace rows.
 */
export async function getSpiceKreweTenantUuid(): Promise<string | null> {
  const explicit = process.env.SPICE_KREWE_TENANT_ID?.trim();
  if (explicit) {
    return explicit;
  }
  const prisma = getPrismaSystem();
  const row = await prisma.tenant.findFirst({
    where: { name: { contains: 'Spice', mode: 'insensitive' } },
    select: { id: true },
  });
  return row?.id ?? null;
}
