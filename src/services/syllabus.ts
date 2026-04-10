/**
 * Dynamic Syllabus — recommendation engine weights and trending courses.
 * Linked to Flomisma market gaps via Market-Syllabus Bridge (trade finance, spice trade surges).
 */

import { prisma } from "../lib/prisma";

/** Module slug used by the bridge for Trade Finance Compliance. */
export const TRADE_FINANCE_COMPLIANCE_SLUG = "TRADE_FINANCE_COMPLIANCE";

/**
 * Get recommendation weights for all courses (for feed ordering).
 */
export async function getRecommendationWeights(): Promise<Record<string, number>> {
  const courses = await prisma.course.findMany({
    select: { slug: true, weight: true },
  });
  const out: Record<string, number> = {};
  for (const c of courses) {
    out[c.slug] = Number(c.weight);
  }
  return out;
}

/**
 * Set the weight of a module (e.g. Trade Finance Compliance) in the recommendation engine.
 */
export async function setModuleWeight(slug: string, weight: number): Promise<void> {
  await prisma.course.upsert({
    where: { slug },
    create: {
      slug,
      title: slug.replace(/_/g, " "),
      weight: weight,
    },
    update: { weight: weight },
  });
}

/**
 * Set isTrending on a course so it appears at the top of the user's feed.
 * Upserts the course if it does not exist (so bridge can set trending on first surge).
 */
export async function setCourseTrending(slug: string, isTrending: boolean): Promise<void> {
  await prisma.course.upsert({
    where: { slug },
    create: {
      slug,
      title: slug.replace(/_/g, " "),
      weight: 1,
      isTrending,
    },
    update: { isTrending },
  });
}

/**
 * Get courses for the user feed: trending first, then by weight descending.
 */
export async function getCoursesForFeed(limit: number = 20): Promise<
  { id: string; slug: string; title: string; weight: number; isTrending: boolean }[]
> {
  const courses = await prisma.course.findMany({
    orderBy: [{ isTrending: "desc" }, { weight: "desc" }],
    take: limit,
    select: { id: true, slug: true, title: true, weight: true, isTrending: true },
  });
  return courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    weight: Number(c.weight),
    isTrending: c.isTrending,
  }));
}
