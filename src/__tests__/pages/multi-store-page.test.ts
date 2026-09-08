import { describe, it, expect } from "vitest";
import type {
  MultiStoreConfig,
  StoreConnection,
  SyncStatus,
  CrossStoreAnalytics,
} from "@/types/multi-store";

describe("Multi-Store Page - Data Types", () => {
  it("multi-store config has required fields", () => {
    const config: MultiStoreConfig = {
      id: "ms-1",
      userId: "user-1",
      stores: [],
      defaultStoreId: null,
      syncEnabled: true,
      syncInterval: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(config.syncEnabled).toBe(true);
    expect(config.syncInterval).toBeGreaterThan(0);
  });

  it("store connection has required fields", () => {
    const conn: StoreConnection = {
      id: "sc-1",
      storeId: "st-1",
      storeName: "Main Store",
      platform: "shopify",
      connected: true,
      lastSyncAt: new Date().toISOString(),
      syncStatus: "idle",
      productsCount: 250,
      ordersCount: 1500,
    };
    expect(conn.connected).toBe(true);
    expect(conn.productsCount).toBeGreaterThanOrEqual(0);
  });

  it("sync status values", () => {
    const statuses: SyncStatus[] = ["idle", "syncing", "error", "completed"];
    expect(statuses).toHaveLength(4);
  });

  it("cross-store analytics has required fields", () => {
    const analytics: CrossStoreAnalytics = {
      totalRevenue: 150000,
      totalOrders: 3500,
      totalProducts: 800,
      averageOrderValue: 42.86,
      topPerformingStore: "st-1",
      storeBreakdown: [
        { storeId: "st-1", storeName: "Store A", revenue: 100000, orders: 2000 },
        { storeId: "st-2", storeName: "Store B", revenue: 50000, orders: 1500 },
      ],
    };
    expect(analytics.totalRevenue).toBeGreaterThan(0);
    expect(analytics.storeBreakdown.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Multi-Store Page - Business Logic", () => {
  it("calculates store revenue percentage", () => {
    const storeRevenue = 100000;
    const totalRevenue = 150000;
    const pct = (storeRevenue / totalRevenue) * 100;
    expect(pct).toBeCloseTo(66.67, 1);
  });

  it("can filter connected stores", () => {
    const stores: StoreConnection[] = [
      { id: "1", connected: true } as StoreConnection,
      { id: "2", connected: false } as StoreConnection,
      { id: "3", connected: true } as StoreConnection,
    ];
    const connected = stores.filter((s) => s.connected);
    expect(connected).toHaveLength(2);
  });

  it("calculates total products across stores", () => {
    const stores: StoreConnection[] = [
      { id: "1", productsCount: 100 } as StoreConnection,
      { id: "2", productsCount: 250 } as StoreConnection,
      { id: "3", productsCount: 50 } as StoreConnection,
    ];
    const total = stores.reduce((sum, s) => sum + s.productsCount, 0);
    expect(total).toBe(400);
  });

  it("can sort by last sync time", () => {
    const stores: StoreConnection[] = [
      { id: "1", lastSyncAt: "2024-01-01T00:00:00Z" } as StoreConnection,
      { id: "2", lastSyncAt: "2024-01-03T00:00:00Z" } as StoreConnection,
      { id: "3", lastSyncAt: "2024-01-02T00:00:00Z" } as StoreConnection,
    ];
    const sorted = [...stores].sort((a, b) =>
      new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime()
    );
    expect(sorted[0].id).toBe("2");
  });
});
