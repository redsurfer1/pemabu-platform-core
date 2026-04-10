// CLEAN MODEL 2026-04-02: Monetary-authority endpoint removed.
// See: FLOMISMA_PLATFORM/docs/dual-entity-operating-boundary.md

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  void request;
  return Response.json(
    {
      error: 'This operation is handled by the licensed provider.',
      code: 'PROVIDER_OPERATION',
      reference: 'FLOMISMA_PLATFORM/docs/dual-entity-operating-boundary.md',
    },
    { status: 501 }
  );
}
