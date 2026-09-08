import { describe, it, expect, vi, beforeEach } from "vitest";
import { googleAdapter } from "./google";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "dev-token";
});

describe("googleAdapter", () => {
  const mockToken = "test-token";
  const mockAccountId = "123-456-7890";

  describe("getCampaigns", () => {
    it("returns mapped campaigns from Google Ads API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          results: [{
            campaign: { id: "111", name: "GA Campaign", status: "ENABLED" },
            metrics: {
              impressions: "2000",
              clicks: "100",
              costMicros: "150000000",
              conversions: "10",
              ctr: "5.0",
              averageCpc: "1500000",
              conversionRate: "10.0",
            },
          }],
        }]),
      });

      const campaigns = await googleAdapter.getCampaigns(mockToken, mockAccountId);
      expect(campaigns).toHaveLength(1);
      expect(campaigns[0].platformCampaignId).toBe("111");
      expect(campaigns[0].name).toBe("GA Campaign");
      expect(campaigns[0].status).toBe("active");
      expect(campaigns[0].metrics.impressions).toBe(2000);
      expect(campaigns[0].metrics.clicks).toBe(100);
      expect(campaigns[0].metrics.conversions).toBe(10);
      expect(campaigns[0].metrics.spend).toBe(150);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Unauthorized" } }),
      });

      await expect(googleAdapter.getCampaigns(mockToken, mockAccountId)).rejects.toThrow("Google Ads API 401");
    });
  });

  describe("pauseCampaign", () => {
    it("sends PAUSED status to Google Ads API", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await googleAdapter.pauseCampaign(mockToken, mockAccountId, "111");
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("resumeCampaign", () => {
    it("sends ENABLED status to Google Ads API", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await googleAdapter.resumeCampaign(mockToken, mockAccountId, "111");
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
