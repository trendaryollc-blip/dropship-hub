import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/monitoring/scheduler", () => ({
  runPriceCheckForUser: vi.fn(),
}));

vi.mock("@/lib/monitoring/metrics", () => ({
  computeMonitoringMetrics: vi.fn(),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function makeReq(url = "http://localhost/api/monitoring/cron", headers?: Record<string, string>) {
  return {
    url,
    method: "GET",
    headers: { get: vi.fn((k: string) => headers?.[k] ?? null) },
    nextUrl: new URL(url),
  } as any;
}

let mockDb: any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  mockDb = {
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === "users") {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [{ id: "user-1" }],
            empty: false,
          }),
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((sub: string) => {
              if (sub === "monitoringMetrics") {
                return { doc: vi.fn().mockReturnValue({ set: vi.fn() }) };
            }
              return buildQueryChain([]);
            }),
          }),
        };
      }
      return { doc: vi.fn().mockReturnValue({ collection: vi.fn().mockReturnValue(buildQueryChain([])) }) };
    }),
    batch: vi.fn().mockReturnValue({ commit: vi.fn(), set: vi.fn() }),
  };
});

describe("GET /api/monitoring/cron", () => {
  it("returns 401 without valid auth header when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "secret-key";
    const { GET } = await import("./route");

    const res = await GET(makeReq("http://localhost/api/monitoring/cron", {}));
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
    delete process.env.CRON_SECRET;
  });

  it("runs price-check cron job for all users", async () => {
    delete process.env.CRON_SECRET;
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(mockDb),
    }));
    const { runPriceCheckForUser } = await import("@/lib/monitoring/scheduler");
    (runPriceCheckForUser as any).mockResolvedValue({ checked: 3, priceChanged: 1, stockChanged: 0, alerts: 1, errors: 0 });

    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/monitoring/cron?job=price-check"));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.job).toBe("price-check");
    expect(json.usersProcessed).toBe(1);
  });

  it("returns empty result when no users exist", async () => {
    delete process.env.CRON_SECRET;
    const emptyDb = {
      collection: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
      }),
    };
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(emptyDb),
    }));

    const { GET } = await import("./route");
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.message).toBe("No users found");
    expect(json.results).toEqual([]);
  });
});
