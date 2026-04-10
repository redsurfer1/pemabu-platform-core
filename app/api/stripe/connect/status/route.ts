/**
 * Read-only Connect onboarding status for a seller.
 * No fund movement.
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const prisma = new PrismaClient();
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId required' }, { status: 400 });
    }

    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectOnboardingComplete: true,
        stripeConnectPayoutsEnabled: true,
      },
    });

    if (!seller?.stripeConnectAccountId) {
      return NextResponse.json({
        status: 'not_started',
        payoutsEnabled: false,
        onboardingComplete: false,
      });
    }

    return NextResponse.json({
      status: seller.stripeConnectOnboardingComplete ? 'complete' : 'pending',
      payoutsEnabled: seller.stripeConnectPayoutsEnabled,
      onboardingComplete: seller.stripeConnectOnboardingComplete,
    });
  } finally {
    await prisma.$disconnect();
  }
}
