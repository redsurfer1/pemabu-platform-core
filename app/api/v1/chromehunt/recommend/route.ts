import { NextResponse } from 'next/server';
import { getRecommendations } from '@/portal/lib/chromehunt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/chromehunt/recommend
 * Body: { "problemStatement": string }
 *
 * TODO: Add API key auth before exposing to external callers.
 */
export async function POST(req: Request) {
  let body: { problemStatement?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const problemStatement =
    typeof body.problemStatement === 'string' ? body.problemStatement : '';
  if (!problemStatement.trim()) {
    return NextResponse.json({
      success: true,
      recommendations: [] as unknown[],
    });
  }

  try {
    const recommendations = await getRecommendations(problemStatement);
    return NextResponse.json({ success: true, recommendations });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
