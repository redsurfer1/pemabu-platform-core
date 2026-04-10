/**
 * Flomisma API configuration (Task 1).
 * Base URL and API Key from environment.
 */

function getEnv(key: string): string | undefined {
  return process.env[key];
}

/** Portal origin (no path). e.g. https://portal.flomisma.com — settlement is POST {baseUrl}/api/v1/settlement */
export const flomismaConfig = {
  baseUrl: (getEnv("FLOMISMA_BASE_URL") ?? "https://api.flomisma.example.com").replace(/\/$/, ""),
  apiKey: getEnv("FLOMISMA_API_KEY") ?? "",
} as const;

export function isFlomismaConfigured(): boolean {
  return Boolean(
    flomismaConfig.apiKey &&
      flomismaConfig.baseUrl &&
      !flomismaConfig.baseUrl.includes("example.com")
  );
}
