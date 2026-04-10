/**
 * POST /api/v1/concierge/accept
 * CLEAN MODEL: Revenue via Stripe. Platform does not hold funds.
 * See: docs/dual-entity-operating-boundary.md
 */

import { NextResponse } from 'next/server';
import { getStripeServer } from '@/portal/lib/stripe/server';
import { getPrismaSystem } from '@/src/lib/prisma-system';

export const dynamic = 'force-dynamic';

const FEE_CENTS = 7500;

export async function POST(req: Request) {
  let body: { briefId?: string; packageId?: string; buyerId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.briefId || !body.packageId) {
    return NextResponse.json({ error: 'briefId and packageId required' }, { status: 400 });
  }
  if (!body.buyerId) {
    return NextResponse.json({ error: 'buyerId required' }, { status: 400 });
  }

  const prisma = getPrismaSystem();
  const brief = await prisma.conciergeBrief.findUnique({
    where: { id: body.briefId },
    include: { packages: true },
  });
  if (!brief || brief.buyerId !== body.buyerId) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const pkg = brief.packages.find((p) => p.id === body.packageId);
  if (!pkg) {
    return NextResponse.json({ error: 'PACKAGE_NOT_FOUND' }, { status: 404 });
  }

  if (brief.status !== 'ready') {
    return NextResponse.json({ error: 'BRIEF_NOT_ACCEPTABLE' }, { status: 409 });
  }

  await prisma.conciergePackage.update({
    where: { id: pkg.id },
    data: { status: 'accepted', acceptedAt: new Date() },
  });
  await prisma.conciergeBrief.update({
    where: { id: brief.id },
    data: { status: 'accepted' },
  });

  const rawPkg = pkg.packageJson as {
    packageItems?: Array<{ providerType?: string }>;
  };
  const providerTypes = (rawPkg.packageItems ?? []).map((it) =>
    it.providerType === 'food_truck' ? 'food_truck' : 'private_chef',
  );

  const stripe = getStripeServer();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: FEE_CENTS,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      flow: 'concierge_fee',
      briefId: brief.id,
      packageId: pkg.id,
      buyerId: brief.buyerId,
      citySlug: brief.citySlug,
      providerTypes: JSON.stringify(providerTypes),
    },
  });

  await prisma.conciergeBrief.update({
    where: { id: brief.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    briefId: brief.id,
    packageId: pkg.id,
  });
}
