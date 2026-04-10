/**
 * Read-only recent contracts for a seller (employee on Contract).
 * CLEAN MODEL: no fund movement; metadata display only.
 *
 * TODO: Bind to authenticated session / server-side auth when Pemabu replaces localStorage demo auth.
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sellerId = searchParams.get('sellerId');

  if (!sellerId) {
    return NextResponse.json({ error: 'sellerId required' }, { status: 400 });
  }

  const prisma = new PrismaClient();
  try {
    const [contracts, totalCount] = await Promise.all([
      prisma.contract.findMany({
        where: { employeeId: sellerId },
        orderBy: { id: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          provider_status: true,
          stripe_payment_intent_id: true,
        },
      }),
      prisma.contract.count({ where: { employeeId: sellerId } }),
    ]);

    return NextResponse.json({ contracts, totalCount });
  } catch (e) {
    console.error('recent-contracts', e);
    return NextResponse.json({ error: 'Failed to load contracts' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
