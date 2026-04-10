/**
 * Market-Syllabus Bridge (Sovereign 5) — Dynamically adjust course weights from Moltbook trends.
 * Uses scraped AgTech/Food Security Submolts to boost "Planetary Resilience" and related course weights.
 * All bridge output is scrubbed via privacy-shield before any external post. Uses Prisma (RLS) for DB.
 */

import { prisma } from "./prisma";
import { getTrendingAgTechFoodTopics } from "./moltbook-scraper";
import { scrubContext } from "./privacy-shield";

const PLANETARY_RESILIENCE_SLUG = "PLANETARY_RESILIENCE";
const MAX_WEIGHT = 5;
const MIN_WEIGHT = 0.5;
const TREND_BOOST_PER_1K_SUBSCRIBERS = 0.1;

export type BridgeParams = {
  userRole: string;
  isAdminRoute?: boolean;
  apiKey?: string | null;
};

export type BridgeResult = {
  updated: boolean;
  courseSlug: string;
  previousWeight: number;
  newWeight: number;
  trendSignal: string;
};

/**
 * Fetch Moltbook trends and update Planetary Resilience (and related) course weights.
 * Trend signal is scrubbed before logging. No PII/treasury posted to external networks.
 */
export async function adjustCourseWeightsFromTrends(
  params: BridgeParams
): Promise<BridgeResult[]> {
  const topics = await getTrendingAgTechFoodTopics({ apiKey: params.apiKey });
  const totalRelevance =
    topics.reduce((s, t) => s + (t.subscriber_count ?? 0), 0) / 1000;
  const boost = Math.min(
    MAX_WEIGHT - 1,
    Math.max(0, totalRelevance * TREND_BOOST_PER_1K_SUBSCRIBERS)
  );

  const course = await prisma.course.findUnique({
    where: { slug: PLANETARY_RESILIENCE_SLUG },
  });
  if (!course) return [];

  const prev = Number(course.weight);
  const newWeight = Math.min(
    MAX_WEIGHT,
    Math.max(MIN_WEIGHT, prev + boost)
  );
  const trendSignal = `AgTech/Food Security trends: ${topics.length} topics, boost +${boost.toFixed(2)}`;
  const scrubbedSignal = scrubContext(trendSignal, params.userRole, {
    isAdminRoute: params.isAdminRoute,
  });

  await prisma.course.update({
    where: { id: course.id },
    data: {
      weight: newWeight,
      isTrending: topics.length > 0,
      updatedAt: new Date(),
    },
  });

  return [
    {
      updated: true,
      courseSlug: PLANETARY_RESILIENCE_SLUG,
      previousWeight: prev,
      newWeight,
      trendSignal: scrubbedSignal,
    },
  ];
}
