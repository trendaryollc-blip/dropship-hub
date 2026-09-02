import type { InventoryCheckResult } from "@/types/automation";

interface InventoryLookup {
  supplierId: string;
  productId: string;
  inStock: boolean;
  stockLevel: number;
  lastChecked: string;
}

const inventoryCache: Map<string, InventoryLookup> = new Map();

function getCacheKey(supplierId: string, productId: string): string {
  return `${supplierId}:${productId}`;
}

function isCacheFresh(entry: InventoryLookup, maxAgeMs: number = 5 * 60 * 1000): boolean {
  const checkedAt = new Date(entry.lastChecked).getTime();
  return Date.now() - checkedAt < maxAgeMs;
}

export async function checkInventory(
  supplierId: string,
  productId: string,
  forceRefresh: boolean = false
): Promise<InventoryCheckResult> {
  const cacheKey = getCacheKey(supplierId, productId);
  const cached = inventoryCache.get(cacheKey);

  if (cached && !forceRefresh && isCacheFresh(cached)) {
    return cached;
  }

  let result: InventoryCheckResult;

  switch (supplierId) {
    case "cj":
      result = await checkCJInventory(productId);
      break;
    case "aliexpress":
      result = await checkAliExpressInventory(productId);
      break;
    case "amazon":
      result = await checkAmazonInventory(productId);
      break;
    default:
      result = {
        supplierId,
        productId,
        inStock: true,
        stockLevel: 999,
        lastChecked: new Date().toISOString(),
      };
  }

  inventoryCache.set(cacheKey, {
    ...result,
    lastChecked: new Date().toISOString(),
  });

  return result;
}

async function checkCJInventory(productId: string): Promise<InventoryCheckResult> {
  try {
    const { getCJAccessToken } = await import("@/lib/cj-auth");
    const token = await getCJAccessToken();
    const res = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${productId}`,
      {
        headers: { "CJ-Access-Token": token },
        signal: AbortSignal.timeout(10000),
      }
    );
    const data = await res.json();
    const product = data.data;
    return {
      supplierId: "cj",
      productId,
      inStock: product?.stock === "in_stock" || (product?.stockQuantity ?? 0) > 0,
      stockLevel: product?.stockQuantity ?? 0,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return {
      supplierId: "cj",
      productId,
      inStock: false,
      stockLevel: 0,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkAliExpressInventory(_productId: string): Promise<InventoryCheckResult> {
  return {
    supplierId: "aliexpress",
    productId: _productId,
    inStock: true,
    stockLevel: 999,
    lastChecked: new Date().toISOString(),
  };
}

async function checkAmazonInventory(_productId: string): Promise<InventoryCheckResult> {
  return {
    supplierId: "amazon",
    productId: _productId,
    inStock: true,
    stockLevel: 999,
    lastChecked: new Date().toISOString(),
  };
}

export async function batchCheckInventory(
  checks: Array<{ supplierId: string; productId: string }>
): Promise<InventoryCheckResult[]> {
  const results = await Promise.allSettled(
    checks.map((c) => checkInventory(c.supplierId, c.productId))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      supplierId: checks[i].supplierId,
      productId: checks[i].productId,
      inStock: false,
      stockLevel: 0,
      lastChecked: new Date().toISOString(),
    };
  });
}

export function getCachedInventory(supplierId: string, productId: string): InventoryCheckResult | null {
  const cacheKey = getCacheKey(supplierId, productId);
  const cached = inventoryCache.get(cacheKey);
  if (cached && isCacheFresh(cached)) return cached;
  return null;
}

export function clearInventoryCache(): number {
  const size = inventoryCache.size;
  inventoryCache.clear();
  return size;
}

export function getCacheStats(): { size: number; entries: Array<{ key: string; fresh: boolean }> } {
  const entries: Array<{ key: string; fresh: boolean }> = [];
  for (const [key, value] of inventoryCache.entries()) {
    entries.push({ key, fresh: isCacheFresh(value) });
  }
  return { size: inventoryCache.size, entries };
}
