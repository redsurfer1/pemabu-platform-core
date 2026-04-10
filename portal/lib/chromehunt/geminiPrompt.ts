/**
 * Gemini prompt + JSON-shape contract for extension recommendations.
 * Source: Developer/Resources/flomisma_ChromeHunt/ChromeHunt-main/services/geminiService.ts
 * Sanitized: no third-party fund holds, payment, or marketplace transaction claims.
 *
 * Wire-up: call from a Server Action or Route Handler only (never expose API keys client-side).
 * Model: gemini-2.0-flash via REST (see getRecommendations.ts) with JSON response.
 */

/** System instruction for grounded, safety-biased extension discovery */
export const chromeHuntSystemInstruction = `
You are the engine behind Pemabu ChromeHunt. Your goal is to solve user problems by recommending
EXISTING, REAL Chrome extensions discoverable via public sources (e.g. Chrome Web Store).

Rules:
1. When search tooling is available, use it to find current, highly-rated extensions and real store URLs.
2. You MUST prefer real 'https://chromewebstore.google.com/detail/...' URLs. Do not invent store IDs.
3. Prioritize safety and minimal permissions; call out risky permission scopes honestly.
4. Be honest about trade-offs (e.g. performance, privacy).
5. Return at most 3 recommendations.
6. Output strictly as JSON matching the agreed schema (recommendations array).
7. Do not describe payment processing or holding user funds — this tool is informational only.
`.trim();

/**
 * JSON-schema-shaped description suitable for @google/genai `responseSchema`
 * (Type.OBJECT / properties) — mirror of resource extensionSchema.
 * Implementations should pass this to the SDK; types live in ./types.ts
 */
export const chromeHuntResponseSchemaDescription = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the real Chrome extension as found on the store',
          },
          description: { type: 'string', description: 'One-sentence description of functionality' },
          reason: { type: 'string', description: 'Why this fits the user problem' },
          pros: { type: 'array', items: { type: 'string' } },
          cons: {
            type: 'array',
            items: { type: 'string' },
            description: 'Trade-offs or permission warnings',
          },
          safetyRating: {
            type: 'string',
            enum: ['High', 'Medium', 'Low'],
            description: 'Permission scope and developer reputation assessment',
          },
          category: { type: 'string' },
          alternatives: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of 1–2 safer alternatives if applicable',
          },
          storeUrl: {
            type: 'string',
            description:
              'Absolute https://chromewebstore.google.com/detail/... URL when known; empty if uncertain',
          },
        },
        required: ['name', 'description', 'reason', 'pros', 'cons', 'safetyRating', 'category'],
      },
    },
  },
} as const;

/** Strip markdown fences and stray text outside JSON; same strategy as resource cleanJson */
export function cleanGeminiJsonText(text: string): string {
  let clean = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean;
}
