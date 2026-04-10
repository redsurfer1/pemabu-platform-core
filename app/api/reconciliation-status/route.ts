// CLEAN MODEL 2026-04-02: Monetary-authority reporting removed (ledger/reserve sums).
// See: FLOMISMA_PLATFORM/docs/dual-entity-operating-boundary.md

export async function GET(request: Request) {
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
