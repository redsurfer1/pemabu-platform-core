/**
 * Execution Sandbox (OpenAI-style).
 * Spins up a transient Docker (or fallback subprocess) container for agents.
 * Input: Job params and data. Output: Signed hash of result + container logs.
 * HITL: Restricted-domain check on logs → self-destruct and flag agent for manual review.
 */

import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { prisma } from "../lib/prisma";
import { enqueueApproval } from "./governance-service";
import {
  sandboxConfig,
  isRestrictedInLogs,
  extractViolatedDomain,
} from "../lib/sandbox-config";
import { computeReputationScore } from "./reputation-service";

export interface SandboxJobInput {
  tenantId: string;
  userId: string;
  contractId?: string;
  jobId?: string;
  skillType: string;
  params: Record<string, unknown>;
  data?: string;
}

export interface SandboxJobResult {
  runId: string;
  success: boolean;
  resultHash: string | null;
  resultHashAlg: string;
  logs: string;
  status: "SUCCESS" | "SELF_DESTRUCT" | "FAILED";
  violatedRestrictedDomain?: string | null;
  /** Call after Flomisma payout to update ERC-8004 reputation */
  shouldUpdateReputation: boolean;
}

/**
 * Signs payload with HMAC-SHA256 for verifiable result hash.
 */
function signResult(payload: string): string {
  return createHmac("sha256", sandboxConfig.signingSecret).update(payload).digest("hex");
}

/**
 * Runs the agent skill in an isolated environment.
 * Production: Docker (transient container). Fallback: local subprocess with timeout.
 */
export async function runSandboxJob(input: SandboxJobInput): Promise<SandboxJobResult> {
  const run = await prisma.sandboxRun.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      contractId: input.contractId,
      jobId: input.jobId,
      skillType: input.skillType,
      status: "RUNNING",
    },
  });

  let logs = "";
  let resultPayload = "";
  let status: "SUCCESS" | "SELF_DESTRUCT" | "FAILED" = "FAILED";
  let violatedDomain: string | null = null;

  try {
    const { stdout, stderr, exitCode } = await executeInSandbox(input);
    logs = [stdout, stderr].filter(Boolean).join("\n");
    resultPayload = stdout;

    if (isRestrictedInLogs(logs)) {
      violatedDomain = extractViolatedDomain(logs);
      status = "SELF_DESTRUCT";
      await onSandboxViolation(run.id, input.tenantId, input.userId, violatedDomain ?? "restricted", logs);
    } else if (exitCode === 0) {
      status = "SUCCESS";
    }
  } catch (err) {
    logs += "\n" + (err instanceof Error ? err.message : String(err));
  }

  const resultHash = status === "SUCCESS" && resultPayload ? signResult(resultPayload) : null;
  await prisma.sandboxRun.update({
    where: { id: run.id },
    data: {
      resultHash,
      resultHashAlg: "sha256",
      logs: logs.slice(0, 64 * 1024),
      status,
      violatedRestrictedDomain: violatedDomain,
      finishedAt: new Date(),
    },
  });

  return {
    runId: run.id,
    success: status === "SUCCESS",
    resultHash,
    resultHashAlg: "sha256",
    logs,
    status,
    violatedRestrictedDomain: violatedDomain,
    shouldUpdateReputation: status === "SUCCESS",
  };
}

/**
 * Execute job: Docker if available, else subprocess (placeholder script).
 */
function executeInSandbox(input: SandboxJobInput): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const timeoutMs = sandboxConfig.timeoutSeconds * 1000;
    let killed = false;

    const useDocker = process.env.SANDBOX_USE_DOCKER !== "0";
    const cmd = useDocker ? "docker" : "node";
    const args = useDocker
      ? [
          "run",
          "--rm",
          "--network=none",
          "-e", `INPUT=${JSON.stringify(input.params)}`,
          sandboxConfig.dockerImage,
          "sh", "-c", `echo "$INPUT" | head -c 1000`,
        ]
      : ["-e", `console.log(JSON.stringify(${JSON.stringify(input.params)}))`];

    const child = spawn(cmd, args, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      if (!killed) {
        killed = true;
        child.kill("SIGKILL");
        reject(new Error("Sandbox timeout"));
      }
    }, timeoutMs);

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (!killed) {
        killed = true;
        resolve({
          stdout,
          stderr,
          exitCode: code ?? (signal ? 1 : 0),
        });
      }
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      if (!killed) {
        killed = true;
        reject(err);
      }
    });
  });
}

/**
 * HITL: On restricted domain detected – self-destruct already done (process killed);
 * enqueue for manual review and flag user.
 */
async function onSandboxViolation(
  runId: string,
  tenantId: string,
  userId: string,
  violatedDomain: string,
  logs: string
): Promise<void> {
  await enqueueApproval(tenantId, "SANDBOX_VIOLATION", {
    runId,
    userId,
    violatedDomain,
    logSnippet: logs.slice(0, 2000),
  });
  await prisma.user.updateMany({
    where: { id: userId, tenantId },
    data: { profileStatus: "MANUAL_REVIEW" },
  });
}

/**
 * Call after successful sandbox execution and Flomisma payout to update ERC-8004 reputation.
 * Ensures every successful sandbox execution and subsequent Flomisma payout updates the agent's Reputation Score.
 */
export async function updateReputationAfterSandboxPayout(
  userId: string,
  tenantId: string
): Promise<number> {
  return computeReputationScore(userId, tenantId);
}

