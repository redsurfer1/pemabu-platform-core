/**
 * P0 gig/project search over TreasuryTask (OfferedJobs-aligned facets, non-payment).
 * Used by app/api/v1/search/gigs — requires DB column search_vector + manual SQL trigger when FTS is enabled.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/src/lib/prisma';

/** POST body for public search; tenantId scopes multi-tenant data. */
export interface GigSearchInput {
  tenantId: string;
  query?: string;
  categorySlug?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
    radiusMiles?: number;
    remoteOk?: boolean;
  };
  vertical?: 'culinary' | 'services';
  page?: number;
  limit?: number;
}

export type GigSearchRow = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  status: string;
  tenantId: string;
  createdAt: Date;
};

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildWhere(input: GigSearchInput): Prisma.TreasuryTaskWhereInput {
  const where: Prisma.TreasuryTaskWhereInput = {
    tenantId: input.tenantId,
    status: 'OPEN',
  };

  if (input.categorySlug) {
    where.categories = {
      some: {
        category: {
          slug: input.categorySlug,
          tenantId: input.tenantId,
        },
      },
    };
  }

  if (input.location) {
    const loc = input.location;
    const is: Prisma.GigLocationWhereInput = {};
    if (loc.city) is.city = loc.city;
    if (loc.state) is.state = loc.state;
    if (loc.country) is.country = loc.country;

    if (input.vertical === 'culinary') {
      if (loc.remoteOk === true) {
        is.remoteOk = true;
      } else {
        is.remoteOk = false;
      }
    } else {
      if (loc.remoteOk === true) is.remoteOk = true;
      if (loc.remoteOk === false) is.remoteOk = false;
    }

    if (Object.keys(is).length > 0) {
      where.location = { is };
    }
  }

  return where;
}

async function idsFromFullTextSearch(tenantId: string, query: string): Promise<string[] | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id FROM "TreasuryTask"
        WHERE "tenantId" = ${tenantId}
          AND status = 'OPEN'
          AND search_vector @@ websearch_to_tsquery('english', ${query})
      `
    );
    return rows.map((r) => r.id);
  } catch {
    return null;
  }
}

type TaskWithSort = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  status: string;
  tenantId: string;
  createdAt: Date;
  location: { lat: number | null; lng: number | null } | null;
  projectLead: { reputationScore: Prisma.Decimal | null } | null;
};

function sortCulinaryGeo(
  rows: TaskWithSort[],
  lat: number,
  lng: number,
  radiusMiles: number
): TaskWithSort[] {
  const withDist = rows.map((r) => {
    const glat = r.location?.lat;
    const glng = r.location?.lng;
    const dist =
      glat != null && glng != null && Number.isFinite(glat) && Number.isFinite(glng)
        ? haversineMiles(lat, lng, glat, glng)
        : Number.POSITIVE_INFINITY;
    return { r, dist };
  });
  const filtered = withDist.filter(({ dist }) => dist <= radiusMiles || dist === Number.POSITIVE_INFINITY);
  filtered.sort((a, b) => {
    if (a.dist !== b.dist) {
      if (a.dist === Number.POSITIVE_INFINITY) return 1;
      if (b.dist === Number.POSITIVE_INFINITY) return -1;
      return a.dist - b.dist;
    }
    const ra = a.r.projectLead?.reputationScore;
    const rb = b.r.projectLead?.reputationScore;
    const na = ra != null ? Number(ra) : -1;
    const nb = rb != null ? Number(rb) : -1;
    if (nb !== na) return nb - na;
    return b.r.createdAt.getTime() - a.r.createdAt.getTime();
  });
  return filtered.map(({ r }) => r);
}

function sortCulinaryNonGeo(rows: TaskWithSort[]): TaskWithSort[] {
  return [...rows].sort((a, b) => {
    const ra = a.projectLead?.reputationScore;
    const rb = b.projectLead?.reputationScore;
    const na = ra != null ? Number(ra) : -1;
    const nb = rb != null ? Number(rb) : -1;
    if (nb !== na) return nb - na;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function executeGigSearch(input: GigSearchInput): Promise<{
  data: GigSearchRow[];
  total: number;
  page: number;
}> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = buildWhere(input);
  const q = input.query?.trim();

  if (q) {
    const ftsIds = await idsFromFullTextSearch(input.tenantId, q);
    if (ftsIds === null) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    } else if (ftsIds.length === 0) {
      return { data: [], total: 0, page };
    } else {
      where.id = { in: ftsIds };
    }
  }

  const culinaryGeo =
    input.vertical === 'culinary' &&
    input.location &&
    typeof input.location.lat === 'number' &&
    Number.isFinite(input.location.lat) &&
    typeof input.location.lng === 'number' &&
    Number.isFinite(input.location.lng);

  if (culinaryGeo) {
    const lat = input.location!.lat as number;
    const lng = input.location!.lng as number;
    const radiusMiles =
      typeof input.location!.radiusMiles === 'number' && input.location!.radiusMiles! > 0
        ? Math.min(500, input.location!.radiusMiles!)
        : 50;

    const fetched = await prisma.treasuryTask.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        skills: true,
        status: true,
        tenantId: true,
        createdAt: true,
        location: { select: { lat: true, lng: true } },
        projectLead: { select: { reputationScore: true } },
      },
    });

    const sorted = sortCulinaryGeo(fetched as TaskWithSort[], lat, lng, radiusMiles);
    const total = sorted.length;
    const slice = sorted.slice(skip, skip + limit);
    const data: GigSearchRow[] = slice.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      skills: r.skills,
      status: r.status,
      tenantId: r.tenantId,
      createdAt: r.createdAt,
    }));
    return { data, total, page };
  }

  if (input.vertical === 'culinary') {
    const rows = await prisma.treasuryTask.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        skills: true,
        status: true,
        tenantId: true,
        createdAt: true,
        location: { select: { lat: true, lng: true } },
        projectLead: { select: { reputationScore: true } },
      },
    });
    const sorted = sortCulinaryNonGeo(rows as TaskWithSort[]);
    const slice = sorted.slice(skip, skip + limit);
    const data: GigSearchRow[] = slice.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      skills: r.skills,
      status: r.status,
      tenantId: r.tenantId,
      createdAt: r.createdAt,
    }));
    return { data, total: sorted.length, page };
  }

  const [total, rows] = await Promise.all([
    prisma.treasuryTask.count({ where }),
    prisma.treasuryTask.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        skills: true,
        status: true,
        tenantId: true,
        createdAt: true,
      },
    }),
  ]);

  const data: GigSearchRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    skills: r.skills,
    status: r.status,
    tenantId: r.tenantId,
    createdAt: r.createdAt,
  }));

  return { data, total, page };
}
