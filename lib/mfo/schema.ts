/**
 * MFO data firewall: Zod validation for workbook-derived JSON before UI or LLM use.
 * Aligns with `lib/mfo/parse-workbook.ts` (columns A–AU, 47 data fields + sheetRow).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers: Excel-style decimal ratios (0.0075 = 0.75% sleeve target)
// ---------------------------------------------------------------------------

/**
 * Nullable numeric from JSON (number or numeric string). Invalid → null.
 */
function nullableFiniteNumber(): z.ZodType<number | null, z.ZodTypeDef, string | number | null> {
  return z
    .union([z.number(), z.string(), z.null()])
    .transform((val): number | null => {
      if (val === null || val === '') return null;
      const n =
        typeof val === 'number'
          ? val
          : Number(String(val).trim().replace(/%$/, '').replace(/,/g, ''));
      if (!Number.isFinite(n)) return null;
      return n;
    });
}

/**
 * **Critical:** Percentage fields stored as Excel decimals (e.g. `targetSleevePct`,
 * `expenseRatio`, `divApy`, sleeve weights, return/volatility fractions).
 * Coerces string input but **does not** rescale whole numbers (0.0075 stays 0.0075).
 */
function excelDecimalRatioNullable(): z.ZodType<number | null, z.ZodTypeDef, string | number | null> {
  return z
    .union([z.number(), z.string(), z.null()])
    .transform((val): number | null => {
      if (val === null || val === '') return null;
      let n: number;
      if (typeof val === 'number') {
        n = val;
      } else {
        const s = String(val).trim().replace(/,$/g, '').replace(/%$/, '');
        n = Number(s.replace(/,/g, ''));
      }
      if (!Number.isFinite(n)) return null;
      return n;
    });
}

/**
 * ISO-8601 snapshot timestamp (string in, string out).
 */
const SnapshotTimestampSchema = z.union([
  z.string().datetime({ offset: true }),
  z.coerce.date().transform((d) => d.toISOString()),
]);

// ---------------------------------------------------------------------------
// PortfolioAssumptions (rows 129–133 horizons, 135–138 factors)
// ---------------------------------------------------------------------------

export const ReturnHorizonWeightsSchema = z.object({
  threeMo: excelDecimalRatioNullable().transform((v) => v ?? 0),
  sixMo: excelDecimalRatioNullable().transform((v) => v ?? 0),
  oneYr: excelDecimalRatioNullable().transform((v) => v ?? 0),
  threeYr: excelDecimalRatioNullable().transform((v) => v ?? 0),
  fiveYr: excelDecimalRatioNullable().transform((v) => v ?? 0),
});

export const FactorWeightsSchema = z.object({
  expense: excelDecimalRatioNullable().transform((v) => v ?? 0),
  pctWeight: excelDecimalRatioNullable().transform((v) => v ?? 0),
  divApy: excelDecimalRatioNullable().transform((v) => v ?? 0),
  volatility: excelDecimalRatioNullable().transform((v) => v ?? 0),
});

export const PortfolioAssumptionsSchema = z.object({
  returnHorizons: ReturnHorizonWeightsSchema,
  factors: FactorWeightsSchema,
});

// ---------------------------------------------------------------------------
// MfoRow — 47 workbook columns (A–AU) + sheetRow
// ---------------------------------------------------------------------------

/**
 * Column map (Excel 1-based):
 * A status, B symbol (ticker), C name, D–K metrics, K spacer,
 * L–N prices, O–P changes, Q–U basis prices, V–Z returns,
 * AA–AE blended/vol, AF–AJ sub-ranks, AK weightAvg%, AL RSI,
 * AM–AN alerts, AO composite, AP spacer, AQ–AR ranks, AS–AU parity/target.
 */
export const MfoRowSchema = z.object({
  sheetRow: z.coerce.number().int().positive(),
  /** Column A — Active | Comparable */
  rowStatus: z.string(),
  /** Column B — ticker / symbol */
  symbol: z.string().min(1, 'symbol (ticker) required'),
  /** Column C — fund name */
  name: z.string(),
  /** Column D — current weight (decimal) */
  currentWeight: excelDecimalRatioNullable(),
  /** Column E — target parity weight (decimal) */
  targetParityWeight: excelDecimalRatioNullable(),
  /** Column F — expense ratio (decimal) */
  expenseRatio: excelDecimalRatioNullable(),
  /** Column G — dividend $ */
  dividendDollars: nullableFiniteNumber(),
  /** Column H — dividend yield APY (decimal) */
  divApy: excelDecimalRatioNullable(),
  quantity: nullableFiniteNumber(),
  marketValue: nullableFiniteNumber(),
  /** Columns L–N — prices */
  price1: nullableFiniteNumber(),
  price2: nullableFiniteNumber(),
  price3: nullableFiniteNumber(),
  /** Columns O–P — period changes (decimal fraction) */
  change24h: excelDecimalRatioNullable(),
  change7d: excelDecimalRatioNullable(),
  basisPrice3mo: nullableFiniteNumber(),
  basisPrice6mo: nullableFiniteNumber(),
  basisPrice1yr: nullableFiniteNumber(),
  basisPrice3yr: nullableFiniteNumber(),
  basisPrice5yr: nullableFiniteNumber(),
  /** Columns V–Z — total returns (decimal fraction) */
  return3mo: excelDecimalRatioNullable(),
  return6mo: excelDecimalRatioNullable(),
  return1yr: excelDecimalRatioNullable(),
  return3yr: excelDecimalRatioNullable(),
  return5yr: excelDecimalRatioNullable(),
  returnWeightedAvg: excelDecimalRatioNullable(),
  volatilityWeight: excelDecimalRatioNullable(),
  volatility3mo: excelDecimalRatioNullable(),
  volatilitySecondary: excelDecimalRatioNullable(),
  /** Sub-ranks (1–100 style) */
  subRankCurrent: nullableFiniteNumber(),
  subRankExpense: nullableFiniteNumber(),
  subRankPctWeight: nullableFiniteNumber(),
  subRankDivApy: nullableFiniteNumber(),
  subRankVolatility: nullableFiniteNumber(),
  /** Often displayed as whole-number percent (e.g. 25.2); stored as number, not Excel 0–1 fraction */
  weightAvgPercent: nullableFiniteNumber(),
  rsi: nullableFiniteNumber(),
  /** Columns AM–AN — narrative signals (strings) */
  alertPrimary: z.union([z.string(), z.null()]).transform((s) => (s === '' ? null : s)),
  alertSecondary: z.union([z.string(), z.null()]).transform((s) => (s === '' ? null : s)),
  compositeScore: nullableFiniteNumber(),
  rankOverall: nullableFiniteNumber(),
  rankSecondary: nullableFiniteNumber(),
  parityDollars: nullableFiniteNumber(),
  parityChangeDollars: nullableFiniteNumber(),
  sharesDelta: nullableFiniteNumber(),
  /** Column AU — target sleeve % for parity (decimal, e.g. 0.0075) */
  targetSleevePct: excelDecimalRatioNullable(),
});

// ---------------------------------------------------------------------------
// Full snapshot (API, DB, AI context)
// ---------------------------------------------------------------------------

export const PortfolioSnapshotSchema = z.object({
  snapshotAt: SnapshotTimestampSchema,
  assumptions: PortfolioAssumptionsSchema,
  rows: z.array(MfoRowSchema),
  /** Optional: from `parse-workbook` metadata */
  sheetName: z.literal('SK_Fidelity').optional(),
  priceAsOfDates: z
    .tuple([
      z.union([z.coerce.date(), z.null()]),
      z.union([z.coerce.date(), z.null()]),
      z.union([z.coerce.date(), z.null()]),
    ])
    .optional(),
});

export type MfoRowValidated = z.infer<typeof MfoRowSchema>;
export type PortfolioAssumptionsValidated = z.infer<typeof PortfolioAssumptionsSchema>;
export type PortfolioSnapshotValidated = z.infer<typeof PortfolioSnapshotSchema>;

/** Strict parse; throws `ZodError` on failure. */
export function parsePortfolioSnapshot(data: unknown): PortfolioSnapshotValidated {
  return PortfolioSnapshotSchema.parse(data);
}

/** Safe parse for routes and ingestion. */
export function safeParsePortfolioSnapshot(data: unknown) {
  return PortfolioSnapshotSchema.safeParse(data);
}

/** Validate a single row (e.g. peer object). */
export function parseMfoRow(data: unknown): MfoRowValidated {
  return MfoRowSchema.parse(data);
}

export function safeParseMfoRow(data: unknown) {
  return MfoRowSchema.safeParse(data);
}

/** Same-sleeve comparables / watchlist rows (each must pass `MfoRowSchema`). */
export const PeerContextSchema = z.array(MfoRowSchema).max(200);

export type PeerContextValidated = z.infer<typeof PeerContextSchema>;

/** Envelope for MFO Portfolio Specialist LLM calls (snapshot + focus row + peers). */
export const MfoSpecialistPayloadSchema = z.object({
  portfolioSnapshot: PortfolioSnapshotSchema,
  focusRow: MfoRowSchema,
  peerContext: PeerContextSchema,
});

export type MfoSpecialistPayloadValidated = z.infer<typeof MfoSpecialistPayloadSchema>;

export function safeParseMfoSpecialistPayload(data: unknown) {
  return MfoSpecialistPayloadSchema.safeParse(data);
}
