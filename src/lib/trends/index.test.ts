import { describe, it, expect } from "vitest";

describe("trends/accuracy", () => {
  it("exports accuracy functions", async () => {
    const mod = await import("../trends/accuracy");
    expect(typeof mod.recordPredictionAccuracy).toBe("function");
    expect(typeof mod.getPredictionAccuracy).toBe("function");
    expect(typeof mod.getOverallAccuracy).toBe("function");
  });
});

describe("trends/notifications", () => {
  it("exports notification functions", async () => {
    const mod = await import("../trends/notifications");
    expect(typeof mod.createNotification).toBe("function");
    expect(typeof mod.getNotifications).toBe("function");
    expect(typeof mod.markNotificationRead).toBe("function");
    expect(typeof mod.markAllNotificationsRead).toBe("function");
    expect(typeof mod.getUnreadCount).toBe("function");
  });
});
