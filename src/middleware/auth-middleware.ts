/**
 * Auth middleware: verify Bearer token and set tenant context (Task 2).
 * Rejects with 403 if JWT is valid but tenant_id claim is missing.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { runWithTenantAsync } from "../lib/tenant-context";
import { verifyJwtAndGetTenant } from "../lib/jwt-tenant";

export interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
}

export interface AuthResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

export type NextFn = () => Promise<void>;

/**
 * Extracts Bearer token from Authorization header.
 */
export function getBearerToken(headers: Record<string, string | string[] | undefined>): string | null {
  const auth = headers.authorization ?? headers.Authorization;
  if (!auth) return null;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value || typeof value !== "string") return null;
  const match = /^\s*Bearer\s+(.+)\s*$/i.exec(value);
  return match ? match[1].trim() : null;
}

/**
 * Middleware that verifies the incoming Bearer token, extracts tenant_id and sub,
 * and runs the next handler inside runWithTenantAsync so all Prisma calls are scoped.
 * Returns 401 if no/invalid token, 403 if valid token but tenant_id missing.
 */
export function requireAuthAndTenant(
  req: AuthRequest,
  res: AuthResponse,
  next: NextFn
): Promise<void> {
  const token = getBearerToken(req.headers);
  if (!token) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Missing or invalid Authorization header" }));
    return Promise.resolve();
  }

  return verifyJwtAndGetTenant(token).then((result) => {
    if (!result.valid) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: result.error ?? "Invalid token" }));
      return;
    }
    if (result.error && !result.payload) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: "Forbidden: tenant_id (or org_id) claim required to prevent cross-tenant access",
        })
      );
      return;
    }
    const payload = result.payload!;
    return runWithTenantAsync(
      {
        tenantId: payload.tenant_id,
        userId: payload.sub,
        requestId: undefined,
      },
      next
    );
  });
}
