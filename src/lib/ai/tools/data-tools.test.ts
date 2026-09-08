import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrdersTool,
  getRevenueDataTool,
  getProfitEntriesTool,
  getAlertsTool,
  markAlertReadTool,
  markAllAlertsReadTool,
  getDailyDigestTool,
  getMissionsTool,
  completeMissionTool,
  getWatchlistTool,
  addToWatchlistTool,
  getStoreConnectionsTool,
  getPushedProductsTool,
  getPriceRulesTool,
  getPriceWarStatsTool,
  getReturnRequestsTool,
  getTrendDashboardTool,
  getAdCampaignsTool,
} from "./data-tools";

vi.mock("@/lib/data/order-routing", () => ({
  getRoutingDecisions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/revenue", () => ({
  getRevenueEntries: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/profit", () => ({
  getProfitEntries: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/alerts", () => ({
  getAlerts: vi.fn().mockResolvedValue([]),
  markAlertRead: vi.fn().mockResolvedValue(undefined),
  markAllAlertsRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/digest", () => ({
  getLatestDigest: vi.fn().mockResolvedValue(null),
  getDigests: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/missions", () => ({
  getMissions: vi.fn().mockResolvedValue([]),
  toggleMission: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/watchlist", () => ({
  getWatchlist: vi.fn().mockResolvedValue([]),
  addToWatchlist: vi.fn().mockResolvedValue(undefined),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/store-connections", () => ({
  getStoreConnections: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/pushed-products", () => ({
  getPushedProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/price-war", () => ({
  getPriceRules: vi.fn().mockResolvedValue([]),
  getPriceWarStats: vi.fn().mockResolvedValue({
    activeRules: 0,
    triggeredToday: 0,
    avgMarginMaintained: 0,
  }),
}));

vi.mock("@/lib/data/returns", () => ({
  getReturnRequests: vi.fn().mockResolvedValue([]),
  getDefectAnalytics: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/data/trend-predictor", () => ({
  getTrendDashboard: vi.fn().mockResolvedValue({
    activeTrends: 0,
    risingStars: 0,
    alertsUnread: 0,
  }),
  getTrendPredictions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/ad-campaigns", () => ({
  getAdCampaigns: vi.fn().mockResolvedValue([]),
}));

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Data Tools", () => {
  describe("getOrdersTool", () => {
    it("gets orders", async () => {
      const result = await getOrdersTool.execute({ limit: 10 }, context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getRevenueDataTool", () => {
    it("gets revenue data", async () => {
      const result = await getRevenueDataTool.execute({ limit: 10 }, context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getProfitEntriesTool", () => {
    it("gets profit entries", async () => {
      const result = await getProfitEntriesTool.execute({ limit: 10 }, context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getAlertsTool", () => {
    it("gets alerts", async () => {
      const result = await getAlertsTool.execute({ limit: 10 }, context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("markAlertReadTool", () => {
    it("marks alert as read", async () => {
      const result = await markAlertReadTool.execute({ alertId: "alert_1" }, context);
      expect(result.success).toBe(true);
    });
  });

  describe("markAllAlertsReadTool", () => {
    it("marks all alerts as read", async () => {
      const result = await markAllAlertsReadTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getDailyDigestTool", () => {
    it("gets daily digest", async () => {
      const result = await getDailyDigestTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getMissionsTool", () => {
    it("gets missions", async () => {
      const result = await getMissionsTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("completeMissionTool", () => {
    it("completes a mission", async () => {
      const result = await completeMissionTool.execute({ missionId: "mission_1" }, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getWatchlistTool", () => {
    it("gets watchlist", async () => {
      const result = await getWatchlistTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("addToWatchlistTool", () => {
    it("adds item to watchlist", async () => {
      const result = await addToWatchlistTool.execute({
        itemId: "item_1",
        title: "Test Product",
        type: "product",
      }, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getStoreConnectionsTool", () => {
    it("gets store connections", async () => {
      const result = await getStoreConnectionsTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getPushedProductsTool", () => {
    it("gets pushed products", async () => {
      const result = await getPushedProductsTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getPriceRulesTool", () => {
    it("gets price rules", async () => {
      const result = await getPriceRulesTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getPriceWarStatsTool", () => {
    it("gets price war stats", async () => {
      const result = await getPriceWarStatsTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getReturnRequestsTool", () => {
    it("gets return requests", async () => {
      const result = await getReturnRequestsTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getTrendDashboardTool", () => {
    it("gets trend dashboard", async () => {
      const result = await getTrendDashboardTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });

  describe("getAdCampaignsTool", () => {
    it("gets ad campaigns", async () => {
      const result = await getAdCampaignsTool.execute({}, context);
      expect(result.success).toBe(true);
    });
  });
});
