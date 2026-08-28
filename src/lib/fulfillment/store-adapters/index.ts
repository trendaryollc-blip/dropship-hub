import type { StoreAdapter, StoreConfig } from "./interface";
import { shopifyAdapter } from "./shopify-adapter";
import { woocommerceAdapter } from "./woocommerce-adapter";
import { etsyAdapter } from "./etsy-adapter";
import { trendaryoAdapter } from "./trendaryo-adapter";

const adapters: Record<string, StoreAdapter> = {
  shopify: shopifyAdapter,
  woocommerce: woocommerceAdapter,
  etsy: etsyAdapter,
  trendaryo: trendaryoAdapter,
};

export function getStoreAdapter(platform: string): StoreAdapter | null {
  return adapters[platform] || null;
}

export function getSupportedStorePlatforms(): string[] {
  return Object.keys(adapters);
}

export async function fetchOrdersFromStore(config: StoreConfig, since?: string) {
  const adapter = getStoreAdapter(config.platform);
  if (!adapter) return [];
  return adapter.fetchOrders(config, since);
}

export async function pushTrackingToStore(config: StoreConfig, orderId: string, trackingNumber: string, carrier: string) {
  const adapter = getStoreAdapter(config.platform);
  if (!adapter) return false;
  return adapter.pushTracking(config, orderId, trackingNumber, carrier);
}
