import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET() {
  try {
    const snapshots = await prisma.auditEvidence.findMany({
      orderBy: {
        triggeredAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      snapshots: snapshots.map(snapshot => ({
        ...snapshot,
        reserveRatio: snapshot.reserveRatio?.toString(),
        ledgerSum: snapshot.ledgerSum?.toString(),
        reserveSum: snapshot.reserveSum?.toString(),
      })),
      total: snapshots.length,
    });
  } catch (error) {
    console.error('Failed to fetch audit evidence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit evidence' },
      { status: 500 }
    );
  }
}
