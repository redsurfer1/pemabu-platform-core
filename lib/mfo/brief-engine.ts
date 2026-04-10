/**
 * MFO structured weekly / on-demand portfolio brief (Gemini + JSON contract).
 * Pattern mirrors Spice Krewe `briefGenerator.ts`: system instruction, JSON-only response,
 * fence stripping, and a deterministic fallback when the model or parse fails.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { MfoRowValidated, PortfolioSnapshotValidated } from './schema';

export const GEMINI_MODEL_MFO_BRIEF = 'gemini-1.5-flash';

/** README-aligned mandatory footer (plain text). */
export const MFO_BRIEF_COMPLIANCE_FOOTER =
  'This analysis is for educational purposes only based on the quantitative model provided. Pemabu and Flomisma are not registered investment advisors. No transactions are executed through this platform.';

/**
 * Core MFO Portfolio Specialist instruction (from README — AI Agent System Instructions).
 * Used as Gemini `systemInstruction`.
 */
export const MFO_PORTFOLIO_SPECIALIST_SYSTEM_INSTRUCTION = `You are a Senior Risk Management Consultant for the MFO (Modern Family Office) platform.

Mission: Provide plain-English narratives for quantitative portfolio signals derived from the model only—never discretionary investment advice.

Guiding principles:
1. The "why" over the "what" — Explain how assumption weights (e.g. 40% on 3-month momentum in the return blend) influence rankings and alerts relative to other horizons and factors.
2. Parity focus — Describe gaps as allocation drift; tie narrative to parity dollar levels and parityChangeDollars / sleeve targets where data exists.
3. Technical context — Interpret RSI cautiously (e.g. elevated RSI may suggest overextended conditions in the model's framing); state clearly when a field is null or missing.
4. Professionalism — Use terms such as factor exposure, sleeve rebalancing, and risk budget where appropriate.

Safety and compliance:
- Strict no-trade policy: Never use "Buy" or "Sell." Use only: Consider Entry, Hold, Consider Exit, Exit Review, etc.
- No hallucinations: Do not invent fund flows, prices, or news. If data is missing, say so.
- The complianceFooter field in your JSON output must be exactly the mandatory disclaimer string provided in the user message (copy it verbatim).`;

const MfoPortfolioBriefSchema = z.object({
  executiveSummary: z.string(),
  allocationDrift: z.string(),
  topSignalChanges: z.string(),
  complianceFooter: z.string(),
});

export type MfoPortfolioBrief = z.infer<typeof MfoPortfolioBriefSchema>;

/** Row slice sent to the model to control token size. */
export type MfoBriefContextRow = {
  symbol: string;
  rowStatus: string;
  name: string;
  currentWeight: number | null;
  targetParityWeight: number | null;
  targetSleevePct: number | null;
  parityChangeDollars: number | null;
  parityDollars: number | null;
  alertPrimary: string | null;
  alertSecondary: string | null;
  compositeScore: number | null;
  rsi: number | null;
};

export type MfoBriefLlmPayload = {
  snapshotAt: string;
  assumptions: PortfolioSnapshotValidated['assumptions'];
  rowCount: number;
  activeCount: number;
  comparableCount: number;
  rows: MfoBriefContextRow[];
};

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'No Gemini API key: set GOOGLE_API_KEY or GEMINI_API_KEY for MFO brief generation (server-side only).',
    );
  }
  return key;
}

function isActiveRow(r: MfoRowValidated): boolean {
  return r.rowStatus.trim().toLowerCase() === 'active';
}

/**
 * Prioritize active names with largest absolute parity $ change, then comparables; cap list size.
 */
export function buildBriefPayload(snapshot: PortfolioSnapshotValidated, maxRows = 80): MfoBriefLlmPayload {
  const active = snapshot.rows.filter(isActiveRow);
  const comparables = snapshot.rows.filter((r) => !isActiveRow(r));

  const byParity = (a: MfoRowValidated, b: MfoRowValidated) => {
    const da = Math.abs(a.parityChangeDollars ?? 0);
    const db = Math.abs(b.parityChangeDollars ?? 0);
    return db - da;
  };

  const activeSorted = [...active].sort(byParity);
  const compSorted = [...comparables].sort(byParity);

  const takeActive = Math.min(activeSorted.length, Math.max(1, maxRows - Math.min(20, compSorted.length)));
  const takeComp = Math.min(compSorted.length, maxRows - takeActive);

  const picked = [...activeSorted.slice(0, takeActive), ...compSorted.slice(0, takeComp)];

  const rows: MfoBriefContextRow[] = picked.map((r) => ({
    symbol: r.symbol,
    rowStatus: r.rowStatus,
    name: r.name,
    currentWeight: r.currentWeight,
    targetParityWeight: r.targetParityWeight,
    targetSleevePct: r.targetSleevePct,
    parityChangeDollars: r.parityChangeDollars,
    parityDollars: r.parityDollars,
    alertPrimary: r.alertPrimary,
    alertSecondary: r.alertSecondary,
    compositeScore: r.compositeScore,
    rsi: r.rsi,
  }));

  return {
    snapshotAt: snapshot.snapshotAt,
    assumptions: snapshot.assumptions,
    rowCount: snapshot.rows.length,
    activeCount: active.length,
    comparableCount: comparables.length,
    rows,
  };
}

function extractJsonObject(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}') + 1;
  return start >= 0 && end > start ? cleaned.slice(start, end) : cleaned;
}

function normalizeBrief(raw: unknown): MfoPortfolioBrief {
  const parsed = MfoPortfolioBriefSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Brief JSON failed schema validation');
  }
  return {
    ...parsed.data,
    complianceFooter: MFO_BRIEF_COMPLIANCE_FOOTER,
  };
}

/**
 * Deterministic brief when Gemini is unavailable or parsing fails (mirrors Spice Krewe `buildFallbackCulinarySummary`).
 */
export function getFallbackBrief(snapshot: PortfolioSnapshotValidated): MfoPortfolioBrief {
  const active = snapshot.rows.filter(isActiveRow);
  const withParity = active.filter(
    (r) => r.parityChangeDollars != null && Number.isFinite(r.parityChangeDollars),
  );

  const sumParityDelta = withParity.reduce((s, r) => s + (r.parityChangeDollars as number), 0);

  const byAbs = [...withParity].sort(
    (a, b) =>
      Math.abs(b.parityChangeDollars as number) - Math.abs(a.parityChangeDollars as number),
  );
  const topDrift = byAbs.slice(0, 8);

  const signalRows = snapshot.rows.filter((r) => {
    const blob = `${r.alertPrimary ?? ''} ${r.alertSecondary ?? ''}`.toLowerCase();
    return (
      blob.includes('consider entry') ||
      blob.includes('consider exit') ||
      blob.includes('exit review')
    );
  });

  const fmt$ = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const executiveSummary =
    `Snapshot as of ${snapshot.snapshotAt}: ${snapshot.rows.length} rows (${active.length} active, ${snapshot.rows.length - active.length} comparable/watchlist). ` +
    (withParity.length
      ? `Sum of parity $ changes across active positions with data: ${fmt$(sumParityDelta)}. `
      : 'Parity change data is sparse for active rows; review individual positions in the workbook. ') +
    `Scenario weights: return horizons (3mo→5yr) and factors (expense, % weight, div APY, volatility) are embedded in the model; adjust assumptions in Scenario Lab to see rank sensitivity.`;

  const driftLines = topDrift.map((r) => {
    const d = r.parityChangeDollars as number;
    const dir = d >= 0 ? 'ahead of' : 'behind';
    return `• ${r.symbol}: parity change ${fmt$(d)} (${dir} model parity band; allocation drift review).`;
  });

  const allocationDrift =
    (driftLines.length
      ? 'Largest absolute parity $ movements among active positions (model-derived):\n' + driftLines.join('\n')
      : 'No parity change dollars available on active rows for this snapshot; allocation drift should be assessed after refreshing prices or parity columns.') +
    (withParity.length
      ? `\nAggregate parity delta (sum of shown active changes with values): ${fmt$(sumParityDelta)}.`
      : '');

  const signalLines = signalRows.slice(0, 15).map((r) => {
    const p = r.alertPrimary ?? '—';
    const s = r.alertSecondary ?? '';
    return `• ${r.symbol} (${r.rowStatus}): ${p}${s ? ` / ${s}` : ''}`;
  });

  const topSignalChanges =
    signalLines.length > 0
      ? 'Positions with non-Hold style signals in primary or secondary alerts:\n' + signalLines.join('\n')
      : 'No Consider Entry / Consider Exit / Exit Review style alerts detected in primary or secondary fields for this export.';

  return {
    executiveSummary,
    allocationDrift,
    topSignalChanges,
    complianceFooter: MFO_BRIEF_COMPLIANCE_FOOTER,
  };
}

/**
 * User message body: JSON payload + strict output contract + verbatim footer requirement.
 */
function buildUserPrompt(payload: MfoBriefLlmPayload): string {
  return `You will receive a validated MFO portfolio snapshot (JSON). Write a concise institutional-style brief.

Mandatory complianceFooter (copy EXACTLY into the JSON field "complianceFooter", character-for-character):
${MFO_BRIEF_COMPLIANCE_FOOTER}

Portfolio data (JSON):
${JSON.stringify(payload)}

Respond in the following JSON format only (no markdown fences, no extra text):
{
  "executiveSummary": "2-4 sentences: snapshot context, key risk/parity themes, factor horizon emphasis using assumptions",
  "allocationDrift": "Paragraph plus optional short bullets: largest parity gaps, sleeve language, mention parityChangeDollars where present",
  "topSignalChanges": "Bullet-style text in a single string (use newline characters): notable Consider Entry / Consider Exit / RSI-related secondary alerts; state if data missing",
  "complianceFooter": ${JSON.stringify(MFO_BRIEF_COMPLIANCE_FOOTER)}
}
Return only valid JSON.`;
}

/**
 * Generate structured MFO portfolio brief via Gemini. On any failure, returns `getFallbackBrief(snapshot)`.
 */
export async function generateMfoPortfolioBrief(
  snapshot: PortfolioSnapshotValidated,
  options?: { maxContextRows?: number },
): Promise<MfoPortfolioBrief> {
  try {
    const payload = buildBriefPayload(snapshot, options?.maxContextRows ?? 80);
    const apiKey = getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const userPrompt = buildUserPrompt(payload);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_MFO_BRIEF,
      contents: userPrompt,
      config: {
        systemInstruction: MFO_PORTFOLIO_SPECIALIST_SYSTEM_INSTRUCTION,
        maxOutputTokens: 2048,
        temperature: 0.25,
      },
    });

    const text = (response.text ?? '').trim();
    const jsonStr = extractJsonObject(text);
    const raw = JSON.parse(jsonStr) as unknown;
    return normalizeBrief(raw);
  } catch {
    return getFallbackBrief(snapshot);
  }
}

export { MfoPortfolioBriefSchema };
