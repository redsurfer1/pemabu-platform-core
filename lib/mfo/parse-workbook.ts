/**
 * Risk Parity workbook ingestion — sheet `SK_Fidelity` only.
 * Maps 47 Excel columns (A–AU) to MfoRow; assumptions from rows 129–138 for Scenario Lab.
 */

import ExcelJS from 'exceljs';

export const SK_FIDELITY_SHEET_NAME = 'SK_Fidelity' as const;

/** Fixed layout: assumption block (1-based rows, matches mockup workbook). */
export const ASSUMPTION_RETURN_START_ROW = 129;
export const ASSUMPTION_RETURN_END_ROW = 133;
export const ASSUMPTION_FACTOR_START_ROW = 135;
export const ASSUMPTION_FACTOR_END_ROW = 138;

/** Horizon weights for multi-period return blend (sum should be 1). */
export interface ReturnHorizonWeights {
  threeMo: number;
  sixMo: number;
  oneYr: number;
  threeYr: number;
  fiveYr: number;
}

/** Factor weights for ranking composite (Expense, sleeve weight, dividend yield, volatility). Sum should be 1. */
export interface FactorWeights {
  expense: number;
  pctWeight: number;
  divApy: number;
  volatility: number;
}

/**
 * Assumption weights from the workbook footer (Scenario Lab source of truth).
 * Values are stored as Excel fractions (e.g. 0.4 = 40%).
 */
export interface PortfolioAssumptions {
  returnHorizons: ReturnHorizonWeights;
  factors: FactorWeights;
}

/**
 * One data row from SK_Fidelity (47 columns).
 * Percent-like fields follow Excel storage: 0.0075 = 0.75% (multiply by 100 for display).
 */
export interface MfoRow {
  /** 1-based row index in the sheet (for traceability). */
  sheetRow: number;
  rowStatus: 'Active' | 'Comparable' | string;
  symbol: string;
  name: string;
  /** Current sleeve / position weight (fraction of portfolio). */
  currentWeight: number | null;
  /** Target parity weight (fraction). */
  targetParityWeight: number | null;
  /** Stated expense ratio (fraction). */
  expenseRatio: number | null;
  dividendDollars: number | null;
  /** Dividend yield APY (fraction). */
  divApy: number | null;
  quantity: number | null;
  marketValue: number | null;
  /** Latest price / quote (first price column). */
  price1: number | null;
  price2: number | null;
  price3: number | null;
  /** 24h change (fraction). */
  change24h: number | null;
  /** 7d change (fraction). */
  change7d: number | null;
  /** Historical basis prices used for return windows (currency). */
  basisPrice3mo: number | null;
  basisPrice6mo: number | null;
  basisPrice1yr: number | null;
  basisPrice3yr: number | null;
  basisPrice5yr: number | null;
  /** Period total returns (fraction). */
  return3mo: number | null;
  return6mo: number | null;
  return1yr: number | null;
  return3yr: number | null;
  return5yr: number | null;
  /** Blended / weighted average return metric from sheet (fraction). */
  returnWeightedAvg: number | null;
  /** Volatility / risk weight column from sheet. */
  volatilityWeight: number | null;
  /** Short-horizon volatility (fraction). */
  volatility3mo: number | null;
  /** Secondary volatility / alignment metric (fraction, may be signed in sheet). */
  volatilitySecondary: number | null;
  /** Sub-ranks: Current, Expense, % Weight, Div APY, Volatility (1–100 style). */
  subRankCurrent: number | null;
  subRankExpense: number | null;
  subRankPctWeight: number | null;
  subRankDivApy: number | null;
  subRankVolatility: number | null;
  /** Composite weight-average % (sheet “WeightAvg%” — often stored as whole number, e.g. 25.2). */
  weightAvgPercent: number | null;
  rsi: number | null;
  alertPrimary: string | null;
  alertSecondary: string | null;
  /** Composite score / meter (sheet). */
  compositeScore: number | null;
  /** First global rank column. */
  rankOverall: number | null;
  /** Second rank column (e.g. alternate sort / dated rank). */
  rankSecondary: number | null;
  parityDollars: number | null;
  parityChangeDollars: number | null;
  sharesDelta: number | null;
  /** Target sleeve % for parity band (fraction). */
  targetSleevePct: number | null;
}

export interface SkFidelityParseResult {
  sheetName: typeof SK_FIDELITY_SHEET_NAME;
  assumptions: PortfolioAssumptions;
  rows: MfoRow[];
  /** Optional price as-of dates from row 2 (columns L–N) when present. */
  priceAsOfDates: [Date | null, Date | null, Date | null];
}

// ——— Column index map:1-based Excel columns A=1 … AU=47 ———

const COL = {
  ROW_STATUS: 1,
  SYMBOL: 2,
  NAME: 3,
  CURRENT_WEIGHT: 4,
  TARGET_PARITY_WEIGHT: 5,
  EXPENSE_RATIO: 6,
  DIVIDEND_DOLLARS: 7,
  DIV_APY: 8,
  QUANTITY: 9,
  MARKET_VALUE: 10,
  PRICE_1: 12,
  PRICE_2: 13,
  PRICE_3: 14,
  CHANGE_24H: 15,
  CHANGE_7D: 16,
  BASIS_3MO: 17,
  BASIS_6MO: 18,
  BASIS_1YR: 19,
  BASIS_3YR: 20,
  BASIS_5YR: 21,
  RET_3MO: 22,
  RET_6MO: 23,
  RET_1YR: 24,
  RET_3YR: 25,
  RET_5YR: 26,
  RETURN_WEIGHTED_AVG: 27,
  VOLATILITY_WEIGHT: 28,
  VOL_3MO: 29,
  VOL_SECONDARY: 30,
  SUB_RANK_CURRENT: 31,
  SUB_RANK_EXPENSE: 32,
  SUB_RANK_PCT_WEIGHT: 33,
  SUB_RANK_DIV_APY: 34,
  SUB_RANK_VOLATILITY: 35,
  WEIGHT_AVG_PCT: 36,
  RSI: 37,
  ALERT_PRIMARY: 38,
  ALERT_SECONDARY: 39,
  COMPOSITE_SCORE: 40,
  RANK_OVERALL: 42,
  RANK_SECONDARY: 43,
  PARITY_DOLLARS: 44,
  PARITY_CHANGE_DOLLARS: 45,
  SHARES_DELTA: 46,
  TARGET_SLEEVE_PCT: 47,
} as const;

const META_PRICE_ROW = 2;

function isBlankStatus(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === 'string' && raw.trim() === '') return true;
  return false;
}

function normalizeString(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') return raw.trim() || null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (raw instanceof Date) return raw.toISOString();
  return String(raw).trim() || null;
}

/**
 * Parse numeric cell: numbers, Excel strings with $ and %, errors → null.
 */
function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim().replace(/[$,]/g, '').replace(/%$/, '');
    if (s === '' || s === '#N/A' || s === 'N/A') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getCellValue(worksheet: ExcelJS.Worksheet, row: number, col: number): unknown {
  const cell = worksheet.getCell(row, col);
  const v = cell.value;
  if (v && typeof v === 'object' && 'result' in v && (v as ExcelJS.CellFormulaValue).result !== undefined) {
    return (v as ExcelJS.CellFormulaValue).result;
  }
  return v;
}

function readMfoRow(worksheet: ExcelJS.Worksheet, sheetRow: number): MfoRow {
  const g = (c: number) => getCellValue(worksheet, sheetRow, c);

  return {
    sheetRow,
    rowStatus: normalizeString(g(COL.ROW_STATUS)) ?? '',
    symbol: normalizeString(g(COL.SYMBOL)) ?? '',
    name: normalizeString(g(COL.NAME)) ?? '',
    currentWeight: toNumber(g(COL.CURRENT_WEIGHT)),
    targetParityWeight: toNumber(g(COL.TARGET_PARITY_WEIGHT)),
    expenseRatio: toNumber(g(COL.EXPENSE_RATIO)),
    dividendDollars: toNumber(g(COL.DIVIDEND_DOLLARS)),
    divApy: toNumber(g(COL.DIV_APY)),
    quantity: toNumber(g(COL.QUANTITY)),
    marketValue: toNumber(g(COL.MARKET_VALUE)),
    price1: toNumber(g(COL.PRICE_1)),
    price2: toNumber(g(COL.PRICE_2)),
    price3: toNumber(g(COL.PRICE_3)),
    change24h: toNumber(g(COL.CHANGE_24H)),
    change7d: toNumber(g(COL.CHANGE_7D)),
    basisPrice3mo: toNumber(g(COL.BASIS_3MO)),
    basisPrice6mo: toNumber(g(COL.BASIS_6MO)),
    basisPrice1yr: toNumber(g(COL.BASIS_1YR)),
    basisPrice3yr: toNumber(g(COL.BASIS_3YR)),
    basisPrice5yr: toNumber(g(COL.BASIS_5YR)),
    return3mo: toNumber(g(COL.RET_3MO)),
    return6mo: toNumber(g(COL.RET_6MO)),
    return1yr: toNumber(g(COL.RET_1YR)),
    return3yr: toNumber(g(COL.RET_3YR)),
    return5yr: toNumber(g(COL.RET_5YR)),
    returnWeightedAvg: toNumber(g(COL.RETURN_WEIGHTED_AVG)),
    volatilityWeight: toNumber(g(COL.VOLATILITY_WEIGHT)),
    volatility3mo: toNumber(g(COL.VOL_3MO)),
    volatilitySecondary: toNumber(g(COL.VOL_SECONDARY)),
    subRankCurrent: toNumber(g(COL.SUB_RANK_CURRENT)),
    subRankExpense: toNumber(g(COL.SUB_RANK_EXPENSE)),
    subRankPctWeight: toNumber(g(COL.SUB_RANK_PCT_WEIGHT)),
    subRankDivApy: toNumber(g(COL.SUB_RANK_DIV_APY)),
    subRankVolatility: toNumber(g(COL.SUB_RANK_VOLATILITY)),
    weightAvgPercent: toNumber(g(COL.WEIGHT_AVG_PCT)),
    rsi: toNumber(g(COL.RSI)),
    alertPrimary: normalizeString(g(COL.ALERT_PRIMARY)),
    alertSecondary: normalizeString(g(COL.ALERT_SECONDARY)),
    compositeScore: toNumber(g(COL.COMPOSITE_SCORE)),
    rankOverall: toNumber(g(COL.RANK_OVERALL)),
    rankSecondary: toNumber(g(COL.RANK_SECONDARY)),
    parityDollars: toNumber(g(COL.PARITY_DOLLARS)),
    parityChangeDollars: toNumber(g(COL.PARITY_CHANGE_DOLLARS)),
    sharesDelta: toNumber(g(COL.SHARES_DELTA)),
    targetSleevePct: toNumber(g(COL.TARGET_SLEEVE_PCT)),
  };
}

function readAssumptions(worksheet: ExcelJS.Worksheet): PortfolioAssumptions {
  const rh: ReturnHorizonWeights = {
    threeMo: toNumber(getCellValue(worksheet, 129, 3)) ?? 0,
    sixMo: toNumber(getCellValue(worksheet, 130, 3)) ?? 0,
    oneYr: toNumber(getCellValue(worksheet, 131, 3)) ?? 0,
    threeYr: toNumber(getCellValue(worksheet, 132, 3)) ?? 0,
    fiveYr: toNumber(getCellValue(worksheet, 133, 3)) ?? 0,
  };

  const factors: FactorWeights = {
    expense: toNumber(getCellValue(worksheet, 135, 3)) ?? 0,
    pctWeight: toNumber(getCellValue(worksheet, 136, 3)) ?? 0,
    divApy: toNumber(getCellValue(worksheet, 137, 3)) ?? 0,
    volatility: toNumber(getCellValue(worksheet, 138, 3)) ?? 0,
  };

  return { returnHorizons: rh, factors };
}

function readPriceAsOfDates(worksheet: ExcelJS.Worksheet): [Date | null, Date | null, Date | null] {
  const d1 = getCellValue(worksheet, META_PRICE_ROW, COL.PRICE_1);
  const d2 = getCellValue(worksheet, META_PRICE_ROW, COL.PRICE_2);
  const d3 = getCellValue(worksheet, META_PRICE_ROW, COL.PRICE_3);
  const asDate = (u: unknown): Date | null => (u instanceof Date ? u : null);
  return [asDate(d1), asDate(d2), asDate(d3)];
}

function isDataRowStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === 'active' || s === 'comparable';
}

/**
 * Parse buffer (e.g. uploaded .xlsx) for sheet `SK_Fidelity`.
 */
export async function parseSkFidelityWorkbook(input: ArrayBuffer | Buffer): Promise<SkFidelityParseResult> {
  const workbook = new ExcelJS.Workbook();
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(new Uint8Array(input));
  // ExcelJS `xlsx.load` typings disagree with Node 22 `Buffer` generics; binary payload is valid at runtime.
  await workbook.xlsx.load(buf as never);

  const worksheet = workbook.getWorksheet(SK_FIDELITY_SHEET_NAME);
  if (!worksheet) {
    throw new Error(`Workbook missing required sheet "${SK_FIDELITY_SHEET_NAME}"`);
  }

  const assumptions = readAssumptions(worksheet);
  const priceAsOfDates = readPriceAsOfDates(worksheet);

  const rows: MfoRow[] = [];
  /** Sparse sheets can report huge rowCount; iterate only populated rows. */
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const statusRaw = getCellValue(worksheet, rowNumber, COL.ROW_STATUS);
    if (isBlankStatus(statusRaw)) return;
    const status = String(statusRaw).trim();
    if (!isDataRowStatus(status)) return;

    const parsed = readMfoRow(worksheet, rowNumber);
    if (!parsed.symbol) return;

    rows.push(parsed);
  });

  return {
    sheetName: SK_FIDELITY_SHEET_NAME,
    assumptions,
    rows,
    priceAsOfDates,
  };
}
