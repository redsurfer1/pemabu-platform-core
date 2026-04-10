'use client';

import { useState, useEffect } from 'react';
import { Shield, Zap, Activity, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigation } from '../components/Navigation';
import { TrendWatchCard } from '../components/TrendWatchCard';
import Link from 'next/link';
import { PROVIDER_PENDING_MESSAGE_FRIENDLY } from '@/app/lib/provider-pending-handler';

export default function DashboardPage() {
  const { hasTrustCenterAccess } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-neutral-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Navigation />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold">Command Center</h1>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                <span className="text-xs font-semibold text-emerald-400">LIVE</span>
              </div>
            </div>
            <p className="text-neutral-400">Your agreements and platform access overview</p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs text-neutral-500">Last Updated</p>
            <p className="font-mono text-sm text-neutral-300">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-emerald-900/30 bg-gradient-to-br from-emerald-950/20 to-neutral-900/50 p-8 lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-neutral-100">Agreement activity</h2>
            </div>
            <p className="mb-2 text-sm text-neutral-300">{PROVIDER_PENDING_MESSAGE_FRIENDLY}</p>
            <p className="text-xs text-neutral-500">
              Portfolio-style totals are not shown here under the clean model. Use jobs, marketplace, and Trust Center
              for non-custodial workflows.
            </p>
          </div>
          <div className="rounded-lg border border-yellow-900/30 bg-gradient-to-br from-yellow-950/10 to-neutral-900/50 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold">Agreement completion</h3>
            </div>
            <p className="mb-4 text-sm text-neutral-400">
              Yield and staking-style summaries are disabled until a licensed provider supplies read-only status.
            </p>
            <Link
              href="/staking"
              className="block w-full rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-sm font-semibold text-yellow-400 transition-colors hover:bg-yellow-500/20"
            >
              View status
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-neutral-400" />
              <h3 className="text-lg font-semibold">Agent programs</h3>
            </div>
            <Link
              href="/mfo"
              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500/20"
            >
              MFO
            </Link>
          </div>
          <div className="py-12 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-neutral-700" />
            <p className="mb-2 text-neutral-400">No program holdings displayed in-app.</p>
            <p className="mb-4 text-sm text-neutral-500">{PROVIDER_PENDING_MESSAGE_FRIENDLY}</p>
            <Link
              href="/jobs"
              className="inline-block rounded-lg border border-blue-500/30 bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500/20"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>

        {hasTrustCenterAccess ? (
          <div className="mb-6">
            <TrendWatchCard />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/jobs"
            className="group rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 transition-colors hover:bg-neutral-900"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                <Package className="h-5 w-5 text-blue-400" />
              </div>
              <h4 className="font-semibold">Marketplace</h4>
            </div>
            <p className="text-sm text-neutral-400">
              Browse gigs and agent programs — marketplace flows only; fund movement uses a licensed provider.
            </p>
          </Link>

          <Link
            href="/staking"
            className="group rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 transition-colors hover:bg-neutral-900"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <h4 className="font-semibold">Program status</h4>
            </div>
            <p className="text-sm text-neutral-400">
              See agreement-completion status placeholder — no in-app liquidity actions until Sprint 5.
            </p>
          </Link>

          <Link
            href="/compliance-review"
            className="group rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 transition-colors hover:bg-neutral-900"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
                <Shield className="h-5 w-5 text-violet-400" />
              </div>
              <h4 className="font-semibold">Trust Center</h4>
            </div>
            <p className="text-sm text-neutral-400">
              Audit trails and compliance certifications — not platform-held reserve proof.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
