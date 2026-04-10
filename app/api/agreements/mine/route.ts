/**
 * Agreements involving the current user (employer or employee).
 * Read-only; CLEAN MODEL.
 *
 * TODO: Replace userId query with server session auth.
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const prisma = new PrismaClient();
  try {
    const contracts = await prisma.contract.findMany({
      where: {
        OR: [{ employerId: userId }, { employeeId: userId }],
      },
      orderBy: { id: 'desc' },
      take: 25,
      select: {
        id: true,
        status: true,
        employerId: true,
        employeeId: true,
        provider_status: true,
      },
    });

    return NextResponse.json({ contracts });
  } catch (e) {
    console.error('agreements mine', e);
    return NextResponse.json({ error: 'Failed to load agreements' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
