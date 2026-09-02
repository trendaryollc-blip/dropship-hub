import type { FulfillmentOrder } from "@/types/fulfillment";
import { getCJOrderStatus } from "./cj-adapter";

interface TrackingResult {
  orderId: string;
  found: boolean;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  estimatedDelivery: string | null;
}

interface TrackingSyncResult {
  orderId: string;
  synced: boolean;
  error?: string;
}

const pollingOrders: Map<string, { orderId: string; cjOrderNumber: string; retryCount: number; lastChecked: string }> = new Map();

export function registerForTrackingPolling(orderId: string, cjOrderNumber: string): void {
  pollingOrders.set(orderId, {
    orderId,
    cjOrderNumber,
    retryCount: 0,
    lastChecked: new Date().toISOString(),
  });
}

export function unregisterFromTrackingPolling(orderId: string): boolean {
  return pollingOrders.delete(orderId);
}

export function getPollingOrders(): Array<{ orderId: string; cjOrderNumber: string; retryCount: number; lastChecked: string }> {
  return Array.from(pollingOrders.values());
}

export async function pollCJStatus(cjOrderNumber: string): Promise<TrackingResult> {
  try {
    const status = await getCJOrderStatus(cjOrderNumber);
    const hasTracking = status.trackingNumber !== null && status.trackingNumber !== "";

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

  for (const [orderId, order] of pollingOrders.entries()) {
    const result = await pollCJStatus(order.cjOrderNumber);
    result.orderId = orderId;

    order.retryCount++;
    order.lastChecked = new Date().toISOString();
    pollingOrders.set(orderId, order);

    if (result.found && result.trackingNumber) {
      pollingOrders.delete(orderId);
    } else if (order.retryCount >= 10) {
      pollingOrders.delete(orderId);
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
