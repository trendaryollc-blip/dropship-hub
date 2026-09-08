import { getAdminDB } from "@/lib/firebase-admin";
import type { GuardrailConfig, ToolExecutionContext } from "../types";
import { DEFAULT_GUARDRAILS } from "../types";

// ─── Guardrails ─────────────────────────────────────────────────────────────
// Rate limiting and safety checks for AI tool execution.
// Enforces per-user limits on action count, cost, and forbidden tools.

interface GuardrailCheck {
  allowed: boolean;
  reason?: string;
}

export async function checkGuardrails(
  uid: string,
  toolId: string,
  input: Record<string, unknown>,
  config?: GuardrailConfig
): Promise<GuardrailCheck> {
  const guards = config || DEFAULT_GUARDRAILS;

  // Check forbidden tools
  if (guards.forbiddenTools.includes(toolId)) {
    return { allowed: false, reason: `Tool "${toolId}" is forbidden by your guardrails` };
  }

  // Check input patterns
  const inputStr = JSON.stringify(input).toLowerCase();
  for (const pattern of guards.blockedInputPatterns) {
    if (inputStr.includes(pattern.toLowerCase())) {
      return { allowed: false, reason: `Input matches blocked pattern: "${pattern}"` };
    }
  }

  // Check hourly rate limit
  const hourlyCount = await getActionCount(uid, "hour");
  if (hourlyCount >= guards.maxActionsPerHour) {
    return { allowed: false, reason: `Hourly limit reached (${guards.maxActionsPerHour}/hour)` };
  }

  // Check daily rate limit
  const dailyCount = await getActionCount(uid, "day");
  if (dailyCount >= guards.maxActionsPerDay) {
    return { allowed: false, reason: `Daily limit reached (${guards.maxActionsPerDay}/day)` };
  }

  // Check daily cost
  const dailyCost = await getDailyCost(uid);
  if (dailyCost >= guards.maxDailyCost) {
    return { allowed: false, reason: `Daily cost limit reached ($${guards.maxDailyCost})` };
  }

  return { allowed: true };
}

export async function recordAction(uid: string, cost: number = 0): Promise<void> {
  const db = await getAdminDB();
  const now = new Date();
  const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}`;
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const countersRef = db.collection("users").doc(uid).collection("aiCounters");

  // Increment hourly counter
  const hourDoc = countersRef.doc(`hour_${hourKey}`);
  await hourDoc.set(
    {
      count: (await hourDoc.get()).data()?.count || 0,
      cost: (await hourDoc.get()).data()?.cost || 0,
      updatedAt: now.toISOString(),
    },
    { merge: true }
  );
  await hourDoc.update({
    count: (await hourDoc.get()).data()?.count + 1,
    cost: ((await hourDoc.get()).data()?.cost || 0) + cost,
  });

  // Increment daily counter
  const dayDoc = countersRef.doc(`day_${dayKey}`);
  await dayDoc.set(
    {
      count: (await dayDoc.get()).data()?.count || 0,
      cost: (await dayDoc.get()).data()?.cost || 0,
      updatedAt: now.toISOString(),
    },
    { merge: true }
  );
  await dayDoc.update({
    count: (await dayDoc.get()).data()?.count + 1,
    cost: ((await dayDoc.get()).data()?.cost || 0) + cost,
  });
}

async function getActionCount(uid: string, window: "hour" | "day"): Promise<number> {
  const db = await getAdminDB();
  const now = new Date();
  let key: string;

  if (window === "hour") {
    key = `hour_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}`;
  } else {
    key = `day_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  const doc = await db.collection("users").doc(uid).collection("aiCounters").doc(key).get();
  return doc.data()?.count || 0;
}

async function getDailyCost(uid: string): Promise<number> {
  const db = await getAdminDB();
  const now = new Date();
  const key = `day_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const doc = await db.collection("users").doc(uid).collection("aiCounters").doc(key).get();
  return doc.data()?.cost || 0;
}

export async function getGuardrailStatus(uid: string): Promise<{
  hourlyActions: number;
  dailyActions: number;
  dailyCost: number;
  limits: GuardrailConfig;
}> {
  const hourly = await getActionCount(uid, "hour");
  const daily = await getActionCount(uid, "day");
  const cost = await getDailyCost(uid);

  return {
    hourlyActions: hourly,
    dailyActions: daily,
    dailyCost: cost,
    limits: DEFAULT_GUARDRAILS,
  };
}
