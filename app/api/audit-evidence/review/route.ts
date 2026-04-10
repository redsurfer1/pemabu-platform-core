import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snapshotId, reviewedBy } = body;

    if (!snapshotId || !reviewedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: snapshotId, reviewedBy' },
        { status: 400 }
      );
    }

    const updatedSnapshot = await prisma.auditEvidence.update({
      where: { id: snapshotId },
      data: {
        reviewedBy,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      snapshot: {
        ...updatedSnapshot,
        reserveRatio: updatedSnapshot.reserveRatio?.toString(),
        ledgerSum: updatedSnapshot.ledgerSum?.toString(),
        reserveSum: updatedSnapshot.reserveSum?.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to review audit evidence:', error);
    return NextResponse.json(
      { error: 'Failed to review audit evidence' },
      { status: 500 }
    );
  }
}
