/**
 * GET/POST /api/v1/concierge/admin/review
 * CLEAN MODEL: Admin review only; no custodial funds.
 * See: docs/dual-entity-operating-boundary.md
 */

import { NextResponse } from 'next/server';
import { getPrismaSystem } from '@/src/lib/prisma-system';

export const dynamic = 'force-dynamic';

function assertAdmin(req: Request): boolean {
  const secret = process.env.PEMABU_ADMIN_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('x-pemabu-admin-secret') === secret;
}

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const prisma = getPrismaSystem();
  const rows = await prisma.conciergeBrief.findMany({
    where: { status: 'pending_review' },
    orderBy: { createdAt: 'asc' },
    include: { packages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: {
    briefId?: string;
    action?: 'approve' | 'modify' | 'reject';
    modifiedPackageJson?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.briefId || !body.action) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const prisma = getPrismaSystem();
  const brief = await prisma.conciergeBrief.findUnique({ where: { id: body.briefId } });
  if (!brief) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (body.action === 'approve') {
    await prisma.conciergeBrief.update({
      where: { id: body.briefId },
      data: {
        status: 'ready',
        requiresHumanReview: false,
        humanReviewedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'reject') {
    await prisma.conciergeBrief.update({
      where: { id: body.briefId },
      data: { status: 'expired', requiresHumanReview: false, humanReviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'modify' && body.modifiedPackageJson != null) {
    const latest = await prisma.conciergePackage.findFirst({
      where: { briefId: body.briefId },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      await prisma.conciergePackage.update({
        where: { id: latest.id },
        data: { packageJson: body.modifiedPackageJson as object },
      });
    }
    await prisma.conciergeBrief.update({
      where: { id: body.briefId },
      data: {
        status: 'ready',
        aiPackageJson: body.modifiedPackageJson as object,
        requiresHumanReview: false,
        humanReviewedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
}
