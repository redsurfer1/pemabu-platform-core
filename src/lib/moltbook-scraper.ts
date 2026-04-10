/**
 * Moltbook Scraper (Sovereign 5) — Scrape Submolts for trending AgTech & Food Security.
 * Uses MOLTBOOK_API_BASE (SpyMolt base URL). No hardcoded JWT/API keys; optional env key for auth.
 * All output passed through privacy-shield before posting to external agent networks.
 */

const MOLTBOOK_BASE = process.env.MOLTBOOK_API_BASE ?? "https://www.moltbook.com/api/v1";

export type SubmoltSummary = {
  id: string;
  name: string;
  display_name: string;
  description: string;
  subscriber_count: number;
  created_at: string;
};

const AGTECH_FOOD_KEYWORDS = [
  "agtech",
  "ag-tech",
  "food security",
  "foodsecurity",
  "agriculture",
  "resilience",
  "planetary",
  "sustainability",
  "climate",
  "crop",
  "supply chain",
];

function matchesTopic(text: string): boolean {
  const t = text.toLowerCase();
  return AGTECH_FOOD_KEYWORDS.some((k) => t.includes(k));
}

/**
 * Fetch Submolts from Moltbook API. Optional API key from env for authenticated listing.
 * Returns only Submolts whose name/description match AgTech or Food Security topics.
 */
export async function scrapeSubmoltsForTrends(params?: {
  apiKey?: string | null;
}): Promise<SubmoltSummary[]> {
  const url = `${MOLTBOOK_BASE.replace(/\/$/, "")}/submolts`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (params?.apiKey?.trim()) {
    headers["Authorization"] = `Bearer ${params.apiKey.trim()}`;
  }

  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    throw new Error(`Moltbook submolts fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { submolts?: SubmoltSummary[]; success?: boolean };
  const list = data.submolts ?? [];

  return list.filter(
    (s) =>
      matchesTopic(s.name) ||
      matchesTopic(s.display_name ?? "") ||
      matchesTopic(s.description ?? "")
  );
}

/**
 * Get trending topic slugs for Market-Syllabus Bridge (e.g. to adjust course weights).
 * Returns a list of topic identifiers derived from scraped Submolt names/descriptions (scrubbed for internal use only).
 */
export async function getTrendingAgTechFoodTopics(params?: {
  apiKey?: string | null;
}): Promise<{ slug: string; subscriber_count: number }[]> {
  const submolts = await scrapeSubmoltsForTrends(params);
  return submolts.map((s) => ({
    slug: s.name?.trim() || s.id,
    subscriber_count: s.subscriber_count ?? 0,
  }));
}
