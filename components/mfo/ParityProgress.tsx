'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export type ParityProgressProps = {
  /** Parity $ change for the row (distance from target band). */
  parityChangeDollars: number | null;
  /** Max absolute change across the portfolio (for bar scale). */
  maxAbsChange: number;
  /** Optional compact label for a11y. */
  label?: string;
};

/**
 * Horizontal bar (Recharts): magnitude of distance to parity; color = sign (green / amber).
 */
export function ParityProgress({
  parityChangeDollars,
  maxAbsChange,
  label = 'Parity distance',
}: ParityProgressProps) {
  const raw = parityChangeDollars ?? 0;
  const scale = Math.max(maxAbsChange, 1);
  const mag = Math.min(1, Math.abs(raw) / scale);
  const data = [{ mag, raw }];

  const fill = raw === 0 ? '#525252' : raw > 0 ? '#22c55e' : '#f59e0b';

  return (
    <div className="w-full min-w-[100px]" title={`${label}: $${raw.toFixed(2)}`}>
      <div className="mb-0.5 flex justify-between text-[10px] text-neutral-500 sm:text-xs">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-neutral-400">
          {raw >= 0 ? '+' : ''}
          {raw.toFixed(0)}
        </span>
      </div>
      <div className="h-7 w-full sm:h-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 2, right: 4, left: 4, bottom: 2 }}
            barCategoryGap={0}
          >
            <XAxis type="number" domain={[0, 1]} hide />
            <YAxis type="category" dataKey={() => ''} width={0} hide />
            <Bar dataKey="mag" radius={[2, 2, 2, 2]} maxBarSize={14}>
              <Cell fill={fill} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
