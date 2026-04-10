/**
 * GET /reserve-status — Flomisma reserve status proxy for agents.
 * Returns RFC 9457 problem details on error (type, title, status, detail, retry_after).
 */

import { flomismaConfig } from "../lib/flomisma-config";
import { withTransparentIdentity } from "../lib/request-middleware";
import { getAgentKey, deriveTransparentAgentId } from "../lib/transparent-agent-id";
import { pemabuProblem, PROBLEM_JSON_CONTENT_TYPE, type ProblemDetails } from "../lib/rfc9457";

export interface ReserveStatusResponse {
  success: boolean;
  data?: {
    solvency_ratio: number;
    total_credits: number;
    usdc_reserve: number;
    wallet_status: string;
    lastVerified?: string;
  };
}

export interface ReserveStatusRequest {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

export interface ReserveStatusResponseWriter {
  status: (code: number) => { json: (body: object) => void; set?: (name: string, value: string) => void };
}

function flomismaHeaders(): Record<string, string> {
  const agentKey = getAgentKey() ?? "";
  const transparentAgentId = agentKey ? deriveTransparentAgentId(agentKey) : "";
  const base: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${flomismaConfig.apiKey}`,
  };
  if (agentKey) base["X-Agent-Key"] = agentKey;
  if (transparentAgentId) base["X-Transparent-Agent-ID"] = transparentAgentId;
  return withTransparentIdentity(base);
}

export async function handleReserveStatus(
  req: ReserveStatusRequest,
  res: ReserveStatusResponseWriter
): Promise<void> {
  const tenantId = (Array.isArray(req.headers["x-tenant-id"])
    ? req.headers["x-tenant-id"][0]
    : req.headers["x-tenant-id"]) as string | undefined;

  try {
    const base = flomismaConfig.baseUrl.replace(/\/$/, "");
    const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    const url = `${base}/api/v1/reserve/proof${qs}`;
    const response = await fetch(url, {
      method: "GET",
      headers: flomismaHeaders(),
    });

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      data?: {
        totalCirculation?: number;
        totalReserve?: number;
        ratio?: number;
        lastVerified?: string;
        display_value?: string;
        reserve_display_value?: string;
      };
    };

    if (!response.ok) {
      const problemPayload: ProblemDetails = pemabuProblem(
        response.status,
        "Reserve status unavailable",
        "FLOMISMA_RESERVE_ERROR",
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: string }).error)
          : response.statusText,
        response.status === 429 || response.status === 503 ? 60 : undefined
      );
      const status = res.status(response.status);
      if (status.set) status.set("Content-Type", PROBLEM_JSON_CONTENT_TYPE);
      status.json(problemPayload);
      return;
    }

    const d = data.data;
    const payload: ReserveStatusResponse = {
      success: true,
      data: {
        solvency_ratio: d?.ratio ?? 0,
        total_credits: d?.totalCirculation ?? 0,
        usdc_reserve: d?.totalReserve ?? 0,
        wallet_status: "PENDING_LINK",
        lastVerified: d?.lastVerified,
      },
    };
    res.status(200).json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const problemPayload: ProblemDetails = pemabuProblem(
      502,
      "Reserve status proxy failed",
      "RESERVE_PROXY_ERROR",
      message,
      30
    );
    const status = res.status(502);
    if (status.set) status.set("Content-Type", PROBLEM_JSON_CONTENT_TYPE);
    status.json(problemPayload);
  }
}
