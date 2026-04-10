/**
 * Sandbox configuration: restricted domains and signing secret.
 */

const DEFAULT_RESTRICTED_PATTERNS = [
  /login\.(amazon|paypal|ebay|walmart|target)\./i,
  /(amazon|paypal|ebay|walmart|target)\.com\/.*(login|signin|auth)/i,
  /(bank|banking|oauth|sso)\/.+login/i,
  /credential|password.*=.*["'][^"']+["']/i,
];

export const sandboxConfig = {
  /** Patterns that trigger self-destruct and HITL when found in container logs */
  restrictedDomainPatterns: DEFAULT_RESTRICTED_PATTERNS,
  /** HMAC secret for signing result hash (env SANDBOX_SIGNING_SECRET) */
  signingSecret: process.env.SANDBOX_SIGNING_SECRET ?? "change-me-in-production",
  /** Docker image for agent execution (read-only, minimal) */
  dockerImage: process.env.SANDBOX_DOCKER_IMAGE ?? "node:20-alpine",
  /** Max run time in seconds before kill */
  timeoutSeconds: Number(process.env.SANDBOX_TIMEOUT_SECONDS ?? "300"),
};

export function isRestrictedInLogs(logs: string): boolean {
  const normalized = logs.toLowerCase();
  return sandboxConfig.restrictedDomainPatterns.some((p) => p.test(normalized));
}

export function extractViolatedDomain(logs: string): string | null {
  for (const p of sandboxConfig.restrictedDomainPatterns) {
    const m = logs.match(p);
    if (m) return m[0] ?? "restricted";
  }
  return null;
}
