/**
 * Transparent Identity (Anti-Perplexity).
 * Injects mandatory User-Agent for all external requests:
 * User-Agent: Pemabu-Agent/1.0 (Verified via Flomisma-Key: ${AGENT_ID})
 */

const PEMABU_UA_PREFIX = "Pemabu-Agent/1.0 (Verified via Flomisma-Key:";

/**
 * Returns the agent identity for the current context (env AGENT_ID or placeholder).
 */
export function getAgentId(): string {
  return process.env.AGENT_ID ?? process.env.FLOMISMA_AGENT_ID ?? "platform";
}

/**
 * Builds the mandatory User-Agent header value.
 */
export function getTransparentIdentityUserAgent(agentId?: string): string {
  const id = agentId ?? getAgentId();
  return `${PEMABU_UA_PREFIX} ${id})`;
}

/**
 * Wraps Headers or a record so outbound requests include Transparent Identity.
 * Use this for all external fetch calls (Flomisma, IDV, etc.).
 */
export function withTransparentIdentity(
  headers: Record<string, string> | Headers,
  agentId?: string
): Record<string, string> {
  const ua = getTransparentIdentityUserAgent(agentId);
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => { out[k] = v; });
    out["User-Agent"] = ua;
    return out;
  }
  return { ...headers, "User-Agent": ua };
}

/**
 * Fetch wrapper: automatically injects User-Agent for Transparent Identity.
 * Use for all external requests from the platform.
 */
export async function fetchWithTransparentIdentity(
  input: RequestInfo | URL,
  init?: RequestInit,
  agentId?: string
): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("User-Agent", getTransparentIdentityUserAgent(agentId));
  return fetch(input, { ...init, headers });
}
