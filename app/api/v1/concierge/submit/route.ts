/**
 * POST /api/v1/concierge/submit
 * CLEAN MODEL: Revenue via Stripe. Platform does not hold funds.
 * See: docs/dual-entity-operating-boundary.md
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { runWithTenantAsync } from '@/src/lib/tenant-context';
import { eventScaleFromGuestCount, generateConciergePackage } from '@/portal/lib/concierge/conciergeAgent';
import { loadConciergeProvidersForCity } from '@/portal/lib/concierge/conciergeJobs';
import { getPrismaSystem } from '@/src/lib/prisma-system';
import {
  getSpiceKreweTenantUuid,
  SPICE_KREWE_TENANT_SLUG,
} from '@/src/lib/spice-krewe-tenant';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: {
    tenantId?: string;
    citySlug?: string;
    buyerId?: string;
    eventType?: string;
    guestCount?: number;
    theme?: string;
    budgetCents?: number;
    eventDate?: string;
    locationNotes?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (body.tenantId !== SPICE_KREWE_TENANT_SLUG) {
    return NextResponse.json({ error: 'TENANT_NOT_ALLOWED' }, { status: 403 });
  }
  if (!body.citySlug || typeof body.citySlug !== 'string') {
    return NextResponse.json({ error: 'citySlug required' }, { status: 400 });
  }
  if (!body.buyerId || typeof body.buyerId !== 'string') {
    return NextResponse.json({ error: 'buyerId required' }, { status: 400 });
  }
  if (!body.eventType || typeof body.eventType !== 'string') {
    return NextResponse.json({ error: 'eventType required' }, { status: 400 });
  }
  if (typeof body.guestCount !== 'number' || body.guestCount < 1) {
    return NextResponse.json({ error: 'guestCount invalid' }, { status: 400 });
  }
  if (typeof body.budgetCents !== 'number' || body.budgetCents < 1) {
    return NextResponse.json({ error: 'budgetCents invalid' }, { status: 400 });
  }

  const tenantUuid = await getSpiceKreweTenantUuid();
  if (!tenantUuid) {
    return NextResponse.json({ error: 'SPICE_KREWE_TENANT_UNRESOLVED' }, { status: 503 });
  }

  const buyerOk = await runWithTenantAsync({ tenantId: tenantUuid }, async () =>
    prisma.user.findUnique({ where: { id: body.buyerId }, select: { id: true } })
  );
  if (!buyerOk) {
    return NextResponse.json({ error: 'BUYER_NOT_FOUND' }, { status: 404 });
  }

  const system = getPrismaSystem();
  const brief = await system.conciergeBrief.create({
    data: {
      tenantId: SPICE_KREWE_TENANT_SLUG,
      citySlug: body.citySlug,
      buyerId: body.buyerId,
      eventType: body.eventType,
      guestCount: body.guestCount,
      theme: body.theme ?? null,
      budgetCents: body.budgetCents,
      eventDate: body.eventDate ? new Date(body.eventDate) : null,
      locationNotes: body.locationNotes ?? null,
      status: 'processing',
    },
  });

  try {
    const { chefs, trucks } = await loadConciergeProvidersForCity(tenantUuid, body.citySlug);
    const cityRow = await system.spiceKreweCity.findUnique({
      where: { slug: body.citySlug },
    });

    const cityDisplayName = cityRow?.displayName ?? body.citySlug;
    const eventScale = eventScaleFromGuestCount(body.guestCount);

    const pkg = await generateConciergePackage({
      citySlug: body.citySlug,
      cityDisplayName,
      eventType: body.eventType,
      guestCount: body.guestCount,
      eventScale,
      theme: body.theme,
      budgetCents: body.budgetCents,
      eventDate: body.eventDate ?? null,
      locationNotes: body.locationNotes,
      chefs,
      trucks,
    });

    const packageJson = {
      eventScale,
      packageItems: pkg.packageItems,
      estimatedTotalCents: pkg.estimatedTotalCents,
      packageNarrative: pkg.packageNarrative,
    };

    const createdPkg = await system.conciergePackage.create({
      data: {
        briefId: brief.id,
        packageJson: packageJson as object,
        status: 'sent',
      },
    });

    const nextStatus = pkg.requiresHumanReview ? 'pending_review' : 'ready';

    await system.conciergeBrief.update({
      where: { id: brief.id },
      data: {
        status: nextStatus,
        estimatedTotalCents: pkg.estimatedTotalCents,
        requiresHumanReview: pkg.requiresHumanReview,
        aiPackageJson: packageJson as object,
      },
    });

    return NextResponse.json({
      briefId: brief.id,
      status: nextStatus,
      package: { id: createdPkg.id, ...packageJson },
      conciergeFee: '$75.00',
      message:
        nextStatus === 'pending_review'
          ? 'This brief is in a 24-hour human review queue because estimated spend is high.'
          : 'Your concierge package is ready.',
    });
  } catch (e) {
    console.error('concierge submit', e);
    await system.conciergeBrief.delete({ where: { id: brief.id } }).catch(() => {});
    return NextResponse.json({ error: 'CONCIERGE_FAILED' }, { status: 500 });
  }
}
