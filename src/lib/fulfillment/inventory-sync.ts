import { getCJAccessToken } from "@/lib/cj-auth";

const CJ_API_URL = "https://developers.cjdropshipping.com/api2.0/v1";

export interface CJInventoryItem {
  productId: string;
  productName: string;
  sku: string;
  stockLevel: number;
  inStock: boolean;
  lastUpdated: string;
  warehouseLocation?: string;
  unitCost?: number;
}

export interface InventorySyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  timestamp: string;
}

export interface InventoryChange {
  productId: string;
  productName: string;
  previousStock: number;
  currentStock: number;
  changeType: "increase" | "decrease" | "out_of_stock" | "back_in_stock";
  timestamp: string;
}

export interface StoreInventoryUpdate {
  storeId: string;
  storePlatform: string;
  productId: string;
  platformProductId: string;
  stockLevel: number;
  synced: boolean;
  error?: string;
}

export async function fetchCJInventory(productIds?: string[]): Promise<CJInventoryItem[]> {
  try {
    const token = await getCJAccessToken();
    const items: CJInventoryItem[] = [];

    if (productIds && productIds.length > 0) {
      for (const productId of productIds) {
        try {
          const res = await fetch(`${CJ_API_URL}/product/stock?productId=${productId}`, {
            headers: { "CJ-Access-Token": token },
            signal: AbortSignal.timeout(10000),
          });
          const data = await res.json();
          if (data.result && data.data) {
            items.push({
              productId,
              productName: data.data.productName || "",
              sku: data.data.sku || "",
              stockLevel: data.data.stock || 0,
              inStock: (data.data.stock || 0) > 0,
              lastUpdated: new Date().toISOString(),
              warehouseLocation: data.data.warehouseLocation,
              unitCost: data.data.unitCost,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch inventory for product ${productId}:`, err);
        }
      }
    } else {
      const res = await fetch(`${CJ_API_URL}/product/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CJ-Access-Token": token,
        },
        body: JSON.stringify({ pageNum: 1, pageSize: 100 }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.result && data.data?.list) {
        for (const product of data.data.list) {
          items.push({
            productId: product.pid || "",
            productName: product.productNameEn || "",
            sku: product.sku || "",
            stockLevel: product.stock || 0,
            inStock: (product.stock || 0) > 0,
            lastUpdated: new Date().toISOString(),
            unitCost: product.sellPrice,
          });
        }
      }
    }

    return items;
  } catch (error) {
    console.error("Failed to fetch CJ inventory:", error);
    return [];
  }
}

export async function syncInventoryForStore(
  storeId: string,
  storePlatform: string,
  productMappings: Array<{ internalProductId: string; platformProductId: string; cjProductId: string }>
): Promise<InventorySyncResult> {
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;

  try {
    const cjProductIds = productMappings.map((m) => m.cjProductId);
    const inventoryItems = await fetchCJInventory(cjProductIds);
    const inventoryMap = new Map(inventoryItems.map((item) => [item.productId, item]));

    for (const mapping of productMappings) {
      try {
        const cjInventory = inventoryMap.get(mapping.cjProductId);
        if (!cjInventory) {
          errors.push(`Product ${mapping.cjProductId} not found in CJ inventory`);
          failed++;
          continue;
        }

        const updateResult = await updateStoreInventory(storeId, storePlatform, mapping.platformProductId, cjInventory.stockLevel);
        if (updateResult.synced) {
          synced++;
        } else {
          errors.push(updateResult.error || `Failed to update store inventory for ${mapping.platformProductId}`);
          failed++;
        }
      } catch (err) {
        errors.push(`Error syncing product ${mapping.cjProductId}: ${err instanceof Error ? err.message : "Unknown error"}`);
        failed++;
      }
    }

    return {
      success: failed === 0,
      synced,
      failed,
      errors,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      synced: 0,
      failed: productMappings.length,
      errors: [error instanceof Error ? error.message : "Inventory sync failed"],
      timestamp: new Date().toISOString(),
    };
  }
}

async function updateStoreInventory(
  storeId: string,
  storePlatform: string,
  platformProductId: string,
  stockLevel: number
): Promise<StoreInventoryUpdate> {
  const update: StoreInventoryUpdate = {
    storeId,
    storePlatform,
    productId: platformProductId,
    platformProductId,
    stockLevel,
    synced: false,
  };

  try {
    switch (storePlatform.toLowerCase()) {
      case "shopify":
        await updateShopifyInventory(storeId, platformProductId, stockLevel);
        update.synced = true;
        break;
      case "woocommerce":
        await updateWooCommerceInventory(storeId, platformProductId, stockLevel);
        update.synced = true;
        break;
      case "ebay":
        update.synced = false;
        update.error = "eBay inventory sync requires manual update";
        break;
      default:
        update.synced = false;
        update.error = `Platform ${storePlatform} not supported for inventory sync`;
    }
  } catch (err) {
    update.error = err instanceof Error ? err.message : "Inventory update failed";
  }

  return update;
}

async function updateShopifyInventory(storeId: string, productId: string, quantity: number): Promise<void> {
  const storeSettings = await getStoreSettings(storeId);
  if (!storeSettings?.accessToken || !storeSettings?.storeDomain) {
    throw new Error("Shopify store not configured");
  }

  const res = await fetch(`https://${storeSettings.storeDomain}/admin/api/2024-01/inventory_levels/set.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": storeSettings.accessToken,
    },
    body: JSON.stringify({
      location_id: storeSettings.locationId,
      inventory_item_id: productId,
      available: quantity,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status}`);
  }
}

async function updateWooCommerceInventory(storeId: string, productId: string, stockQuantity: number): Promise<void> {
  const storeSettings = await getStoreSettings(storeId);
  if (!storeSettings?.apiUrl || !storeSettings?.consumerKey || !storeSettings?.consumerSecret) {
    throw new Error("WooCommerce store not configured");
  }

  const res = await fetch(`${storeSettings.apiUrl}/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${storeSettings.consumerKey}:${storeSettings.consumerSecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      stock_quantity: stockQuantity,
      manage_stock: true,
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

export function detectInventoryChanges(
  previousInventory: CJInventoryItem[],
  currentInventory: CJInventoryItem[]
): InventoryChange[] {
  const changes: InventoryChange[] = [];
  const previousMap = new Map(previousInventory.map((item) => [item.productId, item]));

  for (const current of currentInventory) {
    const previous = previousMap.get(current.productId);
    if (!previous) continue;

    if (previous.stockLevel !== current.stockLevel) {
      let changeType: InventoryChange["changeType"] = "increase";
      if (current.stockLevel < previous.stockLevel) {
        changeType = current.stockLevel === 0 ? "out_of_stock" : "decrease";
      } else if (previous.stockLevel === 0 && current.stockLevel > 0) {
        changeType = "back_in_stock";
      }

      changes.push({
        productId: current.productId,
        productName: current.productName,
        previousStock: previous.stockLevel,
        currentStock: current.stockLevel,
        changeType,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return changes;
}

export function calculateReorderRecommendation(
  inventoryItem: CJInventoryItem,
  dailySalesRate: number,
  leadTimeDays: number = 7,
  safetyStockDays: number = 3
): { needsReorder: boolean; recommendedQuantity: number; urgency: "low" | "medium" | "high" | "critical" } {
  const reorderPoint = dailySalesRate * (leadTimeDays + safetyStockDays);
  const daysUntilStockout = dailySalesRate > 0 ? inventoryItem.stockLevel / dailySalesRate : Infinity;

  const needsReorder = inventoryItem.stockLevel <= reorderPoint;
  const recommendedQuantity = Math.ceil(dailySalesRate * (leadTimeDays + safetyStockDays * 2));

  let urgency: "low" | "medium" | "high" | "critical" = "low";
  if (daysUntilStockout <= 1) {
    urgency = "critical";
  } else if (daysUntilStockout <= 3) {
    urgency = "high";
  } else if (daysUntilStockout <= 7) {
    urgency = "medium";
  }

  return { needsReorder, recommendedQuantity, urgency };
}

export function generateInventoryAlerts(changes: InventoryChange[]): Array<{ type: string; title: string; description: string; severity: "info" | "warning" | "critical" }> {
  const alerts: Array<{ type: string; title: string; description: string; severity: "info" | "warning" | "critical" }> = [];

  for (const change of changes) {
    if (change.changeType === "out_of_stock") {
      alerts.push({
        type: "out_of_stock",
        title: `Out of Stock: ${change.productName}`,
        description: `${change.productName} (ID: ${change.productId}) is now out of stock. Previous: ${change.previousStock}, Current: ${change.currentStock}`,
        severity: "critical",
      });
    } else if (change.changeType === "back_in_stock") {
      alerts.push({
        type: "back_in_stock",
        title: `Back in Stock: ${change.productName}`,
        description: `${change.productName} (ID: ${change.productId}) is back in stock with ${change.currentStock} units`,
        severity: "info",
      });
    } else if (change.changeType === "decrease" && change.currentStock < change.previousStock * 0.3) {
      alerts.push({
        type: "low_stock",
        title: `Low Stock Warning: ${change.productName}`,
        description: `${change.productName} (ID: ${change.productId}) stock dropped significantly from ${change.previousStock} to ${change.currentStock}`,
        severity: "warning",
      });
    }
  }

  return alerts;
}
