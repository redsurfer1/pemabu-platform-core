'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, Eye, EyeOff } from 'lucide-react';
import type { MfoRowScenarioRecalculated } from '@/lib/mfo/engine';
import { ParityProgress } from './ParityProgress';

export type EtfDataTableProps = {
  rows: MfoRowScenarioRecalculated[];
  maxAbsParityChange: number;
  onRowClick: (row: MfoRowScenarioRecalculated) => void;
};

function rowAlertClass(row: MfoRowScenarioRecalculated): string {
  const blob = `${row.alertPrimary ?? ''} ${row.alertSecondary ?? ''}`;
  if (/consider exit|exit review/i.test(blob)) {
    return 'table-row-exit';
  }
  if (/consider entry/i.test(blob)) {
    return 'table-row-entry';
  }
  return 'table-row-default';
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(decimals);
}

function SignalBadge({ text }: { text: string | null }) {
  if (!text) return <span className="text-neutral-600">—</span>;
  const lower = text.toLowerCase();
  if (/consider entry/i.test(lower)) {
    return <span className="signal-entry">{text}</span>;
  }
  if (/consider exit|exit review/i.test(lower)) {
    return <span className="signal-exit">{text}</span>;
  }
  return <span className="signal-hold">{text}</span>;
}

function SortableHeader({ label, column }: { label: string; column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="flex items-center gap-1 font-semibold text-neutral-300 hover:text-teal-300 transition-colors"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sorted ? 'text-teal-400' : 'opacity-40'}`} />
    </button>
  );
}

const COLUMN_GROUPS = {
  core: ['rowStatus', 'symbol', 'name', 'compositeRank', 'compositeScore', 'alertPrimary', 'alertSecondary', 'explain'],
  parity: ['parity', 'parityDollars', 'targetParityWeight', 'currentWeight', 'targetSleevePct'],
  metrics: ['marketValue', 'quantity', 'rsi', 'expenseRatio', 'divApy', 'weightAvgPercent'],
  returns: ['return3mo', 'return6mo', 'return1yr', 'return3yr', 'return5yr', 'returnWeightedAvg'],
  volatility: ['volatility3mo', 'volatilityWeight', 'volatilitySecondary'],
  subranks: ['subRankCurrent', 'subRankExpense', 'subRankPctWeight', 'subRankDivApy', 'subRankVolatility'],
  prices: ['price1', 'price2', 'price3', 'change24h', 'change7d'],
  misc: ['dividendDollars', 'sharesDelta', 'rankOverall', 'rankSecondary'],
};

type ColumnGroupKey = keyof typeof COLUMN_GROUPS;

const GROUP_LABELS: Record<ColumnGroupKey, string> = {
  core: 'Core',
  parity: 'Parity',
  metrics: 'Metrics',
  returns: 'Returns',
  volatility: 'Volatility',
  subranks: 'Sub-Ranks',
  prices: 'Prices',
  misc: 'Other',
};

export function EtfDataTable({ rows, maxAbsParityChange, onRowClick }: EtfDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'compositeRank', desc: false }]);
  const [activeGroups, setActiveGroups] = useState<Set<ColumnGroupKey>>(new Set(['core', 'parity', 'metrics']));
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const visibleColumnIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of activeGroups) {
      for (const id of COLUMN_GROUPS[group]) {
        ids.add(id);
      }
    }
    return ids;
  }, [activeGroups]);

  const columnVisibility = useMemo<VisibilityState>(() => {
    const allIds = Object.values(COLUMN_GROUPS).flat();
    const vis: VisibilityState = {};
    for (const id of allIds) {
      vis[id] = visibleColumnIds.has(id);
    }
    return vis;
  }, [visibleColumnIds]);

  const columns = useMemo<ColumnDef<MfoRowScenarioRecalculated>[]>(
    () => [
      {
        accessorKey: 'rowStatus',
        header: 'Status',
        cell: (info) => (
          <span className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500 bg-neutral-800/50">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'symbol',
        header: ({ column }) => <SortableHeader label="Ticker" column={column} />,
        cell: (info) => (
          <span className="font-mono text-sm font-semibold text-neutral-100">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Fund Name',
        cell: (info) => (
          <span className="block max-w-[200px] truncate text-sm text-neutral-400" title={info.getValue() as string}>
            {(info.getValue() as string) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'compositeRank',
        header: ({ column }) => <SortableHeader label="Rank" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number;
          const isTop = v <= 5;
          return (
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                isTop
                  ? 'bg-teal-900/60 text-teal-300 ring-1 ring-teal-700/40'
                  : 'text-neutral-400'
              }`}
            >
              {v}
            </span>
          );
        },
      },
      {
        accessorKey: 'compositeScore',
        header: ({ column }) => <SortableHeader label="Score" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          const pct = Math.min(100, Math.max(0, v));
          return (
            <div className="flex items-center gap-2 min-w-[80px]">
              <div className="h-1 flex-1 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="tabular-nums text-xs text-neutral-300 w-8 text-right">
                {v.toFixed(1)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'alertPrimary',
        header: 'Primary Signal',
        cell: (info) => <SignalBadge text={info.getValue() as string | null} />,
        enableSorting: false,
      },
      {
        accessorKey: 'alertSecondary',
        header: 'Secondary',
        cell: (info) => {
          const v = info.getValue() as string | null;
          if (!v) return <span className="text-neutral-600 text-xs">—</span>;
          return (
            <span className="text-xs text-neutral-500">{v}</span>
          );
        },
        enableSorting: false,
      },
      {
        id: 'explain',
        header: '',
        cell: ({ row }) => (
          <button
            type="button"
            className="rounded-md border border-teal-800/50 bg-teal-950/30 px-2.5 py-1 text-[10px] font-medium text-teal-400 transition-all duration-150 hover:bg-teal-900/50 hover:text-teal-300 hover:border-teal-700/60"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.original);
            }}
          >
            Explain
          </button>
        ),
        enableSorting: false,
      },
      {
        id: 'parity',
        header: 'Parity Δ',
        cell: ({ row }) => (
          <ParityProgress
            parityChangeDollars={row.original.parityChangeDollars}
            maxAbsChange={maxAbsParityChange}
            label="Δ$"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'parityDollars',
        header: ({ column }) => <SortableHeader label="Parity $" column={column} />,
        cell: (info) => (
          <span className="tabular-nums text-xs text-neutral-400">{fmtUsd(info.getValue() as number | null)}</span>
        ),
      },
      {
        accessorKey: 'targetParityWeight',
        header: 'Target Parity',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtPct(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'currentWeight',
        header: ({ column }) => <SortableHeader label="Cur Weight" column={column} />,
        cell: (info) => <span className="tabular-nums text-xs text-neutral-400">{fmtPct(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'targetSleevePct',
        header: 'Sleeve Tgt',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtPct(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'marketValue',
        header: ({ column }) => <SortableHeader label="Mkt Value" column={column} />,
        cell: (info) => <span className="tabular-nums text-sm font-medium text-neutral-200">{fmtUsd(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        cell: (info) => {
          const v = info.getValue() as number | null;
          return <span className="tabular-nums text-xs text-neutral-400">{v != null ? v.toFixed(2) : '—'}</span>;
        },
      },
      {
        accessorKey: 'rsi',
        header: ({ column }) => <SortableHeader label="RSI" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          const isHigh = v >= 65;
          const isLow = v <= 35;
          return (
            <span className={`tabular-nums text-sm font-medium ${isHigh ? 'text-amber-400' : isLow ? 'text-teal-400' : 'text-neutral-300'}`}>
              {v.toFixed(0)}
            </span>
          );
        },
      },
      {
        accessorKey: 'expenseRatio',
        header: 'Expense',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-400">{fmtPct(info.getValue() as number | null, 3)}</span>,
      },
      {
        accessorKey: 'divApy',
        header: ({ column }) => <SortableHeader label="Div APY" column={column} />,
        cell: (info) => <span className="tabular-nums text-xs text-neutral-300">{fmtPct(info.getValue() as number | null, 2)}</span>,
      },
      {
        accessorKey: 'weightAvgPercent',
        header: 'Wt Avg%',
        cell: (info) => {
          const v = info.getValue() as number | null;
          return <span className="tabular-nums text-xs text-neutral-400">{v != null ? `${v.toFixed(1)}%` : '—'}</span>;
        },
      },
      {
        accessorKey: 'return3mo',
        header: ({ column }) => <SortableHeader label="3M Ret" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return (
            <span className={`tabular-nums text-xs font-medium ${v >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
              {fmtPct(v)}
            </span>
          );
        },
      },
      {
        accessorKey: 'return6mo',
        header: ({ column }) => <SortableHeader label="6M Ret" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return <span className={`tabular-nums text-xs ${v >= 0 ? 'text-teal-400/80' : 'text-red-400/80'}`}>{fmtPct(v)}</span>;
        },
      },
      {
        accessorKey: 'return1yr',
        header: ({ column }) => <SortableHeader label="1Y Ret" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return <span className={`tabular-nums text-xs ${v >= 0 ? 'text-teal-400/80' : 'text-red-400/80'}`}>{fmtPct(v)}</span>;
        },
      },
      {
        accessorKey: 'return3yr',
        header: ({ column }) => <SortableHeader label="3Y Ret" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return <span className={`tabular-nums text-xs ${v >= 0 ? 'text-teal-400/80' : 'text-red-400/80'}`}>{fmtPct(v)}</span>;
        },
      },
      {
        accessorKey: 'return5yr',
        header: ({ column }) => <SortableHeader label="5Y Ret" column={column} />,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return <span className={`tabular-nums text-xs ${v >= 0 ? 'text-teal-400/80' : 'text-red-400/80'}`}>{fmtPct(v)}</span>;
        },
      },
      {
        accessorKey: 'returnWeightedAvg',
        header: 'Ret Blend',
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return <span className={`tabular-nums text-xs font-medium ${v >= 0 ? 'text-teal-300' : 'text-red-300'}`}>{fmtPct(v)}</span>;
        },
      },
      {
        accessorKey: 'volatility3mo',
        header: ({ column }) => <SortableHeader label="Vol 3M" column={column} />,
        cell: (info) => <span className="tabular-nums text-xs text-neutral-400">{fmtPct(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'volatilityWeight',
        header: 'Vol Wt',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtPct(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'volatilitySecondary',
        header: 'Vol 2',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtPct(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'subRankCurrent',
        header: 'SR Cur',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null, 0)}</span>,
      },
      {
        accessorKey: 'subRankExpense',
        header: 'SR Exp',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null, 0)}</span>,
      },
      {
        accessorKey: 'subRankPctWeight',
        header: 'SR Wt',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null, 0)}</span>,
      },
      {
        accessorKey: 'subRankDivApy',
        header: 'SR Div',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null, 0)}</span>,
      },
      {
        accessorKey: 'subRankVolatility',
        header: 'SR Vol',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null, 0)}</span>,
      },
      {
        accessorKey: 'price1',
        header: 'Price 1',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-400">{fmtNum(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'price2',
        header: 'Price 2',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'price3',
        header: 'Price 3',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'change24h',
        header: '24h Δ',
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return <span className={`tabular-nums text-xs ${v >= 0 ? 'text-teal-400' : 'text-red-400'}`}>{fmtPct(v)}</span>;
        },
      },
      {
        accessorKey: 'change7d',
        header: '7d Δ',
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null || !Number.isFinite(v)) return <span className="text-neutral-600">—</span>;
          return <span className={`tabular-nums text-xs ${v >= 0 ? 'text-teal-400/80' : 'text-red-400/80'}`}>{fmtPct(v)}</span>;
        },
      },
      {
        accessorKey: 'dividendDollars',
        header: 'Div $',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtUsd(info.getValue() as number | null)}</span>,
      },
      {
        accessorKey: 'sharesDelta',
        header: 'Shares Δ',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null, 2)}</span>,
      },
      {
        accessorKey: 'rankOverall',
        header: ({ column }) => <SortableHeader label="Rank Overall" column={column} />,
        cell: (info) => <span className="tabular-nums text-xs text-neutral-400">{fmtNum(info.getValue() as number | null, 0)}</span>,
      },
      {
        accessorKey: 'rankSecondary',
        header: 'Rank 2',
        cell: (info) => <span className="tabular-nums text-xs text-neutral-500">{fmtNum(info.getValue() as number | null, 0)}</span>,
      },
    ],
    [maxAbsParityChange, onRowClick],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const toggleGroup = (group: ColumnGroupKey) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        if (next.size === 1) return prev;
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
          Column Groups:
        </span>
        {(Object.keys(COLUMN_GROUPS) as ColumnGroupKey[]).map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => toggleGroup(group)}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-all duration-150 ${
              activeGroups.has(group)
                ? 'border-teal-800/60 bg-teal-950/30 text-teal-400'
                : 'border-neutral-800 bg-transparent text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {activeGroups.has(group) ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            {GROUP_LABELS[group]}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-neutral-700 tabular-nums">
          {table.getVisibleLeafColumns().length} cols · {rows.length} rows
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800/80 bg-neutral-950/60 shadow-inner">
        <table className="w-full border-collapse text-left text-sm" style={{ minWidth: '600px' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-neutral-800/80 bg-neutral-900/80">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-b border-neutral-800/50 transition-all duration-100 hover:brightness-110 ${rowAlertClass(row.original)} ${
                  idx % 2 === 0 ? '' : 'bg-white/[0.015]'
                }`}
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <div className="text-2xl">—</div>
            <p className="text-sm text-neutral-500">No rows loaded. Upload a workbook to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
