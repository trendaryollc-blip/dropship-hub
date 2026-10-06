// ── Observed supplier metrics — server persistence ────────────────────────
//
// Thin Firestore glue around the pure counters in ./observed-metrics. Callers
// pass the Admin DB so routes stay testable, and every write is best-effort:
// a metrics failure must never break order processing or a refund.

import {
  applyCancellation,
  applyOrderFulfilled,
  applyOrderIngested,
  applyPriceDrift,
  applyRefund,
  emptyObservedMetrics,
  toPerformanceSnapshot,
  type ObservedSupplierMetrics,
} from "./observed-metrics";
import { sanitizeKey, type AdminDB } from "./keys";

function sanitizeSupplierKey(id: string): string {
  return sanitizeKey(id);
}

interface BaseInput {
  supplierId: string;
  supplierName?: string;
  at?: string | null;
}

async function loadCounters(
  db: AdminDB,
  uid: string,
  supplierId: string
): Promise<{ ref: FirebaseFirestore.DocumentReference; prev: ObservedSupplierMetrics | null }> {
  const ref = db
    .collection("users")
    .doc(uid)
    .collection("supplierObservations")
    .doc(sanitizeSupplierKey(supplierId));
  const snap = await ref.get();
  const prev = snap.exists ? (snap.data() as ObservedSupplierMetrics) : null;
  return { ref, prev };
}

async function commit(db: AdminDB, uid: string, next: ObservedSupplierMetrics): Promise<void> {
  const ref = db
    .collection("users")
    .doc(uid)
    .collection("supplierObservations")
    .doc(sanitizeSupplierKey(next.supplierId));
  await ref.set(next, { merge: true });

  const snapshot = toPerformanceSnapshot(next);
  if (snapshot) {
    // One snapshot row per supplier — the router reads the most recent by
    // createdAt, so overwriting keeps the collection bounded.
    await db
      .collection("users")
      .doc(uid)
      .collection("supplierPerformance")
      .doc(sanitizeSupplierKey(next.supplierId))
      .set({ ...snapshot, createdAt: new Date() }, { merge: true });
  }
}

export async function getObservedMetrics(
  db: AdminDB,
  uid: string,
  supplierId: string
): Promise<ObservedSupplierMetrics | null> {
  const { prev } = await loadCounters(db, uid, supplierId);
  return prev;
}

export async function recordOrderIngested(
  db: AdminDB,
  uid: string,
  input: BaseInput
): Promise<ObservedSupplierMetrics> {
  const { prev } = await loadCounters(db, uid, input.supplierId);
  const next = applyOrderIngested(
    prev,
    input.supplierId,
    input.supplierName ?? prev?.supplierName ?? input.supplierId,
    { at: input.at }
  );
  await commit(db, uid, next);
  return next;
}

export async function recordOrderFulfilled(
  db: AdminDB,
  uid: string,
  input: BaseInput & { latencyDays: number }
): Promise<ObservedSupplierMetrics> {
  const { prev } = await loadCounters(db, uid, input.supplierId);
  const base =
    prev ??
    emptyObservedMetrics(input.supplierId, input.supplierName ?? input.supplierId);
  const next = applyOrderFulfilled(base, input.latencyDays, { at: input.at });
  await commit(db, uid, next);
  return next;
}

export async function recordRefund(
  db: AdminDB,
  uid: string,
  input: BaseInput
): Promise<ObservedSupplierMetrics> {
  const { prev } = await loadCounters(db, uid, input.supplierId);
  const base =
    prev ??
    emptyObservedMetrics(input.supplierId, input.supplierName ?? input.supplierId);
  const next = applyRefund(base, { at: input.at });
  await commit(db, uid, next);
  return next;
}

export async function recordCancellation(
  db: AdminDB,
  uid: string,
  input: BaseInput
): Promise<ObservedSupplierMetrics> {
  const { prev } = await loadCounters(db, uid, input.supplierId);
  const base =
    prev ??
    emptyObservedMetrics(input.supplierId, input.supplierName ?? input.supplierId);
  const next = applyCancellation(base, { at: input.at });
  await commit(db, uid, next);
  return next;
}

export async function recordPriceDrift(
  db: AdminDB,
  uid: string,
  input: BaseInput & { absPct: number }
): Promise<ObservedSupplierMetrics | null> {
  const { prev } = await loadCounters(db, uid, input.supplierId);
  if (!prev) return null;
  const next = applyPriceDrift(prev, input.absPct, { at: input.at });
  if (next === prev) return prev;
  await commit(db, uid, next);
  return next;
}

export interface ShipmentOrderInput {
  status?: string | null;
  createdAt?: string | null;
  items?: Array<{ supplierId?: string; supplierName?: string }>;
}

/**
 * Record fulfillment latency for a shipment transition. Callers must pass the
 * order as it was read BEFORE the status update, so a "shipped" order is never
 * counted twice (poll-status and sync-tracking can both observe it).
 * No-ops when the order was already shipped or its createdAt is unparseable.
 */
export async function recordShipmentObserved(
  db: AdminDB,
  uid: string,
  order: ShipmentOrderInput,
  now: Date = new Date()
): Promise<void> {
  if (order.status === "shipped") return;
  const createdMs = Date.parse(String(order.createdAt ?? ""));
  if (Number.isNaN(createdMs)) return;
  const latencyMs = now.getTime() - createdMs;
  if (latencyMs < 0) return;
  const latencyDays = Math.round((latencyMs / 86_400_000) * 100) / 100;

  for (const item of order.items ?? []) {
    if (!item.supplierId || item.supplierId === "unknown") continue;
    await recordOrderFulfilled(db, uid, {
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      latencyDays,
    });
  }
}
