/**
 * POST /api/v1/concierge/provider-response
 * CLEAN MODEL: Revenue via Stripe. Platform does not hold funds.
 * See: docs/dual-entity-operating-boundary.md
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { runWithTenantAsync } from '@/src/lib/tenant-context';
import { handleProviderDecline } from '@/portal/lib/concierge/conciergeJobs';
import { getSpiceKreweTenantUuid } from '@/src/lib/spice-krewe-tenant';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { briefId?: string; providerId?: string; action?: 'accept' | 'decline' };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.briefId || !body.providerId || !body.action) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const tenantUuid = await getSpiceKreweTenantUuid();
  if (!tenantUuid) {
    return NextResponse.json({ error: 'TENANT_UNRESOLVED' }, { status: 503 });
  }

  if (body.action === 'decline') {
    await handleProviderDecline(body.briefId, body.providerId);
    return NextResponse.json({ ok: true, status: 'declined' });
  }

  await runWithTenantAsync({ tenantId: tenantUuid }, async () => {
    const contracts = await prisma.contract.findMany({
      where: {
        employeeId: body.providerId,
        agenticProof: { contains: `concierge:${body.briefId}:` },
      },
    });
    for (const c of contracts) {
      await prisma.contract.update({
        where: { id: c.id },
        data: { provider_status: 'confirmed' },
      });
    }
  });

  return NextResponse.json({ ok: true, status: 'accepted' });
}
