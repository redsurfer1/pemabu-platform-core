import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizeTrustRole, type TrustRole } from '@/types/auth';

const ADMIN_ENTITY_HEADER = 'X-Admin-Entity-Context';
const VALID_ENTITY_VALUES = ['FLOMISMA_ADMIN', 'PEMABU_ADMIN', 'DUAL_ADMIN'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Governance: /api/admin/* requires X-Admin-Entity-Context (Sovereign Command Center / V4.1)
  if (pathname.startsWith('/api/admin/')) {
    const value = request.headers.get(ADMIN_ENTITY_HEADER);
    if (!value || !VALID_ENTITY_VALUES.includes(value)) {
      return new NextResponse(
        JSON.stringify({
          error: 'GOVERNANCE_REQUIRED',
          message:
            'X-Admin-Entity-Context header is required for admin API access. Use FLOMISMA_ADMIN, PEMABU_ADMIN, or DUAL_ADMIN.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  if (pathname.startsWith('/compliance-review') || pathname.startsWith('/trust-center')) {
    const authCookie = request.cookies.get('pemabu_auth_user');

    if (!authCookie) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('error', 'authentication_required');
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const user = JSON.parse(authCookie.value);
      const trustRole = normalizeTrustRole(user?.trustRole);

      const allowed: TrustRole[] = ['ADVISOR', 'USER', 'ADMIN'];
      if (!trustRole || !allowed.includes(trustRole)) {
        const accessDeniedUrl = new URL('/', request.url);
        accessDeniedUrl.searchParams.set('error', 'access_denied');
        return NextResponse.redirect(accessDeniedUrl);
      }
    } catch (error) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('error', 'invalid_session');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/compliance-review/:path*', '/trust-center/:path*'],
};
