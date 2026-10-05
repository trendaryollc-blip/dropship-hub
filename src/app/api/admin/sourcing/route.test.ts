import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireOwner: (handler: any) => handler,
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

interface Doc {
  id: string;
  [key: string]: unknown;
}

function buildDb(opts: {
  counts?: Record<string, number | null>;
  docs?: Record<string, Doc[]>;
  throwOn?: string;
}) {
  const counts = opts.counts || {};
  const docs = opts.docs || {};
  return {
    collectionGroup: vi.fn((name: string) => {
      if (opts.throwOn === name) throw new Error("index missing");
      const query = {
        count: () => ({
          get: async () => ({ data: () => ({ count: counts[name] ?? 0 }) }),
        }),
        limit: () => query,
        get: async () => ({
          size: (docs[name] || []).length,
          docs: (docs[name] || []).map((d) => ({ id: d.id, data: () => d })),
        }),
      };
      return query;
    }),
  };
}

async function loadRoute() {
  return import("./route");
}

describe("/api/admin/sourcing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("aggregates the product → supplier → store → order pipeline", async () => {
    const db = buildDb({
      counts: { productCatalog: 12, productSuppliers: 5, pushedProducts: 3, fulfillmentOrders: 2 },
      docs: {
        productSuppliers: [
          { id: "p1", productId: "p1", selectedSupplierName: "CJ Dropshipping", source: "manual", updatedAt: "2026-01-02" },
          { id: "p2", productId: "p2", selectedSupplierName: "AliExpress", source: "auto", updatedAt: "2026-01-01" },
          { id: "S1", productId: "p1", selectedSupplierName: "CJ Dropshipping", source: "manual", aliasedFrom: "p1", storeProductId: "S1", updatedAt: "2026-01-03" },
        ],
        pushedProducts: [
          { id: "pu1", productTitle: "Widget", storeName: "Shop A", supplierName: "CJ Dropshipping", platformProductId: "S1", pushedAt: "2026-01-03" },
          { id: "pu2", productTitle: "Gadget", storeName: "Shop B", supplierName: "AliExpress", platformProductId: "S2", pushedAt: "2026-01-04" },
        ],
        fulfillmentOrders: [
          { id: "o1", items: [{ supplierId: "cj" }] },
          { id: "o2", items: [{ supplierId: "unknown" }] },
          { id: "o3", items: [{}] },
        ],
      },
    });
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(db as any);

    const { GET } = await loadRoute();
    const res = await GET({} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pipeline).toEqual({
      catalogProducts: 12,
      supplierAssignments: 5,
      listingsPushed: 3,
      ordersReceived: 2,
    });
    expect(body.orderRouting).toEqual({ routed: 1, unassigned: 2, sampled: 3 });
    expect(body.estimates.pipeline).toBe(false);

    // Aliased assignment excluded from supplier tallies, listings counted.
    const cj = body.topSuppliers.find((s: any) => s.name === "CJ Dropshipping");
    expect(cj).toEqual({ name: "CJ Dropshipping", assignments: 1, listings: 1 });
  });

  it("degrades honestly when aggregations are unavailable", async () => {
    const db = buildDb({
      counts: {},
      docs: {},
      throwOn: "productCatalog",
    });
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(db as any);

    const { GET } = await loadRoute();
    const res = await GET({} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pipeline.catalogProducts).toBeNull();
    expect(body.estimates.pipeline).toBe(true);
  });

  it("returns 500 when the database is unavailable", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(null as any);
    const { GET } = await loadRoute();
    const res = await GET({} as any);
    expect(res.status).toBe(500);
  });
});
