/**
 * Seller dashboard — Connect onboarding + recent agreements (read-only).
 * Auth: client `useAuth()` (localStorage `pemabu_auth_user`); mirrors compliance cookie pattern for Trust Center.
 * TODO: Replace with server session + httpOnly cookie when production auth ships.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { StripeConnectOnboarding } from '@/portal/components/StripeConnectOnboarding';

interface ConnectStatus {
  status?: string;
  payoutsEnabled?: boolean;
  onboardingComplete?: boolean;
}

interface RecentContract {
  id: string;
  status: string;
  provider_status: string | null;
  stripe_payment_intent_id: string | null;
}

export default function SellerDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [contracts, setContracts] = useState<RecentContract[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sellerId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !sellerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [statusRes, contractsRes] = await Promise.all([
          fetch(`/api/stripe/connect/status?sellerId=${encodeURIComponent(sellerId)}`, { cache: 'no-store' }),
          fetch(`/api/seller/recent-contracts?sellerId=${encodeURIComponent(sellerId)}`, { cache: 'no-store' }),
        ]);

        const statusJson = (await statusRes.json()) as ConnectStatus & { error?: string };
        const contractsJson = (await contractsRes.json()) as {
          contracts?: RecentContract[];
          totalCount?: number;
          error?: string;
        };

        if (!statusRes.ok) {
          throw new Error(statusJson.error ?? 'Could not load Connect status');
        }
        if (!contractsRes.ok) {
          throw new Error(contractsJson.error ?? 'Could not load agreements');
        }

        if (!cancelled) {
          setConnectStatus(statusJson);
          setContracts(contractsJson.contracts ?? []);
          setTotalCount(typeof contractsJson.totalCount === 'number' ? contractsJson.totalCount : null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, sellerId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold mb-4">Seller dashboard</h1>
          <p className="text-neutral-400">Sign in (developer role simulator on localhost) to view your seller workspace.</p>
        </main>
      </div>
    );
  }

  if (!sellerId) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold mb-4">Seller dashboard</h1>
          <p className="text-neutral-400">
            {/* TODO: Replace missing user id with session user ID when auth is server-backed. */}
            Missing user id in session.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Navigation />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Seller dashboard</h1>
          <p className="text-sm text-neutral-500">
            Agreements (you as provider):{' '}
            <span className="text-neutral-200 font-semibold">{totalCount ?? contracts.length}</span>
          </p>
        </div>

        {loadError ? <p className="text-red-400">{loadError}</p> : null}
        {loading ? <p className="text-neutral-500">Loading…</p> : null}

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Payment account</h2>
          <StripeConnectOnboarding
            sellerId={sellerId}
            isOnboardingComplete={Boolean(connectStatus?.onboardingComplete)}
            payoutsEnabled={Boolean(connectStatus?.payoutsEnabled)}
          />
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Recent agreements</h2>
          {contracts.length === 0 ? (
            <p className="text-neutral-400">No agreements yet.</p>
          ) : (
            <ul className="space-y-3">
              {contracts.map((a) => (
                <li key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-800 pb-3 last:border-0">
                  <div>
                    <Link href={`/agreements/${a.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                      Agreement {a.id.slice(0, 8)}…
                    </Link>
                    <p className="text-xs text-neutral-500 mt-1">State: {a.status}</p>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {a.provider_status ? `Payment: ${a.provider_status}` : 'Payment: not started'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
