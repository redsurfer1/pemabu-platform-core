'use client';

import { PROVIDER_PENDING_MESSAGE_FRIENDLY } from '@/app/lib/provider-pending-handler';

/**
 * CLEAN MODEL 2026-04-02: Staking / buffer liquidity UI removed pending licensed provider.
 * TODO Sprint 5: Re-enable when licensed provider integration is complete. See approach-c docs.
 */
export function StakingDashboard() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-neutral-100 mb-3">Platform access — staking</h1>
      <p className="text-neutral-300 mb-2">{PROVIDER_PENDING_MESSAGE_FRIENDLY}</p>
      <p className="text-sm text-neutral-500">
        Liquidity or staking-style actions are not available in this app until provider integration ships.
      </p>
    </div>
  );
}
