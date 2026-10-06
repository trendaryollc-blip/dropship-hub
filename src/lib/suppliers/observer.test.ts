import { describe, it, expect } from "vitest";
import {
  getObservedMetrics,
  recordOrderIngested,
  recordRefund,
  recordPriceDrift,
  recordShipmentObserved,
} from "./observer";

type DocData = Record<string, unknown>;

interface FakeRef {
  collection(name: string): FakeRef;
  doc(id: string): FakeRef;
  get(): Promise<{ exists: boolean; data: () => DocData | undefined }>;
  set(data: DocData, opts?: unknown): Promise<void>;
}

/** Minimal in-memory stand-in for the Admin SDK collection/doc chain. */
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
      store.set(key(path), { ...(store.get(key(path)) ?? {}), ...data });
    },
  });
  return { db: build([]), store, key };
}

const uid = "user-1";

describe("observed metrics persistence", () => {
  it("increments ingest counters and stamps the last order", async () => {
    const { db } = makeDb();

    const first = await recordOrderIngested(db, uid, {
      supplierId: "sup-1",
      supplierName: "Alpha",
      at: "2026-01-01T00:00:00.000Z",
    });
    const second = await recordOrderIngested(db, uid, {
      supplierId: "sup-1",
      supplierName: "Alpha",
      at: "2026-01-05T00:00:00.000Z",
    });

    expect(first.ordersIngested).toBe(1);
    expect(second.ordersIngested).toBe(2);
    expect(second.lastOrderAt).toBe("2026-01-05T00:00:00.000Z");

    const stored = await getObservedMetrics(db, uid, "sup-1");
    expect(stored?.ordersIngested).toBe(2);
    expect(stored?.supplierName).toBe("Alpha");
  });

  it("does not emit a performance snapshot until an order is fulfilled", async () => {
    const { db, store } = makeDb();

    await recordOrderIngested(db, uid, { supplierId: "sup-1", supplierName: "Alpha" });

    const performanceDoc = store.get(["c", "users", "d", uid, "c", "supplierPerformance", "d", "sup-1"].join("/"));
    expect(performanceDoc).toBeUndefined();
  });

  it("records a shipment with latency and projects the router snapshot", async () => {
    const { db, store } = makeDb();

    await recordOrderIngested(db, uid, { supplierId: "sup-1", supplierName: "Alpha" });
    await recordShipmentObserved(
      db,
      uid,
      {
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        items: [{ supplierId: "sup-1", supplierName: "Alpha" }],
      },
      new Date("2026-01-11T00:00:00.000Z")
    );

    const counters = await getObservedMetrics(db, uid, "sup-1");
    expect(counters?.ordersFulfilled).toBe(1);
    expect(counters?.fulfillmentLatencySamples).toBe(1);
    expect(counters?.fulfillmentLatencyDaysSum).toBeCloseTo(10, 5);

    const snapshot = store.get(
      ["c", "users", "d", uid, "c", "supplierPerformance", "d", "sup-1"].join("/")
    );
    expect(snapshot).toBeDefined();
    expect(snapshot?.supplierId).toBe("sup-1");
    expect(typeof snapshot?.reliabilityScore).toBe("number");
    expect(snapshot?.avgShippingDays).toBeCloseTo(10, 5);
    expect(Number(snapshot?.reliabilityScore)).toBeGreaterThan(0);
  });

  it("never double counts a shipment that is already shipped", async () => {
    const { db, store } = makeDb();

    await recordOrderIngested(db, uid, { supplierId: "sup-1", supplierName: "Alpha" });
    const order = {
      status: "pending",
      createdAt: "2026-01-01T00:00:00.000Z",
      items: [{ supplierId: "sup-1" }],
    };

    await recordShipmentObserved(db, uid, order, new Date("2026-01-11T00:00:00.000Z"));

    const counters = await getObservedMetrics(db, uid, "sup-1");
    expect(counters?.ordersFulfilled).toBe(1);
    expect(counters?.fulfillmentLatencySamples).toBe(1);

    // A second caller reads the order after the first one marked it shipped.
    await recordShipmentObserved(
      db,
      uid,
      { ...order, status: "shipped" },
      new Date("2026-01-13T00:00:00.000Z")
    );
    const after = await getObservedMetrics(db, uid, "sup-1");
    expect(after?.ordersFulfilled).toBe(1);
    expect(store.size).toBeGreaterThan(0);
  });

  it("does not project a router snapshot from a shipment with no ingest history", async () => {
    const { db, store } = makeDb();

    await recordShipmentObserved(
      db,
      uid,
      {
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        items: [{ supplierId: "sup-1", supplierName: "Alpha" }],
      },
      new Date("2026-01-11T00:00:00.000Z")
    );

    // The fulfilment itself is recorded…
    const counters = await getObservedMetrics(db, uid, "sup-1");
    expect(counters?.ordersFulfilled).toBe(1);

    // …but nothing is published to the router: an unmeasured history must not
    // become reliabilityScore 0, which would exclude the supplier from routing.
    expect(
      store.get(["c", "users", "d", uid, "c", "supplierPerformance", "d", "sup-1"].join("/"))
    ).toBeUndefined();
  });

  it("ignores unknown or missing supplier ids and unparseable timestamps", async () => {
    const { db, store } = makeDb();

    await recordShipmentObserved(
      db,
      uid,
      {
        status: "pending",
        createdAt: "not-a-date",
        items: [{ supplierId: "sup-1" }],
      },
      new Date("2026-01-11T00:00:00.000Z")
    );
    await recordShipmentObserved(
      db,
      uid,
      {
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        items: [{ supplierId: "unknown" }, { supplierName: "no id" }],
      },
      new Date("2026-01-11T00:00:00.000Z")
    );

    expect(store.size).toBe(0);
    expect(await getObservedMetrics(db, uid, "sup-1")).toBeNull();
  });

  it("only counts price drift for suppliers with observed history", async () => {
    const { db } = makeDb();

    const unseen = await recordPriceDrift(db, uid, { supplierId: "sup-1", absPct: 4 });
    expect(unseen).toBeNull();
    expect(await getObservedMetrics(db, uid, "sup-1")).toBeNull();

    await recordOrderIngested(db, uid, { supplierId: "sup-1", supplierName: "Alpha" });
    await recordPriceDrift(db, uid, { supplierId: "sup-1", absPct: 4 });
    await recordPriceDrift(db, uid, { supplierId: "sup-1", absPct: 6 });

    const counters = await getObservedMetrics(db, uid, "sup-1");
    expect(counters?.priceDriftSamples).toBe(2);
    expect(counters?.priceDriftAbsPctSum).toBe(10);
  });

  it("counts refunds against the supplier behind the order", async () => {
    const { db } = makeDb();

    await recordOrderIngested(db, uid, { supplierId: "sup-1", supplierName: "Alpha" });
    await recordRefund(db, uid, { supplierId: "sup-1", supplierName: "Alpha" });

    const counters = await getObservedMetrics(db, uid, "sup-1");
    expect(counters?.refunds).toBe(1);
    expect(counters?.ordersIngested).toBe(1);
  });
});
