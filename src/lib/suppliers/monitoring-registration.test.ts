import { describe, it, expect } from "vitest";
import { registerSupplierProductMonitoring } from "./monitoring-registration";

type DocData = Record<string, unknown>;

interface FakeRef {
  collection(name: string): FakeRef;
  doc(id: string): FakeRef;
  get(): Promise<{ exists: boolean; data: () => DocData | undefined }>;
  set(data: DocData, opts?: unknown): Promise<void>;
}

function makeDb() {
  const store = new Map<string, DocData>();
  const key = (path: (string | number)[]) => path.join("/");
  const build = (path: (string | number)[]): FakeRef => ({
    collection: (name: string) => build([...path, "c", name]),
    doc: (id: string) => build([...path, "d", id]),
    get: async () => ({
      exists: store.has(key(path)),
      data: () => store.get(key(path)),
    }),
    set: async (data: DocData, _opts?: unknown) => {
      const existing = store.get(key(path)) ?? {};
      const next: DocData = { ...existing };
      for (const [field, value] of Object.entries(data)) {
        if (value === undefined) delete next[field];
        else next[field] = value;
      }
      store.set(key(path), next);
    },
  });
  return { db: build([]), store, key };
}

const uid = "user-1";
const docKey = ["c", "users", "d", uid, "c", "monitoredProducts", "d", "prod-1"].join("/");

describe("registerSupplierProductMonitoring", () => {
  it("creates a monitored product that keeps the supplier attribution", async () => {
    const { db, store } = makeDb();

    const created = await registerSupplierProductMonitoring(db, uid, {
      productId: "prod-1",
      productTitle: "Robot Toy",
      sourceUrl: "https://www.alibaba.com/product-detail/robot_1.html",
      currentPrice: 12.99,
      supplierId: "sup-1",
      supplierName: "Factory X",
    });

    expect(created).toBe(true);
    const doc = store.get(docKey);
    expect(doc?.sourceUrl).toBe("https://www.alibaba.com/product-detail/robot_1.html");
    expect(doc?.supplierId).toBe("sup-1");
    expect(doc?.supplierName).toBe("Factory X");
    expect(doc?.currentPrice).toBe(12.99);
    expect(doc?.stockStatus).toBe("unknown");
  });

  it("merges instead of duplicating on re-push, preserving supplier data", async () => {
    const { db, store } = makeDb();

    await registerSupplierProductMonitoring(db, uid, {
      productId: "prod-1",
      productTitle: "Robot Toy",
      sourceUrl: "https://www.alibaba.com/product-detail/robot_1.html",
      currentPrice: 12.99,
      supplierId: "sup-1",
      supplierName: "Factory X",
    });
    const again = await registerSupplierProductMonitoring(db, uid, {
      productId: "prod-1",
      productTitle: "Robot Toy v2",
      sourceUrl: "https://www.alibaba.com/product-detail/robot_1.html",
      currentPrice: 11.5,
      supplierId: "sup-1",
      supplierName: "Factory X",
    });

    expect(again).toBe(false);
    expect(store.size).toBe(1);
    const doc = store.get(docKey);
    expect(doc?.productTitle).toBe("Robot Toy v2");
    expect(doc?.currentPrice).toBe(11.5);
    expect(doc?.supplierId).toBe("sup-1");
  });

  it("skips suppliers that have no id and refuses empty inputs", async () => {
    const { db, store } = makeDb();

    const noSupplier = await registerSupplierProductMonitoring(db, uid, {
      productId: "prod-1",
      productTitle: "Robot Toy",
      sourceUrl: "https://www.alibaba.com/product-detail/robot_1.html",
      currentPrice: 12.99,
    });
    expect(noSupplier).toBe(true);
    expect(store.get(docKey)?.supplierId).toBeUndefined();

    const noUrl = await registerSupplierProductMonitoring(db, uid, {
      productId: "prod-2",
      productTitle: "Nothing",
      sourceUrl: "",
      currentPrice: 5,
    });
    expect(noUrl).toBe(false);
    expect(store.size).toBe(1);
  });
});
