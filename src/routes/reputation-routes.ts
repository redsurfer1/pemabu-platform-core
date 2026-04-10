/**
 * Reputation API: /reputation/score
 */

import { getReputationScore } from "../services/reputation-service";
import { runWithTenantAsync } from "../lib/tenant-context";

export interface ReputationRequest {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

export interface ReputationResponse {
  status: (code: number) => { json: (body: object) => void };
}

export async function handleGetReputationScore(
  req: ReputationRequest,
  res: ReputationResponse
): Promise<void> {
  const tenantId = getHeader(req.headers, "x-tenant-id");
  const userId = getQuery(req.query, "userId");
  if (!tenantId || !userId) {
    res.status(400).json({ success: false, error: "X-Tenant-ID and userId query required" });
    return;
  }
  const score = await runWithTenantAsync(
    { tenantId },
    () => getReputationScore(userId, tenantId)
  );
  res.status(200).json({ success: true, data: { userId, score } });
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const v = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(v) ? v[0] : (v as string | undefined);
}

function getQuery(
  query: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  if (!query) return undefined;
  const v = query[name];
  return Array.isArray(v) ? v[0] : (v as string | undefined);
}
