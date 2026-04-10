/**
 * My agreements — lists contracts where the user is employer or employee.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/contexts/AuthContext';

interface Row {
  id: string;
  status: string;
  employerId: string;
  employeeId: string;
  provider_status: string | null;
}

export default function AgreementsListPage() {
  const { user, isAuthenticated } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/agreements/mine?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
        const data = (await res.json()) as { contracts?: Row[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to load');
        if (!cancelled) setRows(data.contracts ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load agreement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold mb-4">My agreements</h1>
          <p className="text-neutral-400">Sign in to view agreements.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Navigation />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-2xl font-bold">My agreements</h1>
        {loading ? <p className="text-neutral-500">Loading…</p> : null}
        {error ? <p className="text-red-400">{error}</p> : null}
        {!loading && rows.length === 0 ? <p className="text-neutral-400">No agreements yet.</p> : null}
        <ul className="space-y-3">
          {rows.map((r) => {
            const side = user?.id === r.employerId ? 'buyer' : 'seller';
            return (
              <li key={r.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Link href={`/agreements/${r.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                      Agreement {r.id.slice(0, 8)}…
                    </Link>
                    <p className="text-xs text-neutral-500 mt-1">
                      {side} · {r.status}
                      {r.provider_status ? ` · ${r.provider_status}` : ''}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
