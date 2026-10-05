import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { STORE_PUSH: { windowMs: 60000, maxRequests: 30 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const pushProductToStore = vi.hoisted(() => vi.fn());
vi.mock("@/lib/store-push", () => ({ pushProductToStore }));

function makeRequest(body: unknown) {
  const req = new Request("http://localhost/api/store/push-with-supplier", {
    method: "POST",
    body: JSON.stringify(body),
  }) as any;
  req.json = async () => body;
  return req;
}

function buildDb(assignment: Record<string, unknown> | null) {
  const writes: { path: string; data: any; opts?: any }[] = [];
  const adds: { path: string; data: any }[] = [];

  const docRef = (path: string) => ({
    get: vi.fn().mockResolvedValue(
      assignment && path.endsWith(`/productSuppliers/app-prod`)
        ? { exists: true, data: () => assignment }
        : { exists: false, data: () => null }
    ),
    set: vi.fn((data: any, opts?: any) => {
      writes.push({ path, data, opts });
      return Promise.resolve();
    }),
  });

  const collectionRef = (path: string) => ({
    doc: vi.fn((id: string) => docRef(`${path}/${id}`)),
    add: vi.fn((data: any) => {
      adds.push({ path, data });
      return Promise.resolve();
    }),
  });

  const userRef = {
    collection: vi.fn((name: string) => collectionRef(`users/test-user-123/${name}`)),
  };

  const db = {
    collection: vi.fn((name: string) => ({
      doc: vi.fn(() => (name === "users" ? userRef : docRef(name))),
    })),
  };

  return { db, writes, adds };
}

let writes: { path: string; data: any; opts?: any }[] = [];

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(async () => mockDb),
}));

let mockDb: any;

describe("/api/store/push-with-supplier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a selected supplier before pushing", async () => {
    const built = buildDb(null);
    mockDb = built.db;

    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ storeId: "s1", productId: "app-prod", title: "Widget", price: 19.99 })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/select a supplier/i);
    expect(pushProductToStore).not.toHaveBeenCalled();
  });

  it("requires a positive price", async () => {
    const built = buildDb({ selectedSupplierId: "cj", selectedSupplierName: "CJ", unitCost: 5 });
    mockDb = built.db;

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ storeId: "s1", productId: "app-prod", title: "Widget", price: 0 }));
    expect(res.status).toBe(400);
  });

  it("aliases the supplier assignment under the store product id after a successful push", async () => {
    const built = buildDb({
      selectedSupplierId: "cj",
      selectedSupplierName: "CJ Dropshipping",
      unitCost: 5.25,
    });
    mockDb = built.db;
    writes = built.writes;
    pushProductToStore.mockResolvedValue({
      success: true,
      platformProductId: "STORE-9001",
      storeId: "s1",
      storeName: "My Shop",
      platform: "shopify",
    });

    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ storeId: "s1", productId: "app-prod", title: "Widget", price: 19.99 })
    );
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(pushProductToStore).toHaveBeenCalledWith(
      "test-user-123",
      "s1",
      expect.objectContaining({ productTitle: "Widget", supplierName: "CJ Dropshipping" })
    );

    const alias = writes.find((w) => w.path.endsWith("/productSuppliers/STORE-9001"));
    expect(alias).toBeDefined();
    expect(alias!.data).toMatchObject({
      selectedSupplierId: "cj",
      storeProductId: "STORE-9001",
      storeId: "s1",
      productId: "app-prod",
    });
    expect(alias!.opts).toEqual({ merge: true });
  });

  it("does not alias when the push fails", async () => {
    const built = buildDb({ selectedSupplierId: "cj", selectedSupplierName: "CJ", unitCost: 5 });
    mockDb = built.db;
    writes = built.writes;
    pushProductToStore.mockResolvedValue({
      success: false,
      error: "store rejected",
      storeId: "s1",
      storeName: "My Shop",
      platform: "shopify",
    });

    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ storeId: "s1", productId: "app-prod", title: "Widget", price: 19.99 })
    );

    expect(res.status).toBe(502);
    expect(writes.some((w) => w.path.includes("productSuppliers"))).toBe(false);
  });
});
