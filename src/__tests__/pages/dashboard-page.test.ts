import { describe, it, expect } from "vitest";
import type { DashboardMetric, DashboardAlert, ActivityItem } from "@/types/dashboard";

describe("Dashboard Page - Data Types", () => {
  it("dashboard metric has required fields", () => {
    const metric: DashboardMetric = {
      id: "dm-1",
      label: "Total Revenue",
      value: "$12,450",
      change: 12.5,
      changeType: "positive",
      icon: "DollarSign",
      description: "Revenue this month",
    };
    expect(metric.changeType).toBe("positive");
    expect(metric.change).toBeGreaterThan(0);
  });

  it("dashboard alert has required fields", () => {
    const alert: DashboardAlert = {
      id: "da-1",
      type: "stock_low",
      severity: "warning",
      title: "Low stock alert",
      message: "Product X has only 5 units left",
      actionable: true,
      createdAt: new Date().toISOString(),
    };
    expect(alert.actionable).toBe(true);
  });

  it("activity item has required fields", () => {
    const activity: ActivityItem = {
      id: "ai-1",
      type: "order",
      title: "New order received",
      description: "Order #ORD-001 from Shopify",
      timestamp: new Date().toISOString(),
      icon: "ShoppingCart",
    };
    expect(activity.type).toBe("order");
  });

  it("change type values", () => {
    const types = ["positive", "negative", "neutral"] as const;
    expect(types).toHaveLength(3);
  });

  it("alert severity values", () => {
    const severities = ["info", "warning", "critical"] as const;
    expect(severities).toHaveLength(3);
  });
});

describe("Dashboard Page - Business Logic", () => {
  it("can calculate revenue change percentage", () => {
    const current = 12450;
    const previous = 11000;
    const change = ((current - previous) / previous) * 100;
    expect(change).toBeCloseTo(13.18, 1);
  });

  it("can filter actionable alerts", () => {
    const alerts: DashboardAlert[] = [
      { id: "1", actionable: true } as DashboardAlert,
      { id: "2", actionable: false } as DashboardAlert,
      { id: "3", actionable: true } as DashboardAlert,
    ];
    const actionable = alerts.filter((a) => a.actionable);
    expect(actionable).toHaveLength(2);
  });

  it("can sort activities by timestamp", () => {
    const activities: ActivityItem[] = [
      { id: "1", timestamp: "2024-01-01T10:00:00Z" } as ActivityItem,
      { id: "2", timestamp: "2024-01-01T12:00:00Z" } as ActivityItem,
      { id: "3", timestamp: "2024-01-01T08:00:00Z" } as ActivityItem,
    ];
    const sorted = [...activities].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    expect(sorted[0].id).toBe("2");
  });

  it("can count alerts by severity", () => {
    const alerts: DashboardAlert[] = [
      { id: "1", severity: "warning" } as DashboardAlert,
      { id: "2", severity: "critical" } as DashboardAlert,
      { id: "3", severity: "warning" } as DashboardAlert,
    ];
    const bySeverity = alerts.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(bySeverity.warning).toBe(2);
    expect(bySeverity.critical).toBe(1);
  });
});
