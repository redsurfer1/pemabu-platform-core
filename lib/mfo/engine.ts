/**
 * Scenario Lab — pure recomputation of composite scores and alerts from assumption weights.
 * Mirrors the workbook idea: horizon-weighted return blend + factor-weighted sleeve / cost / yield / vol scores.
 */

import type { MfoRowValidated, PortfolioAssumptionsValidated } from './schema';

export type MfoRowScenarioRecalculated = MfoRowValidated & {
  /** 1 = best composite in this batch (dense rank by descending score). */
  compositeRank: number;
};

const EPS = 1e-9;

function sumHorizons(h: PortfolioAssumptionsValidated['returnHorizons']): number {
  return h.threeMo + h.sixMo + h.oneYr + h.threeYr + h.fiveYr;
}

function sumFactors(f: PortfolioAssumptionsValidated['factors']): number {
  return f.expense + f.pctWeight + f.divApy + f.volatility;
}

/** Dot product of horizon weights × period returns (Excel fractions). */
function blendHorizonReturns(
  row: MfoRowValidated,
  h: PortfolioAssumptionsValidated['returnHorizons'],
): number {
  return (
    h.threeMo * (row.return3mo ?? 0) +
    h.sixMo * (row.return6mo ?? 0) +
    h.oneYr * (row.return1yr ?? 0) +
    h.threeYr * (row.return3yr ?? 0) +
    h.fiveYr * (row.return5yr ?? 0)
  );
}

/**
 * Min–max to [0, 1]. All-invalid or flat → 0.5 per row.
 */
function normalizeHigherIsBetter(values: number[]): number[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0.5);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (Math.abs(max - min) < EPS) return values.map(() => 0.5);
  return values.map((v) =>
    Number.isFinite(v) ? (v - min) / (max - min) : 0.5,
  );
}

/** Lower raw value → higher score (e.g. expense, vol, drift). */
function normalizeLowerIsBetter(values: number[]): number[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0.5);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (Math.abs(max - min) < EPS) return values.map(() => 0.5);
  return values.map((v) =>
    Number.isFinite(v) ? (max - v) / (max - min) : 0.5,
  );
}

function isComparable(row: MfoRowValidated): boolean {
  return row.rowStatus.trim().toLowerCase() === 'comparable';
}

function rsiSecondaryAlert(rsi: number | null): string {
  if (rsi === null || !Number.isFinite(rsi)) return 'Hold';
  if (rsi >= 70) return 'Consider Exit';
  if (rsi <= 30) return 'Consider Entry';
  return 'Hold';
}

/**
 * Primary alert: sleeve drift vs target; comparables use cross-sectional score tilt.
 */
function primaryAlert(
  row: MfoRowValidated,
  compositeNorm: number,
  comparableCutHi: number,
): string {
  if (isComparable(row)) {
    if (compositeNorm >= comparableCutHi) return 'Consider Entry';
    return 'Hold';
  }

  const cur = row.currentWeight;
  const tgt = row.targetParityWeight ?? row.targetSleevePct;

  if (cur != null && tgt != null && Number.isFinite(cur) && Number.isFinite(tgt)) {
    const drift = cur - tgt;
    if (drift < -0.001) return 'Consider Entry';
    if (drift > 0.001) return 'Consider Exit';
  }

  return 'Hold';
}

/**
 * Recompute composite scores and ranks from new assumption weights (Scenario Lab).
 * Does not mutate input rows; returns new objects.
 */
export function recalculateMfoRanks(
  rows: MfoRowValidated[],
  newAssumptions: PortfolioAssumptionsValidated,
): MfoRowScenarioRecalculated[] {
  if (rows.length === 0) return [];

  const h = newAssumptions.returnHorizons;
  const f = newAssumptions.factors;
  const wSumH = sumHorizons(h);
  const wSumF = sumFactors(f);

  const returnBlends = rows.map((r) => blendHorizonReturns(r, h));
  const nRet = normalizeHigherIsBetter(returnBlends);

  const expenseRaw = rows.map((r) => r.expenseRatio ?? 0);
  const divRaw = rows.map((r) => r.divApy ?? 0);
  const volRaw = rows.map((r) => {
    const v = r.volatility3mo ?? r.volatilityWeight;
    return v != null && Number.isFinite(v) ? Math.abs(v) : 0;
  });
  const driftRaw = rows.map((r) => {
    const cur = r.currentWeight ?? 0;
    const tgt = r.targetParityWeight ?? r.targetSleevePct;
    if (tgt == null || !Number.isFinite(tgt)) return 0;
    return Math.abs(cur - tgt);
  });

  const nExp = normalizeLowerIsBetter(expenseRaw);
  const nDiv = normalizeHigherIsBetter(divRaw);
  const nVol = normalizeLowerIsBetter(volRaw);
  const nDrift = normalizeLowerIsBetter(driftRaw);

  const facSum = wSumF > EPS ? wSumF : 1;
  const retSum = wSumH > EPS ? wSumH : 1;

  const factorParts = rows.map((_, i) => {
    const fe = f.expense / facSum;
    const fp = f.pctWeight / facSum;
    const fd = f.divApy / facSum;
    const fv = f.volatility / facSum;
    return fe * nExp[i]! + fp * nDrift[i]! + fd * nDiv[i]! + fv * nVol[i]!;
  });

  const totalW = retSum + facSum;
  const composites = rows.map((_, i) => {
    const retPart = (retSum / totalW) * nRet[i]!;
    const facPart = (facSum / totalW) * factorParts[i]!;
    return 100 * (retPart + facPart);
  });

  const sortedIdx = composites
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score || rows[a.i]!.symbol.localeCompare(rows[b.i]!.symbol));

  const rankByIndex = new Map<number, number>();
  sortedIdx.forEach((item, ord) => {
    rankByIndex.set(item.i, ord + 1);
  });

  const compositeNormForCut = normalizeHigherIsBetter(composites);
  const sortedNorm = [...compositeNormForCut].sort((a, b) => a - b);
  const hiIdx = Math.min(sortedNorm.length - 1, Math.floor(sortedNorm.length * 0.67));
  const comparableCutHi = sortedNorm[hiIdx] ?? 0.5;

  return rows.map((row, i) => {
    const compositeScore = Math.round(composites[i]! * 1000) / 1000;
    const compositeRank = rankByIndex.get(i)!;
    const cn = compositeNormForCut[i]!;

    const alertPrimary = primaryAlert(row, cn, comparableCutHi);
    const alertSecondary = rsiSecondaryAlert(row.rsi);

    return {
      ...row,
      compositeScore,
      compositeRank,
      rankOverall: compositeRank,
      rankSecondary: row.rankSecondary,
      alertPrimary,
      alertSecondary,
    };
  });
}
