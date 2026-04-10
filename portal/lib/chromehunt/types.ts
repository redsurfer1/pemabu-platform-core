/**
 * ChromeHunt — structured extension recommendation types (camelCase).
 * Derived from resource ChromeHunt-main/types.ts + geminiService schema alignment.
 *
 * Legal note: no language implying third-party payment holds, moving funds between parties,
 * or marketplace purchase obligations may be added to prompts or types in this module —
 * see portal/docs/chromehunt-reconciliation.md.
 */

export type ExtensionSafetyRating = 'High' | 'Medium' | 'Low';

export interface ExtensionRecommendation {
  name: string;
  description: string;
  reason: string;
  pros: string[];
  cons: string[];
  safetyRating: ExtensionSafetyRating;
  category: string;
  alternatives?: string[];
  /** Absolute Chrome Web Store URL when grounded by search; may be empty if uncertain */
  storeUrl?: string;
}

export interface ExtensionRecommendationsPayload {
  recommendations: ExtensionRecommendation[];
}
