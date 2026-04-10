/**
 * Talent Hunt — semantic intelligence for CV-to-Project matching.
 * Vector/semantic search: match user skill profile (e.g. from Learn certification) to open Hire projects.
 */

import { prisma } from "./prisma";

/** Skill keywords inferred from Learn course types (for matching). */
const COURSE_SKILL_MAP: Record<string, string[]> = {
  PLANETARY_RESILIENCE: ["resilience", "sustainability", "planetary", "climate", "environment", "systems thinking"],
  AGTECH: ["agtech", "agriculture", "crops", "farming", "precision", "sustainability", "food systems"],
};

export type ProjectMatch = {
  projectId: string;
  title: string;
  projectLeadId: string;
  matchScore: number;
  skills: string[];
};

/**
 * Vector search / semantic match: given a user's new certification (courseType + optional score),
 * return the top N open projects in the Hire ecosystem that match the user's skill profile.
 */
export async function findTopMatchingProjects(
  tenantId: string,
  courseType: string,
  _skillScore?: number,
  topN: number = 3
): Promise<ProjectMatch[]> {
  const skills = COURSE_SKILL_MAP[courseType] ?? [courseType.toLowerCase().replace(/\s+/g, "_")];
  const openProjects = await prisma.treasuryTask.findMany({
    where: { tenantId, status: "OPEN" },
    include: { projectLead: { select: { id: true } } },
  });

  const scored = openProjects.map((p) => {
    const projectSkills = p.skills.map((s) => s.toLowerCase());
    const matchCount = skills.filter((sk) =>
      projectSkills.some((ps) => ps.includes(sk) || sk.includes(ps))
    ).length;
    const descMatch = skills.some((sk) =>
      p.description.toLowerCase().includes(sk)
    ) ? 1 : 0;
    const matchScore = (matchCount / Math.max(skills.length, 1)) * 0.7 + descMatch * 0.3;
    return {
      projectId: p.id,
      title: p.title,
      projectLeadId: p.projectLeadId,
      matchScore: Math.round(matchScore * 100) / 100,
      skills: p.skills,
    };
  });

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, topN)
    .filter((m) => m.matchScore > 0);
}
