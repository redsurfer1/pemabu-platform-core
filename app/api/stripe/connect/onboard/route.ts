/**
 * Initiates Stripe Connect Express onboarding for a seller.
 * Returns a Stripe-hosted onboarding URL.
 *
 * CLEAN MODEL: Flomisma/Pemabu never collect seller bank or identity documents here.
 * Stripe hosts onboarding; we store only stripe_connect_account_id (opaque reference).
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getStripeServer } from '@/portal/lib/stripe/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const prisma = new PrismaClient();
  let body: { sellerId?: string; returnUrl?: string; refreshUrl?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sellerId, returnUrl, refreshUrl } = body;
  if (!sellerId || !returnUrl || !refreshUrl) {
    return NextResponse.json(
      { error: 'sellerId, returnUrl, refreshUrl required' },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeServer();

    const user = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, email: true, stripeConnectAccountId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    let accountId = user.stripeConnectAccountId ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email || undefined,
        metadata: {
          seller_id: user.id,
          platform: 'pemabu',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeConnectAccountId: accountId,
          stripeConnectOnboardingComplete: false,
          stripeConnectPayoutsEnabled: false,
        },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
    });
  } catch (e) {
    console.error('Connect onboard error', e);
    return NextResponse.json({ error: 'Connect onboarding failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
