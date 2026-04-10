'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { MfoRowScenarioRecalculated } from '@/lib/mfo/engine';

export type ParityHeatmapProps = {
  rows: MfoRowScenarioRecalculated[];
};

const SLEEVE_LABELS: Record<string, string> = {
  'Fixed Income': 'Fixed Inc.',
  'Equity': 'Equity',
  'Alternative': 'Alt.',
  'Cash': 'Cash',
  'Real Asset': 'Real Asset',
  'International': "Int'l",
  'Domestic': 'Domestic',
};

type SleeveBar = {
  sleeve: string;
  delta: number;
  count: number;
  positive: number;
  negative: number;
};

function classifySleeve(name: string): string {
  const n = name.toLowerCase();
  if (/bond|treasur|note|fixed|income|bnd|tlt|ief|shy|tip|agg|lqd/.test(n)) return 'Fixed Inc.';
  if (/intl|international|world|foreign|emerging|eafe|vxus|efa|eem/.test(n)) return "Int'l";
  if (/reit|real estate|real asset|commodity|gold|gld|vnq|iau/.test(n)) return 'Real Asset';
  if (/cash|money market|mmkt|sgov|bil/.test(n)) return 'Cash';
  if (/alt|hedge|managed|futures|merger/.test(n)) return 'Alt.';
  return 'Equity';
}

function buildSleeveData(rows: MfoRowScenarioRecalculated[]): SleeveBar[] {
  const map = new Map<string, { delta: number; count: number; pos: number; neg: number }>();

  for (const row of rows) {
    const sleeve = classifySleeve(row.name || row.symbol);
    const delta = row.parityChangeDollars ?? 0;
    const existing = map.get(sleeve) ?? { delta: 0, count: 0, pos: 0, neg: 0 };
    map.set(sleeve, {
      delta: existing.delta + delta,
      count: existing.count + 1,
      pos: existing.pos + (delta > 0 ? 1 : 0),
      neg: existing.neg + (delta < 0 ? 1 : 0),
    });
  }

  return Array.from(map.entries())
    .map(([sleeve, v]) => ({
      sleeve,
      delta: Math.round(v.delta),
      count: v.count,
      positive: v.pos,
      negative: v.neg,
    }))
    .sort((a, b) => b.delta - a.delta);
}

type TooltipPayloadEntry = {
  value: number;
  payload: SleeveBar;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      signDisplay: 'always',
    }).format(n);

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-neutral-100">{d.sleeve}</p>
      <p className="mt-1 tabular-nums text-neutral-300">
        Parity drift: <span className={d.delta >= 0 ? 'text-emerald-400' : 'text-amber-400'}>{fmt(d.delta)}</span>
      </p>
      <p className="text-neutral-500">{d.count} position{d.count !== 1 ? 's' : ''}</p>
      <p className="text-neutral-500">{d.positive} above · {d.negative} below parity</p>
    </div>
  );
}

export function ParityHeatmap({ rows }: ParityHeatmapProps) {
  const data = buildSleeveData(rows);

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/40">
        <p className="text-sm text-neutral-600">Upload a workbook to see sleeve drift</p>
      </div>
    );
  }

  const absMax = Math.max(1, ...data.map((d) => Math.abs(d.delta)));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Sleeve Parity Drift</h3>
          <p className="text-xs text-neutral-500">Aggregate $ distance from target band by asset class</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
            Above parity
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" />
            Below parity
          </span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              vertical={false}
              stroke="#262626"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="sleeve"
              tick={{ fill: '#737373', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-absMax * 1.15, absMax * 1.15]}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000
                  ? `${v >= 0 ? '+' : ''}${(v / 1000).toFixed(0)}k`
                  : `${v >= 0 ? '+' : ''}${v}`
              }
              tick={{ fill: '#525252', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
            <ReferenceLine y={0} stroke="#404040" strokeWidth={1} />
            <Bar dataKey="delta" radius={[3, 3, 0, 0]} maxBarSize={48}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.delta >= 0 ? '#10b981' : '#f59e0b'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
