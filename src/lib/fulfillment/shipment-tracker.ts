import { getCJAccessToken } from "@/lib/cj-auth";

const CJ_API_URL = "https://developers.cjdropshipping.com/api2.0/v1";

export interface TrackingEvent {
  timestamp: string;
  status: string;
  location: string;
  description: string;
  carrier: string;
}

export interface ShipmentStatus {
  orderId: string;
  cjOrderNumber: string;
  status: "pending" | "processing" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "exception" | "returned";
  trackingNumber: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  events: TrackingEvent[];
  lastUpdated: string;
}

export interface TrackingSyncToStore {
  storeId: string;
  storePlatform: string;
  platformOrderId: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string | null;
  synced: boolean;
  error?: string;
}

export interface BulkTrackingUpdate {
  orderId: string;
  status: ShipmentStatus;
  syncResult?: TrackingSyncToStore;
}

const STATUS_MAP: Record<string, ShipmentStatus["status"]> = {
  pending: "pending",
  confirmed: "processing",
  processing: "processing",
  shipped: "shipped",
  in_transit: "in_transit",
  transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  exception: "exception",
  returned: "returned",
  cancel: "returned",
};

export async function getShipmentStatus(cjOrderNumber: string): Promise<ShipmentStatus> {
  const defaultStatus: ShipmentStatus = {
    orderId: "",
    cjOrderNumber,
    status: "pending",
    trackingNumber: null,
    carrier: null,
    estimatedDelivery: null,
    actualDelivery: null,
    events: [],
    lastUpdated: new Date().toISOString(),
  };

  try {
    const token = await getCJAccessToken();
    const res = await fetch(`${CJ_API_URL}/order/trace?orderNumber=${cjOrderNumber}`, {
      headers: { "CJ-Access-Token": token },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();

    if (!data.result || !data.data) {
      return defaultStatus;
    }

    const order = data.data;
    const rawStatus = (order.status || "pending").toLowerCase();
    const mappedStatus = STATUS_MAP[rawStatus] || "pending";

    const events: TrackingEvent[] = [];
    if (order.trackingHistory && Array.isArray(order.trackingHistory)) {
      for (const event of order.trackingHistory) {
        events.push({
          timestamp: event.time || "",
          status: event.status || "",
          location: event.location || "",
          description: event.description || "",
          carrier: event.logisticsName || order.logisticsName || "",
        });
      }
    }

    return {
      orderId: order.orderNumber || cjOrderNumber,
      cjOrderNumber,
      status: mappedStatus,
      trackingNumber: order.trackingNumber || null,
      carrier: order.logisticsName || null,
      estimatedDelivery: order.estimatedDelivery || null,
      actualDelivery: mappedStatus === "delivered" ? (order.deliveredAt || new Date().toISOString()) : null,
      events,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to get shipment status for ${cjOrderNumber}:`, error);
    return defaultStatus;
  }
}

export async function syncTrackingToStore(
  storeId: string,
  storePlatform: string,
  platformOrderId: string,
  trackingNumber: string,
  carrier: string,
  estimatedDelivery: string | null
): Promise<TrackingSyncToStore> {
  const result: TrackingSyncToStore = {
    storeId,
    storePlatform,
    platformOrderId,
    trackingNumber,
    carrier,
    estimatedDelivery,
    synced: false,
  };

  try {
    switch (storePlatform.toLowerCase()) {
      case "shopify":
        await updateShopifyTracking(storeId, platformOrderId, trackingNumber, carrier, estimatedDelivery);
        result.synced = true;
        break;
      case "woocommerce":
        await updateWooCommerceTracking(storeId, platformOrderId, trackingNumber, carrier);
        result.synced = true;
        break;
      case "ebay":
        result.synced = false;
        result.error = "eBay tracking sync requires manual update";
        break;
      default:
        result.synced = false;
        result.error = `Platform ${storePlatform} not supported for tracking sync`;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Tracking sync failed";
  }

  return result;
}

async function updateShopifyTracking(
  storeId: string,
  orderId: string,
  trackingNumber: string,
  carrier: string,
  estimatedDelivery: string | null
): Promise<void> {
  const storeSettings = await getStoreSettings(storeId);
  if (!storeSettings?.accessToken || !storeSettings?.storeDomain) {
    throw new Error("Shopify store not configured");
  }

  const fulfillmentRes = await fetch(`https://${storeSettings.storeDomain}/admin/api/2024-01/orders/${orderId}/fulfillments.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": storeSettings.accessToken,
    },
    body: JSON.stringify({
      fulfillment: {
        tracking_number: trackingNumber,
        tracking_company: carrier,
        tracking_url: `https://trackingshipment.com/${carrier}/${trackingNumber}`,
        notify_customer: true,
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!fulfillmentRes.ok) {
    throw new Error(`Shopify fulfillment API error: ${fulfillmentRes.status}`);
  }
}

async function updateWooCommerceTracking(
  storeId: string,
  orderId: string,
  trackingNumber: string,
  carrier: string
): Promise<void> {
  const storeSettings = await getStoreSettings(storeId);
  if (!storeSettings?.apiUrl || !storeSettings?.consumerKey || !storeSettings?.consumerSecret) {
    throw new Error("WooCommerce store not configured");
  }

  const res = await fetch(`${storeSettings.apiUrl}/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${storeSettings.consumerKey}:${storeSettings.consumerSecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      meta_data: [
        { key: "_tracking_number", value: trackingNumber },
        { key: "_tracking_provider", value: carrier },
      ],
      status: "completed",
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`WooCommerce API error: ${res.status}`);
  }
}

async function getStoreSettings(storeId: string): Promise<Record<string, string> | null> {
  return null;
}

export async function pollAllShipments(
  orders: Array<{ orderId: string; cjOrderNumber: string; storeId?: string; storePlatform?: string; platformOrderId?: string }>
): Promise<BulkTrackingUpdate[]> {
  const updates: BulkTrackingUpdate[] = [];

  for (const order of orders) {
    const status = await getShipmentStatus(order.cjOrderNumber);
    status.orderId = order.orderId;

    const update: BulkTrackingUpdate = { orderId: order.orderId, status };

    if (order.storeId && order.storePlatform && order.platformOrderId && status.trackingNumber && status.status === "shipped") {
      update.syncResult = await syncTrackingToStore(
        order.storeId,
        order.storePlatform,
        order.platformOrderId,
        status.trackingNumber,
        status.carrier || "Unknown",
        status.estimatedDelivery
      );
    }

    updates.push(update);
  }

  return updates;
}

export function shouldUpdateTracking(status: ShipmentStatus, lastSyncedTracking: string | null): boolean {
  if (!status.trackingNumber) return false;
  if (status.trackingNumber !== lastSyncedTracking) return true;
  if (status.status === "exception" || status.status === "returned") return true;
  return false;
}

export function getTrackingStatusColor(status: ShipmentStatus["status"]): string {
  const colors: Record<ShipmentStatus["status"], string> = {
    pending: "#6b7280",
    processing: "#3b82f6",
    shipped: "#8b5cf6",
    in_transit: "#f59e0b",
    out_for_delivery: "#10b981",
    delivered: "#22c55e",
    exception: "#ef4444",
    returned: "#6b7280",
  };
  return colors[status] || "#6b7280";
}

export function getTrackingStatusText(status: ShipmentStatus["status"]): string {
  const texts: Record<ShipmentStatus["status"], string> = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    in_transit: "In Transit",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    exception: "Exception",
    returned: "Returned",
  };
  return texts[status] || "Unknown";
}
