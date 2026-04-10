import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, systemState, ratio, metadata } = body;

    if (!eventType || !systemState || ratio === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, systemState, ratio' },
        { status: 400 }
      );
    }

    const prisma = new PrismaClient();

    const recentLedgerEntries = await prisma.ledgerEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        flomismaTxId: true,
        userId: true,
        tenantId: true,
      },
    });

    const agentCount = await prisma.user.count({
      where: { role: 'AI_AGENT' },
    });

    const agentEquity = await prisma.agentEquity.findFirst({
      select: {
        totalSupply: true,
        circulatingSupply: true,
      },
    });

    const ledgerSum = await prisma.ledgerEntry.aggregate({
      _sum: {
        amount: true,
      },
    });

    const totalReserves = new Prisma.Decimal(1000000);
    const calculatedLedgerSum = ledgerSum._sum.amount || new Prisma.Decimal(0);

    await prisma.auditEvidence.create({
      data: {
        eventType,
        systemState,
        reserveRatio: new Prisma.Decimal(ratio),
        ledgerSum: calculatedLedgerSum,
        reserveSum: totalReserves,
        snapshotData: {
          ratio,
          systemState,
          recentLedgerEntries,
          agentCount,
          totalSupply: agentEquity?.totalSupply.toString() || '1000000',
          circulatingSupply: agentEquity?.circulatingSupply.toString() || '0',
          timestamp: new Date().toISOString(),
        },
        metadata: metadata || {},
      },
    });

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Audit snapshot captured successfully',
      eventType,
      systemState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to capture audit snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to capture audit snapshot' },
      { status: 500 }
    );
  }
}
