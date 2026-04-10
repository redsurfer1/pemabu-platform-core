/**
 * CLEAN MODEL: Concierge automation; payments via Stripe only.
 * See: docs/dual-entity-operating-boundary.md
 */

import { Prisma } from '@prisma/client';
import { getStripeServer } from '@/portal/lib/stripe/server';
import { sendEmail } from '@/portal/lib/email/emailService';
import {
  eventScaleFromGuestCount,
  generateConciergePackage,
  type ProviderSummary,
} from '@/portal/lib/concierge/conciergeAgent';
import { getPrismaSystem } from '@/src/lib/prisma-system';
import { getSpiceKreweTenantUuid, SPICE_KREWE_TENANT_SLUG } from '@/src/lib/spice-krewe-tenant';

function expiryMs(): number {
  const h = parseInt(process.env.CONCIERGE_BRIEF_EXPIRY_HOURS ?? '48', 10);
  return (Number.isFinite(h) && h > 0 ? h : 48) * 60 * 60 * 1000;
}

export async function expireStaleConciergeBriefs(): Promise<void> {
  const prisma = getPrismaSystem();
  const cutoff = new Date(Date.now() - expiryMs());
  const stale = await prisma.conciergeBrief.findMany({
    where: {
      tenantId: SPICE_KREWE_TENANT_SLUG,
      conciergeFeeCharged: false,
      OR: [
        {
          status: { in: ['pending', 'processing'] },
          createdAt: { lt: cutoff },
        },
        {
          status: 'accepted',
          updatedAt: { lt: cutoff },
        },
      ],
    },
  });

  const stripe = process.env.STRIPE_SECRET_KEY ? getStripeServer() : null;

  for (const b of stale) {
    if (b.stripePaymentIntentId && stripe) {
      try {
        await stripe.paymentIntents.cancel(b.stripePaymentIntentId);
      } catch (e) {
        console.warn('concierge expire: PI cancel', e);
      }
    }
    await prisma.conciergeBrief.update({
      where: { id: b.id },
      data: { status: 'expired' },
    });
    await prisma.notificationLog.create({
      data: {
        entityType: 'concierge_brief',
        entityId: b.id,
        type: 'brief_expired',
        recipient: 'system',
        metadata: { reason: 'stale_pending' },
      },
    });
  }
}

type PackageJsonShape = {
  eventScale?: string;
  packageItems?: Array<{
    providerId: string;
    providerName?: string;
    providerType?: string;
    serviceType?: string;
    estimatedCostCents?: number;
    notes?: string;
  }>;
  estimatedTotalCents?: number;
  packageNarrative?: string;
};

export async function handleProviderDecline(
  briefId: string,
  providerId: string
): Promise<void> {
  const prisma = getPrismaSystem();
  const brief = await prisma.conciergeBrief.findUnique({
    where: { id: briefId },
    include: { packages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!brief || brief.packages.length === 0) return;

  const tenantUuid = await getSpiceKreweTenantUuid();
  if (!tenantUuid) return;

  const latest = brief.packages[0];
  const priorDeclined =
    ((brief.aiPackageJson as Record<string, unknown> | null)?.declinedProviders as
      | string[]
      | undefined) ?? [];
  const declinedProviders = [...priorDeclined, providerId];
  const mergedAi = {
    ...(typeof brief.aiPackageJson === 'object' && brief.aiPackageJson !== null
      ? brief.aiPackageJson
      : {}),
    declinedProviders,
  };

  await prisma.conciergeBrief.update({
    where: { id: briefId },
    data: { aiPackageJson: mergedAi as object },
  });

  const { prisma: tenantPrisma } = await import('@/src/lib/prisma');
  const { runWithTenantAsync } = await import('@/src/lib/tenant-context');

  const cityRow = await prisma.spiceKreweCity.findUnique({
    where: { slug: brief.citySlug },
  });

  const { chefs: chefsRaw, trucks } = await loadConciergeProvidersForCity(tenantUuid, brief.citySlug);
  const chefs = chefsRaw.filter((c) => !declinedProviders.includes(c.providerId));
  const eventScale = eventScaleFromGuestCount(brief.guestCount);

  const pkg = await generateConciergePackage({
    citySlug: brief.citySlug,
    cityDisplayName: cityRow?.displayName ?? brief.citySlug,
    eventType: brief.eventType,
    guestCount: brief.guestCount,
    eventScale,
    theme: brief.theme,
    budgetCents: brief.budgetCents,
    eventDate: brief.eventDate?.toISOString() ?? null,
    locationNotes: brief.locationNotes,
    chefs,
    trucks,
  });

  const nextJson = {
    eventScale,
    packageItems: pkg.packageItems,
    estimatedTotalCents: pkg.estimatedTotalCents,
    packageNarrative: pkg.packageNarrative,
    priorPackageId: latest.id,
    supersededReason: 'provider_declined',
  };

  await prisma.conciergePackage.create({
    data: {
      briefId,
      packageJson: nextJson as object,
      status: 'sent',
    },
  });

  await prisma.conciergeBrief.update({
    where: { id: briefId },
    data: {
      status: pkg.requiresHumanReview ? 'pending_review' : 'ready',
      estimatedTotalCents: pkg.estimatedTotalCents,
      requiresHumanReview: pkg.requiresHumanReview,
      aiPackageJson: nextJson as object,
    },
  });

  const buyer = await runWithTenantAsync({ tenantId: tenantUuid }, async () =>
    tenantPrisma.user.findUnique({
      where: { id: brief.buyerId },
      select: { email: true },
    })
  );
  if (buyer?.email) {
    await sendEmail({
      to: buyer.email,
      subject: 'Your SpiceKrewe concierge package was updated',
      bodyMarkdown: `A provider declined. We assembled a refreshed lineup.\n\n${pkg.packageNarrative}`,
      log: {
        entityType: 'concierge_brief',
        entityId: briefId,
        type: 'buyer_package_refresh',
      },
    });
  }
}

export async function conciergeOperatorDigest(): Promise<void> {
  const prisma = getPrismaSystem();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const briefsToday = await prisma.conciergeBrief.count({
    where: { createdAt: { gte: start } },
  });
  const acceptedPackages = await prisma.conciergePackage.count({
    where: { status: 'accepted', acceptedAt: { gte: start } },
  });
  const fees = await prisma.conciergeBrief.count({
    where: { conciergeFeeCharged: true, updatedAt: { gte: start } },
  });
  const pendingReview = await prisma.conciergeBrief.count({
    where: { status: 'pending_review' },
  });

  const to = process.env.CONCIERGE_OPS_EMAIL ?? process.env.OPS_EMAIL;
  if (!to) {
    console.info('[conciergeOperatorDigest]', {
      briefsToday,
      acceptedPackages,
      fees,
      pendingReview,
    });
    return;
  }

  await sendEmail({
    to,
    subject: 'SpiceKrewe concierge — daily digest',
    bodyMarkdown: [
      `Briefs submitted today: **${briefsToday}**`,
      `Packages accepted today: **${acceptedPackages}**`,
      `Concierge fees collected today: **${fees}**`,
      `Pending human review: **${pendingReview}**`,
    ].join('\n\n'),
    log: { entityType: 'concierge', entityId: SPICE_KREWE_TENANT_SLUG, type: 'ops_digest' },
  });
}

/** Static food-truck roster keyed by SpiceKrewe city slug (mirrors SpiceKrewe talent roster). */
const FOOD_TRUCKS_BY_CITY: Record<string, ProviderSummary[]> = {
  memphis: [
    {
      providerId: 'mid-south-smoke-truck',
      providerName: 'Mid-South Smoke & Pickle',
      serviceType: 'food_truck',
      providerType: 'food_truck',
    },
  ],
};

/**
 * Private chefs from tenant users with payouts enabled; food trucks from static city roster.
 */
export async function loadConciergeProvidersForCity(
  tenantUuid: string,
  citySlug: string,
): Promise<{ chefs: ProviderSummary[]; trucks: ProviderSummary[] }> {
  const { prisma } = await import('@/src/lib/prisma');
  const { runWithTenantAsync } = await import('@/src/lib/tenant-context');
  const chefs = await runWithTenantAsync({ tenantId: tenantUuid }, async () => {
    const rows = await prisma.user.findMany({
      where: {
        tenantId: tenantUuid,
        stripeConnectPayoutsEnabled: true,
      },
      select: { id: true, email: true },
      take: 50,
    });
    return rows.map(
      (u): ProviderSummary => ({
        providerId: u.id,
        providerName: u.email.split('@')[0] ?? u.id.slice(0, 8),
        serviceType: 'culinary',
        providerType: 'private_chef',
      }),
    );
  });
  const slug = citySlug.toLowerCase();
  const trucks = FOOD_TRUCKS_BY_CITY[slug] ?? [];
  return { chefs, trucks };
}

/** @deprecated Use loadConciergeProvidersForCity — combined list for legacy callers. */
export async function loadProvidersForCity(
  tenantUuid: string,
  citySlug: string,
): Promise<Array<{ providerId: string; providerName: string; serviceType: string }>> {
  const { chefs, trucks } = await loadConciergeProvidersForCity(tenantUuid, citySlug);
  return [...chefs, ...trucks].map((p) => ({
    providerId: p.providerId,
    providerName: p.providerName,
    serviceType: p.serviceType,
  }));
}

export async function createContractsFromConciergePackage(params: {
  briefId: string;
  packageId: string;
  tenantUuid: string;
  buyerId: string;
  packageJson: unknown;
}): Promise<void> {
  const { prisma } = await import('@/src/lib/prisma');
  const { runWithTenantAsync } = await import('@/src/lib/tenant-context');
  const body = params.packageJson as PackageJsonShape;
  const items = body.packageItems ?? [];
  const proofPrefix = `concierge:${params.briefId}:${params.packageId}`;

  await runWithTenantAsync({ tenantId: params.tenantUuid }, async () => {
    for (const item of items) {
      if (!item.providerId) continue;
      const cents = item.estimatedCostCents ?? 0;
      const dollars = cents / 100;
      await prisma.contract.create({
        data: {
          tenantId: params.tenantUuid,
          employerId: params.buyerId,
          employeeId: item.providerId,
          status: 'ACTIVE',
          escrowAmount: new Prisma.Decimal(dollars.toFixed(2)),
          agenticProof: `${proofPrefix}:${item.providerId}`,
          provider_status: 'awaiting_provider_response',
        },
      });
    }
  });
}
