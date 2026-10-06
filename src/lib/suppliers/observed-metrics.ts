// ── Observed supplier metrics (pure) ──────────────────────────────────────
//
// Discovery tells you a store exists; only *observed* order outcomes tell you
// whether it is any good. This module accumulates order ingest / fulfilment /
// refund / price-drift events into a compact counter document, and derives the
// measured reliability the router and UI can trust. Every derived getter
// returns null (or 0 reliability) until there is real evidence — never a guess.

export interface ObservedSupplierMetrics {
  supplierId: string;
  supplierName: string;
  ordersIngested: number;
  ordersFulfilled: number;
  fulfillmentLatencyDaysSum: number;
  fulfillmentLatencySamples: number;
  refunds: number;
  cancellations: number;
  priceDriftAbsPctSum: number;
  priceDriftSamples: number;
  lastOrderAt: string | null;
  updatedAt: string | null;
}

export interface ObservedEvent {
  at?: string | null;
}

function stamp(event: ObservedEvent): string {
  return event.at ?? new Date().toISOString();
}

export function emptyObservedMetrics(
  supplierId: string,
  supplierName: string
): ObservedSupplierMetrics {
  return {
    supplierId,
    supplierName,
    ordersIngested: 0,
    ordersFulfilled: 0,
    fulfillmentLatencyDaysSum: 0,
    fulfillmentLatencySamples: 0,
    refunds: 0,
    cancellations: 0,
    priceDriftAbsPctSum: 0,
    priceDriftSamples: 0,
    lastOrderAt: null,
    updatedAt: null,
  };
}

export function applyOrderIngested(
  prev: ObservedSupplierMetrics | null,
  supplierId: string,
  supplierName: string,
  event: ObservedEvent = {}
): ObservedSupplierMetrics {
  const base = prev ?? emptyObservedMetrics(supplierId, supplierName);
  const at = stamp(event);
  return {
    ...base,
    supplierId,
    supplierName,
    ordersIngested: base.ordersIngested + 1,
    lastOrderAt: at,
    updatedAt: at,
  };
}

export function applyOrderFulfilled(
  prev: ObservedSupplierMetrics,
  latencyDays: number,
  event: ObservedEvent = {}
): ObservedSupplierMetrics {
  const at = stamp(event);
  const safeLatency = Number.isFinite(latencyDays) && latencyDays >= 0 ? latencyDays : null;
  return {
    ...prev,
    ordersFulfilled: prev.ordersFulfilled + 1,
    fulfillmentLatencyDaysSum:
      safeLatency === null ? prev.fulfillmentLatencyDaysSum : prev.fulfillmentLatencyDaysSum + safeLatency,
    fulfillmentLatencySamples:
      safeLatency === null ? prev.fulfillmentLatencySamples : prev.fulfillmentLatencySamples + 1,
    updatedAt: at,
  };
}

export function applyRefund(
  prev: ObservedSupplierMetrics,
  event: ObservedEvent = {}
): ObservedSupplierMetrics {
  return { ...prev, refunds: prev.refunds + 1, updatedAt: stamp(event) };
}

export function applyCancellation(
  prev: ObservedSupplierMetrics,
  event: ObservedEvent = {}
): ObservedSupplierMetrics {
  return { ...prev, cancellations: prev.cancellations + 1, updatedAt: stamp(event) };
}

export function applyPriceDrift(
  prev: ObservedSupplierMetrics,
  absPct: number,
  event: ObservedEvent = {}
): ObservedSupplierMetrics {
  if (!Number.isFinite(absPct) || absPct < 0) return prev;
  return {
    ...prev,
    priceDriftAbsPctSum: prev.priceDriftAbsPctSum + absPct,
    priceDriftSamples: prev.priceDriftSamples + 1,
    updatedAt: stamp(event),
  };
}

export function averageFulfillmentLatencyDays(
  metrics: ObservedSupplierMetrics
): number | null {
  if (metrics.fulfillmentLatencySamples <= 0) return null;
  return (
    Math.round((metrics.fulfillmentLatencyDaysSum / metrics.fulfillmentLatencySamples) * 10) / 10
  );
}

export function refundRate(metrics: ObservedSupplierMetrics): number | null {
  if (metrics.ordersIngested <= 0) return null;
  return Math.round((metrics.refunds / metrics.ordersIngested) * 1000) / 10;
}

export function orderCompletionRate(metrics: ObservedSupplierMetrics): number | null {
  if (metrics.ordersIngested <= 0) return null;
  const rate = Math.min(1, metrics.ordersFulfilled / metrics.ordersIngested);
  return Math.round(rate * 1000) / 10;
}

export function averagePriceDriftPct(metrics: ObservedSupplierMetrics): number | null {
  if (metrics.priceDriftSamples <= 0) return null;
  return Math.round((metrics.priceDriftAbsPctSum / metrics.priceDriftSamples) * 10) / 10;
}

/**
 * Measured reliability in [0,100]. Returns 0 until at least one order has
 * actually been fulfilled — an incomplete order history is not evidence.
 */
export function deriveObservedReliability(metrics: ObservedSupplierMetrics): number {
  if (metrics.ordersIngested <= 0 || metrics.ordersFulfilled <= 0) return 0;

  const completion = Math.min(1, metrics.ordersFulfilled / metrics.ordersIngested);
  const refundScore = Math.max(0, 1 - metrics.refunds / metrics.ordersIngested);
  const avgLatency = averageFulfillmentLatencyDays(metrics);
  const speedScore = avgLatency === null ? 0.5 : Math.max(0, Math.min(1, 1 - avgLatency / 30));

  const score = 100 * (0.6 * completion + 0.25 * refundScore + 0.15 * speedScore);
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** A performance snapshot row for users/{uid}/supplierPerformance. */
export interface ObservedPerformanceSnapshot {
  supplierId: string;
  supplierName: string;
  reliabilityScore: number;
  refundRate: number;
  avgShippingDays: number;
  snapshotDate: string;
}

/**
 * Project counters into the supplierPerformance row the router already reads.
 *
 * Every number written here must have been measured. The router treats a low
 * reliabilityScore as evidence and excludes the supplier from auto-routing, so
 * publishing an unmeasured 0 would silently drop a healthy supplier — no row is
 * strictly better than a wrong one. Metrics nobody collects (complaint rate,
 * stock reliability) are therefore omitted entirely, never zero-filled.
 */
export function toPerformanceSnapshot(
  metrics: ObservedSupplierMetrics,
  snapshotDate = new Date().toISOString().split("T")[0]
): ObservedPerformanceSnapshot | null {
  if (metrics.ordersIngested <= 0 || metrics.ordersFulfilled <= 0) return null;
  const avgLatency = averageFulfillmentLatencyDays(metrics);
  const rate = refundRate(metrics);
  if (avgLatency === null || rate === null) return null;
  return {
    supplierId: metrics.supplierId,
    supplierName: metrics.supplierName,
    reliabilityScore: deriveObservedReliability(metrics),
    refundRate: rate,
    avgShippingDays: avgLatency,
    snapshotDate,
  };
}
