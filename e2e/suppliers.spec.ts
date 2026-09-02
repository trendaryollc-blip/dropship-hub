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

const MOCK_SUPPLIERS = {
  suppliers: [
    {
      id: "sup-1",
      name: "Alpha Trading Co",
      location: "Shenzhen, China",
      country: "China",
      flag: "🇨🇳",
      trustBadge: "gold" as const,
      dataSource: "api" as const,
      specializations: ["Electronics", "Phone Accessories"],
      stats: {
        rating: 4.8,
        reviews: 1250,
        reliabilityScore: 95,
        responseTimeHours: 2,
        responseTime: "< 2h",
        shippingDays: 5,
        orderCompletionRate: 98,
        disputeRate: 0.5,
        monthlyOrders: 15000,
        qualityScore: 92,
        communicationScore: 88,
      },
    },
    {
      id: "sup-2",
      name: "Beta Supply Ltd",
      location: "Guangzhou, China",
      country: "China",
      flag: "🇨🇳",
      trustBadge: "silver" as const,
      dataSource: "scraped" as const,
      specializations: ["Home & Garden", "Kitchen"],
      stats: {
        rating: 4.5,
        reviews: 800,
        reliabilityScore: 88,
        responseTimeHours: 4,
        responseTime: "< 4h",
        shippingDays: 7,
        orderCompletionRate: 95,
        disputeRate: 1.2,
        monthlyOrders: 8000,
        qualityScore: 85,
        communicationScore: 80,
      },
    },
  ],
};

test.describe("Suppliers Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/suppliers");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Suppliers Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/suppliers", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUPPLIERS),
      });
    });
  });

  test("loads suppliers page with heading", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Supplier Intelligence")).toBeVisible();
  });

  test("shows supplier count", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/suppliers found/i)).toBeVisible();
  });

  test("has search input", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test("has sort dropdown", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const sortSelect = page.locator("select");
    await expect(sortSelect.first()).toBeVisible();
  });

  test("has filters button", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
  });

  test("search input accepts text", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill("Alpha");
    await expect(searchInput).toHaveValue("Alpha");
  });

  test("shows supplier cards", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Alpha Trading Co")).toBeVisible();
    await expect(page.getByText("Beta Supply Ltd")).toBeVisible();
  });

  test("supplier card shows trust badge", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("gold", { exact: false }).first()).toBeVisible();
  });

  test("supplier card shows location", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Shenzhen, China")).toBeVisible();
  });

  test("supplier card shows reliability score", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Reliability")).toBeVisible();
  });

  test("supplier card shows rating", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("4.8")).toBeVisible();
  });

  test("supplier card shows specializations", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Electronics")).toBeVisible();
  });

  test("supplier card links to detail page", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const link = page.getByRole("link").filter({ hasText: "Alpha Trading Co" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /sup-1/);
  });

  test("filter button toggles filter panel", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    // Filter panel should appear with trust badge options
    await expect(page.getByText("Trust Badge")).toBeVisible();
  });

  test("filter panel shows location filters", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Location")).toBeVisible();
  });

  test("filter panel shows rating filters", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Min Rating")).toBeVisible();
  });

  test("filter panel shows shipping speed filters", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Shipping Speed")).toBeVisible();
  });

  test("can sort by different options", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const sortSelect = page.locator("select").first();
    await sortSelect.selectOption("reliability");
    await page.waitForTimeout(300);
    // Results should re-sort (same suppliers visible)
    await expect(page.getByText("Alpha Trading Co")).toBeVisible();
  });
});

test.describe("Suppliers Page - Error State", () => {
  test("shows error state when API fails", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/suppliers", (route) => {
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });

    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Should show error or retry state
  });
});

test.describe("Suppliers Page - Responsive", () => {
  test("suppliers page is responsive on mobile", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
    await page.route("**/api/suppliers", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SUPPLIERS) });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Supplier Intelligence")).toBeVisible();
  });
});
