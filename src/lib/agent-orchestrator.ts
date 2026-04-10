/**
 * Deep Agent Architecture — sub-agent spawning, ephemeral VirtualFS, strategic planning.
 * Planning logs are scrubbed via privacy-shield before writing to AuditEvidence.
 */

import { prisma } from "./prisma";
import { scrubContext } from "./privacy-shield";
import { checkSpendingAllowance, recordSpending } from "./spending-allowance";

// ---------------------------------------------------------------------------
// Virtual Filesystem (ephemeral, in-memory — prevents long-term PII leaks)
// ---------------------------------------------------------------------------

export type VirtualFS = {
  read(path: string): string | undefined;
  write(path: string, content: string): void;
  delete(path: string): boolean;
  list(prefix?: string): string[];
  clear(): void;
};

function createVirtualFS(): VirtualFS {
  const store = new Map<string, string>();
  return {
    read(path: string) {
      return store.get(path);
    },
    write(path: string, content: string) {
      store.set(path, content);
    },
    delete(path: string) {
      return store.delete(path);
    },
    list(prefix?: string) {
      const keys = Array.from(store.keys());
      if (!prefix) return keys;
      return keys.filter((k) => k.startsWith(prefix));
    },
    clear() {
      store.clear();
    },
  };
}

// ---------------------------------------------------------------------------
// Agent context
// ---------------------------------------------------------------------------

export type AgentContext = {
  id: string;
  parentId: string | null;
  tenantId: string;
  agentId: string;
  vfs: VirtualFS;
  createdAt: Date;
};

const contextStore = new Map<string, AgentContext>();

function createContext(tenantId: string, agentId: string, parentId: string | null): AgentContext {
  const id = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const ctx: AgentContext = {
    id,
    parentId,
    tenantId,
    agentId,
    vfs: createVirtualFS(),
    createdAt: new Date(),
  };
  contextStore.set(id, ctx);
  return ctx;
}

export function spawnSubAgent(parent: AgentContext): AgentContext {
  return createContext(parent.tenantId, parent.agentId, parent.id);
}

export function getAgentContext(contextId: string): AgentContext | undefined {
  return contextStore.get(contextId);
}

export function disposeSubAgent(contextId: string): void {
  const ctx = contextStore.get(contextId);
  if (ctx) {
    ctx.vfs.clear();
    contextStore.delete(contextId);
  }
}

export function createRootAgentContext(tenantId: string, agentId: string): AgentContext {
  return createContext(tenantId, agentId, null);
}

// ---------------------------------------------------------------------------
// Strategic planning — write_todos; plan logged to AuditEvidence (scrubbed)
// ---------------------------------------------------------------------------

export type AgentTodo = {
  id: string;
  title: string;
  payload?: Record<string, unknown>;
  status: "pending" | "in_progress" | "done";
};

export type ExecuteTransactionParams = {
  contextId: string;
  userRole: string;
  isAdminRoute?: boolean;
  todos: AgentTodo[];
  steps: TransactionStep[];
};

export type TransactionStep =
  | { kind: "pmb_transfer"; amount: number; toAccountId: string; referenceId?: string }
  | { kind: "custom"; execute: () => Promise<void> };

export type ExecuteTransactionResult =
  | { success: true; planEvidenceId: string }
  | { success: false; error: string; planEvidenceId?: string };

const AGENT_PLANNING_EVENT = "AGENT_PLANNING";

export async function executeTransaction(params: ExecuteTransactionParams): Promise<ExecuteTransactionResult> {
  const ctx = contextStore.get(params.contextId);
  if (!ctx) return { success: false, error: "CONTEXT_NOT_FOUND" };

  const planPayload = {
    todos: params.todos,
    agentId: ctx.agentId,
    tenantId: ctx.tenantId,
    contextId: ctx.id,
  };
  const planText = JSON.stringify(planPayload, null, 2);
  const scrubbedPlan = scrubContext(planText, params.userRole, { isAdminRoute: params.isAdminRoute });

  let planEvidenceId: string;
  try {
    const evidence = await prisma.auditEvidence.create({
      data: {
        eventType: AGENT_PLANNING_EVENT,
        snapshotData: {
          plan: scrubbedPlan,
          todoCount: params.todos.length,
          agentId: ctx.agentId,
          tenantId: ctx.tenantId,
          contextId: ctx.id,
        },
        systemState: "OPTIMAL",
        metadata: { agentId: ctx.agentId, contextId: ctx.id },
      },
    });
    planEvidenceId = evidence.id;
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { success: false, error: `PLAN_LOG_FAILED: ${err}` };
  }

  for (const step of params.steps) {
    if (step.kind === "pmb_transfer") {
      const check = await checkSpendingAllowance(ctx.tenantId, ctx.agentId, step.amount);
      if (check.allowed === false) {
        return { success: false, error: `SPENDING_ALLOWANCE_${check.reason}`, planEvidenceId };
      }
      try {
        await recordSpending(ctx.tenantId, ctx.agentId, step.amount);
        // PEMABU: actual ledger/transfer integration can call LedgerEntry or bridge to Flomisma
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        return { success: false, error: `TRANSFER_FAILED: ${err}`, planEvidenceId };
      }
    } else {
      await step.execute();
    }
  }

  return { success: true, planEvidenceId };
}
