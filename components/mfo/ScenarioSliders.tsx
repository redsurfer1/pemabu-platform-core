'use client';

import type { PortfolioAssumptionsValidated } from '@/lib/mfo/schema';

export type ScenarioSlidersProps = {
  assumptions: PortfolioAssumptionsValidated;
  onChange: (next: PortfolioAssumptionsValidated) => void;
};

function normalizeHorizons(
  h: PortfolioAssumptionsValidated['returnHorizons'],
): PortfolioAssumptionsValidated['returnHorizons'] {
  const sum = h.threeMo + h.sixMo + h.oneYr + h.threeYr + h.fiveYr;
  if (sum < 1e-9) return h;
  return {
    threeMo: h.threeMo / sum,
    sixMo: h.sixMo / sum,
    oneYr: h.oneYr / sum,
    threeYr: h.threeYr / sum,
    fiveYr: h.fiveYr / sum,
  };
}

function normalizeFactors(
  f: PortfolioAssumptionsValidated['factors'],
): PortfolioAssumptionsValidated['factors'] {
  const sum = f.expense + f.pctWeight + f.divApy + f.volatility;
  if (sum < 1e-9) return f;
  return {
    expense: f.expense / sum,
    pctWeight: f.pctWeight / sum,
    divApy: f.divApy / sum,
    volatility: f.volatility / sum,
  };
}

type SliderFieldProps = {
  label: string;
  sublabel?: string;
  valuePct: number;
  onChangePct: (pct: number) => void;
  accentColor?: 'teal' | 'neutral';
};

function SliderField({ label, sublabel, valuePct, onChangePct, accentColor = 'teal' }: SliderFieldProps) {
  const barWidth = `${valuePct}%`;
  const isTeal = accentColor === 'teal';

  return (
    <label className="flex flex-col gap-1.5 group">
      <span className="flex justify-between items-baseline">
        <span className="flex flex-col">
          <span className="text-xs font-medium text-neutral-300 group-hover:text-neutral-100 transition-colors">
            {label}
          </span>
          {sublabel && (
            <span className="text-[10px] text-neutral-600">{sublabel}</span>
          )}
        </span>
        <span
          className={`tabular-nums text-sm font-semibold ${
            isTeal ? 'text-teal-400' : 'text-neutral-300'
          }`}
        >
          {valuePct.toFixed(0)}
          <span className="text-xs font-normal text-neutral-600">%</span>
        </span>
      </span>

      <div className="relative">
        <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isTeal
                ? 'bg-gradient-to-r from-teal-600 to-teal-400'
                : 'bg-gradient-to-r from-neutral-600 to-neutral-400'
            }`}
            style={{ width: barWidth }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(valuePct)}
          onChange={(e) => onChangePct(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
          style={{ margin: 0 }}
        />
      </div>
    </label>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        {label}
      </span>
      <div className="flex-1 h-px bg-neutral-800" />
    </div>
  );
}

export function ScenarioSliders({ assumptions, onChange }: ScenarioSlidersProps) {
  const h = assumptions.returnHorizons;
  const f = assumptions.factors;

  const patchHorizons = (
    key: keyof PortfolioAssumptionsValidated['returnHorizons'],
    pct: number,
  ) => {
    const v = pct / 100;
    const next = { ...h, [key]: v };
    onChange({
      ...assumptions,
      returnHorizons: normalizeHorizons(next),
    });
  };

  const patchFactor = (
    key: keyof PortfolioAssumptionsValidated['factors'],
    pct: number,
  ) => {
    const v = pct / 100;
    const next = { ...f, [key]: v };
    onChange({
      ...assumptions,
      factors: normalizeFactors(next),
    });
  };

  const horizonSum = h.threeMo + h.sixMo + h.oneYr + h.threeYr + h.fiveYr;
  const factorSum = f.expense + f.pctWeight + f.divApy + f.volatility;

  return (
    <div className="space-y-5 rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4 backdrop-blur-sm">

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-200">Scenario Lab</span>
        <span className="text-[10px] text-neutral-600 tabular-nums">
          Live — ranks update instantly
        </span>
      </div>

      <div className="space-y-3.5">
        <SectionDivider label="Return Horizons" />
        <div className="space-y-3">
          <SliderField
            label="3-Month"
            sublabel="Short momentum"
            valuePct={h.threeMo * 100}
            onChangePct={(pct) => patchHorizons('threeMo', pct)}
          />
          <SliderField
            label="6-Month"
            sublabel="Medium momentum"
            valuePct={h.sixMo * 100}
            onChangePct={(pct) => patchHorizons('sixMo', pct)}
          />
          <SliderField
            label="1-Year"
            sublabel="Annual return"
            valuePct={h.oneYr * 100}
            onChangePct={(pct) => patchHorizons('oneYr', pct)}
          />
          <SliderField
            label="3-Year"
            sublabel="Medium-term trend"
            valuePct={h.threeYr * 100}
            onChangePct={(pct) => patchHorizons('threeYr', pct)}
          />
          <SliderField
            label="5-Year"
            sublabel="Long-term quality"
            valuePct={h.fiveYr * 100}
            onChangePct={(pct) => patchHorizons('fiveYr', pct)}
          />
        </div>
        <div className="flex justify-end">
          <span className="text-[10px] tabular-nums text-neutral-700">
            Σ = {(horizonSum * 100).toFixed(0)}% (auto-normalized)
          </span>
        </div>
      </div>

      <div className="space-y-3.5">
        <SectionDivider label="Factor Weights" />
        <div className="space-y-3">
          <SliderField
            label="Expense Ratio"
            sublabel="Lower = better score"
            valuePct={f.expense * 100}
            onChangePct={(pct) => patchFactor('expense', pct)}
          />
          <SliderField
            label="% Weight (Drift)"
            sublabel="Parity alignment"
            valuePct={f.pctWeight * 100}
            onChangePct={(pct) => patchFactor('pctWeight', pct)}
          />
          <SliderField
            label="Dividend APY"
            sublabel="Income yield"
            valuePct={f.divApy * 100}
            onChangePct={(pct) => patchFactor('divApy', pct)}
          />
          <SliderField
            label="Volatility"
            sublabel="Lower vol = better"
            valuePct={f.volatility * 100}
            onChangePct={(pct) => patchFactor('volatility', pct)}
          />
        </div>
        <div className="flex justify-end">
          <span className="text-[10px] tabular-nums text-neutral-700">
            Σ = {(factorSum * 100).toFixed(0)}% (auto-normalized)
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-neutral-600">
          Adjust sliders to reweight the composite score model. Rankings recompute instantly in-browser without any server call.
        </p>
      </div>
    </div>
  );
}
