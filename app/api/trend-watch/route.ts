import { NextResponse } from 'next/server';

/**
 * GET /api/trend-watch — Admin-only. Moltbook Scraper populates this as a background insight task.
 * Launch MVP: returns placeholder until scraper is wired.
 */
export async function GET() {
  return NextResponse.json({
    trends: [],
    message: 'Trend Watch populated by Moltbook Scraper (background task). Admin only.',
  });
}
