import { describe, it, expect, vi } from "vitest";
import {
  createAlert,
  getUserAlerts,
  deleteAlert,
  toggleAlert,
  matchAlertToProducts,
  isPriceDrop,
  checkAlertsForUser,
} from "./alerts";
import type { SearchAlert, AlertStore } from "./alerts";
import type { MergedProduct } from "./dedup";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeAlert(overrides: Partial<SearchAlert> = {}): SearchAlert {
  return {
    id: "alert-1",
    userId: "user-1",
    query: "wireless earbuds",
    platforms: ["amazon"],
    notifyOn: "any",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeProduct(overrides: Partial<MergedProduct> = {}): MergedProduct {
  return {
    id: "product-1",
    title: "Wireless Earbuds",
    image: null,
    images: [],
    platforms: [{ platform: "amazon", price: 25, link: "", originalTitle: "Wireless Earbuds" }],
    bestPrice: 25,
    worstPrice: 25,
    priceSpread: 0,
    avgPrice: 25,
    platformCount: 1,
    bestPlatform: "amazon",
    rating: 4.5,
    reviews: 100,
    ...overrides,
  };
}

function createMockStore(alerts: SearchAlert[] = []): AlertStore {
  const stored = [...alerts];
  let nextId = alerts.length + 1;
  return {
    create: vi.fn(async (data) => {
      const alert: SearchAlert = {
        ...data,
        id: `alert-${nextId++}`,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      stored.push(alert);
      return alert;
    }),
    getAll: vi.fn(async () => stored.filter((a) => a.userId === stored[0]?.userId || true)),
    get: vi.fn(async (userId, alertId) => stored.find((a) => a.id === alertId && a.userId === userId) || null),
    delete: vi.fn(async (userId, alertId) => {
      const idx = stored.findIndex((a) => a.id === alertId && a.userId === userId);
      if (idx >= 0) stored.splice(idx, 1);
    }),
    update: vi.fn(async (userId, alertId, data) => {
      const alert = stored.find((a) => a.id === alertId && a.userId === userId);
      if (alert) Object.assign(alert, data);
    }),
  };
}

// ── createAlert ───────────────────────────────────────────────────────────

describe("createAlert", () => {
  it("creates alert in store", async () => {
    const store = createMockStore();
    const result = await createAlert(store, "user-1", {
      query: "laptop",
      platforms: ["amazon"],
      notifyOn: "any",
    });
    expect(result.id).toBeTruthy();
    expect(result.query).toBe("laptop");
    expect(store.create).toHaveBeenCalledOnce();
  });

  it("returns alert with generated id", async () => {
    const store = createMockStore();
    const result = await createAlert(store, "user-1", {
      query: "test",
      platforms: [],
      notifyOn: "new_product",
    });
    expect(result.id).toMatch(/^alert-/);
  });

  it("sets isActive to true via store", async () => {
    const store = createMockStore();
    await createAlert(store, "user-1", {
      query: "test",
      platforms: [],
      notifyOn: "any",
    });
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ query: "test" })
    );
  });
});

// ── getUserAlerts ─────────────────────────────────────────────────────────

describe("getUserAlerts", () => {
  it("returns all alerts for user", async () => {
    const alerts = [makeAlert({ id: "a1" }), makeAlert({ id: "a2" })];
    const store = createMockStore(alerts);
    const result = await getUserAlerts(store, "user-1");
    expect(result.length).toBe(2);
  });

  it("returns empty array for new user", async () => {
    const store = createMockStore([]);
    const result = await getUserAlerts(store, "new-user");
    expect(result).toEqual([]);
  });
});

// ── deleteAlert ───────────────────────────────────────────────────────────

describe("deleteAlert", () => {
  it("removes alert from store", async () => {
    const store = createMockStore([makeAlert({ id: "to-delete" })]);
    await deleteAlert(store, "user-1", "to-delete");
    expect(store.delete).toHaveBeenCalledWith("user-1", "to-delete");
  });

  it("handles non-existent alert gracefully", async () => {
    const store = createMockStore([]);
    await deleteAlert(store, "user-1", "nonexistent");
    expect(store.delete).toHaveBeenCalledWith("user-1", "nonexistent");
  });
});

// ── toggleAlert ───────────────────────────────────────────────────────────

describe("toggleAlert", () => {
  it("sets isActive to true", async () => {
    const store = createMockStore([makeAlert({ isActive: false })]);
    await toggleAlert(store, "user-1", "alert-1", true);
    expect(store.update).toHaveBeenCalledWith("user-1", "alert-1", { isActive: true });
  });

  it("sets isActive to false", async () => {
    const store = createMockStore([makeAlert({ isActive: true })]);
    await toggleAlert(store, "user-1", "alert-1", false);
    expect(store.update).toHaveBeenCalledWith("user-1", "alert-1", { isActive: false });
  });
});

// ── matchAlertToProducts ──────────────────────────────────────────────────

describe("matchAlertToProducts", () => {
  it("matches products within price range", () => {
    const alert = makeAlert({ priceMin: 10, priceMax: 50 });
    const products = [makeProduct({ bestPrice: 25 })];
    const match = matchAlertToProducts(alert, products);
    expect(match).not.toBeNull();
    expect(match!.matchedProducts.length).toBe(1);
  });

  it("matches products above min rating", () => {
    const alert = makeAlert({ minRating: 4 });
    const products = [makeProduct({ rating: 4.5 })];
    const match = matchAlertToProducts(alert, products);
    expect(match).not.toBeNull();
  });

  it("returns null when no matches", () => {
    const alert = makeAlert({ priceMax: 10 });
    const products = [makeProduct({ bestPrice: 25 })];
    const match = matchAlertToProducts(alert, products);
    expect(match).toBeNull();
  });

  it("handles price_drop notification type", () => {
    const alert = makeAlert({ notifyOn: "price_drop" });
    const products = [makeProduct()];
    const match = matchAlertToProducts(alert, products);
    expect(match!.matchType).toBe("price_drop");
  });

  it("handles new_product notification type", () => {
    const alert = makeAlert({ notifyOn: "new_product" });
    const products = [makeProduct()];
    const match = matchAlertToProducts(alert, products);
    expect(match!.matchType).toBe("new_product");
  });

  it("filters by platform", () => {
    const alert = makeAlert({ platforms: ["amazon"] });
    const ebayProduct = makeProduct({
      platforms: [{ platform: "ebay", price: 25, link: "", originalTitle: "" }],
    });
    const match = matchAlertToProducts(alert, [ebayProduct]);
    expect(match).toBeNull();
  });

  it("matches when product has correct platform", () => {
    const alert = makeAlert({ platforms: ["amazon"] });
    const amazonProduct = makeProduct();
    const match = matchAlertToProducts(alert, [amazonProduct]);
    expect(match).not.toBeNull();
  });
});

// ── isPriceDrop ───────────────────────────────────────────────────────────

describe("isPriceDrop", () => {
  it("returns true when price drops by threshold %", () => {
    expect(isPriceDrop(100, 80, 10)).toBe(true);
  });

  it("returns false when price change is below threshold", () => {
    expect(isPriceDrop(100, 95, 10)).toBe(false);
  });

  it("returns false when price increases", () => {
    expect(isPriceDrop(100, 110, 10)).toBe(false);
  });

  it("handles zero previous price", () => {
    expect(isPriceDrop(0, 10, 10)).toBe(false);
  });

  it("handles null values", () => {
    expect(isPriceDrop(null, 50, 10)).toBe(false);
    expect(isPriceDrop(100, null, 10)).toBe(false);
  });

  it("detects exact threshold", () => {
    expect(isPriceDrop(100, 90, 10)).toBe(true);
  });
});

// ── checkAlertsForUser ────────────────────────────────────────────────────

describe("checkAlertsForUser", () => {
  it("checks all active alerts for user", async () => {
    const store = createMockStore([
      makeAlert({ id: "a1", query: "earbuds", isActive: true }),
    ]);
    const searchFn = vi.fn(async () => [makeProduct()]);
    const matches = await checkAlertsForUser(store, "user-1", searchFn);
    expect(searchFn).toHaveBeenCalledWith("earbuds", ["amazon"]);
    expect(matches.length).toBe(1);
  });

  it("returns empty for no active alerts", async () => {
    const store = createMockStore([
      makeAlert({ id: "a1", isActive: false }),
    ]);
    const searchFn = vi.fn(async () => []);
    const matches = await checkAlertsForUser(store, "user-1", searchFn);
    expect(matches).toEqual([]);
    expect(searchFn).not.toHaveBeenCalled();
  });

  it("updates lastChecked timestamp", async () => {
    const store = createMockStore([
      makeAlert({ id: "a1", query: "laptop", isActive: true }),
    ]);
    const searchFn = vi.fn(async () => []);
    await checkAlertsForUser(store, "user-1", searchFn);
    expect(store.update).toHaveBeenCalledWith(
      "user-1",
      "a1",
      expect.objectContaining({ lastChecked: expect.any(String) })
    );
  });
});
