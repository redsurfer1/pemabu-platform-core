'use client';

const DISCLAIMER =
  'Educational purposes only — not investment advice. Pemabu and Flomisma are not registered investment advisors. No transactions are executed through this platform.';

/**
 * Persistent compliance strip for MFO surfaces (README-aligned).
 */
export function MfoComplianceBanner() {
  return (
    <div className="border-b border-amber-900/40 bg-amber-950/30 px-3 py-2 text-center text-[11px] leading-snug text-amber-100/90 sm:text-xs">
      {DISCLAIMER}
    </div>
  );
}
