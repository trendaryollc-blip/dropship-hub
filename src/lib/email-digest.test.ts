import { describe, it, expect, vi, beforeEach } from "vitest";

describe("email-digest", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.RESEND_API_KEY = "test-resend-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sendDigestEmail is a function", async () => {
    const { sendDigestEmail } = await import("./email-digest");
    expect(typeof sendDigestEmail).toBe("function");
  });

  it("sends email successfully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "email-123" }),
    }));
    const { sendDigestEmail } = await import("./email-digest");
    const result = await sendDigestEmail("test@example.com", {
      date: "2024-01-15",
      summary: "Test summary",
      metrics: { orders: 5, revenue: 500, profit: 200, stockAlerts: 1, supplierDelays: 0 },
      alerts: [],
      recommendations: ["Test recommendation"],
      weeklyTrend: { direction: "up", percentage: 15, insight: "Growing" },
    });
    expect(result).toBe(true);
  });

  it("returns false on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed" }),
    }));
    const { sendDigestEmail } = await import("./email-digest");
    const result = await sendDigestEmail("test@example.com", {
      date: "2024-01-15",
      summary: "Test",
      metrics: { orders: 0, revenue: 0, profit: 0, stockAlerts: 0, supplierDelays: 0 },
      alerts: [],
      recommendations: [],
      weeklyTrend: { direction: "stable", percentage: 0, insight: "" },
    });
    expect(result).toBe(false);
  });

  it("calls fetch with correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "email-123" }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const { sendDigestEmail } = await import("./email-digest");
    await sendDigestEmail("test@example.com", {
      date: "2024-01-15",
      summary: "Test",
      metrics: { orders: 1, revenue: 100, profit: 50, stockAlerts: 0, supplierDelays: 0 },
      alerts: [],
      recommendations: [],
      weeklyTrend: { direction: "stable", percentage: 0, insight: "" },
    });
    expect(mockFetch).toHaveBeenCalled();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("resend");
    expect(options.method).toBe("POST");
  });

  it("sends correct email payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "email-456" }),
    });
    vi.stubGlobal("fetch", mockFetch);
    const { sendDigestEmail } = await import("./email-digest");
    await sendDigestEmail("recipient@example.com", {
      date: "2024-06-01",
      summary: "Weekly report",
      metrics: { orders: 10, revenue: 1000, profit: 400, stockAlerts: 2, supplierDelays: 1 },
      alerts: [{ type: "stock", title: "Low stock on Widget", description: "Widget stock is low", severity: "medium" }],
      recommendations: ["Reorder Widget"],
      weeklyTrend: { direction: "down", percentage: 5, insight: "Slight decline" },
    });
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(["recipient@example.com"]);
    expect(body.subject).toBeDefined();
  });

  it("returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const { sendDigestEmail } = await import("./email-digest");
    const result = await sendDigestEmail("test@example.com", {
      date: "2024-01-15",
      summary: "Test",
      metrics: { orders: 0, revenue: 0, profit: 0, stockAlerts: 0, supplierDelays: 0 },
      alerts: [],
      recommendations: [],
      weeklyTrend: { direction: "stable", percentage: 0, insight: "" },
    });
    expect(result).toBe(false);
  });

  it("handles empty recommendations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "email-789" }),
    }));
    const { sendDigestEmail } = await import("./email-digest");
    const result = await sendDigestEmail("test@example.com", {
      date: "2024-01-15",
      summary: "Test",
      metrics: { orders: 0, revenue: 0, profit: 0, stockAlerts: 0, supplierDelays: 0 },
      alerts: [],
      recommendations: [],
      weeklyTrend: { direction: "stable", percentage: 0, insight: "" },
    });
    expect(result).toBe(true);
  });

  it("handles multiple alerts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "email-alert" }),
    }));
    const { sendDigestEmail } = await import("./email-digest");
    const result = await sendDigestEmail("test@example.com", {
      date: "2024-01-15",
      summary: "Alerts test",
      metrics: { orders: 3, revenue: 300, profit: 100, stockAlerts: 3, supplierDelays: 2 },
      alerts: [
        { type: "stock", title: "Alert 1", description: "First alert", severity: "high" },
        { type: "supplier", title: "Alert 2", description: "Second alert", severity: "medium" },
        { type: "trend", title: "Alert 3", description: "Third alert", severity: "low" },
      ],
      recommendations: ["Rec 1"],
      weeklyTrend: { direction: "up", percentage: 10, insight: "Improving" },
    });
    expect(result).toBe(true);
  });
});
