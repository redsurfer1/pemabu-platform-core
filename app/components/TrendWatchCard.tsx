'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';

/**
 * Trend Watch — Admin only. Populated by Moltbook Scraper as a background insight task.
 * Shows aggregated trend data; no promotion buttons. Launch MVP: placeholder until scraper is wired.
 */
export function TrendWatchCard() {
  const [trends, setTrends] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trend-watch')
      .then((res) => res.ok ? res.json() : { trends: [] })
      .then((data) => setTrends(data.trends ?? []))
      .catch(() => setTrends([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-lg border border-neutral-700/80 bg-neutral-900/60 p-4">
      <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        Trend Watch
      </h3>
      <p className="text-xs text-neutral-500 mb-3">
        Background insight (Moltbook Scraper). Admin only.
      </p>
      {loading ? (
        <div className="animate-pulse h-16 rounded bg-neutral-800/50" />
      ) : trends.length === 0 ? (
        <p className="text-xs text-neutral-500">No trend data yet. Scraper runs in background.</p>
      ) : (
        <ul className="space-y-2">
          {trends.map((t, i) => (
            <li key={i} className="flex justify-between text-xs">
              <span className="text-neutral-400">{t.label}</span>
              <span className="text-neutral-200">{t.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
