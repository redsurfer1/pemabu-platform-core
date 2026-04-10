import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type Stripe from 'stripe';
import { getStripeServer } from '@/portal/lib/stripe/server';
import { sendEmail } from '@/portal/lib/email/emailService';
import { createContractsFromConciergePackage } from '@/portal/lib/concierge/conciergeJobs';
import { getPrismaSystem } from '@/src/lib/prisma-system';
import { getSpiceKreweTenantUuid } from '@/src/lib/spice-krewe-tenant';

export const dynamic = 'force-dynamic';

/**
 * Stripe webhook handler for Pemabu (Next.js).
 *
 * CLEAN MODEL: Verifies Stripe-Signature and may mirror provider state on `Contract`.
 * No fund movement is initiated here.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeServer();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const prisma = new PrismaClient();

  try {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated':
        await handleHoldReady(prisma, event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.succeeded':
        await handleSucceeded(prisma, event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.canceled':
        await handleCanceled(prisma, event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handleFailed(prisma, event.data.object as Stripe.PaymentIntent);
        break;
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const seller = await prisma.user.findFirst({
          where: { stripeConnectAccountId: account.id },
        });
        if (seller) {
          await prisma.user.update({
            where: { id: seller.id },
            data: {
              stripeConnectPayoutsEnabled: account.payouts_enabled ?? false,
              stripeConnectOnboardingComplete: account.details_submitted ?? false,
            },
          });
        }
        break;
      }
      default:
        console.info(`Unhandled Stripe event: ${event.type}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  return NextResponse.json({ received: true });
}

async function handleHoldReady(prisma: PrismaClient, paymentIntent: Stripe.PaymentIntent) {
  const agreementId = paymentIntent.metadata?.agreement_id ?? undefined;
  if (!agreementId || !paymentIntent.id) return;
  await prisma.contract.updateMany({
    where: { id: agreementId },
    data: {
      provider_reference_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      provider_status: 'hold_ready',
    },
  });
}

async function handleConciergeFeeSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const briefId = paymentIntent.metadata?.brief_id;
  const packageId = paymentIntent.metadata?.package_id;
  if (!briefId || !packageId || !paymentIntent.id) return;

  const sys = getPrismaSystem();
  const brief = await sys.conciergeBrief.findUnique({
    where: { id: briefId },
    include: { packages: true },
  });
  if (!brief) return;
  const pkg = brief.packages.find((p) => p.id === packageId);
  if (!pkg) return;

  if (brief.conciergeFeeCharged) return;

  await sys.conciergeBrief.update({
    where: { id: briefId },
    data: {
      conciergeFeeCharged: true,
      stripePaymentIntentId: paymentIntent.id,
      status: 'accepted',
    },
  });

  const tenantUuid = await getSpiceKreweTenantUuid();
  if (!tenantUuid) return;

  await createContractsFromConciergePackage({
    briefId,
    packageId,
    tenantUuid,
    buyerId: brief.buyerId,
    packageJson: pkg.packageJson,
  });

  const { prisma } = await import('@/src/lib/prisma');
  const { runWithTenantAsync } = await import('@/src/lib/tenant-context');

  const buyer = await runWithTenantAsync({ tenantId: tenantUuid }, async () =>
    prisma.user.findUnique({ where: { id: brief.buyerId }, select: { email: true } })
  );

  const body = pkg.packageJson as {
    packageItems?: Array<{
      providerId?: string;
      providerName?: string;
      estimatedCostCents?: number;
    }>;
    estimatedTotalCents?: number;
    packageNarrative?: string;
  };

  if (buyer?.email) {
    await sendEmail({
      to: buyer.email,
      subject: 'SpiceKrewe concierge — booking confirmed',
      bodyMarkdown: [
        'Your concierge fee cleared. We created booking requests for each provider.',
        '',
        `**Estimated total (indicative):** $${((body.estimatedTotalCents ?? 0) / 100).toFixed(2)}`,
        '',
        body.packageNarrative ?? '',
      ].join('\n'),
      log: {
        entityType: 'concierge_brief',
        entityId: briefId,
        type: 'buyer_confirmed',
      },
    });
  }

  const items = body.packageItems ?? [];
  for (const item of items) {
    if (!item.providerId) continue;
    const prov = await runWithTenantAsync({ tenantId: tenantUuid }, async () =>
      prisma.user.findUnique({
        where: { id: item.providerId },
        select: { email: true },
      })
    );
    if (!prov?.email) continue;
    await sendEmail({
      to: prov.email,
      subject: 'New SpiceKrewe concierge booking request',
      bodyMarkdown: [
        'You have a new booking request from a SpiceKrewe concierge package.',
        'Please accept or decline within **24 hours**.',
        '',
        `Buyer brief: ${brief.eventType} (${brief.guestCount} guests)`,
      ].join('\n'),
      log: {
        entityType: 'concierge_brief',
        entityId: briefId,
        type: 'provider_booking_request',
      },
    });
  }
}

async function handleSucceeded(prisma: PrismaClient, paymentIntent: Stripe.PaymentIntent) {
  const agreementId = paymentIntent.metadata?.agreement_id ?? undefined;
  if (!agreementId || !paymentIntent.id) return;
  await prisma.contract.updateMany({
    where: { id: agreementId },
    data: {
      provider_reference_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      provider_status: 'released',
    },
  });
}

async function handleCanceled(prisma: PrismaClient, paymentIntent: Stripe.PaymentIntent) {
  const agreementId = paymentIntent.metadata?.agreement_id ?? undefined;
  if (!agreementId || !paymentIntent.id) return;
  await prisma.contract.updateMany({
    where: { id: agreementId },
    data: {
      provider_reference_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      provider_status: 'refunded',
    },
  });
}

async function handleFailed(prisma: PrismaClient, paymentIntent: Stripe.PaymentIntent) {
  const agreementId = paymentIntent.metadata?.agreement_id ?? undefined;
  if (!agreementId || !paymentIntent.id) return;
  await prisma.contract.updateMany({
    where: { id: agreementId },
    data: {
      provider_reference_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      provider_status: 'failed',
    },
  });
}
