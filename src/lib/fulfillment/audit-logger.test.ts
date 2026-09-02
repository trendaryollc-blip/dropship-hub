import { describe, it, expect, beforeEach } from "vitest";
import { logAuditEvent, getAuditLogs, getAuditLogCount, clearAuditLogs, getAuditStats } from "@/lib/fulfillment/audit-logger";

describe("Audit Logger", () => {
  beforeEach(() => {
    clearAuditLogs("test_user");
  });

  it("logs an audit event", () => {
    const entry = logAuditEvent("test_user", {
      orderId: "order_1",
      action: "order_detected",
      details: "Order detected via webhook",
    });
    expect(entry.id).toBeDefined();
    expect(entry.orderId).toBe("order_1");
    expect(entry.action).toBe("order_detected");
    expect(entry.timestamp).toBeDefined();
  });

  it("retrieves logs for user", () => {
    logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    logAuditEvent("test_user", { orderId: "order_2", action: "order_routed", details: "test" });
    const logs = getAuditLogs("test_user");
    expect(logs.length).toBe(2);
  });

  it("filters logs by orderId", () => {
    logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    logAuditEvent("test_user", { orderId: "order_2", action: "order_routed", details: "test" });
    const logs = getAuditLogs("test_user", { orderId: "order_1" });
    expect(logs.length).toBe(1);
    expect(logs[0].orderId).toBe("order_1");
  });

  it("filters logs by action", () => {
    logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    logAuditEvent("test_user", { orderId: "order_1", action: "order_routed", details: "test" });
    const logs = getAuditLogs("test_user", { action: "order_detected" });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("order_detected");
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 10; i++) {
      logAuditEvent("test_user", { orderId: `order_${i}`, action: "order_detected", details: "test" });
    }
    const logs = getAuditLogs("test_user", { limit: 3, offset: 2 });
    expect(logs.length).toBe(3);
  });

  it("counts logs correctly", () => {
    logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    logAuditEvent("test_user", { orderId: "order_1", action: "order_routed", details: "test" });
    expect(getAuditLogCount("test_user")).toBe(2);
    expect(getAuditLogCount("test_user", "order_1")).toBe(2);
  });

  it("clears all logs", () => {
    logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    const cleared = clearAuditLogs("test_user");
    expect(cleared).toBe(1);
    expect(getAuditLogs("test_user").length).toBe(0);
  });

  it("clears logs for specific order", () => {
    logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    logAuditEvent("test_user", { orderId: "order_2", action: "order_detected", details: "test" });
    const cleared = clearAuditLogs("test_user", "order_1");
    expect(cleared).toBe(1);
    expect(getAuditLogs("test_user").length).toBe(1);
  });

  it("stores metadata", () => {
    const entry = logAuditEvent("test_user", {
      orderId: "order_1",
      action: "order_placed",
      details: "CJ order placed",
      metadata: { cjOrderNumber: "CJ123", totalCost: 15.99 },
    });
    expect(entry.metadata.cjOrderNumber).toBe("CJ123");
    expect(entry.metadata.totalCost).toBe(15.99);
  });

  it("returns stats", () => {
    logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    logAuditEvent("test_user", { orderId: "order_1", action: "order_failed", details: "test" });
    const stats = getAuditStats("test_user");
    expect(stats.totalEvents).toBe(2);
    expect(stats.ordersProcessed).toBe(1);
    expect(stats.eventsByAction["order_detected"]).toBe(1);
    expect(stats.recentErrors.length).toBe(1);
  });

  it("isolates logs between users", () => {
    logAuditEvent("user_1", { orderId: "order_1", action: "order_detected", details: "test" });
    logAuditEvent("user_2", { orderId: "order_2", action: "order_detected", details: "test" });
    expect(getAuditLogs("user_1").length).toBe(1);
    expect(getAuditLogs("user_2").length).toBe(1);
  });

  it("limits stored logs to 1000", () => {
    for (let i = 0; i < 1100; i++) {
      logAuditEvent("test_user", { orderId: `order_${i}`, action: "order_detected", details: "test" });
    }
    expect(getAuditLogCount("test_user")).toBe(1000);
  });
});
