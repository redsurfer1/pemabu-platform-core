/**
 * JWT-to-tenant identity mapping (Task 2).
 * Extracts tenant_id and user id from a decoded JWT (Clerk / Auth0 / custom).
 */

export interface JwtTenantPayload {
  /** Required: organization/tenant scope (Clerk org_id, Auth0 app_metadata.tenant_id, etc.) */
  tenant_id: string;
  /** Subject – user id (sub claim) */
  sub: string;
  /** Optional: email */
  email?: string;
}

export interface JwtValidationResult {
  valid: boolean;
  payload?: JwtTenantPayload;
  error?: string;
}

/**
 * Extracts tenantId and userId from a decoded JWT payload.
 * Supports common claim names: tenant_id, org_id, organization_id (Clerk/Auth0/custom).
 */
export function extractTenantFromJwt(decoded: Record<string, unknown>): JwtTenantPayload | null {
  const sub = decoded.sub;
  const userId = typeof sub === "string" ? sub : null;
  if (!userId) return null;

  const tenantId =
    (decoded.tenant_id as string) ??
    (decoded.org_id as string) ??
    (decoded.organization_id as string) ??
    (decoded.tenantId as string);
  if (!tenantId || typeof tenantId !== "string") return null;

  return {
    tenant_id: tenantId,
    sub: userId,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
  };
}

/**
 * Verifies JWT and returns payload with tenant_id. Uses JWT_SECRET_OR_PUBLIC_KEY
 * and optional JWT_ISSUER. Returns validation result; caller must reject with 403
 * if valid but tenant_id missing.
 */
export async function verifyJwtAndGetTenant(token: string): Promise<JwtValidationResult> {
  const secret = process.env.JWT_SECRET_OR_PUBLIC_KEY;
  const issuer = process.env.JWT_ISSUER;
  if (!secret) {
    return { valid: false, error: "JWT verification not configured" };
  }

  try {
    // Dynamic import to avoid requiring jsonwebtoken if not installed
    const { default: jwt } = await import("jsonwebtoken");
    const options: { algorithms?: ("RS256" | "HS256")[]; issuer?: string } = { algorithms: ["RS256", "HS256"] };
    if (issuer) options.issuer = issuer;
    const decoded = jwt.verify(token, secret, options);
    const payload = extractTenantFromJwt(
      typeof decoded === "object" && decoded !== null ? (decoded as Record<string, unknown>) : {}
    );
    if (!payload) {
      return {
        valid: true,
        error: "JWT valid but tenant_id (or org_id / organization_id) claim missing",
      };
    }
    return { valid: true, payload };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: message };
  }
}
