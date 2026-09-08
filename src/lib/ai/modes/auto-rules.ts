import { inngest } from "@/lib/jobs/client";
import { ToolRegistry } from "../tools/registry";
import type { AutoModeRule, ToolExecutionContext } from "../types";

// ─── Auto Mode Rule Engine ───────────────────────────────────────────────────
// Evaluates and triggers auto-mode rules. Integrates with Inngest for scheduling.

const COLLECTION_PATH = (uid: string) => `users/${uid}/settings/aiMode`;

// ─── Evaluate Auto Triggers ──────────────────────────────────────────────────
// Checks if any rules should be triggered based on schedule/event/threshold.

export async function evaluateAutoTriggers(uid: string): Promise<{
  triggered: string[];
  skipped: string[];
  errors: string[];
}> {
  const { getAdminDB } = await import("@/lib/firebase-admin");
  const db = await getAdminDB();

  const prefsDoc = await db.doc(COLLECTION_PATH(uid)).get();
  const prefs = prefsDoc.data();
  if (!prefs?.autoRules) {
    return { triggered: [], skipped: [], errors: [] };
  }

  const rules: AutoModeRule[] = prefs.autoRules;
  const now = new Date();
  const triggered: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.enabled) {
      skipped.push(rule.id);
      continue;
    }

    try {
      const shouldTrigger = await checkRuleTrigger(rule, now);
      if (shouldTrigger) {
        // Execute the tool
        const context: ToolExecutionContext = {
          uid,
          executionId: `auto_${Date.now()}_${rule.id}`,
          trigger: "scheduled",
          mode: "auto",
        };

        const result = await ToolRegistry.executeTool(rule.toolId, rule.params, context);

        // Update last run time
        await db.doc(COLLECTION_PATH(uid)).update({
          [`autoRules.${rules.indexOf(rule)}.lastRunAt`]: now.toISOString(),
        });

        if (result.success) {
          triggered.push(rule.id);
        } else {
          errors.push(`${rule.id}: ${result.error}`);
        }
      } else {
        skipped.push(rule.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${rule.id}: ${message}`);
    }
  }

  return { triggered, skipped, errors };
}

// ─── Check Rule Trigger ──────────────────────────────────────────────────────

async function checkRuleTrigger(rule: AutoModeRule, now: Date): Promise<boolean> {
  switch (rule.trigger) {
    case "schedule":
      return checkScheduleTrigger(rule, now);
    case "event":
      return true; // Event triggers are evaluated externally
    case "threshold":
      return checkThresholdTrigger(rule);
    default:
      return false;
  }
}

// ─── Check Schedule Trigger ──────────────────────────────────────────────────

function checkScheduleTrigger(rule: AutoModeRule, now: Date): boolean {
  if (!rule.schedule) return false;

  // Parse schedule string (e.g., "hourly", "daily", "weekly", "*/30 * * * *")
  const schedule = rule.schedule.toLowerCase();

  // Simple schedule matching
  if (schedule === "hourly") {
    return now.getMinutes() === 0;
  }
  if (schedule === "daily") {
    return now.getHours() === 8 && now.getMinutes() === 0; // 8 AM
  }
  if (schedule === "weekly") {
    return now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() === 0; // Monday 8 AM
  }

  // Check if enough time has passed since last run
  if (rule.lastRunAt) {
    const lastRun = new Date(rule.lastRunAt);
    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

    if (schedule.includes("hour") || schedule === "hourly") {
      return hoursSinceLastRun >= 1;
    }
    if (schedule.includes("6h") || schedule === "6hours") {
      return hoursSinceLastRun >= 6;
    }
    if (schedule.includes("12h") || schedule === "12hours") {
      return hoursSinceLastRun >= 12;
    }
  }

  return false;
}

// ─── Check Threshold Trigger ─────────────────────────────────────────────────

async function checkThresholdTrigger(rule: AutoModeRule): Promise<boolean> {
  if (!rule.threshold) return false;

  const { field, operator, value } = rule.threshold;

  // Get the current value from the tool's data
  // This is a simplified check - in production, you'd fetch the actual data
  const tool = ToolRegistry.get(rule.toolId);
  if (!tool) return false;

  // For now, return true if the rule was never run
  // In production, you'd check the actual threshold against live data
  return !rule.lastRunAt;
}

// ─── Schedule Inngest Auto-Mode Job ──────────────────────────────────────────

export async function scheduleAutoModeJob(uid: string): Promise<void> {
  await inngest.send({
    name: "app/auto-mode-check",
    data: { uid },
  });
}

// ─── Get Auto Mode Stats ─────────────────────────────────────────────────────

export async function getAutoModeStats(uid: string): Promise<{
  totalRules: number;
  activeRules: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  recentExecutions: number;
}> {
  const { getAdminDB } = await import("@/lib/firebase-admin");
  const db = await getAdminDB();

  const prefsDoc = await db.doc(COLLECTION_PATH(uid)).get();
  const prefs = prefsDoc.data();

  if (!prefs?.autoRules) {
    return { totalRules: 0, activeRules: 0, lastRunAt: null, nextRunAt: null, recentExecutions: 0 };
  }

  const rules: AutoModeRule[] = prefs.autoRules;
  const activeRules = rules.filter((r) => r.enabled);
  const lastRuns = rules.map((r) => r.lastRunAt).filter(Boolean).sort().reverse();

  return {
    totalRules: rules.length,
    activeRules: activeRules.length,
    lastRunAt: lastRuns[0] || null,
    nextRunAt: null, // Would be calculated based on schedules
    recentExecutions: 0, // Would be queried from audit log
  };
}
