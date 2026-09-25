import { describe, it, expect } from "vitest";
import {
  liveEnvelope,
  configMissingEnvelope,
  quotaExhaustedEnvelope,
  providerErrorEnvelope,
  comingSoonEnvelope,
  envelopeFromError,
  envelopeHttpStatus,
  providerSetupInfo,
} from "./envelope";
import { ConfigMissingError, QuotaExhaustedError } from "./pool";

describe("api-keys/envelope", () => {
  describe("builders", () => {
    it("liveEnvelope carries data, source and timestamp", () => {
      const env = liveEnvelope({ volume: 100 }, "serpapi");
      expect(env.data).toEqual({ volume: 100 });
      expect(env.meta.status).toBe("live");
      expect(env.meta.source).toBe("serpapi");
      expect(env.meta.fetchedAt).toBeTruthy();
    });

    it("configMissingEnvelope has null data and actionable setup", () => {
      const env = configMissingEnvelope("serpapi");
      expect(env.data).toBeNull();
      expect(env.meta.status).toBe("config_missing");
      expect(env.meta.setup?.envVar).toBe("SERPAPI_KEYS");
      expect(env.meta.setup?.whereToGet).toContain("serpapi.com");
      expect(env.meta.setup?.whereToSet).toContain("SERPAPI_KEYS");
    });

    it("quotaExhaustedEnvelope reports key count and reset time", () => {
      const resetsAt = Date.now() + 60_000;
      const env = quotaExhaustedEnvelope("serpapi", 4, resetsAt);
      expect(env.data).toBeNull();
      expect(env.meta.status).toBe("quota_exhausted");
      expect(env.meta.quota?.keyCount).toBe(4);
      expect(env.meta.quota?.resetsAt).toBe(new Date(resetsAt).toISOString());
      expect(env.meta.setup?.envVar).toBe("SERPAPI_KEYS");
    });

    it("comingSoonEnvelope names the concrete deliverable", () => {
      const env = comingSoonEnvelope("Price history via Keepa API", "keepa.com/#!api");
      expect(env.data).toBeNull();
      expect(env.meta.status).toBe("coming_soon");
      expect(env.meta.comingSoon?.whatNeeded).toContain("Keepa");
      expect(env.meta.comingSoon?.howToGet).toBe("keepa.com/#!api");
    });

    it("providerErrorEnvelope keeps null data", () => {
      const env = providerErrorEnvelope("upstream 500", "rainforest");
      expect(env.data).toBeNull();
      expect(env.meta.status).toBe("provider_error");
      expect(env.meta.message).toBe("upstream 500");
    });
  });

  describe("envelopeFromError", () => {
    it("maps ConfigMissingError to config_missing with setup", () => {
      const env = envelopeFromError(new ConfigMissingError("serpapi"));
      expect(env.meta.status).toBe("config_missing");
      expect(env.meta.setup?.what).toContain("SerpAPI");
      expect(env.data).toBeNull();
    });

    it("maps QuotaExhaustedError to quota_exhausted with key count", () => {
      const env = envelopeFromError(new QuotaExhaustedError("serpapi", 4));
      expect(env.meta.status).toBe("quota_exhausted");
      expect(env.meta.quota?.keyCount).toBe(4);
      expect(env.data).toBeNull();
    });

    it("maps unknown errors to provider_error", () => {
      const env = envelopeFromError(new Error("boom"), "cj");
      expect(env.meta.status).toBe("provider_error");
      expect(env.meta.source).toBe("cj");
      expect(env.meta.message).toBe("boom");
    });
  });

  describe("envelopeHttpStatus", () => {
    it("maps statuses to HTTP codes", () => {
      expect(envelopeHttpStatus({ status: "live" })).toBe(200);
      expect(envelopeHttpStatus({ status: "coming_soon" })).toBe(200);
      expect(envelopeHttpStatus({ status: "config_missing" })).toBe(503);
      expect(envelopeHttpStatus({ status: "quota_exhausted" })).toBe(429);
      expect(envelopeHttpStatus({ status: "provider_error" })).toBe(502);
    });
  });

  describe("providerSetupInfo", () => {
    it("builds setup text for any registered provider", () => {
      const info = providerSetupInfo("scraperapi", "ScraperAPI key for marketplace scrapes");
      expect(info.what).toContain("ScraperAPI");
      expect(info.envVar).toBe("SCRAPER_API_KEYS");
      expect(info.whereToGet).toContain("scraperapi.com");
      expect(info.whereToSet).toContain(".env.local");
    });
  });
});
