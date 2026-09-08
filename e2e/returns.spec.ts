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

async function loginAndGoToReturns(page: import("@playwright/test").Page) {
  await setupFirebaseAuth(page);
  await page.goto("/");
  await injectAuthState(page);

  await page.route("**/api/returns*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ returns: [] }),
    });
  });
  await page.route("**/api/returns/defects*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ defects: [], suppliers: [], totalDefects: 0, severityBreakdown: {}, topDefectProducts: [] }),
    });
  });
  await page.route("**/api/returns/refund*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ refunds: [] }),
    });
  });

  await page.goto("/returns");
  await page.waitForLoadState("networkidle");
}

test.describe("Returns Page - Navigation", () => {
  test("sidebar has Returns & Refunds link", async ({ page }) => {
    await loginAndGoToReturns(page);
    const returnsLink = page.getByRole("link", { name: /returns/i }).first();
    await expect(returnsLink).toBeVisible();
  });

  test("sidebar Returns link has correct href", async ({ page }) => {
    await loginAndGoToReturns(page);
    const returnsLink = page.getByRole("link", { name: /returns/i }).first();
    await expect(returnsLink).toHaveAttribute("href", "/returns");
  });

  test("clicking Returns link navigates to returns page", async ({ page }) => {
    await loginAndGoToReturns(page);
    await page.getByRole("link", { name: /returns/i }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/returns/);
  });
});

test.describe("Returns Page - Header", () => {
  test("page has Returns & Refunds heading", async ({ page }) => {
    await loginAndGoToReturns(page);
    await expect(page.getByRole("heading", { name: /returns/i }).first()).toBeVisible();
  });

  test("page has Auto-Detect button", async ({ page }) => {
    await loginAndGoToReturns(page);
    const autoDetectBtn = page.getByRole("button", { name: /auto-detect/i });
    await expect(autoDetectBtn).toBeVisible();
  });
});

test.describe("Returns Page - Tabs", () => {
  test("has Returns tab", async ({ page }) => {
    await loginAndGoToReturns(page);
    const returnsTab = page.getByRole("button", { name: /returns/i }).first();
    await expect(returnsTab).toBeVisible();
  });

  test("has Refunds tab", async ({ page }) => {
    await loginAndGoToReturns(page);
    const refundsTab = page.getByRole("button", { name: /refunds/i }).first();
    await expect(refundsTab).toBeVisible();
  });

  test("has Defects tab", async ({ page }) => {
    await loginAndGoToReturns(page);
    const defectsTab = page.getByRole("button", { name: /defects/i }).first();
    await expect(defectsTab).toBeVisible();
  });

  test("has Analytics tab", async ({ page }) => {
    await loginAndGoToReturns(page);
    const analyticsTab = page.getByRole("button", { name: /analytics/i }).first();
    await expect(analyticsTab).toBeVisible();
  });

  test("Returns tab is active by default", async ({ page }) => {
    await loginAndGoToReturns(page);
    const returnsTab = page.getByRole("button", { name: /returns/i }).first();
    await expect(returnsTab).toHaveClass(/bg-accent/);
  });
});

test.describe("Returns Page - Empty State", () => {
  test("shows empty state when no returns", async ({ page }) => {
    await loginAndGoToReturns(page);
    await expect(page.getByText(/no returns found/i)).toBeVisible();
  });

  test("empty state has Auto-Detect Returns button", async ({ page }) => {
    await loginAndGoToReturns(page);
    const btn = page.getByRole("button", { name: /auto-detect returns/i });
    await expect(btn).toBeVisible();
  });
});

test.describe("Returns Page - Search and Filter", () => {
  test("has search input", async ({ page }) => {
    await loginAndGoToReturns(page);
    const searchInput = page.getByPlaceholder(/search by order/i);
    await expect(searchInput).toBeVisible();
  });

  test("has status filter dropdown", async ({ page }) => {
    await loginAndGoToReturns(page);
    const filter = page.locator("select").first();
    await expect(filter).toBeVisible();
  });

  test("search input accepts text", async ({ page }) => {
    await loginAndGoToReturns(page);
    const searchInput = page.getByPlaceholder(/search by order/i);
    await searchInput.fill("ORD-001");
    await expect(searchInput).toHaveValue("ORD-001");
  });
});

test.describe("Returns Page - Returns with Data", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/returns", (route) => {
      if (route.request().url().includes("defects") || route.request().url().includes("refund")) return;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          returns: [
            {
              id: "ret-1",
              orderId: "ord-1",
              orderNumber: "ORD-001",
              customerId: "cust-1",
              customerName: "John Doe",
              customerEmail: "john@example.com",
              items: [{ productId: "p1", productName: "Test Widget", quantity: 1, unitPrice: 29.99, imageUrl: "" }],
              reason: "defective",
              reasonDetails: "Arrived broken",
              status: "pending",
              returnLabel: null,
              refundAmount: 0,
              supplierId: "sup-1",
              supplierName: "Test Supplier",
              platform: "shopify",
              storePlatform: "custom",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: "ret-2",
              orderId: "ord-2",
              orderNumber: "ORD-002",
              customerId: "cust-2",
              customerName: "Jane Smith",
              customerEmail: "jane@example.com",
              items: [{ productId: "p2", productName: "Another Widget", quantity: 2, unitPrice: 15.00, imageUrl: "" }],
              reason: "wrong_item",
              reasonDetails: "Received wrong color",
              status: "approved",
              returnLabel: { trackingNumber: "RT123456", carrier: "USPS", returnAddress: "123 St", instructions: "Ship back", labelUrl: null, generatedAt: new Date().toISOString() },
              refundAmount: 30.00,
              supplierId: "sup-1",
              supplierName: "Test Supplier",
              platform: "shopify",
              storePlatform: "custom",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });
    await page.route("**/api/returns/defects*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ defects: [], suppliers: [], totalDefects: 0, severityBreakdown: {}, topDefectProducts: [] }),
      });
    });
    await page.route("**/api/returns/refund*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ refunds: [] }),
      });
    });
  });

  test("displays return requests", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("ORD-001")).toBeVisible();
    await expect(page.getByText("ORD-002")).toBeVisible();
  });

  test("displays customer names", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("John Doe")).toBeVisible();
    await expect(page.getByText("Jane Smith")).toBeVisible();
  });

  test("displays return statuses", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Pending").first()).toBeVisible();
    await expect(page.getByText("Approved").first()).toBeVisible();
  });

  test("shows Approve button for pending returns", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    const approveBtn = page.getByRole("button", { name: /approve/i }).first();
    await expect(approveBtn).toBeVisible();
  });

  test("shows Generate Label button for approved returns", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    const labelBtn = page.getByRole("button", { name: /generate label/i }).first();
    await expect(labelBtn).toBeVisible();
  });
});

test.describe("Returns Page - Tab Switching", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToReturns(page);
  });

  test("clicking Refunds tab shows refunds section", async ({ page }) => {
    await page.getByRole("button", { name: /refunds/i }).first().click();
    await expect(page.getByText(/no refunds yet/i)).toBeVisible();
  });

  test("clicking Defects tab shows defects section", async ({ page }) => {
    await page.getByRole("button", { name: /defects/i }).first().click();
    await expect(page.getByText(/no defect reports/i)).toBeVisible();
  });

  test("clicking Analytics tab shows analytics section", async ({ page }) => {
    await page.getByRole("button", { name: /analytics/i }).first().click();
    await expect(page.getByText(/severity breakdown/i)).toBeVisible();
  });
});

test.describe("Returns Page - Auto-Detect Modal", () => {
  test("clicking Auto-Detect opens modal", async ({ page }) => {
    await loginAndGoToReturns(page);
    await page.getByRole("button", { name: /auto-detect$/i }).first().click();
    await expect(page.getByText(/auto-detect returns/i).last()).toBeVisible();
  });

  test("modal shows no returns message when empty", async ({ page }) => {
    await loginAndGoToReturns(page);
    await page.getByRole("button", { name: /auto-detect$/i }).first().click();
    await expect(page.getByText(/no new returns detected/i)).toBeVisible();
  });

  test("modal can be closed", async ({ page }) => {
    await loginAndGoToReturns(page);
    await page.getByRole("button", { name: /auto-detect$/i }).first().click();
    const closeBtn = page.locator("button").filter({ has: page.locator("svg") }).last();
    await closeBtn.click();
  });
});

test.describe("Returns Page - Responsive", () => {
  test("page is usable on mobile", async ({ page }) => {
    await loginAndGoToReturns(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /returns/i }).first()).toBeVisible();
  });

  test("tabs scroll on mobile", async ({ page }) => {
    await loginAndGoToReturns(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    const tabsContainer = page.locator("[class*='overflow-x-auto']").first();
    await expect(tabsContainer).toBeVisible();
  });
});

test.describe("Returns Page - Protected Route", () => {
  test("redirects to sign-in when not authenticated", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/sign-in/);
  });
});
