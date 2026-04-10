/**
 * Server-only Gemini calls for Chrome extension recommendations (REST API, fetch).
 * Requires GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY — never expose to the client.
 */

import type { ExtensionRecommendation } from './types';
import { chromeHuntSystemInstruction, cleanGeminiJsonText } from './geminiPrompt';

const MODEL_ID = 'gemini-2.0-flash';

/** JSON schema subset for Gemini `responseSchema` (REST generationConfig). */
const responseSchema = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          description: { type: 'STRING' },
          reason: { type: 'STRING' },
          pros: { type: 'ARRAY', items: { type: 'STRING' } },
          cons: { type: 'ARRAY', items: { type: 'STRING' } },
          safetyRating: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
          category: { type: 'STRING' },
          alternatives: { type: 'ARRAY', items: { type: 'STRING' } },
          storeUrl: { type: 'STRING' },
        },
        required: ['name', 'description', 'reason', 'pros', 'cons', 'safetyRating', 'category'],
      },
    },
  },
  required: ['recommendations'],
};

function parseRecommendations(text: string): ExtensionRecommendation[] {
  const data = JSON.parse(cleanGeminiJsonText(text)) as { recommendations?: ExtensionRecommendation[] };
  return Array.isArray(data.recommendations) ? data.recommendations : [];
}

async function generateJson(
  apiKey: string,
  userPrompt: string,
  tools?: { googleSearch: Record<string, never> }[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: chromeHuntSystemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  };
  if (tools?.length) {
    body.tools = tools;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

/**
 * Returns up to 3 structured extension recommendations for a free-text problem statement.
 */
export async function getRecommendations(problemStatement: string): Promise<ExtensionRecommendation[]> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not set');
  }
  if (!problemStatement.trim()) {
    return [];
  }

  const userPrompt = `The user has this problem: "${problemStatement}". Recommend Chrome extensions and return JSON only.`;

  try {
    const text = await generateJson(apiKey, userPrompt, [{ googleSearch: {} }]);
    return parseRecommendations(text);
  } catch {
    const text = await generateJson(apiKey, userPrompt);
    return parseRecommendations(text);
  }
}
