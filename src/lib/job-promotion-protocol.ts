/**
 * Job Promotion Protocol (SpyMolt / Applme) — Project Leads push jobs to agent-heavy channels.
 * All content is scrubbed via privacy-shield before being "posted" to the agent network.
 */

import { prisma } from "./prisma";
import { scrubContext } from "./privacy-shield";

export type PromoteJobParams = {
  projectId: string;
  projectLeadId: string;
  tenantId: string;
};

export type PromoteJobResult =
  | { success: true; promotedAt: string }
  | { success: false; error: string };

/**
 * Promote a job to the agent channel (sets promotedAt). Only the project lead may promote.
 */
export async function promoteJob(params: PromoteJobParams): Promise<PromoteJobResult> {
  const project = await prisma.treasuryTask.findFirst({
    where: { id: params.projectId, tenantId: params.tenantId, projectLeadId: params.projectLeadId },
  });
  if (!project) return { success: false, error: "PROJECT_NOT_FOUND_OR_NOT_LEAD" };
  if (project.status !== "OPEN") return { success: false, error: "PROJECT_NOT_OPEN" };

  const promotedAt = new Date();
  await prisma.treasuryTask.update({
    where: { id: params.projectId },
    data: { promotedAt },
  });
  return { success: true, promotedAt: promotedAt.toISOString() };
}

export type PromotedJobFeedItem = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  promotedAt: string;
  deadlineDays: number;
  /** Scrubbed for external agent network; do not expose raw. */
};

export type GetPromotedFeedParams = {
  tenantId?: string | null;
  userRole: string;
  isAdminRoute?: boolean;
  limit?: number;
};

/**
 * Returns promoted jobs for agent channel. Title and description are scrubbed via privacy-shield.
 */
export async function getPromotedJobsFeed(
  params: GetPromotedFeedParams
): Promise<PromotedJobFeedItem[]> {
  const { tenantId, userRole, isAdminRoute, limit = 50 } = params;
  const projects = await prisma.treasuryTask.findMany({
    where: {
      promotedAt: { not: null },
      ...(tenantId ? { tenantId } : {}),
      status: "OPEN",
    },
    orderBy: { promotedAt: "desc" },
    take: limit,
    select: { id: true, title: true, description: true, skills: true, promotedAt: true, deadlineDays: true },
  });

  return projects.map((p) => ({
    id: p.id,
    title: scrubContext(p.title, userRole, { isAdminRoute }),
    description: scrubContext(p.description, userRole, { isAdminRoute }),
    skills: p.skills,
    promotedAt: (p.promotedAt as Date).toISOString(),
    deadlineDays: p.deadlineDays ?? 75,
  }));
}
