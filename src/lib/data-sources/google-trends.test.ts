import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchGoogleTrends } from "./google-trends";
import { __resetPoolStateForTests } from "@/lib/api-keys/pool";

const SERPAPI_ENV_VARS = [
  "SERPAPI_KEYS",
  "SERP_API_KEYS",
  "SERPAPI_KEY",
  "SERP_API_KEY",
  "SERPAPI_API_KEY",
];

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const TIMESERIES_BODY = {
  interest_over_time: {
    timeline_data: [
      { date: "Dec 29, 2024 – Jan 4, 2025", values: [{ extracted_value: 42 }] },
      { date: "Jan 5, 2025 – Jan 11, 2025", values: [{ extracted_value: 58 }] },
    ],
  },
};

const GEO_MAP_BODY = {
  interest_by_region: [
    { location: "California", extracted_value: 88 },
    { location: "", extracted_value: 50 },
  ],
};

describe("fetchGoogleTrends (SerpAPI live adapter)", () => {
  const saved: Record<string, string | undefined> = {};
  const fetchMock = vi.fn();

  beforeEach(() => {
    for (const name of SERPAPI_ENV_VARS) saved[name] = process.env[name];
    for (const name of SERPAPI_ENV_VARS) delete process.env[name];
    __resetPoolStateForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const name of SERPAPI_ENV_VARS) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it("returns an honest not-configured message when no SerpAPI key is set", async () => {
    const result = await fetchGoogleTrends("earbuds");
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/SerpAPI is not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches the timeseries + region map and maps real values", async () => {
    process.env.SERPAPI_KEYS = "serp_key_1";
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("data_type=GEO_MAP_0")) return jsonResponse(GEO_MAP_BODY);
      return jsonResponse(TIMESERIES_BODY);
    });

    const result = await fetchGoogleTrends("wireless earbuds", "30d");
    expect(result.success).toBe(true);
    expect(result.cached).toBe(false);
    expect(result.data).toMatchObject({
      keyword: "wireless earbuds",
      timeframe: "30d",
      interestOverTime: [
        { date: "Dec 29, 2024 – Jan 4, 2025", value: 42 },
        { date: "Jan 5, 2025 – Jan 11, 2025", value: 58 },
      ],
      interestByRegion: [{ region: "California", value: 88 }],
      relatedQueries: [],
      relatedTopics: [],
    });

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls[0]).toContain("engine=google_trends");
    expect(urls[0]).toContain("q=wireless+earbuds");
    expect(urls[0]).toContain("data_type=TIMESERIES");
    expect(urls[0]).toContain("date=today+1-m");
    expect(urls[0]).toContain("api_key=serp_key_1");
    expect(urls[1]).toContain("data_type=GEO_MAP_0");
    // worldwide → geo omitted (SerpAPI's default)
    expect(urls[0]).not.toContain("geo=");
  });

  it("passes a non-worldwide geo through and maps timeframe dates", async () => {
    process.env.SERPAPI_KEYS = "serp_key_1";
    fetchMock.mockImplementation(async () => jsonResponse(TIMESERIES_BODY));

    const result = await fetchGoogleTrends("earbuds", "7d", "US");
    expect(result.success).toBe(true);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("geo=US");
    expect(url).toContain("date=now+7-d");
  });

  it("returns an honest error when the keyword has no interest data", async () => {
    process.env.SERPAPI_KEYS = "serp_key_1";
    fetchMock.mockImplementation(async () => jsonResponse({ interest_over_time: { timeline_data: [] } }));

    const result = await fetchGoogleTrends("zzz-unfindable");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no interest-over-time data/);
  });

  it("surfaces quota exhaustion as an honest error (no fake data)", async () => {
    process.env.SERPAPI_KEYS = "serp_key_1";
    fetchMock.mockImplementation(async () =>
      jsonResponse({ error: "too many requests" }, 429)
    );

    const result = await fetchGoogleTrends("earbuds");
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/quota|rate|429/i);
  });
});
