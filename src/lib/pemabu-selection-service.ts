/**
 * Pemabu Selection Service (APPLME Bidding Engine extraction).
 * Bid submission, ranking by reputation/certification, and selection for "Planetary Resilience" tasks.
 * All public job/bid data must be scrubbed via privacy-shield before display.
 */

import { prisma } from "./prisma";
import { scrubContext } from "./privacy-shield";

const PLANETARY_RESILIENCE_SKILL = "PLANETARY_RESILIENCE";
const PLANETARY_RESILIENCE_COURSE_SLUG = "PLANETARY_RESILIENCE";

export type SubmitBidParams = {
  treasuryTaskId: string;
  userId: string;
  tenantId: string;
  amount?: number;
  message?: string;
};

export type SubmitBidResult =
  | { success: true; agenticTenderId: string }
  | { success: false; error: string };

/**
 * Submit a bid on a project. One bid per user per project (upsert).
 */
export async function submitBid(params: SubmitBidParams): Promise<SubmitBidResult> {
  const project = await prisma.treasuryTask.findFirst({
    where: { id: params.treasuryTaskId, tenantId: params.tenantId, status: "OPEN" },
  });
  if (!project) return { success: false, error: "PROJECT_NOT_FOUND_OR_CLOSED" };

  const bid = await prisma.agenticTender.upsert({
    where: {
      treasuryTaskId_userId: { treasuryTaskId: params.treasuryTaskId, userId: params.userId },
    },
    create: {
      treasuryTaskId: params.treasuryTaskId,
      userId: params.userId,
      amount: params.amount ?? null,
      message: params.message ?? null,
      status: "PENDING",
    },
    update: {
      amount: params.amount ?? undefined,
      message: params.message ?? undefined,
    },
  });
  return { success: true, agenticTenderId: bid.id };
}

export type RankedBid = {
  bidId: string;
  userId: string;
  amount: number | null;
  message: string | null;
  reputationScore: number;
  hasPlanetaryResilience: boolean;
  rank: number;
};

/**
 * Rank bids for a project: reputation (desc), Planetary Resilience certification, then amount (asc = cheaper first).
 */
export async function rankBids(projectId: string, tenantId: string): Promise<RankedBid[]> {
  const bids = await prisma.agenticTender.findMany({
    where: { treasuryTaskId: projectId, treasuryTask: { tenantId }, status: "PENDING" },
    include: {
      user: {
        select: {
          id: true,
          reputationScore: true,
          certifications: { where: { courseType: PLANETARY_RESILIENCE_COURSE_SLUG }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const withScores = bids.map((b) => ({
    bidId: b.id,
    userId: b.user.id,
    amount: b.amount != null ? Number(b.amount) : null,
    message: b.message,
    reputationScore: b.user.reputationScore != null ? Number(b.user.reputationScore) : 0,
    hasPlanetaryResilience: b.user.certifications.length > 0,
  }));

  withScores.sort((a, b) => {
    if (b.reputationScore !== a.reputationScore) return b.reputationScore - a.reputationScore;
    if (a.hasPlanetaryResilience !== b.hasPlanetaryResilience) return a.hasPlanetaryResilience ? -1 : 1;
    const amtA = a.amount ?? Infinity;
    const amtB = b.amount ?? Infinity;
    return amtA - amtB;
  });

  return withScores.map((b, i) => ({ ...b, rank: i + 1 }));
}

export type SelectBidParams = {
  treasuryTaskId: string;
  agenticTenderId: string;
  projectLeadId: string;
  tenantId: string;
  /** If set, create Flomisma escrow for this amount (caller handles Flomisma API). */
  createEscrowAmount?: number;
};

export type SelectBidResult =
  | { success: true; acceptedAgenticTenderId: string }
  | { success: false; error: string };

/**
 * Select (accept) one bid: mark bid ACCEPTED, reject others, set project to FILLED.
 * Caller may then create Flomisma EscrowContract via VettingWorkflowService.approveApplicant.
 */
export async function selectBid(params: SelectBidParams): Promise<SelectBidResult> {
  const project = await prisma.treasuryTask.findFirst({
    where: {
      id: params.treasuryTaskId,
      tenantId: params.tenantId,
      projectLeadId: params.projectLeadId,
      status: "OPEN",
    },
    include: { bids: true },
  });
  if (!project) return { success: false, error: "PROJECT_NOT_FOUND_OR_NOT_LEAD" };

  const bid = project.bids.find((b) => b.id === params.agenticTenderId);
  if (!bid || bid.status !== "PENDING") return { success: false, error: "BID_NOT_FOUND_OR_NOT_PENDING" };

  await prisma.$transaction([
    prisma.agenticTender.updateMany({
      where: { treasuryTaskId: params.treasuryTaskId, id: { not: params.agenticTenderId } },
      data: { status: "REJECTED" },
    }),
    prisma.agenticTender.update({
      where: { id: params.agenticTenderId },
      data: { status: "ACCEPTED" },
    }),
    prisma.treasuryTask.update({
      where: { id: params.treasuryTaskId },
      data: { status: "FILLED" },
    }),
  ]);

  return { success: true, acceptedAgenticTenderId: params.agenticTenderId };
}

/**
 * Fetch open projects that match "Planetary Resilience" (skill or course slug) for AI agents to bid on.
 * Title and description are scrubbed via privacy-shield before return.
 */
export type PlanetaryResilienceFeedParams = {
  tenantId?: string | null;
  userRole: string;
  isAdminRoute?: boolean;
  limit?: number;
};

export type PlanetaryResilienceFeedItem = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  promotedAt: string | null;
  deadlineDays: number;
  createdAt: string;
};

export async function getPlanetaryResilienceFeed(
  params: PlanetaryResilienceFeedParams
): Promise<PlanetaryResilienceFeedItem[]> {
  const { tenantId, userRole, isAdminRoute, limit = 50 } = params;
  const projects = await prisma.treasuryTask.findMany({
    where: {
      status: "OPEN",
      ...(tenantId ? { tenantId } : {}),
      OR: [
        { skills: { has: PLANETARY_RESILIENCE_SKILL } },
        { skills: { has: PLANETARY_RESILIENCE_COURSE_SLUG } },
      ],
    },
    orderBy: { promotedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      skills: true,
      promotedAt: true,
      deadlineDays: true,
      createdAt: true,
    },
  });

  return projects.map((p) => ({
    id: p.id,
    title: scrubContext(p.title, userRole, { isAdminRoute }),
    description: scrubContext(p.description, userRole, { isAdminRoute }),
    skills: p.skills,
    promotedAt: p.promotedAt ? (p.promotedAt as Date).toISOString() : null,
    deadlineDays: p.deadlineDays,
    createdAt: (p.createdAt as Date).toISOString(),
  }));
}
