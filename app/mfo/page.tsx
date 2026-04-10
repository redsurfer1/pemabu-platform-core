'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Upload, Loader as Loader2, ChartBar as BarChart3, SlidersHorizontal, Table2, ChevronDown, ChevronUp, FileText, RefreshCw, CircleAlert as AlertCircle, TrendingUp, TrendingDown, Activity, DollarSign, X } from 'lucide-react';
import { MfoComplianceBanner } from '@/components/mfo/MfoComplianceBanner';
import { ScenarioSliders } from '@/components/mfo/ScenarioSliders';
import { EtfDataTable } from '@/components/mfo/EtfDataTable';
import { ParityHeatmap } from '@/components/mfo/ParityHeatmap';
import { SignalExplainer } from '@/components/mfo/SignalExplainer';
import { PemabuLogo } from '@/components/brand/PemabuLogo';
import { DEFAULT_MFO_ASSUMPTIONS } from '@/lib/mfo/default-assumptions';
import { recalculateMfoRanks } from '@/lib/mfo/engine';
import { getFallbackBrief } from '@/lib/mfo/brief-engine';
import type { MfoPortfolioBrief } from '@/lib/mfo/brief-engine';
import type { MfoRowScenarioRecalculated } from '@/lib/mfo/engine';
import type { MfoRowValidated, PortfolioAssumptionsValidated, PortfolioSnapshotValidated } from '@/lib/mfo/schema';
import { safeParsePortfolioSnapshot } from '@/lib/mfo/schema';

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = false,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <div
      className={`stat-card border transition-all duration-200 ${
        accent ? 'border-teal-800/40' : 'border-neutral-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
          {label}
        </p>
        {icon && (
          <div className={`rounded-md p-1.5 ${accent ? 'bg-teal-950/50' : 'bg-neutral-800/50'}`}>
            <span className={accent ? 'text-teal-500' : 'text-neutral-500'}>{icon}</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p
          className={`text-2xl font-bold tabular-nums leading-none ${
            accent ? 'text-teal-300' : 'text-neutral-100'
          }`}
        >
          {value}
        </p>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-teal-500" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-amber-500" />}
      </div>
      {sub && <p className="mt-1.5 text-[11px] text-neutral-600">{sub}</p>}
    </div>
  );
}

function BriefSection({ brief, onClose }: { brief: MfoPortfolioBrief; onClose: () => void }) {
  return (
    <div className="animate-slide-up space-y-0 rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-teal-950/60 p-1.5">
            <FileText className="h-3.5 w-3.5 text-teal-400" />
          </div>
          <span className="text-xs font-semibold text-neutral-200">Weekly Portfolio Brief</span>
          <span className="rounded-full border border-teal-800/40 bg-teal-950/30 px-2 py-0.5 text-[10px] text-teal-500">
            Deterministic · Sandbox Mode
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-neutral-600 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-0 divide-y divide-neutral-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
            Executive Summary
          </p>
          <p className="text-sm leading-relaxed text-neutral-300">{brief.executiveSummary}</p>
        </div>
        <div className="p-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
            Allocation Drift
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">
            {brief.allocationDrift}
          </p>
        </div>
        <div className="p-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
            Top Signal Changes
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">
            {brief.topSignalChanges}
          </p>
        </div>
      </div>

      <div className="border-t border-amber-900/20 bg-amber-950/10 px-5 py-2.5">
        <p className="text-[10px] leading-relaxed text-amber-300/60">{brief.complianceFooter}</p>
      </div>
    </div>
  );
}

function BriefSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-5 py-3">
        <div className="skeleton h-7 w-7 rounded-md" />
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-5 w-28 rounded-full" />
      </div>
      <div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-neutral-800">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2.5 p-5">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-4/5 rounded" />
              <div className="skeleton h-3 w-3/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionToggle({
  label,
  icon,
  collapsed,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 transition-colors hover:text-neutral-300"
      onClick={onToggle}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {collapsed ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronUp className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export default function MfoDashboardPage() {
  const [baseRows, setBaseRows] = useState<MfoRowValidated[]>([]);
  const [assumptions, setAssumptions] = useState<PortfolioAssumptionsValidated>(DEFAULT_MFO_ASSUMPTIONS);
  const [snapshot, setSnapshot] = useState<PortfolioSnapshotValidated | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<MfoRowScenarioRecalculated | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [slidersCollapsed, setSlidersCollapsed] = useState(false);
  const [heatmapCollapsed, setHeatmapCollapsed] = useState(false);
  const [brief, setBrief] = useState<MfoPortfolioBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  const displayRows = useMemo(
    () => recalculateMfoRanks(baseRows, assumptions),
    [baseRows, assumptions],
  );

  const maxAbsParityChange = useMemo(() => {
    if (displayRows.length === 0) return 1;
    return Math.max(1, ...displayRows.map((r) => Math.abs(r.parityChangeDollars ?? 0)));
  }, [displayRows]);

  const stats = useMemo(() => {
    const active = displayRows.filter((r) => r.rowStatus.trim().toLowerCase() === 'active');
    const entrySignals = displayRows.filter((r) => /consider entry/i.test(r.alertPrimary ?? ''));
    const exitSignals = displayRows.filter((r) =>
      /consider exit|exit review/i.test(r.alertPrimary ?? ''),
    );
    const totalParityDelta = displayRows.reduce((s, r) => s + (r.parityChangeDollars ?? 0), 0);
    const fmtUsd = (n: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        notation: Math.abs(n) >= 1_000_000 ? 'compact' : 'standard',
      }).format(n);
    return { active, entrySignals, exitSignals, totalParityDelta, fmtUsd };
  }, [displayRows]);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    setBrief(null);
    setBriefOpen(false);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/mfo/parse', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) {
        setUploadError(json.error ?? 'Upload failed');
        return;
      }
      const parsed = safeParsePortfolioSnapshot(json.data);
      if (!parsed.success) {
        setUploadError(
          parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid snapshot',
        );
        return;
      }
      setBaseRows(parsed.data.rows);
      setAssumptions(parsed.data.assumptions);
      setSnapshotAt(parsed.data.snapshotAt);
      setSnapshot(parsed.data);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const generateBrief = useCallback(() => {
    if (!snapshot) return;
    setBriefLoading(true);
    setBriefOpen(true);
    setBrief(null);
    setTimeout(() => {
      const snapshotWithCurrentRows: PortfolioSnapshotValidated = {
        ...snapshot,
        rows: displayRows,
      };
      const result = getFallbackBrief(snapshotWithCurrentRows);
      setBrief(result);
      setBriefLoading(false);
    }, 1200);
  }, [snapshot, displayRows]);

  const openExplainer = useCallback((row: MfoRowScenarioRecalculated) => {
    setSelected(row);
    setExplainerOpen(true);
  }, []);

  const hasData = displayRows.length > 0;

  return (
    <div className="min-h-screen bg-neutral-950 font-sans text-neutral-50">
      <MfoComplianceBanner />

      <header className="sticky top-0 z-40 border-b border-neutral-800/60 bg-neutral-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
              <PemabuLogo size={34} />
            </Link>
            <div className="hidden h-5 w-px bg-neutral-800 sm:block" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold leading-none text-neutral-100">
                  Modern Family Office
                </h1>
                <span className="rounded border border-teal-900/60 bg-teal-950/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-teal-600">
                  Risk Parity
                </span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-600">
                {snapshotAt
                  ? `Snapshot · ${new Date(snapshotAt).toLocaleString()}`
                  : 'Command Center · Upload SK_Fidelity workbook to begin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <div className="hidden items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 sm:flex">
                  <Activity className="h-3 w-3 text-teal-500" />
                  <span className="text-xs text-neutral-400 tabular-nums">
                    {displayRows.length} rows
                  </span>
                </div>
                <button
                  type="button"
                  onClick={generateBrief}
                  disabled={briefLoading}
                  className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {briefLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-400" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Weekly Brief</span>
                </button>
              </>
            )}
            <label className="btn-teal cursor-pointer">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Upload .xlsx</span>
              <span className="sm:hidden">Upload</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={uploading}
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </header>

      {uploadError && (
        <div className="mx-auto max-w-screen-2xl px-5 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{uploadError}</p>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="ml-auto text-red-600 hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-center gap-8 px-5 py-28 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-teal-500/5 blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-teal-800/30 bg-neutral-900/80">
              <PemabuLogo size={44} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-100">
              Risk Parity Command Center
            </h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-neutral-500">
              Upload your SK_Fidelity .xlsx workbook to activate the scenario lab, parity heatmap,
              signal ranking engine, and automated portfolio brief generation.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {[
              {
                icon: <SlidersHorizontal className="h-6 w-6 text-teal-700" />,
                label: 'Scenario Lab',
                desc: '9 live weight sliders',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-teal-700" />,
                label: 'Parity Heatmap',
                desc: 'Sleeve drift visualization',
              },
              {
                icon: <Table2 className="h-6 w-6 text-teal-700" />,
                label: 'ETF Rankings',
                desc: '47-column data grid',
              },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
                  {icon}
                </div>
                <p className="text-xs font-semibold text-neutral-300">{label}</p>
                <p className="text-[10px] text-neutral-600">{desc}</p>
              </div>
            ))}
          </div>

          <label className="btn-teal cursor-pointer px-8 py-3 text-sm">
            <Upload className="h-4 w-4" />
            Upload workbook to begin
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={uploading}
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 w-full max-w-lg">
            <div className="rounded-xl border border-teal-900/30 bg-teal-950/10 p-4 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-700 mb-1">
                Consider Entry
              </p>
              <p className="text-xs text-neutral-500">Teal row highlighting for positions below parity target</p>
            </div>
            <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 mb-1">
                Exit Review
              </p>
              <p className="text-xs text-neutral-500">Amber row highlighting for positions above parity target</p>
            </div>
          </div>
        </div>
      )}

      {hasData && (
        <main className="mx-auto max-w-screen-2xl space-y-6 px-5 py-5 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Active Positions"
              value={String(stats.active.length)}
              sub={`${displayRows.length} total incl. comparables`}
              icon={<Activity className="h-4 w-4" />}
              accent
            />
            <StatCard
              label="Entry Signals"
              value={String(stats.entrySignals.length)}
              sub="Consider Entry"
              icon={<TrendingUp className="h-4 w-4" />}
              trend={stats.entrySignals.length > 0 ? 'up' : null}
            />
            <StatCard
              label="Exit Signals"
              value={String(stats.exitSignals.length)}
              sub="Consider Exit / Review"
              icon={<TrendingDown className="h-4 w-4" />}
              trend={stats.exitSignals.length > 0 ? 'down' : null}
            />
            <StatCard
              label="Net Parity Δ"
              value={stats.fmtUsd(stats.totalParityDelta)}
              sub="Aggregate drift vs target"
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>

          {briefOpen && (
            <div>
              {briefLoading ? (
                <BriefSkeleton />
              ) : brief ? (
                <BriefSection brief={brief} onClose={() => setBriefOpen(false)} />
              ) : null}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <SectionToggle
                label="Scenario Lab"
                icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                collapsed={slidersCollapsed}
                onToggle={() => setSlidersCollapsed((v) => !v)}
              />
              {!slidersCollapsed && (
                <ScenarioSliders assumptions={assumptions} onChange={setAssumptions} />
              )}

              <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/30 p-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-700">
                  Signal Legend
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm border-l-2 border-teal-500 bg-teal-950/40" />
                    <span className="text-xs text-neutral-500">Consider Entry — below parity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm border-l-2 border-amber-500 bg-amber-950/30" />
                    <span className="text-xs text-neutral-500">Exit Review — above parity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm border-l-2 border-neutral-700 bg-transparent" />
                    <span className="text-xs text-neutral-600">Hold — within band</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-6">
              <div>
                <SectionToggle
                  label="Sleeve Parity Drift"
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  collapsed={heatmapCollapsed}
                  onToggle={() => setHeatmapCollapsed((v) => !v)}
                />
                {!heatmapCollapsed && (
                  <div className="mt-3">
                    <ParityHeatmap rows={displayRows} />
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="section-label">
                    <Table2 className="h-3.5 w-3.5" />
                    Holdings &amp; Comparables
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-neutral-700 tabular-nums">
                      {stats.entrySignals.length} entry · {stats.exitSignals.length} exit signals
                    </span>
                    <span className="text-[10px] text-neutral-600">Click row for context</span>
                  </div>
                </div>
                <EtfDataTable
                  rows={displayRows}
                  maxAbsParityChange={maxAbsParityChange}
                  onRowClick={openExplainer}
                />
              </div>
            </div>
          </div>
        </main>
      )}

      <footer className="mt-12 border-t border-neutral-800/40 bg-neutral-950 px-5 py-8">
        <div className="mx-auto max-w-screen-2xl">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <PemabuLogo size={30} showWordmark />
            <div className="max-w-lg text-center sm:text-right space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/70">
                Educational Purposes Only
              </p>
              <p className="text-[11px] leading-relaxed text-neutral-700">
                This analysis is for educational purposes only based on the quantitative model
                provided. Pemabu and Flomisma are not registered investment advisors. No
                transactions are executed through this platform.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <SignalExplainer
        open={explainerOpen}
        onClose={() => setExplainerOpen(false)}
        row={selected}
        assumptions={assumptions}
      />
    </div>
  );
}
