/**
 * Canonical registry of external data providers.
 *
 * Every provider declares the env vars that may hold its key(s), in the
 * order they should be read. Comma-separated POOL vars come first so a
 * multi-key rotation setup (e.g. 4 free SerpAPI accounts) takes precedence
 * over any single-key legacy alias. See `.env.example` → "*_KEYS pools".
 */
export type ProviderId =
  | "serpapi"
  | "rainforest"
  | "cj"
  | "keepa"
  | "scraperapi"
  | "openai"
  | "groq";

export interface ProviderSetup {
  id: ProviderId;
  /** Human-readable name used in user-facing messages. */
  name: string;
  /**
   * Env vars checked (and merged) to build the key pool, in priority order.
   * Pool vars (comma-separated) first; legacy single-key aliases last.
   */
  envVars: string[];
  /** Canonical pool env var documented in .env.example and setup messages. */
  poolEnvVar: string;
  /** Where the user can obtain a key. */
  getKeyUrl: string;
}

export const PROVIDERS: Record<ProviderId, ProviderSetup> = {
  serpapi: {
    id: "serpapi",
    name: "SerpAPI",
    envVars: ["SERPAPI_KEYS", "SERP_API_KEYS", "SERPAPI_KEY", "SERP_API_KEY", "SERPAPI_API_KEY"],
    poolEnvVar: "SERPAPI_KEYS",
    getKeyUrl: "https://serpapi.com/manage/api-key",
  },
  rainforest: {
    id: "rainforest",
    name: "Rainforest API",
    envVars: ["RAINFOREST_API_KEYS", "RAINFOREST_API_KEY"],
    poolEnvVar: "RAINFOREST_API_KEYS",
    getKeyUrl: "https://dashboard.rainforestapi.com/api-keys",
  },
  cj: {
    id: "cj",
    name: "CJ Dropshipping",
    envVars: ["CJ_API_KEYS", "CJ_API_KEY"],
    poolEnvVar: "CJ_API_KEYS",
    getKeyUrl: "https://developers.cjdropshipping.com/api2.0/v1/account/info",
  },
  keepa: {
    id: "keepa",
    name: "Keepa",
    envVars: ["KEEPA_API_KEYS", "KEEPA_API_KEY"],
    poolEnvVar: "KEEPA_API_KEYS",
    getKeyUrl: "https://keepa.com/#!api",
  },
  scraperapi: {
    id: "scraperapi",
    name: "ScraperAPI",
    envVars: ["SCRAPER_API_KEYS", "SCRAPER_API_KEY"],
    poolEnvVar: "SCRAPER_API_KEYS",
    getKeyUrl: "https://www.scraperapi.com/dashboard/",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    envVars: ["OPENAI_API_KEYS", "OPENAI_API_KEY"],
    poolEnvVar: "OPENAI_API_KEYS",
    getKeyUrl: "https://platform.openai.com/api-keys",
  },
  groq: {
    id: "groq",
    name: "Groq",
    envVars: ["GROQ_API_KEYS", "GROQ_API_KEY"],
    poolEnvVar: "GROQ_API_KEYS",
    getKeyUrl: "https://console.groq.com/keys",
  },
};

export function getProviderSetup(id: ProviderId): ProviderSetup {
  return PROVIDERS[id];
}
