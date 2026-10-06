import { describe, it, expect } from "vitest";
import {
  applyOrderFulfilled,
  applyOrderIngested,
  applyPriceDrift,
  applyRefund,
  averageFulfillmentLatencyDays,
  averagePriceDriftPct,
  deriveObservedReliability,
  emptyObservedMetrics,
  orderCompletionRate,
  refundRate,
  toPerformanceSnapshot,
} from "./observed-metrics";

describe("observed supplier metrics", () => {
  it("starts empty and derives nothing without evidence", () => {
    const empty = emptyObservedMetrics("s1", "Supplier 1");
    expect(deriveObservedReliability(empty)).toBe(0);
    expect(averageFulfillmentLatencyDays(empty)).toBeNull();
    expect(refundRate(empty)).toBeNull();
    expect(orderCompletionRate(empty)).toBeNull();
    expect(toPerformanceSnapshot(empty)).toBeNull();
  });

  it("accumulates ingested and fulfilled orders", () => {
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyOrderIngested(m, "s1", "Supplier 1", { at: "2026-01-01T00:00:00Z" });
    m = applyOrderIngested(m, "s1", "Supplier 1", { at: "2026-01-02T00:00:00Z" });
    m = applyOrderFulfilled(m, 6, { at: "2026-01-07T00:00:00Z" });
    m = applyOrderFulfilled(m, 8, { at: "2026-01-10T00:00:00Z" });

    expect(m.ordersIngested).toBe(2);
    expect(m.ordersFulfilled).toBe(2);
    expect(averageFulfillmentLatencyDays(m)).toBe(7);
    expect(orderCompletionRate(m)).toBe(100);
    expect(refundRate(m)).toBe(0);
    expect(m.lastOrderAt).toBe("2026-01-02T00:00:00Z");
    expect(deriveObservedReliability(m)).toBeGreaterThan(0);
  });

  it("ignores negative latency samples", () => {
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyOrderFulfilled(m, -3, { at: "2026-01-07T00:00:00Z" });
    expect(m.ordersFulfilled).toBe(1);
    expect(m.fulfillmentLatencySamples).toBe(0);
    expect(averageFulfillmentLatencyDays(m)).toBeNull();
  });

  it("tracks refunds and lowers reliability", () => {
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyOrderIngested(m, "s1", "Supplier 1");
    m = applyOrderFulfilled(m, 5);
    const before = deriveObservedReliability(m);
    m = applyRefund(m);
    expect(refundRate(m)).toBe(100);
    expect(deriveObservedReliability(m)).toBeLessThan(before);
  });

  it("tracks price drift and averages absolute percentage", () => {
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyPriceDrift(m, 4);
    m = applyPriceDrift(m, 6);
    expect(averagePriceDriftPct(m)).toBe(5);
    expect(applyPriceDrift(m, -1)).toBe(m);
  });

  it("projects a performance snapshot only once orders are fulfilled", () => {
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyOrderIngested(m, "s1", "Supplier 1");
    expect(toPerformanceSnapshot(m, "2026-01-01")).toBeNull();
    m = applyOrderFulfilled(m, 4);
    const snap = toPerformanceSnapshot(m, "2026-01-05");
    expect(snap).toMatchObject({
      supplierId: "s1",
      avgShippingDays: 4,
      snapshotDate: "2026-01-05",
    });
    expect(snap!.reliabilityScore).toBeGreaterThan(0);
  });

  it("never publishes a snapshot when order ingest was never observed", () => {
    // A shipment can arrive without an ingest record (legacy orders, a webhook
    // that only half-succeeded). Projecting that would write reliability 0 and
    // get the supplier excluded by the router's minimum-reliability check.
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyOrderFulfilled(m, 4);
    expect(toPerformanceSnapshot(m, "2026-01-05")).toBeNull();
  });

  it("never publishes a snapshot without a measured shipping latency", () => {
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyOrderIngested(m, "s1", "Supplier 1");
    m = applyOrderFulfilled(m, -3);
    expect(toPerformanceSnapshot(m, "2026-01-05")).toBeNull();
  });

  it("omits metrics nobody collects instead of reporting zero for them", () => {
    let m = emptyObservedMetrics("s1", "Supplier 1");
    m = applyOrderIngested(m, "s1", "Supplier 1");
    m = applyOrderFulfilled(m, 4);
    const snap = toPerformanceSnapshot(m, "2026-01-05");
    expect(snap).not.toHaveProperty("complaintRate");
    expect(snap).not.toHaveProperty("stockReliability");
  });
});
