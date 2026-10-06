import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 }, PRODUCT_ENRICH: { windowMs: 60000, maxRequests: 20 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/platform-search", () => ({
  searchAmazon: vi.fn().mockResolvedValue({ search_results: [{ title: "Amazon Item", price: 29.99, rating: 4.5, reviews: 100, link: "https://amazon.com/dp/B0123" }] }),
  searchGoogleShopping: vi.fn().mockResolvedValue({ search_results: [] }),
  searchCJProducts: vi.fn().mockResolvedValue({ search_results: [] }),
  searchKeepaProducts: vi.fn().mockResolvedValue({ search_results: [] }),
  searchAliExpress: vi.fn().mockResolvedValue({ search_results: [] }),
}));

vi.mock("@/lib/supplier-service", () => ({
  getSuppliers: vi.fn().mockResolvedValue([
    { id: "s1", name: "Supplier One", trustBadge: "Gold", location: "China", flag: "", catalog: { categories: ["all"] }, stats: { shippingDays: 5, shippingDaysEU: 7, reliabilityScore: 90, responseTime: "2h" } },
  ]),
}));

vi.mock("@/lib/supplier-platform-search", () => ({
  searchSupplierPlatforms: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/suppliers/directory", () => ({
  upsertDirectorySupplier: vi.fn().mockResolvedValue(undefined),
  directoryEntryFromOffer: (offer: { supplierId: string; supplierName: string }, source: string) => ({
    supplierId: offer.supplierId,
    name: offer.supplierName,
    source,
  }),
}));

import { POST } from "./route";
import { getSuppliers } from "@/lib/supplier-service";
import { searchSupplierPlatforms } from "@/lib/supplier-platform-search";
import { upsertDirectorySupplier } from "@/lib/suppliers/directory";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

describe("POST /api/products/enrich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("title");
  });

  it("enriches a product with platform prices", async () => {
    const res = await POST(makeReq({ title: "Wireless Earbuds", source: "Amazon", price: 30 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.platforms).toBeDefined();
    expect(Array.isArray(data.platforms)).toBe(true);
    expect(data.cheapest).toBeDefined();
    expect(data.mostExpensive).toBeDefined();
    expect(data.priceSpread).toBeGreaterThanOrEqual(0);
    expect(data.platforms[0].title).toBe("Amazon Item");
  });

  it("returns only real platform results without mock padding", async () => {
    const res = await POST(makeReq({ title: "Rare Gadget", price: 20 }), null as any);
    const data = await res.json();
    expect(data.hasMockData).toBeUndefined();
    expect(data.coverage).toBeDefined();
    expect(data.coverage.queried).toBe(5);
    expect(Array.isArray(data.platforms)).toBe(true);
    const mockRows = data.platforms.filter((p: { isMock?: boolean }) => p.isMock);
    expect(mockRows).toHaveLength(0);
    expect(data.platforms.length).toBeLessThanOrEqual(data.coverage.uniquePlatforms);
  });

  it("calls supplier service and returns supplier matches", async () => {
    await POST(makeReq({ title: "Wireless Earbuds", price: 30 }), null as any);
    expect(getSuppliers).toHaveBeenCalled();
  });

  it("persists suppliers discovered for this product into the directory", async () => {
    vi.mocked(searchSupplierPlatforms).mockResolvedValue({
      sources: [
        {
          platformId: "alibaba",
          platformName: "Alibaba",
          storeName: "Factory X Store",
          storeUrl: "https://www.alibaba.com/store/1.html",
          listingCount: 2,
          listings: [
            { title: "Wireless Earbuds Pro", price: 4.5, currency: "USD", image: null, link: "https://www.alibaba.com/product-detail/1" },
            { title: "Wireless Earbuds Pro", price: 4.5, currency: "USD", image: null, link: "https://www.alibaba.com/product-detail/1" },
          ],
          dataSource: "estimated",
        },
      ],
      errors: [],
      keywords: ["wireless", "earbuds"],
    } as never);

    const res = await POST(makeReq({ title: "Wireless Earbuds", price: 30 }), "test-user-123" as never);
    expect(res.status).toBe(200);

    // Deduped: two listings from one store become a single directory entry.
    expect(upsertDirectorySupplier).toHaveBeenCalledTimes(1);
    const [db, uid, entry] = vi.mocked(upsertDirectorySupplier).mock.calls[0];
    expect(db).toBeTruthy();
    expect(uid).toBe("test-user-123");
    expect(entry).toMatchObject({ supplierId: "alibaba:factory-x-store", source: "discovery" });
  });

  it("still enriches when the directory write fails", async () => {
    vi.mocked(upsertDirectorySupplier).mockRejectedValueOnce(new Error("firestore down"));
    vi.mocked(searchSupplierPlatforms).mockResolvedValue({
      sources: [
        {
          platformId: "alibaba",
          platformName: "Alibaba",
          storeName: "Factory X Store",
          storeUrl: "https://www.alibaba.com/store/1.html",
          listingCount: 1,
          listings: [{ title: "Wireless Earbuds Pro", price: 4.5, currency: "USD", image: null, link: "https://www.alibaba.com/product-detail/1" }],
          dataSource: "estimated",
        },
      ],
      errors: [],
      keywords: [],
    } as never);

    const res = await POST(makeReq({ title: "Wireless Earbuds", price: 30 }), "test-user-123" as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.supplierOffers.length).toBeGreaterThan(0);
  });
});
