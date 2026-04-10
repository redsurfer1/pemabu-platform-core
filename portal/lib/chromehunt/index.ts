/**
 * ChromeHunt shared library — prompts, schema description, and types for Gemini-backed
 * Chrome extension recommendations (server-side use only).
 */

export type { ExtensionRecommendation, ExtensionRecommendationsPayload, ExtensionSafetyRating } from './types';
export {
  chromeHuntSystemInstruction,
  chromeHuntResponseSchemaDescription,
  cleanGeminiJsonText,
} from './geminiPrompt';
export { getRecommendations } from './getRecommendations';
