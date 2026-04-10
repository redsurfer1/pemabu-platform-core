/**
 * Log PRIVACY_SHIELD_TRIGGERED to AuditEvidence when non-leadership redaction occurs.
 */

import { prisma } from "./prisma";
import type { PrivacyShieldLogger } from "./privacy-shield";

export const logPrivacyShieldToAuditEvidence: PrivacyShieldLogger = async (params) => {
  await prisma.auditEvidence.create({
    data: {
      eventType: "PRIVACY_SHIELD_TRIGGERED",
      snapshotData: {
        originalLength: params.originalLength,
        scrubbedLength: params.scrubbedLength,
        agentId: params.agentId,
      },
      systemState: "OPTIMAL",
      metadata: {
        originalLength: params.originalLength,
        scrubbedLength: params.scrubbedLength,
        agentId: params.agentId,
      },
    },
  });
};
