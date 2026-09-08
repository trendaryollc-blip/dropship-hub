import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "dropship-hub",
  name: "DropShip Hub",
});

export interface PriceCheckEventData {
  uid: string;
  productId?: string;
}

export interface InventorySyncEventData {
  uid: string;
  storeId?: string;
}

export interface OrderProcessingEventData {
  uid: string;
  orderId: string;
}

export interface DigestEmailEventData {
  uid: string;
  frequency: "daily" | "weekly";
}

export interface WebhookProcessEventData {
  uid: string;
  webhookId: string;
  source: string;
  payload: Record<string, unknown>;
}
