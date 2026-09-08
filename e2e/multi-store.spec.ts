import { test, expect } from "@playwright/test";

async function setupFirebaseAuth(page: import("@playwright/test").Page) {
  await page.route("**/identitytoolkit.googleapis.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ localId: "test-user-123", email: "test@example.com", idToken: "mock-token", registered: true }),
    });
  });
  await page.route("**/securetoken.googleapis.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "mock-token", token_type: "Bearer", expires_in: 3600 }),
    });
  });
}

async function injectAuthState(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const dbRequest = indexedDB.open("firebaseLocalStorageDb", 1);
    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("firebaseLocalStorage")) db.createObjectStore("firebaseLocalStorage");
    };
    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = db.transaction("firebaseLocalStorage", "readwrite");
      tx.objectStore("firebaseLocalStorage").put({
        fbase_key: "firebase:authUser:test-api-key:[DEFAULT]",
        value: { uid: "test-user-123", email: "test@example.com", stsTokenManager: { accessToken: "mock-token", refreshToken: "mock-refresh", expirationTime: Date.now() + 3600000 }, emailVerified: true },
      });
    };
  });
}

const MOCK_CONNECTIONS = {
  connections: [
    { id: "store-1", platform: "shopify", name: "My Shopify Store", url: "https://my-store.myshopify.com", status: "connected", connectedAt: new Date().toISOString() },
    { id: "store-2", platform: "woocommerce", name: "Woo Store", url: "https://woo.example.com", status: "connected", connectedAt: new Date().toISOString() },
  ],
};

const MOCK_ORDERS = {
  orders: [
    {
      id: "ord-1",
      orderId: "ORD-001",
      storeId: "store-1",
      storeName: "My Shopify Store",
      storePlatform: "shopify",
      orderNumber: "1001",
      customerName: "John Doe",
      customerEmail: "john@test.com",
      items: [{ productId: "p1", title: "Wireless Earbuds", quantity: 2, unitPrice: 29.99, totalPrice: 59.98 }],
      totalAmount: 59.98,
      currency: "USD",
      status: "pending",
      fulfillmentStatus: "unfulfilled",
      shippingAddress: { fullName: "John Doe", street: "123 Main St", city: "New York", state: "NY", zipCode: "10001", country: "US" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "ord-2",
      orderId: "ORD-002",
      storeId: "store-2",
      storeName: "Woo Store",
      storePlatform: "woocommerce",
      orderNumber: "2001",
      customerName: "Jane Smith",
      customerEmail: "jane@test.com",
      items: [{ productId: "p2", title: "Phone Case", quantity: 1, unitPrice: 14.99, totalPrice: 14.99 }],
      totalAmount: 14.99,
      currency: "USD",
      status: "shipped",
      fulfillmentStatus: "fulfilled",
      trackingNumber: "TRACK123",
      shippingAddress: { fullName: "Jane Smith", street: "456 Oak Ave", city: "Los Angeles", state: "CA", zipCode: "90001", country: "US" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

test.describe("Multi-Store Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/multi-store");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Multi-Store Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/store/connections*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONNECTIONS) });
    });
    await page.route("**/api/multi-store/orders*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ORDERS) });
    });
    await page.route("**/api/multi-store/inventory*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ inventory: [] }) });
    });
    await page.route("**/api/multi-store/performance*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ performances: [] }) });
    });
    await page.route("**/api/multi-store/bulk-push*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobs: [] }) });
    });
  });

  test("loads multi-store page with heading", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Multi-Store Dashboard")).toBeVisible();
  });

  test("shows connected store count", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/stores connected/i)).toBeVisible();
  });

  test("shows KPI cards", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Total Orders")).toBeVisible();
    await expect(page.getByText("Total Revenue")).toBeVisible();
  });

  test("has tab navigation", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Unified Orders")).toBeVisible();
    await expect(page.getByText("Inventory Sync")).toBeVisible();
    await expect(page.getByText("Performance")).toBeVisible();
    await expect(page.getByText("Bulk Push")).toBeVisible();
  });

  test("shows unified orders", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("1001")).toBeVisible();
    await expect(page.getByText("2001")).toBeVisible();
  });

  test("order shows customer name", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("John Doe")).toBeVisible();
  });

  test("order shows status badge", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("pending").first()).toBeVisible();
  });

  test("can switch to inventory tab", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await page.getByText("Inventory Sync").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Cross-Store Inventory")).toBeVisible();
  });

  test("can switch to performance tab", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await page.getByText("Performance").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("7d")).toBeVisible();
  });

  test("can switch to bulk push tab", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await page.getByText("Bulk Push").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Bulk Push to Stores")).toBeVisible();
  });

  test("bulk push shows connected stores", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await page.getByText("Bulk Push").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("My Shopify Store")).toBeVisible();
  });

  test("has store filter dropdown", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    const select = page.locator("select").first();
    await expect(select).toBeVisible();
  });

  test("has status filter dropdown", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    const selects = page.locator("select");
    await expect(selects.nth(1)).toBeVisible();
  });

  test("order expands on click", async ({ page }) => {
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await page.getByText("1001").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Wireless Earbuds")).toBeVisible();
  });
});

test.describe("Multi-Store Page - Responsive", () => {
  test("page is responsive on mobile", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
    await page.route("**/api/store/connections*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONNECTIONS) });
    });
    await page.route("**/api/multi-store/*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [], inventory: [], performances: [], jobs: [] }) });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/multi-store");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Multi-Store Dashboard")).toBeVisible();
  });
});
