import type { SupplierAdapter, SupplierOrderInput, SupplierStockInfo, SupplierTrackingInfo } from "./interface";
import { placeCJOrder, getCJOrderStatus } from "@/lib/fulfillment/cj-adapter";

const PLATFORM_STORE_URLS: Record<string, string> = {
  aliexpress: "https://www.aliexpress.com",
  alibaba: "https://www.alibaba.com",
  dhgate: "https://www.dhgate.com",
  global_sources: "https://www.globalsources.com",
};

function manualAdapter(platformId: string, platformName: string): SupplierAdapter {
  const storeUrl = PLATFORM_STORE_URLS[platformId] || "https://www.google.com";
  return {
    platformId,
    canAutoOrder: false,
    async placeOrder(input: SupplierOrderInput) {
      return {
        success: true,
        queuedForManual: true,
        deepLink: `${storeUrl}/wholesale/search?SearchText=${encodeURIComponent(input.productId)}`,
        instructions: `Place order manually on ${platformName} (qty ${input.quantity}), then paste the tracking number back here.`,
      };
    },
    async getOrderStatus(): Promise<SupplierTrackingInfo> {
      // No tracking API — status only becomes known when the user pastes it.
      return { status: "manual", trackingNumber: null, carrier: null };
    },
    async checkInventory(): Promise<SupplierStockInfo> {
      // No inventory API — report unknown so the UI shows Unknown, never fake stock.
      return { inStock: null, stockLevel: null };
    },
  };
}

const cjAdapter: SupplierAdapter = {
  platformId: "cj",
  canAutoOrder: true,
  async placeOrder(input: SupplierOrderInput) {
    const result = await placeCJOrder(input);
    return {
      success: result.success,
      platformOrderId: result.orderId,
      estimatedDelivery: result.estimatedDelivery,
      error: result.error,
    };
  },
  async getOrderStatus(ref: string): Promise<SupplierTrackingInfo> {
    const s = await getCJOrderStatus(ref);
    return { status: s.status, trackingNumber: s.trackingNumber, carrier: s.carrier };
  },
  async checkInventory(): Promise<SupplierStockInfo> {
    // CJ stock is read via inventory-sync fetchCJInventory by callers that
    // need product-scoped levels; the registry reports unknown here.
    return { inStock: null, stockLevel: null };
  },
};

const adapters: Record<string, SupplierAdapter> = {
  cj: cjAdapter,
  aliexpress: manualAdapter("aliexpress", "AliExpress"),
  alibaba: manualAdapter("alibaba", "Alibaba"),
  dhgate: manualAdapter("dhgate", "DHgate"),
  global_sources: manualAdapter("global_sources", "Global Sources"),
};

export function getSupplierAdapter(platformId: string): SupplierAdapter {
  return adapters[platformId] || manualAdapter(platformId, platformId);
}

export function getSupportedSupplierPlatforms(): string[] {
  return Object.keys(adapters);
}
