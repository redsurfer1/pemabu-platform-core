/**
 * POST /contracts/settle – agentic proof verification and Flomisma release.
 * Returns unified StandardSettlementResponse on success; RFC 9457 problem details on error.
 */

import { runWithTenantAsync } from "../lib/tenant-context";
import { verifyAgenticProof } from "../services/verification-service";
import type { StandardSettlementResponse } from "../services/types";
import { pemabuProblem, PROBLEM_JSON_CONTENT_TYPE, type ProblemDetails } from "../lib/rfc9457";

export interface SettleContractBody {
  contractId: string;
  agenticProof: string;
  notes?: string;
}

export interface SettleContractRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export interface SettleContractResponse {
  status: (code: number) => {
    json: (body: object) => void;
    set?: (name: string, value: string) => void;
  };
}

function toStandardResponse(result: {
  success: boolean;
  contractId: string;
  transactionId?: string | null;
  status: "SETTLED" | "FAILED_RETRY" | "COMPLETED";
  timestamp: string;
  error?: string;
  duplicate?: boolean;
}): StandardSettlementResponse {
  return {
    success: result.success,
    transactionId: result.transactionId ?? null,
    status: result.status,
    timestamp: result.timestamp,
    contractId: result.contractId,
    ...(result.error && { error: result.error }),
    ...(result.duplicate && { duplicate: result.duplicate }),
  };
}

function sendProblem(
  res: SettleContractResponse,
  status: number,
  title: string,
  errorCode: string,
  detail?: string,
  retry_after?: number
): void {
  const payload: ProblemDetails = pemabuProblem(status, title, errorCode, detail, retry_after);
  const writer = res.status(status);
  if (writer.set) writer.set("Content-Type", PROBLEM_JSON_CONTENT_TYPE);
  writer.json(payload);
}

export async function handleSettleContract(
  req: SettleContractRequest,
  res: SettleContractResponse
): Promise<void> {
  const tenantId = (Array.isArray(req.headers["x-tenant-id"])
    ? req.headers["x-tenant-id"][0]
    : req.headers["x-tenant-id"]) as string | undefined;
  if (!tenantId) {
    sendProblem(res, 400, "Tenant context required", "MISSING_TENANT", "X-Tenant-ID header or tenant context required");
    return;
  }

  const body = req.body as SettleContractBody | null;
  if (!body?.contractId || !body?.agenticProof) {
    sendProblem(res, 400, "Invalid request", "MISSING_FIELDS", "contractId and agenticProof are required");
    return;
  }

  const requestId = Array.isArray(req.headers["x-request-id"])
    ? req.headers["x-request-id"][0]
    : req.headers["x-request-id"];

  try {
    const result = await runWithTenantAsync(
      { tenantId, requestId: requestId as string | undefined },
      () => verifyAgenticProof(body.contractId, body.agenticProof, tenantId)
    );

    const response = toStandardResponse(result);
    if (!result.success) {
      const isNotFound = result.error === "Contract not found";
      if (isNotFound) {
        sendProblem(res, 404, "Contract not found", "CONTRACT_NOT_FOUND", result.error);
        return;
      }
      sendProblem(res, 400, "Settlement failed", "SETTLEMENT_FAILED", result.error ?? "Settlement failed");
      return;
    }
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendProblem(res, 500, "Settlement error", "INTERNAL_ERROR", message, 60);
  }
}
