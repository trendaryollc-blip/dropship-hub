import type { FulfillmentOrder } from "@/types/fulfillment";
import { getCJOrderStatus } from "./cj-adapter";
import { getAdminDB } from "@/lib/firebase-admin";

interface TrackingResult {
  orderId: string;
  found: boolean;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  estimatedDelivery: string | null;
}

interface _TrackingSyncResult {
  orderId: string;
  synced: boolean;
  error?: string;
}

const COLLECTION = "pollingOrders";

async function getCollection() {
  const db = await getAdminDB();
  return db.collection("system").doc("fulfillment").collection(COLLECTION);
}

interface PollingOrder {
  orderId: string;
  cjOrderNumber: string;
  retryCount: number;
  lastChecked: string;
}

export async function registerForTrackingPolling(orderId: string, cjOrderNumber: string): Promise<void> {
  try {
    const col = await getCollection();
    await col.doc(orderId).set({
      orderId,
      cjOrderNumber,
      retryCount: 0,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[auto-tracker] Failed to register:", error);
  }
}

export async function unregisterFromTrackingPolling(orderId: string): Promise<boolean> {
  try {
    const col = await getCollection();
    await col.doc(orderId).delete();
    return true;
  } catch (error) {
    console.error("[auto-tracker] Failed to unregister:", error);
    return false;
  }
}

export async function getPollingOrders(): Promise<PollingOrder[]> {
  try {
    const col = await getCollection();
    const snap = await col.get();
    return snap.docs.map((d) => d.data() as PollingOrder);
  } catch (error) {
    console.error("[auto-tracker] Failed to get polling orders:", error);
    return [];
  }
}

export async function pollCJStatus(cjOrderNumber: string): Promise<TrackingResult> {
  try {
    const status = await getCJOrderStatus(cjOrderNumber);

    return {
      orderId: "",
      found: true,
      trackingNumber: status.trackingNumber,
      carrier: status.carrier,
      status: status.status,
      estimatedDelivery: null,
    };
  } catch {
    return {
      orderId: "",
      found: false,
      trackingNumber: null,
      carrier: null,
      status: "unknown",
      estimatedDelivery: null,
    };
  }
}

export async function pollAllTrackedOrders(): Promise<TrackingResult[]> {
  const results: TrackingResult[] = [];
  const pollingOrders = await getPollingOrders();

  for (const order of pollingOrders) {
    const result = await pollCJStatus(order.cjOrderNumber);
    result.orderId = order.orderId;

    order.retryCount++;
    order.lastChecked = new Date().toISOString();

    try {
      const col = await getCollection();

      if (result.found && result.trackingNumber) {
        await col.doc(order.orderId).delete();
      } else if (order.retryCount >= 10) {
        await col.doc(order.orderId).delete();
      } else {
        await col.doc(order.orderId).set(order);
      }
    } catch (error) {
      console.error("[auto-tracker] Failed to update polling order:", error);
    }

    results.push(result);
  }

  return results;
}

export function detectTrackingFromStatus(order: FulfillmentOrder): {
  needsSync: boolean;
  trackingNumber: string | null;
  carrier: string | null;
} {
  const platformOrders = order.platformOrders || [];
  const shippedOrders = platformOrders.filter(
    (po) => po.status === "shipped" && po.trackingNumber
  );

  if (shippedOrders.length > 0) {
    const latest = shippedOrders[shippedOrders.length - 1];
    const alreadySynced = platformOrders.some(
      (po) => po.trackingNumber === latest.trackingNumber && po.platform === order.storePlatform
    );

    return {
      needsSync: !alreadySynced,
      trackingNumber: latest.trackingNumber,
      carrier: latest.carrier,
    };
  }

  return { needsSync: false, trackingNumber: null, carrier: null };
}

export function shouldContinuePolling(retryCount: number, lastChecked: string): boolean {
  if (retryCount >= 10) return false;

  const lastCheck = new Date(lastChecked).getTime();
  const elapsed = Date.now() - lastCheck;
  const minInterval = 30 * 60 * 1000;
  return retryCount === 0 || elapsed >= minInterval;
}
