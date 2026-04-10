'use client';

import { useEffect, useState, useCallback } from 'react';
import type { WarRoomData } from '@/src/lib/war-room-types';
import { Activity, Shield, Users, Heart, RefreshCw } from 'lucide-react';
import { useEntity, useAdminEntityHeader } from '@/portal/app/context/EntityContext';

const BORDER_COPPER = 'border-copper-500/30';
const NAVY_BG = 'bg-[#0B1120]';

export function WarRoomClient({ initialData }: { initialData: WarRoomData | null }) {
  const [data, setData] = useState<WarRoomData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const { headerContext } = useEntity();
  const entityHeaders = useAdminEntityHeader();

  const fetchWarRoom = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/war-room', {
      headers: { 'X-Admin-Entity-Context': headerContext, ...entityHeaders },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [headerContext, entityHeaders]);

  useEffect(() => {
    if (data === null) {
      fetchWarRoom();
    }
  }, [data, fetchWarRoom]);

  if (!data) {
    return (
      <div className={`rounded-xl border ${BORDER_COPPER} p-8 ${NAVY_BG} text-center text-slate-500`}>
        Loading War Room data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">V4.1 Gold Standard · Entity-scoped</span>
        <button
          type="button"
          onClick={fetchWarRoom}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-copper-500/30 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Real-Time Vitals: Solvency + Drift Guard */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={`rounded-xl border ${BORDER_COPPER} p-6 ${NAVY_BG}`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-copper/80">
            <Activity className="h-4 w-4" />
            Solvency Ratio
          </h2>
          <p className="text-3xl font-bold text-white">{data.solvencyRatio.toFixed(2)}x</p>
          <p className="mt-1 text-sm text-slate-400">Target ≥ {data.solvencyTarget}x</p>
          <div
            className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${
              data.solvencyOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {data.solvencyOk ? 'On target' : 'Below target'}
          </div>
          {data.isHalted && <p className="mt-2 text-xs text-amber-400">Minting halted</p>}
        </div>

        <div className={`rounded-xl border ${BORDER_COPPER} p-6 ${NAVY_BG}`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-copper/80">
            <Shield className="h-4 w-4" />
            Drift Guard
          </h2>
          {data.driftGuard ? (
            <>
              <p
                className={`text-2xl font-bold ${
                  data.driftGuard.status === 'OK' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {data.driftGuard.status}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Last run: {new Date(data.driftGuard.ranAt).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                Discrepancy: {data.driftGuard.discrepancy.toFixed(6)}
              </p>
            </>
          ) : (
            <p className="text-slate-500">No reconciliation runs yet</p>
          )}
        </div>

        <div className={`rounded-xl border ${BORDER_COPPER} p-6 ${NAVY_BG}`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-copper/80">
            <Heart className="h-4 w-4" />
            Sanctions Pulse
          </h2>
          <div
            className={`inline-flex h-4 w-4 rounded-full ${
              data.sanctionsPulse.green ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            title={data.sanctionsPulse.lastSuccess ?? 'No successful heartbeat'}
          />
          <p className="mt-2 text-sm text-slate-300">
            {data.sanctionsPulse.green
              ? `Last success: ${new Date(data.sanctionsPulse.lastSuccess!).toLocaleString()}`
              : 'No recent Sanctions Heartbeat'}
          </p>
        </div>
      </section>

      {/* Alpha Tracker: Genesis 5 */}
      <section className={`rounded-xl border ${BORDER_COPPER} p-6 ${NAVY_BG}`}>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-copper/80">
          <Users className="h-4 w-4" />
          Genesis 5 — Alpha Tracker
        </h2>
        <div className="space-y-3">
          {data.genesisAlpha.length === 0 ? (
            <p className="text-sm text-slate-500">No Genesis Alpha users</p>
          ) : (
            data.genesisAlpha.map((u) => (
              <div
                key={u.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-copper-500/20 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-200">{u.email ?? u.legalName ?? u.userId}</p>
                  {u.legalName && u.email && (
                    <p className="text-xs text-slate-500">{u.legalName}</p>
                  )}
                </div>
                <div className="text-sm text-copper">
                  ILoC:{' '}
                  {u.ilocUtilization.length === 0
                    ? '—'
                    : u.ilocUtilization.map((s) => `Slot ${s.slotNumber}=${s.status}`).join(', ')}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
