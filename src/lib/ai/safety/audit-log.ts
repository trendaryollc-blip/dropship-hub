import { getAdminDB } from "@/lib/firebase-admin";
import type { AIAuditLogEntry, ExecutionMode, AutonomyLevel } from "../types";

// ─── Audit Log ──────────────────────────────────────────────────────────────
// Logs every AI tool execution for accountability and debugging.
// Writes to: users/{uid}/aiAuditLog

const COLLECTION = "aiAuditLog";

export async function logAIAction(entry: Omit<AIAuditLogEntry, "id" | "timestamp">): Promise<string> {
  const db = await getAdminDB();
  const docRef = db.collection("users").doc(entry.uid).collection(COLLECTION).doc();

  const fullEntry: AIAuditLogEntry = {
    ...entry,
    id: docRef.id,
    timestamp: new Date().toISOString(),
  };

  await docRef.set(fullEntry);
  return docRef.id;
}

export async function logToolCalled(
  uid: string,
  toolId: string,
  executionId: string,
  input: Record<string, unknown>,
  mode: ExecutionMode,
  autonomyLevel: AutonomyLevel
): Promise<string> {
  return logAIAction({
    uid,
    toolId,
    executionId,
    action: "tool_called",
    input,
    mode,
    autonomyLevel,
  });
}

export async function logToolExecuted(
  uid: string,
  toolId: string,
  executionId: string,
  input: Record<string, unknown>,
  result: unknown,
  mode: ExecutionMode,
  autonomyLevel: AutonomyLevel
): Promise<string> {
  return logAIAction({
    uid,
    toolId,
    executionId,
    action: "tool_executed",
    input,
    result,
    mode,
    autonomyLevel,
  });
}

export async function logToolFailed(
  uid: string,
  toolId: string,
  executionId: string,
  input: Record<string, unknown>,
  error: string,
  mode: ExecutionMode,
  autonomyLevel: AutonomyLevel
): Promise<string> {
  return logAIAction({
    uid,
    toolId,
    executionId,
    action: "tool_failed",
    input,
    error,
    mode,
    autonomyLevel,
  });
}

export async function logToolConfirmed(
  uid: string,
  toolId: string,
  executionId: string,
  mode: ExecutionMode,
  autonomyLevel: AutonomyLevel
): Promise<string> {
  return logAIAction({
    uid,
    toolId,
    executionId,
    action: "tool_confirmed",
    input: {},
    mode,
    autonomyLevel,
  });
}

export async function logToolCancelled(
  uid: string,
  toolId: string,
  executionId: string,
  mode: ExecutionMode,
  autonomyLevel: AutonomyLevel
): Promise<string> {
  return logAIAction({
    uid,
    toolId,
    executionId,
    action: "tool_cancelled",
    input: {},
    mode,
    autonomyLevel,
  });
}

export async function getAuditLog(uid: string, limit: number = 50): Promise<AIAuditLogEntry[]> {
  const db = await getAdminDB();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection(COLLECTION)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AIAuditLogEntry);
}

export async function getAuditLogForTool(uid: string, toolId: string, limit: number = 20): Promise<AIAuditLogEntry[]> {
  const db = await getAdminDB();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection(COLLECTION)
    .where("toolId", "==", toolId)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AIAuditLogEntry);
}
