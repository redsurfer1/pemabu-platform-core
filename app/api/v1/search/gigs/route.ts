import { NextResponse } from 'next/server';
import { executeGigSearch, type GigSearchInput } from '@/portal/lib/search/gigSearch';

export const dynamic = 'force-dynamic';

// NOTE: This route serves both gig listings and service task search. A separate /search/tasks
// route was evaluated and determined redundant. See: portal/docs/search-upgrade-design.md
// See: FLOMISMA_PLATFORM/docs/SPRINT_SUMMARY.md Section 10.1

// Vertical-aware search: 'culinary' enforces location requirements and proximity sort for SpiceKrewe.
// 'services' or undefined uses standard Pemabu behavior.
// Vertical is provided by the tenant's frontend based on config.json vertical field.

/**
 * POST /api/v1/search/gigs
 * Public search over open TreasuryTask rows (P0 structured filters + FTS fallback).
 *
 * TODO: Add authentication / rate limiting before production exposure.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const b = body as Partial<GigSearchInput>;
  if (!b.tenantId || typeof b.tenantId !== 'string') {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const verticalRaw = b.vertical;
  const vertical =
    verticalRaw === 'culinary' || verticalRaw === 'services' ? verticalRaw : undefined;

  const loc =
    b.location && typeof b.location === 'object'
      ? {
          city: typeof b.location.city === 'string' ? b.location.city : undefined,
          state: typeof b.location.state === 'string' ? b.location.state : undefined,
          country: typeof b.location.country === 'string' ? b.location.country : undefined,
          lat: typeof b.location.lat === 'number' ? b.location.lat : undefined,
          lng: typeof b.location.lng === 'number' ? b.location.lng : undefined,
          radiusMiles:
            typeof b.location.radiusMiles === 'number' ? b.location.radiusMiles : undefined,
          remoteOk:
            typeof b.location.remoteOk === 'boolean' ? b.location.remoteOk : undefined,
        }
      : undefined;

  if (vertical === 'culinary') {
    const hasCityState =
      Boolean(loc?.city?.trim()) && Boolean(loc?.state?.trim());
    const hasCoords =
      typeof loc?.lat === 'number' &&
      Number.isFinite(loc.lat) &&
      typeof loc?.lng === 'number' &&
      Number.isFinite(loc.lng);
    if (!hasCityState && !hasCoords) {
      return NextResponse.json(
        {
          error: 'CULINARY_LOCATION_REQUIRED',
          message:
            'For vertical=culinary, provide location.city and location.state, or location.lat and location.lng.',
        },
        { status: 400 }
      );
    }
  }

  const page = typeof b.page === 'number' && b.page > 0 ? Math.floor(b.page) : 1;
  const limit =
    typeof b.limit === 'number' && b.limit > 0 ? Math.min(50, Math.floor(b.limit)) : 20;

  const input: GigSearchInput = {
    tenantId: b.tenantId,
    query: typeof b.query === 'string' ? b.query : undefined,
    categorySlug: typeof b.categorySlug === 'string' ? b.categorySlug : undefined,
    location: loc,
    vertical,
    page,
    limit,
  };

  try {
    const { data, total, page: p } = await executeGigSearch(input);
    const res = NextResponse.json({ data, total, page: p });
    if (vertical === 'culinary') {
      res.headers.set('X-Vertical', 'culinary');
    }
    return res;
  } catch (e) {
    console.error('search/gigs', e);
    return NextResponse.json({ error: 'SEARCH_FAILED' }, { status: 500 });
  }
}
