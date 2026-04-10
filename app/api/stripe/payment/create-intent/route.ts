/**
 * Creates a Stripe PaymentIntent with manual capture for an agreement.
 * CLEAN MODEL: Stripe holds funds after confirmation; platform stores references only.
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getStripeServer } from '@/portal/lib/stripe/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const prisma = new PrismaClient();
  try {
    let body: {
      agreementId?: string;
      displayAmountCents?: number;
      currency?: string;
      buyerId?: string;
      sellerId?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      agreementId,
      displayAmountCents,
      currency = 'usd',
      buyerId,
      sellerId,
    } = body;

    if (
      agreementId === undefined ||
      displayAmountCents === undefined ||
      !buyerId ||
      !sellerId ||
      !Number.isFinite(displayAmountCents) ||
      displayAmountCents < 1
    ) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectPayoutsEnabled: true,
      },
    });

    if (!seller?.stripeConnectAccountId || !seller.stripeConnectPayoutsEnabled) {
      return NextResponse.json(
        {
          error: 'Seller has not completed payment setup',
          code: 'SELLER_NOT_ONBOARDED',
        },
        { status: 422 },
      );
    }

    const feeRate = parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE ?? '0.05');
    const platformFeeCents = Math.round(displayAmountCents * (Number.isFinite(feeRate) ? feeRate : 0.05));

    const stripe = getStripeServer();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: displayAmountCents,
      currency: currency.toLowerCase(),
      capture_method: 'manual',
      transfer_data: {
        destination: seller.stripeConnectAccountId,
      },
      application_fee_amount: platformFeeCents,
      metadata: {
        agreement_id: agreementId,
        buyer_id: buyerId,
        seller_id: sellerId,
        platform: 'pemabu',
      },
    });

    await prisma.contract.update({
      where: { id: agreementId },
      data: {
        stripe_payment_intent_id: paymentIntent.id,
        provider_reference_id: paymentIntent.id,
        provider_status: paymentIntent.status,
        provider_last_updated: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    console.error('create-intent error', e);
    return NextResponse.json({ error: 'Payment intent creation failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
