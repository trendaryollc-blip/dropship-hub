import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getPoolKeys,
  getPrimaryKey,
  withKeyPool,
  isQuotaError,
  isAuthError,
  ConfigMissingError,
  QuotaExhaustedError,
  __resetPoolStateForTests,
} from "./pool";

const SERP_POOL_VARS = [
  "SERPAPI_KEYS",
  "SERP_API_KEYS",
  "SERPAPI_KEY",
  "SERP_API_KEY",
  "SERPAPI_API_KEY",
];

describe("api-keys/pool", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const v of SERP_POOL_VARS) {
      savedEnv[v] = process.env[v];
      delete process.env[v];
    }
    __resetPoolStateForTests();
  });

  afterEach(() => {
    for (const v of SERP_POOL_VARS) {
      const original = savedEnv[v];
      if (original === undefined) delete process.env[v];
      else process.env[v] = original;
    }
    __resetPoolStateForTests();
  });

  describe("getPoolKeys", () => {
    it("returns empty array when no env vars are set", () => {
      expect(getPoolKeys("serpapi")).toEqual([]);
    });

    it("parses a comma-separated pool var", () => {
      process.env.SERPAPI_KEYS = "k1, k2 ,k3";
      expect(getPoolKeys("serpapi")).toEqual(["k1", "k2", "k3"]);
    });

    it("merges pool var with legacy single-key alias and dedupes", () => {
      process.env.SERPAPI_KEYS = "k1,k2";
      process.env.SERP_API_KEY = "k2,k3";
      expect(getPoolKeys("serpapi")).toEqual(["k1", "k2", "k3"]);
    });

    it("reads legacy SERP_API_KEY alone (backward compat)", () => {
      process.env.SERP_API_KEY = "legacy-key";
      expect(getPoolKeys("serpapi")).toEqual(["legacy-key"]);
      expect(getPrimaryKey("serpapi")).toBe("legacy-key");
    });

    it("reads pool vars for other providers", () => {
      process.env.SCRAPER_API_KEYS = "s1,s2";
      expect(getPoolKeys("scraperapi")).toEqual(["s1", "s2"]);
    });
  });

  describe("withKeyPool", () => {
    it("throws ConfigMissingError when no keys configured", async () => {
      await expect(
        withKeyPool("serpapi", async () => "never")
      ).rejects.toBeInstanceOf(ConfigMissingError);
    });

    it("returns the function result on success", async () => {
      process.env.SERPAPI_KEYS = "k1";
      const result = await withKeyPool("serpapi", async (key) => `ok:${key}`);
      expect(result).toBe("ok:k1");
    });

    it("rotates to the next key when the first hits quota", async () => {
      process.env.SERPAPI_KEYS = "kQuota,kGood";
      const seen: string[] = [];
      const result = await withKeyPool("serpapi", async (key) => {
        seen.push(key);
        if (key === "kQuota") throw new Error("SerpAPI 429: out of searches");
        return "ok";
      });
      expect(result).toBe("ok");
      expect(seen).toEqual(["kQuota", "kGood"]);
    });

    it("cools down a quota-hit key so the next call skips it", async () => {
      process.env.SERPAPI_KEYS = "kQuota,kGood";
      await withKeyPool("serpapi", async (key) => {
        if (key === "kQuota") throw new Error("429 too many requests");
        return "ok";
      });
      const seen: string[] = [];
      await withKeyPool("serpapi", async (key) => {
        seen.push(key);
        return "ok";
      });
      expect(seen).toEqual(["kGood"]);
    });

    it("throws QuotaExhaustedError when every key is quota-limited", async () => {
      process.env.SERPAPI_KEYS = "kA,kB";
      await expect(
        withKeyPool("serpapi", async (key) => {
          throw new Error(`429 rate limit exceeded for ${key}`);
        })
      ).rejects.toBeInstanceOf(QuotaExhaustedError);
    });

    it("throws QuotaExhaustedError when all keys are already cooled down", async () => {
      process.env.SERPAPI_KEYS = "kA";
      await expect(
        withKeyPool("serpapi", async () => {
          throw new Error("quota exhausted");
        })
      ).rejects.toBeInstanceOf(QuotaExhaustedError);

      // Second call: key already cooling → immediate quota error, fn not invoked
      let invoked = false;
      await expect(
        withKeyPool("serpapi", async () => {
          invoked = true;
          return "x";
        })
      ).rejects.toBeInstanceOf(QuotaExhaustedError);
      expect(invoked).toBe(false);
    });

    it("rethrows non-quota, non-auth errors immediately without rotating", async () => {
      process.env.SERPAPI_KEYS = "kA,kB";
      const seen: string[] = [];
      await expect(
        withKeyPool("serpapi", async (key) => {
          seen.push(key);
          throw new Error("Rainforest API 500: internal server error");
        })
      ).rejects.toThrow("500");
      expect(seen).toEqual(["kA"]);
    });

    it("cools down auth-failed keys and tries the next", async () => {
      process.env.SERPAPI_KEYS = "kBad,kGood";
      const result = await withKeyPool("serpapi", async (key) => {
        if (key === "kBad") throw new Error("401 unauthorized: invalid api key");
        return "ok";
      });
      expect(result).toBe("ok");
    });
  });

  describe("error classification", () => {
    it("detects quota errors from status and message", () => {
      expect(isQuotaError(new Error("SerpAPI 429: out of searches"))).toBe(true);
      expect(isQuotaError(new Error("rate limit exceeded"))).toBe(true);
      expect(isQuotaError({ status: 429, message: "nope" })).toBe(true);
      expect(isQuotaError(new Error("quota exhausted"))).toBe(true);
      expect(isQuotaError(new Error("500 server error"))).toBe(false);
    });

    it("detects auth errors", () => {
      expect(isAuthError(new Error("401 unauthorized"))).toBe(true);
      expect(isAuthError(new Error("invalid api key"))).toBe(true);
      expect(isAuthError({ status: 403, message: "forbidden" })).toBe(true);
      expect(isAuthError(new Error("404 not found"))).toBe(false);
    });
  });
});
