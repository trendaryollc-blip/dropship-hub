import type { AuditLogEntry, AuditAction } from "@/types/automation";

interface AuditContext {
  orderId: string;
  action: AuditAction;
  details: string;
  metadata?: Record<string, unknown>;
}

const inMemoryLogs: Map<string, AuditLogEntry[]> = new Map();

function getLogsForUser(uid: string): AuditLogEntry[] {
  if (!inMemoryLogs.has(uid)) inMemoryLogs.set(uid, []);
  return inMemoryLogs.get(uid)!;
}

export function logAuditEvent(uid: string, context: AuditContext): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orderId: context.orderId,
    action: context.action,
    details: context.details,
    metadata: context.metadata || {},
    timestamp: new Date().toISOString(),
  };

  const logs = getLogsForUser(uid);
  logs.unshift(entry);

  if (logs.length > 1000) {
    logs.splice(1000);
  }

  return entry;
}

export function getAuditLogs(
  uid: string,
  options?: {
    orderId?: string;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  }
): AuditLogEntry[] {
  const logs = getLogsForUser(uid);
  let filtered = logs;

  if (options?.orderId) {
    filtered = filtered.filter((l) => l.orderId === options.orderId);
  }
  if (options?.action) {
    filtered = filtered.filter((l) => l.action === options.action);
  }

  const offset = options?.offset || 0;
  const limit = options?.limit || 50;

  return filtered.slice(offset, offset + limit);
}

export function getAuditLogCount(uid: string, orderId?: string): number {
  const logs = getLogsForUser(uid);
  if (orderId) return logs.filter((l) => l.orderId === orderId).length;
  return logs.length;
}

export function clearAuditLogs(uid: string, orderId?: string): number {
  const logs = getLogsForUser(uid);
  if (orderId) {
    const before = logs.length;
    const filtered = logs.filter((l) => l.orderId !== orderId);
    inMemoryLogs.set(uid, filtered);
    return before - filtered.length;
  }
  const before = logs.length;
  inMemoryLogs.set(uid, []);
  return before;
}

export function getAuditStats(uid: string): {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  recentErrors: AuditLogEntry[];
  ordersProcessed: number;
} {
  const logs = getLogsForUser(uid);
  const eventsByAction: Record<string, number> = {};
  const errorActions = new Set(["order_failed", "sla_breach", "profit_rejected", "inventory_unavailable"]);

  for (const log of logs) {
    eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;
  }

  const recentErrors = logs
    .filter((l) => errorActions.has(l.action))
    .slice(0, 10);

  const orderIds = new Set(logs.map((l) => l.orderId));

  return {
    totalEvents: logs.length,
    eventsByAction,
    recentErrors,
    ordersProcessed: orderIds.size,
  };
}
