import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { scrubContext } from '@/src/lib/privacy-shield';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/[id] — Single project for dashboard (title/description scrubbed).
 * Returns project + deadlineDays + 75-day clock info; bids only if project lead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') ?? 'PUBLIC';
    const isAdminRoute = searchParams.get('admin') === 'true';
    const asLead = searchParams.get('asLead') === 'true';

    const project = await prisma.treasuryTask.findFirst({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        skills: true,
        status: true,
        promotedAt: true,
        deadlineDays: true,
        createdAt: true,
        projectLeadId: true,
        bids: asLead
          ? {
              select: {
                id: true,
                userId: true,
                amount: true,
                message: true,
                status: true,
                createdAt: true,
              },
            }
          : false,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const createdAt = project.createdAt as Date;
    const deadlineAt = new Date(createdAt);
    deadlineAt.setDate(deadlineAt.getDate() + (project.deadlineDays ?? 75));

    const scrubbed = {
      id: project.id,
      title: scrubContext(project.title, userRole, { isAdminRoute }),
      description: scrubContext(project.description, userRole, { isAdminRoute }),
      skills: project.skills,
      status: project.status,
      promotedAt: project.promotedAt ? (project.promotedAt as Date).toISOString() : null,
      deadlineDays: project.deadlineDays ?? 75,
      createdAt: createdAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      bids: project.bids ?? undefined,
    };

    return NextResponse.json(scrubbed);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}
