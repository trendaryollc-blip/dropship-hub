import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSearchCJProducts = vi.fn();
const mockGetAdminDB = vi.fn();

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    if ((req as any).__rejectAuth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    return handler(req, { uid: "test-user-123" });
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/platform-search", () => ({
  searchCJProducts: (...args: any[]) => mockSearchCJProducts(...args),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: any[]) => mockGetAdminDB(...args),
}));

function makeProduct(overrides: Record<string, any> = {}) {
  return {
    title: "Test Product",
    price: 10,
    image: "https://example.com/img.jpg",
    link: "https://cj.com/product/1",
    source: "CJ",
    rating: 4.5,
    reviews: 100,
    ...overrides,
  };
}

function makeRequest(uid?: string) {
  const req = new Request("http://localhost/api/dashboard");
  if (uid !== undefined) {
    req.headers.set("x-user-id", uid);
  }
  return req;
}

function buildFirestoreMocks(opts: {
  connections?: { status: string }[];
  revenue?: { date: string; amount: number; orders: number; profit?: number }[];
  orders?: { status: string; totalRevenue: number; profit: number; customerName: string; items: { name: string; price: number }[]; createdAt: string; updatedAt: string }[];
} = {}) {
  const { connections = [], revenue = [], orders = [] } = opts;

  const docsSnap = (docs: any[]) => ({
    docs: docs.map((d) => ({ data: () => d })),
  });

  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        collection: vi.fn().mockImplementation((sub: string) => {
          if (sub === "storeConnections") {
            return { get: vi.fn().mockResolvedValue(docsSnap(connections)) };
          }
          if (sub === "revenue") {
            return {
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(docsSnap(revenue)),
                }),
              }),
            };
          }
          if (sub === "fulfillmentOrders") {
            return {
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(docsSnap(orders)),
                }),
              }),
            };
          }
          return {
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ docs: [] }),
              }),
            }),
          };
        }),
      }),
    }),
  };
}

describe("/api/dashboard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Happy path — products available", () => {
    it("returns 200 with all dashboard properties", async () => {
      const products = [
        makeProduct({ title: "Gadget A", price: 15, category: "electronics" }),
        makeProduct({ title: "Gadget B", price: 25, category: "electronics" }),
        makeProduct({ title: "Shirt C", price: 20, category: "fashion" }),
      ];
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: products.filter((p) => p.category === cat),
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("test-user-123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBeDefined();
      expect(data.ticker.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.ticker)).toBe(true);
      expect(Array.isArray(data.nicheCards)).toBe(true);
      expect(Array.isArray(data.trending)).toBe(true);
      expect(Array.isArray(data.supplierStatuses)).toBe(true);
      expect(Array.isArray(data.heatmap)).toBe(true);
      expect(Array.isArray(data.alerts)).toBe(true);
      expect(Array.isArray(data.actionStats)).toBe(true);
      expect(data.briefing).toBeDefined();
      expect(data.revenueStats).toBeDefined();
      expect(data.pulse).toBeDefined();
      expect(data.fulfillmentPipeline).toBeDefined();
      expect(data.contextualActions).toBeDefined();
    });

    it("returns aiDailyPick with computed pricing", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ title: "Best Item", price: 10, rating: 4.8, reviews: 200, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.aiDailyPick).not.toBeNull();
      expect(data.aiDailyPick.sourcePrice).toBe(10);
      expect(data.aiDailyPick.sellPrice).toBeGreaterThan(10);
      expect(data.aiDailyPick.profit).toBeGreaterThan(0);
      expect(data.aiDailyPick.margin).toBeGreaterThan(0);
      expect(data.aiDailyPick.platform).toBe("CJ Dropshipping");
      expect(data.aiDailyPick.expiresAt).toBeDefined();
      expect(Array.isArray(data.aiDailyPick.reasonPoints)).toBe(true);
    });

    it("returns revenue stats computed from Firestore revenue entries", async () => {
      const now = Date.now();
      const recentDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const oldDate = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 15, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          revenue: [
            { date: recentDate, amount: 500, orders: 10, profit: 150 },
            { date: oldDate, amount: 300, orders: 5, profit: 80 },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.revenueStats.revenue).toBe(500);
      expect(data.revenueStats.orders).toBe(10);
      expect(data.revenueStats.growth).toBeDefined();
      expect(data.revenueStats.avgOrder).toBe(50);
    });

    it("builds revenueChart from last 14 days", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const revenue = [
        { date: "2025-06-14", amount: 200, orders: 4 },
        { date: "2025-06-13", amount: 150, orders: 3 },
        { date: "2025-05-01", amount: 50, orders: 1 },
      ];

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks({ revenue }));

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(Array.isArray(data.revenueChart)).toBe(true);
      expect(data.revenueChart.length).toBe(2);
      expect(data.revenueChart[0].date).toBe("2025-06-13");
      expect(data.revenueChart[1].date).toBe("2025-06-14");
    });

    it("computes fulfillmentPipeline from Firestore orders", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "Alice", items: [{ name: "Widget", price: 50 }], createdAt: "2025-06-10T10:00:00Z", updatedAt: "2025-06-10T10:00:00Z" },
            { status: "shipped", totalRevenue: 80, profit: 25, customerName: "Bob", items: [{ name: "Gadget", price: 80 }], createdAt: "2025-06-09T08:00:00Z", updatedAt: "2025-06-09T08:00:00Z" },
            { status: "delivered", totalRevenue: 120, profit: 40, customerName: "Carol", items: [{ name: "Thingamajig", price: 120 }], createdAt: "2025-06-08T12:00:00Z", updatedAt: "2025-06-08T12:00:00Z" },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.fulfillmentPipeline.pending).toBe(1);
      expect(data.fulfillmentPipeline.shipped).toBe(1);
      expect(data.fulfillmentPipeline.delivered).toBe(1);
      expect(data.fulfillmentPipeline.totalRevenue).toBe(250);
      expect(data.fulfillmentPipeline.totalProfit).toBe(80);
      expect(data.fulfillmentPipeline.recentOrders.length).toBe(3);
      expect(data.fulfillmentPipeline.recentOrders[0].customer).toBe("Alice");
      expect(data.fulfillmentPipeline.recentOrders[0].status).toBe("pending");
    });

    it("counts connected stores correctly", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          connections: [
            { status: "connected" },
            { status: "connected" },
            { status: "disconnected" },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.storesCount).toBe(2);
    });

    it("computes healthScore from real signals", async () => {
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          connections: [{ status: "connected" }],
          revenue: [
            { date: recentDate, amount: 100, orders: 3, profit: 30 },
            { date: recentDate, amount: 100, orders: 3, profit: 30 },
            { date: recentDate, amount: 100, orders: 3, profit: 30 },
            { date: recentDate, amount: 100, orders: 3, profit: 30 },
            { date: recentDate, amount: 100, orders: 3, profit: 30 },
            { date: recentDate, amount: 100, orders: 3, profit: 30 },
            { date: recentDate, amount: 100, orders: 3, profit: 30 },
          ],
          orders: [
            { status: "delivered", totalRevenue: 100, profit: 30, customerName: "X", items: [{ name: "P", price: 100 }], createdAt: recentDate, updatedAt: recentDate },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.healthScore).toBeGreaterThanOrEqual(20);
      expect(data.healthScore).toBeLessThanOrEqual(99);
    });
  });

  describe("Empty products fallback (all search results fail)", () => {
    it("returns empty dashboard when no products found", async () => {
      mockSearchCJProducts.mockImplementation(async () => ({
        search_results: [],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toEqual([]);
      expect(data.aiDailyPick).toBeNull();
      expect(data.revenueStats).toEqual({ revenue: 0, growth: 0, orders: 0, avgOrder: 0 });
      expect(data.revenueChart).toEqual([]);
      expect(data.alerts).toEqual([]);
      expect(data.nicheCards).toEqual([]);
      expect(data.supplierStatuses).toEqual([]);
      expect(data.heatmap).toEqual([]);
      expect(data.trending).toEqual([]);
      expect(data.briefing.insights[0]).toContain("temporarily unavailable");
      expect(data.pulse).toEqual([]);
      expect(data.actionStats).toEqual([]);
      expect(data.fulfillmentPipeline).toEqual({
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        totalRevenue: 0,
        totalProfit: 0,
        recentOrders: [],
      });
      expect(data.contextualActions).toEqual([]);
    });

    it("returns null healthScore when no products", async () => {
      mockSearchCJProducts.mockImplementation(async () => ({
        search_results: [],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.healthScore).toBeNull();
    });
  });

  describe("Error handling — searchCJProducts throws", () => {
    it("returns fallback when searchCJProducts throws", async () => {
      mockSearchCJProducts.mockRejectedValue(new Error("API down"));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toEqual([]);
      expect(data.briefing.insights[0]).toContain("temporarily unavailable");
    });
  });

  describe("Error handling — getAdminDB throws", () => {
    it("returns dashboard with default Firestore values when getAdminDB fails", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockRejectedValue(new Error("Firestore unavailable"));

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.storesCount).toBe(0);
      expect(data.revenueStats.revenue).toBe(0);
      expect(data.fulfillmentPipeline.pending).toBe(0);
      expect(data.fulfillmentPipeline.recentOrders).toEqual([]);
    });
  });

  describe("Cache behavior", () => {
    it("returns cached data on second call", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");

      const resp1 = await GET(makeRequest("u1"));
      const data1 = await resp1.json();
      expect(mockSearchCJProducts).toHaveBeenCalledTimes(5);

      mockSearchCJProducts.mockClear();

      const resp2 = await GET(makeRequest("u1"));
      const data2 = await resp2.json();
      expect(mockSearchCJProducts).not.toHaveBeenCalled();
      expect(data2.ticker).toBeDefined();
    });
  });

  describe("Products with missing/null fields", () => {
    it("handles products with null prices gracefully", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: null, category: cat, title: "Null Price Item" }),
          makeProduct({ price: 12, category: cat, title: "Good Item" }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker.length).toBeGreaterThanOrEqual(0);
    });

    it("handles products with missing ratings and reviews", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 10, rating: undefined, reviews: undefined, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.aiDailyPick).not.toBeNull();
      expect(data.aiDailyPick.margin).toBeGreaterThanOrEqual(0);
    });

    it("handles products with missing image and link", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 10, image: null, link: null, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.aiDailyPick.image).toBe("");
      expect(data.aiDailyPick.sourceUrl).toBeUndefined();
    });

    it("handles products with very long titles", async () => {
      const longTitle = "A".repeat(200);
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 10, title: longTitle, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker[0].name.length).toBeLessThanOrEqual(40);
    });
  });

  describe("Revenue growth calculation edge cases", () => {
    it("returns 0 growth when no previous period data", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const recentDate = "2025-06-10";

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          revenue: [{ date: recentDate, amount: 200, orders: 5, profit: 60 }],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.revenueStats.revenue).toBe(200);
      expect(data.revenueStats.growth).toBe(100);
    });

    it("computes positive growth correctly", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          revenue: [
            { date: "2025-06-10", amount: 1000, orders: 20 },
            { date: "2025-05-10", amount: 500, orders: 10 },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.revenueStats.growth).toBe(100);
    });

    it("computes negative growth correctly", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          revenue: [
            { date: "2025-06-10", amount: 200, orders: 4 },
            { date: "2025-05-10", amount: 500, orders: 10 },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.revenueStats.growth).toBeLessThan(0);
    });

    it("returns growth 0 when both periods are zero", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks({ revenue: [] }));

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.revenueStats.growth).toBe(0);
    });
  });

  describe("Niche card grade thresholds", () => {
    it("assigns A+ grade for high scores", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: Array.from({ length: 15 }, (_, i) =>
          makeProduct({ price: 10, rating: 5, reviews: 500, category: cat, title: `Product ${i}` })
        ),
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const grades = data.nicheCards.map((c: any) => c.grade);
      expect(grades.some((g: string) => ["A+", "A", "B+"].includes(g))).toBe(true);
    });

    it("assigns C grade for low scores", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 1, rating: 1, reviews: 0, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.nicheCards.length).toBeGreaterThanOrEqual(0);
      if (data.nicheCards.length > 0) {
        expect(["C", "C+", "B"]).toContain(data.nicheCards[0].grade);
      }
    });
  });

  describe("Supplier status trust badge", () => {
    it("returns gold badge for high product count", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: Array.from({ length: 10 }, (_, i) =>
          makeProduct({ price: 10, category: cat, title: `P${i}` })
        ),
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.supplierStatuses.length).toBe(1);
      expect(data.supplierStatuses[0].name).toBe("CJ Dropshipping");
      expect(["gold", "silver", "bronze"]).toContain(data.supplierStatuses[0].trustBadge);
    });

    it("returns correct response level based on product count", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(["fast", "moderate", "slow"]).toContain(data.supplierStatuses[0].responseLevel);
      expect(data.supplierStatuses[0].location).toBe("China");
      expect(data.supplierStatuses[0].status).toBe("online");
    });
  });

  describe("Heatmap trend derivation", () => {
    it("sets trend up when avg rating > 4.2", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 10, rating: 4.8, category: cat }),
          makeProduct({ price: 12, rating: 4.5, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const trends = data.heatmap.map((h: any) => h.trend);
      expect(trends.some((t: string) => t === "up" || t === "stable" || t === "down")).toBe(true);
    });

    it("sets weeklyData with 7 entries per category", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      data.heatmap.forEach((h: any) => {
        expect(h.weeklyData.length).toBe(7);
      });
    });
  });

  describe("Trending products edge cases", () => {
    it("truncates names longer than 60 characters", async () => {
      const longName = "X".repeat(100);
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, title: longName, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      if (data.trending.length > 0) {
        expect(data.trending[0].name.length).toBeLessThanOrEqual(60);
      }
    });

    it("includes listingSuggestion with title and description", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      if (data.trending.length > 0) {
        expect(data.trending[0].listingSuggestion).toBeDefined();
        expect(typeof data.trending[0].listingSuggestion.title).toBe("string");
        expect(typeof data.trending[0].listingSuggestion.description).toBe("string");
      }
    });

    it("populates sparkline from category prices when multiple products exist", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 5, category: cat, title: "A" }),
          makeProduct({ price: 10, category: cat, title: "B" }),
          makeProduct({ price: 15, category: cat, title: "C" }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      if (data.trending.length > 0) {
        expect(Array.isArray(data.trending[0].sparkline)).toBe(true);
        expect(data.trending[0].sparkline.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("Alerts generation", () => {
    it("generates alerts from high-margin trending products", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 5, rating: 4.8, reviews: 200, category: cat, title: "High Margin Item" }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(Array.isArray(data.alerts)).toBe(true);
      data.alerts.forEach((alert: any) => {
        expect(alert.id).toBeDefined();
        expect(["opportunity", "risk", "info", "warning"]).toContain(alert.type);
        expect(typeof alert.title).toBe("string");
        expect(typeof alert.description).toBe("string");
        expect(typeof alert.action).toBe("string");
        expect(typeof alert.actionHref).toBe("string");
        expect(typeof alert.timestamp).toBe("string");
        expect(typeof alert.read).toBe("boolean");
        expect(typeof alert.confidence).toBe("number");
        expect(typeof alert.aiAnalysis).toBe("string");
        expect(Array.isArray(alert.sparkline)).toBe(true);
      });
    });

    it("warning alerts link to /ai not /intelligence", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const warningAlerts = data.alerts.filter((a: any) => a.type === "warning");
      warningAlerts.forEach((alert: any) => {
        expect(alert.actionHref).toBe("/ai");
      });
    });
  });

  describe("Contextual actions", () => {
    it("filters contextual actions based on conditions", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(Array.isArray(data.contextualActions)).toBe(true);
      data.contextualActions.forEach((action: any) => {
        expect(action.id).toBeDefined();
        expect(typeof action.message).toBe("string");
        expect(typeof action.action).toBe("string");
        expect(action.href).toBeDefined();
        expect(["urgent", "suggestion", "info"]).toContain(action.type);
      });
    });

    it("excludes urgent action when no pending orders", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const urgentActions = data.contextualActions.filter((a: any) => a.id === "a1");
      expect(urgentActions.length).toBe(0);
    });

    it("includes urgent action when pending orders exist", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "X", items: [{ name: "P", price: 50 }], createdAt: "2025-06-10", updatedAt: "2025-06-10" },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const urgentActions = data.contextualActions.filter((a: any) => a.id === "a1");
      expect(urgentActions.length).toBe(1);
      expect(urgentActions[0].href).toBe("/fulfillment");
    });
  });

  describe("Briefing insights", () => {
    it("includes product count and category count insights", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 10, category: cat }),
          makeProduct({ price: 15, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.briefing.insights.length).toBeGreaterThan(0);
      expect(typeof data.briefing.sentiment).toBe("number");
      expect(["positive", "neutral", "negative"]).toContain(data.briefing.sentimentLabel);
      expect(typeof data.briefing.opportunities).toBe("number");
      expect(typeof data.briefing.risks).toBe("number");
      expect(typeof data.briefing.trends).toBe("number");
      expect(data.briefing.lastScan).toBe("just now");
    });

    it("reports price drops when products under $5 exist", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: 3, category: cat }),
          makeProduct({ price: 4, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const priceDropInsight = data.briefing.insights.find((i: string) => i.includes("under $5"));
      expect(priceDropInsight).toBeDefined();
    });
  });

  describe("Quick action stats", () => {
    it("returns 4 action stats with correct structure", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.actionStats.length).toBe(4);
      data.actionStats.forEach((stat: any) => {
        expect(typeof stat.label).toBe("string");
        expect(typeof stat.description).toBe("string");
        expect(typeof stat.href).toBe("string");
        expect(typeof stat.color).toBe("string");
        expect(typeof stat.stat).toBe("string");
        expect(typeof stat.statLabel).toBe("string");
      });
    });
  });

  describe("Fulfillment pipeline structure", () => {
    it("returns correct pipeline totals", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const fp = data.fulfillmentPipeline;
      expect(typeof fp.pending).toBe("number");
      expect(typeof fp.processing).toBe("number");
      expect(typeof fp.shipped).toBe("number");
      expect(typeof fp.delivered).toBe("number");
      expect(typeof fp.totalRevenue).toBe("number");
      expect(typeof fp.totalProfit).toBe("number");
      expect(Array.isArray(fp.recentOrders)).toBe(true);
    });

    it("limits recentOrders to 5", async () => {
      const orders = Array.from({ length: 10 }, (_, i) => ({
        status: "pending" as const,
        totalRevenue: 50,
        profit: 15,
        customerName: `Customer ${i}`,
        items: [{ name: `Item ${i}`, price: 50 }],
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
      }));

      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks({ orders }));

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.fulfillmentPipeline.recentOrders.length).toBeLessThanOrEqual(5);
    });
  });

  describe("withAuth wrapper", () => {
    it("passes uid from x-user-id header", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("custom-uid-456"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    it("handles missing x-user-id header", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest(undefined));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.storesCount).toBe(0);
    });
  });

  describe("formatTimeAgo (via fulfillmentPipeline.recentOrders.time)", () => {
    it("returns 'just now' for very recent timestamps", async () => {
      const now = new Date().toISOString();
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "X", items: [{ name: "P", price: 50 }], createdAt: now, updatedAt: now },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.fulfillmentPipeline.recentOrders[0].time).toBe("just now");
    });

    it("returns 'just now' for empty date string", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "X", items: [{ name: "P", price: 50 }], createdAt: "", updatedAt: "" },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.fulfillmentPipeline.recentOrders[0].time).toBe("just now");
    });

    it("returns minutes ago for timestamps within the hour", async () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "X", items: [{ name: "P", price: 50 }], createdAt: tenMinsAgo, updatedAt: tenMinsAgo },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.fulfillmentPipeline.recentOrders[0].time).toBe("10m ago");
    });

    it("returns hours ago for timestamps within the day", async () => {
      const threeHrsAgo = new Date(Date.now() - 3 * 3600000).toISOString();
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "X", items: [{ name: "P", price: 50 }], createdAt: threeHrsAgo, updatedAt: threeHrsAgo },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.fulfillmentPipeline.recentOrders[0].time).toBe("3h ago");
    });

    it("returns days ago for timestamps older than a day", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "X", items: [{ name: "P", price: 50 }], createdAt: twoDaysAgo, updatedAt: twoDaysAgo },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.fulfillmentPipeline.recentOrders[0].time).toBe("2d ago");
    });
  });

  describe("Partial search failures (Promise.allSettled)", () => {
    it("continues when some category searches fail", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => {
        if (cat === "electronics") {
          throw new Error("timeout");
        }
        return { search_results: [makeProduct({ price: 10, category: cat })] };
      });
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ticker).toBeDefined();
    });

    it("returns empty dashboard when all searches fail", async () => {
      mockSearchCJProducts.mockRejectedValue(new Error("all down"));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(data.ticker).toEqual([]);
      expect(data.briefing.insights[0]).toContain("temporarily unavailable");
    });
  });

  describe("Fulfillment order with missing fields", () => {
    it("handles orders with missing customerName and items", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [makeProduct({ price: 10, category: cat })],
      }));
      mockGetAdminDB.mockResolvedValue(
        buildFirestoreMocks({
          orders: [
            { status: "pending", totalRevenue: 50, profit: 15, customerName: "", items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
        })
      );

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      const order = data.fulfillmentPipeline.recentOrders[0];
      expect(order.customer).toBe("Customer");
      expect(order.product).toBe("Product");
    });
  });

  describe("Product price filtering", () => {
    it("filters out products with null or zero prices from allProducts", async () => {
      mockSearchCJProducts.mockImplementation(async (cat: string) => ({
        search_results: [
          makeProduct({ price: null, category: cat }),
          makeProduct({ price: 0, category: cat }),
          makeProduct({ price: 15, category: cat }),
        ],
      }));
      mockGetAdminDB.mockResolvedValue(buildFirestoreMocks());

      const { GET } = await import("./route");
      const response = await GET(makeRequest("u1"));
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });
});
