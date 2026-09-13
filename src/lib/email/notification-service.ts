import { getAdminDB } from "@/lib/firebase-admin";
import {
  smartSendEmail,
  renderOrderShippedEmail,
  renderOrderDeliveredEmail,
  renderTrackingUpdateEmail,
  renderReturnStatusEmail,
  renderOrderConfirmedEmail,
} from "./smart-sender";
import { logAuditEvent } from "@/lib/fulfillment/audit-logger";

export type NotificationType =
  | "order_confirmed"
  | "order_shipped"
  | "tracking_update"
  | "order_delivered"
  | "return_requested"
  | "return_approved"
  | "return_denied"
  | "refund_processed";

interface NotificationPreferences {
  emailOnNewOrder: boolean;
  emailOnShipment: boolean;
  emailOnDelivery: boolean;
}

async function getNotificationPrefs(uid: string): Promise<NotificationPreferences> {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection("fulfillmentSettings").doc("config").get();
    if (doc.exists) {
      const data = doc.data()!;
      return {
        emailOnNewOrder: data.emailOnNewOrder ?? true,
        emailOnShipment: data.emailOnShipment ?? true,
        emailOnDelivery: data.emailOnDelivery ?? false,
      };
    }
  } catch {
    // Fall through to defaults
  }
  return { emailOnNewOrder: true, emailOnShipment: true, emailOnDelivery: false };
}

function getTrackingUrl(orderNumber: string, trackingNumber: string, carrier: string): string {
  const carrierUrls: Record<string, string> = {
    "cainiao": `https://track.cainiao.com/?mailNoList=${trackingNumber}`,
    "yanwen": `https://track.yanwen.com/?tracking=${trackingNumber}`,
    "yanwen economic": `https://track.yanwen.com/?tracking=${trackingNumber}`,
    "4px": `https://www.4px.com/track/#nums=${trackingNumber}`,
    "sunyou": `https://www.sunyou.com/track?tracking=${trackingNumber}`,
    "jitsu": `https://www.jitsu.com/track/${trackingNumber}`,
    "dhl": `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    "fedex": `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    "usps": `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    "ups": `https://www.ups.com/track?tracknum=${trackingNumber}`,
    "china post": `https://track-chinapost.com/?tracking=${trackingNumber}`,
    "epacket": `https://track-chinapost.com/?tracking=${trackingNumber}`,
  };

  const key = carrier.toLowerCase();
  if (carrierUrls[key]) return carrierUrls[key];
  return `https://trackingshipment.com/${carrier}/${trackingNumber}`;
}

export async function sendOrderNotification(
  uid: string,
  orderId: string,
  type: NotificationType,
  data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    total?: number;
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    status?: string;
    location?: string;
    returnId?: string;
    refundAmount?: number;
    denyReason?: string;
  }
): Promise<{ sent: boolean; provider?: string; error?: string }> {
  const prefs = await getNotificationPrefs(uid);

  const shouldSend =
    (type === "order_confirmed" && prefs.emailOnNewOrder) ||
    (type === "order_shipped" && prefs.emailOnShipment) ||
    (type === "tracking_update" && prefs.emailOnShipment) ||
    (type === "order_delivered" && prefs.emailOnDelivery) ||
    type.startsWith("return") ||
    type === "refund_processed";

  if (!shouldSend) {
    return { sent: false, error: "Notification disabled in preferences" };
  }

  if (!data.customerEmail) {
    return { sent: false, error: "No customer email" };
  }

  let html = "";
  const subject = (() => {
    switch (type) {
      case "order_confirmed":
        html = renderOrderConfirmedEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          items: data.items || [],
          total: data.total || 0,
        });
        return `Order Confirmed — ${data.orderNumber}`;
      case "order_shipped":
        html = renderOrderShippedEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          trackingNumber: data.trackingNumber || "",
          carrier: data.carrier || "Unknown",
          estimatedDelivery: data.estimatedDelivery,
          items: data.items || [],
          trackingUrl: getTrackingUrl(data.orderNumber, data.trackingNumber || "", data.carrier || ""),
        });
        return `Your Order Has Shipped — ${data.orderNumber}`;
      case "tracking_update":
        html = renderTrackingUpdateEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          status: data.status || "Update",
          trackingNumber: data.trackingNumber || "",
          carrier: data.carrier || "Unknown",
          location: data.location,
          trackingUrl: getTrackingUrl(data.orderNumber, data.trackingNumber || "", data.carrier || ""),
        });
        return `Tracking Update — ${data.orderNumber}`;
      case "order_delivered":
        html = renderOrderDeliveredEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          items: data.items || [],
        });
        return `Your Order Has Arrived — ${data.orderNumber}`;
      case "return_requested":
        html = renderReturnStatusEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          status: "requested",
          returnId: data.returnId || "",
        });
        return `Return Request Received — ${data.orderNumber}`;
      case "return_approved":
        html = renderReturnStatusEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          status: "approved",
          returnId: data.returnId || "",
        });
        return `Return Approved — ${data.orderNumber}`;
      case "return_denied":
        html = renderReturnStatusEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          status: "denied",
          returnId: data.returnId || "",
          denyReason: data.denyReason,
        });
        return `Return Request Update — ${data.orderNumber}`;
      case "refund_processed":
        html = renderReturnStatusEmail({
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          status: "refund_processed",
          returnId: data.returnId || "",
          refundAmount: data.refundAmount,
        });
        return `Refund Processed — ${data.orderNumber}`;
    }
  })();

  if (!html) return { sent: false, error: "Unknown notification type" };

  const result = await smartSendEmail({
    to: data.customerEmail,
    subject,
    html,
    tags: [{ name: "type", value: type }, { name: "orderId", value: orderId }],
  });

  logAuditEvent(uid, {
    orderId,
    action: "tracking_synced",
    details: `Email notification sent: ${type} via ${result.provider}`,
    metadata: { notificationType: type, provider: result.provider, success: result.success },
  });

  return { sent: result.success, provider: result.provider, error: result.error };
}
