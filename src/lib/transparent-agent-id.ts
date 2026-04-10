/**
 * Derive X-Transparent-Agent-ID from agent key (must match Flomisma governance-service algorithm).
 * Used for Legal-Compliance handshake on all Flomisma API calls.
 */

import { createHash } from "crypto";

const PREFIX = "tah_"; // Transparent Agent Handshake

/**
 * Derive a stable, verifiable public ID from the agent key.
 * Same key => same ID; Flomisma verifies by recomputing from X-Agent-Key.
 */
export function deriveTransparentAgentId(agentKey: string): string {
  const normalized = (agentKey ?? "").trim();
  const hash = createHash("sha256").update(normalized, "utf8").digest("base64url");
  return PREFIX + hash.slice(0, 43);
}

/**
 * Get agent key from environment (for Flomisma API).
 */
export function getAgentKey(): string | undefined {
  return process.env.FLOMISMA_AGENT_KEY ?? process.env.AGENT_KEY;
}
