import { NextRequest, NextResponse } from 'next/server';
import { getPromotedJobsFeed } from '@/src/lib/job-promotion-protocol';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs — Promoted job listings (scrubbed via privacy-shield for public feed).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') ?? undefined;
    const userRole = searchParams.get('userRole') ?? 'PUBLIC';
    const isAdminRoute = searchParams.get('admin') === 'true';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    const feed = await getPromotedJobsFeed({
      tenantId: tenantId || null,
      userRole,
      isAdminRoute,
      limit,
    });

    return NextResponse.json({ jobs: feed });
  } catch (error) {
    console.error('Failed to fetch jobs feed:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
