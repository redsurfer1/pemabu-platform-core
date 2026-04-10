'use client';

import { X, TrendingUp, TrendingDown, Minus, Sparkles, TriangleAlert as AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MfoRowScenarioRecalculated } from '@/lib/mfo/engine';
import type { PortfolioAssumptionsValidated } from '@/lib/mfo/schema';

export type SignalExplainerProps = {
  open: boolean;
  onClose: () => void;
  row: MfoRowScenarioRecalculated | null;
  assumptions: PortfolioAssumptionsValidated | null;
};

function AlertBadge({ text }: { text: string | null | undefined }) {
  if (!text) return <span className="text-neutral-500">—</span>;
  if (/consider entry/i.test(text)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-700/50">
        <TrendingUp className="h-3 w-3" />
        {text}
      </span>
    );
  }
  if (/consider exit|exit review/i.test(text)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-700/50">
        <TrendingDown className="h-3 w-3" />
        {text}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400 ring-1 ring-neutral-700">
      <Minus className="h-3 w-3" />
      {text}
    </span>
  );
}

function SkeletonLine({ width = 'w-full', className = '' }: { width?: string; className?: string }) {
  return (
    <div className={`h-3 animate-pulse rounded bg-neutral-800 ${width} ${className}`} />
  );
}

function AiAnalysisSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-teal-400" />
        <span className="text-xs font-medium text-teal-300">Generating analysis…</span>
      </div>
      <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
        <SkeletonLine />
        <SkeletonLine width="w-5/6" />
        <SkeletonLine width="w-4/6" />
        <SkeletonLine className="mt-3" />
        <SkeletonLine width="w-3/4" />
        <SkeletonLine width="w-5/6" />
        <SkeletonLine width="w-2/3" className="mt-3" />
      </div>
      <p className="text-[10px] text-neutral-600">
        MFO Portfolio Specialist is interpreting signals, parity drift, and factor weights…
      </p>
    </div>
  );
}

function AiReadyPlaceholder({ symbol }: { symbol: string }) {
  return (
    <div className="rounded-lg border border-teal-900/40 bg-teal-950/20 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
        <div>
          <p className="text-sm font-medium text-teal-200">MFO Portfolio Specialist</p>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
            Connect{' '}
            <code className="rounded bg-neutral-800 px-1 py-0.5 text-xs text-teal-300">/api/mfo/explain</code>{' '}
            to stream an institutional narrative for{' '}
            <span className="font-medium text-neutral-200">{symbol}</span> — parity context,
            RSI framing, horizon-weight sensitivity, and sleeve rebalancing guidance.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-neutral-800/60 py-1.5 last:border-0">
      <dt className="shrink-0 text-xs text-neutral-500">{label}</dt>
      <dd className={`text-right text-xs text-neutral-200 ${mono ? 'tabular-nums' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

export function SignalExplainer({ open, onClose, row, assumptions }: SignalExplainerProps) {
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setAiLoading(true);
    const t = setTimeout(() => setAiLoading(false), 2200);
    return () => clearTimeout(t);
  }, [open, row]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !row) return null;

  const parityDelta = row.parityChangeDollars;

  const fmtUsd = (n: number | null | undefined) => {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      signDisplay: 'always',
    }).format(n);
  };

  const fmtPct = (n: number | null | undefined) => {
    if (n == null || !Number.isFinite(n)) return '—';
    return `${(n * 100).toFixed(2)}%`;
  };

  const signalColor = /consider entry/i.test(row.alertPrimary ?? '')
    ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.35)]'
    : /consider exit|exit review/i.test(row.alertPrimary ?? '')
    ? 'bg-amber-500 shadow-[0_0_6px_2px_rgba(245,158,11,0.35)]'
    : 'bg-neutral-600';

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Signal context for ${row.symbol}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-full flex-col border-l border-neutral-800 bg-neutral-950 shadow-2xl sm:max-w-[480px]">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${signalColor}`} />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                Signal Context
              </p>
              <h2 className="text-lg font-bold tracking-tight text-neutral-100">{row.symbol}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <p className="line-clamp-3 text-sm leading-relaxed text-neutral-400">
              {row.name || '—'}
            </p>
            <span className="mt-1.5 inline-block rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              {row.rowStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-neutral-600">Primary</p>
              <div className="mt-1.5">
                <AlertBadge text={row.alertPrimary} />
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-neutral-600">Secondary</p>
              <div className="mt-1.5">
                <AlertBadge text={row.alertSecondary} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Position Metrics
            </p>
            <dl>
              <MetricRow
                label="Composite Score"
                mono
                value={row.compositeScore != null ? row.compositeScore.toFixed(2) : '—'}
              />
              <MetricRow label="Rank" mono value={`#${row.compositeRank}`} />
              <MetricRow
                label="RSI"
                mono
                value={row.rsi != null ? row.rsi.toFixed(0) : '—'}
              />
              <MetricRow label="Current Weight" mono value={fmtPct(row.currentWeight)} />
              <MetricRow label="Target Parity" mono value={fmtPct(row.targetParityWeight)} />
              <MetricRow label="Target Sleeve" mono value={fmtPct(row.targetSleevePct)} />
              <MetricRow
                label="Parity Δ $"
                mono
                value={
                  <span
                    className={
                      parityDelta == null
                        ? 'text-neutral-500'
                        : parityDelta > 0
                        ? 'text-emerald-400'
                        : parityDelta < 0
                        ? 'text-amber-400'
                        : 'text-neutral-400'
                    }
                  >
                    {fmtUsd(parityDelta)}
                  </span>
                }
              />
              <MetricRow
                label="Market Value"
                mono
                value={
                  row.marketValue != null
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      }).format(row.marketValue)
                    : '—'
                }
              />
              <MetricRow label="Expense Ratio" mono value={fmtPct(row.expenseRatio)} />
              <MetricRow label="Div APY" mono value={fmtPct(row.divApy)} />
            </dl>
          </div>

          {assumptions && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Active Scenario Weights
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="text-neutral-500">3 mo return</div>
                <div className="tabular-nums text-right text-neutral-300">
                  {(assumptions.returnHorizons.threeMo * 100).toFixed(0)}%
                </div>
                <div className="text-neutral-500">6 mo return</div>
                <div className="tabular-nums text-right text-neutral-300">
                  {(assumptions.returnHorizons.sixMo * 100).toFixed(0)}%
                </div>
                <div className="text-neutral-500">1 yr return</div>
                <div className="tabular-nums text-right text-neutral-300">
                  {(assumptions.returnHorizons.oneYr * 100).toFixed(0)}%
                </div>
                <div className="text-neutral-500">Expense wt.</div>
                <div className="tabular-nums text-right text-neutral-300">
                  {(assumptions.factors.expense * 100).toFixed(0)}%
                </div>
                <div className="text-neutral-500">Div APY wt.</div>
                <div className="tabular-nums text-right text-neutral-300">
                  {(assumptions.factors.divApy * 100).toFixed(0)}%
                </div>
                <div className="text-neutral-500">Volatility wt.</div>
                <div className="tabular-nums text-right text-neutral-300">
                  {(assumptions.factors.volatility * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                AI Analysis
              </p>
            </div>
            {aiLoading ? <AiAnalysisSkeleton /> : <AiReadyPlaceholder symbol={row.symbol} />}
          </div>

          {row.rsi != null && row.rsi >= 65 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-amber-200/90">
                RSI of {row.rsi.toFixed(0)} may indicate overextended conditions in the
                model&apos;s framing. This is not a trading signal.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 bg-neutral-950/80 px-5 py-3">
          <p className="text-[10px] leading-relaxed text-neutral-600">
            Educational purposes only. Not investment advice. Pemabu and Flomisma are not
            registered investment advisors. No transactions are executed through this platform.
          </p>
        </div>
      </aside>
    </div>
  );
}
