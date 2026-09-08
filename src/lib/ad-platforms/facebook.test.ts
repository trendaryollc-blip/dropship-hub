import { describe, it, expect, vi, beforeEach } from "vitest";
import { facebookAdapter } from "./facebook";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("facebookAdapter", () => {
  const mockToken = "test-token";
  const mockAccountId = "123456789";

  describe("getCampaigns", () => {
    it("returns mapped campaigns from Facebook API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            id: "camp1",
            name: "Test Campaign",
            status: "ACTIVE",
            daily_budget: "5000",
            insights: {
              data: [{
                impressions: "1000",
                clicks: "50",
                spend: "75.50",
                actions: [{ action_type: "purchase", value: "5" }],
                ctr: "5.0",
                cpc: "1.51",
              }],
            },
          }],
        }),
      });

      const campaigns = await facebookAdapter.getCampaigns(mockToken, mockAccountId);
      expect(campaigns).toHaveLength(1);
      expect(campaigns[0].platformCampaignId).toBe("camp1");
      expect(campaigns[0].name).toBe("Test Campaign");
      expect(campaigns[0].status).toBe("active");
      expect(campaigns[0].dailyBudget).toBe(50);
      expect(campaigns[0].metrics.impressions).toBe(1000);
      expect(campaigns[0].metrics.clicks).toBe(50);
      expect(campaigns[0].metrics.conversions).toBe(5);
      expect(campaigns[0].metrics.spend).toBe(75.5);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "Invalid token" } }),
      });

      await expect(facebookAdapter.getCampaigns(mockToken, mockAccountId)).rejects.toThrow("Facebook API 400");
    });

    it("handles empty data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const campaigns = await facebookAdapter.getCampaigns(mockToken, mockAccountId);
      expect(campaigns).toHaveLength(0);
    });
  });

  describe("pauseCampaign", () => {
    it("sends PAUSED status to Facebook API", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await facebookAdapter.pauseCampaign(mockToken, mockAccountId, "camp1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("camp1"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("resumeCampaign", () => {
    it("sends ACTIVE status to Facebook API", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await facebookAdapter.resumeCampaign(mockToken, mockAccountId, "camp1");
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("updateBudget", () => {
    it("sends budget update to Facebook API", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await facebookAdapter.updateBudget(mockToken, mockAccountId, "camp1", 100);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
