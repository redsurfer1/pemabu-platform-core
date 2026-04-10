/**
 * Read-only agreement (Contract) detail for buyer/seller views.
 * CLEAN MODEL: no fund movement.
 *
 * TODO: Replace userId query param with authenticated session when server auth is wired.
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const prisma = new PrismaClient();
  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        milestones: {
          select: {
            id: true,
            title: true,
            isVerified: true,
            releaseDate: true,
            amount: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (contract.employerId !== userId && contract.employeeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = contract.employerId === userId ? 'buyer' : 'seller';

    return NextResponse.json({
      contract: {
        id: contract.id,
        status: contract.status,
        employerId: contract.employerId,
        employeeId: contract.employeeId,
        escrowAmount: contract.escrowAmount.toString(),
        provider_status: contract.provider_status,
        stripe_payment_intent_id: contract.stripe_payment_intent_id,
        milestones: contract.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          isVerified: m.isVerified,
          releaseDate: m.releaseDate ? m.releaseDate.toISOString() : null,
          amount: m.amount.toString(),
        })),
      },
      role,
    });
  } catch (e) {
    console.error('agreement detail', e);
    return NextResponse.json({ error: 'Failed to load agreement' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
