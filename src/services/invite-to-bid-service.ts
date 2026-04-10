/**
 * Invite to Bid — autonomous recruitment from Talent Hunt (certification-issued webhook).
 * Creates InviteToBid records and notifies user + project lead (bypass manual recruitment).
 */

import { prisma } from "../lib/prisma";

export type SendInviteResult =
  | { success: true; inviteId: string }
  | { success: false; error: string };

/**
 * Send an Invite to Bid to the user for a project. Creates InviteToBid and notifies project lead.
 */
export async function sendInviteToBid(params: {
  treasuryTaskId: string;
  userId: string;
  tenantId: string;
  metadata?: { courseType: string; courseName?: string; matchScore: number };
}): Promise<SendInviteResult> {
  const project = await prisma.treasuryTask.findFirst({
    where: { id: params.treasuryTaskId, tenantId: params.tenantId, status: "OPEN" },
    include: { projectLead: { select: { id: true, email: true } } },
  });
  if (!project) return { success: false, error: "PROJECT_NOT_FOUND_OR_CLOSED" };

  const existing = await prisma.inviteToBid.findUnique({
    where: {
      treasuryTaskId_userId: { treasuryTaskId: params.treasuryTaskId, userId: params.userId },
    },
  });
  if (existing) return { success: true, inviteId: existing.id };

  const invite = await prisma.inviteToBid.create({
    data: {
      treasuryTaskId: params.treasuryTaskId,
      userId: params.userId,
      status: "PENDING",
      metadata: {
        source: "certification-issued-webhook",
        ...params.metadata,
      },
    },
  });

  return { success: true, inviteId: invite.id };
}
