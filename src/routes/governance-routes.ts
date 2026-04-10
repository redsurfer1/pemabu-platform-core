/**
 * Governance API: /governance/queue, /governance/thresholds
 */

import { getApprovalQueue, getThresholds, setThresholds } from "../services/governance-service";
import { runWithTenantAsync } from "../lib/tenant-context";

export interface GovernanceRequest {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface GovernanceResponse {
  status: (code: number) => { json: (body: object) => void };
}

export async function handleGetQueue(
  req: GovernanceRequest,
  res: GovernanceResponse
): Promise<void> {
  const tenantId = getHeader(req.headers, "x-tenant-id");
  if (!tenantId) {
    res.status(400).json({ success: false, error: "X-Tenant-ID required" });
    return;
  }
  const status = getQuery(req.query, "status") as "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | undefined;
  const items = await runWithTenantAsync(
    { tenantId },
    () => getApprovalQueue(tenantId, status)
  );
  res.status(200).json({ success: true, data: items });
}

export async function handleGetThresholds(
  req: GovernanceRequest,
  res: GovernanceResponse
): Promise<void> {
  const tenantId = getHeader(req.headers, "x-tenant-id");
  if (!tenantId) {
    res.status(400).json({ success: false, error: "X-Tenant-ID required" });
    return;
  }
  const thresholds = await runWithTenantAsync(
    { tenantId },
    () => getThresholds(tenantId)
  );
  res.status(200).json({ success: true, data: thresholds });
}

export async function handleUpdateThresholds(
  req: GovernanceRequest,
  res: GovernanceResponse
): Promise<void> {
  const tenantId = getHeader(req.headers, "x-tenant-id");
  if (!tenantId) {
    res.status(400).json({ success: false, error: "X-Tenant-ID required" });
    return;
  }
  const body = req.body as Record<string, unknown> | undefined;
  await runWithTenantAsync(
    { tenantId },
    () =>
      setThresholds({
        tenantId,
        autoSettlementLimitUsd: body?.autoSettlementLimitUsd as number | undefined,
        autoBrandingApproval: body?.autoBrandingApproval as boolean | undefined,
        kycConfidenceMinPct: body?.kycConfidenceMinPct as number | undefined,
        treasuryDiscrepancyMaxPct: body?.treasuryDiscrepancyMaxPct as number | undefined,
        driftVarianceMax: body?.driftVarianceMax as number | null | undefined,
      })
  );
  const thresholds = await getThresholds(tenantId);
  res.status(200).json({ success: true, data: thresholds });
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
