/**
 * Backend initialization: required environment variable check.
 * Call at server startup; exits process if critical vars are missing.
 */

const REQUIRED = [
  "DATABASE_URL",
  "FLOMISMA_BASE_URL",
  "FLOMISMA_API_KEY",
  "JWT_SECRET_OR_PUBLIC_KEY",
] as const;

export interface EnvCheckResult {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Verifies presence of required env vars. Returns result; use assertEnv() to exit on failure.
 */
export function checkEnv(): EnvCheckResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED) {
    const value = process.env[key];
    if (value == null || String(value).trim() === "") {
      missing.push(key);
    }
  }

  if (process.env.FLOMISMA_BASE_URL?.includes("example.com")) {
    warnings.push("FLOMISMA_BASE_URL looks like a placeholder; replace for production.");
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Checks env and exits process with code 1 if any required var is missing.
 * Logs warnings for non-fatal issues.
 */
export function assertEnv(): void {
  const result = checkEnv();
  if (!result.ok) {
    console.error(
      "[PEMABU] Missing required environment variables:",
      result.missing.join(", ")
    );
    process.exit(1);
  }
  for (const w of result.warnings) {
    console.warn("[PEMABU]", w);
  }
}
