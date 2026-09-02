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

test.describe("Competitors Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/competitors");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Competitors Page - Authenticated - Initial State", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
  });

  test("loads competitors page with heading", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Competitor Intelligence")).toBeVisible();
  });

  test("shows subtitle about real-time analysis", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/real-time market analysis/i)).toBeVisible();
  });

  test("has search input for product analysis", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByPlaceholder(/search any product/i);
    await expect(searchInput).toBeVisible();
  });

  test("has Analyze Market button", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /analyze market/i })).toBeVisible();
  });

  test("Analyze Market button is disabled when input is empty", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    const button = page.getByRole("button", { name: /analyze market/i });
    await expect(button).toBeDisabled();
  });

  test("shows quick search suggestions", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Quick search:")).toBeVisible();
  });

  test("can type in search input", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByPlaceholder(/search any product/i);
    await searchInput.fill("wireless earbuds");
    await expect(searchInput).toHaveValue("wireless earbuds");
  });

  test("Analyze Market button enables when input has text", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder(/search any product/i).fill("wireless earbuds");
    const button = page.getByRole("button", { name: /analyze market/i });
    await expect(button).toBeEnabled();
  });

  test("shows empty state before search", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Ready to Spy on Competitors")).toBeVisible();
  });

  test("empty state has suggestion buttons", async ({ page }) => {
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /wireless earbuds/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /phone case/i })).toBeVisible();
  });

  test("clicking suggestion fills search and triggers analysis", async ({ page }) => {
    await page.route("**/api/competitors", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          platforms: [{ platform: "amazon", icon: "🛒", avgPrice: 25, minPrice: 10, maxPrice: 50, sellerCount: 100, trend: "up", trendPercent: 5, sparkline: [20, 22, 25, 24, 26], listings: [] }],
          avgPrice: 25,
          priceRange: { min: 10, max: 50 },
          totalListings: 100,
          priceDistribution: [{ range: "$0-$20", count: 30, percent: 30, isSweetSpot: false }],
          priceHistory: [{ date: "2024-01-01", price: 25, volume: 100 }],
          topSellers: [],
          opportunities: [],
          pricingOptions: [],
          insights: ["Market is growing"],
        }),
      });
    });

    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /wireless earbuds/i }).click();
    await page.waitForTimeout(2000);
  });
});

test.describe("Competitors Page - Search Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
  });

  test("shows loading state during analysis", async ({ page }) => {
    await page.route("**/api/competitors", (route) => {
      // Delay response to see loading state
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ error: null }),
        });
      }, 3000);
    });

    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder(/search any product/i).fill("test product");
    await page.getByRole("button", { name: /analyze market/i }).click();
    await expect(page.getByText("Scanning Platforms...")).toBeVisible();
  });

  test("shows error state when analysis fails", async ({ page }) => {
    await page.route("**/api/competitors", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to analyze market" }),
      });
    });

    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder(/search any product/i).fill("test product");
    await page.getByRole("button", { name: /analyze market/i }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText("Analysis Failed")).toBeVisible();
  });

  test("Enter key triggers search", async ({ page }) => {
    await page.route("**/api/competitors", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: null }),
      });
    });

    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder(/search any product/i).fill("wireless earbuds");
    await page.getByPlaceholder(/search any product/i).press("Enter");
    await page.waitForTimeout(1000);
  });
});

test.describe("Competitors Page - Responsive", () => {
  test("competitors page is responsive on mobile", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Competitor Intelligence")).toBeVisible();
  });

  test("competitors page is responsive on tablet", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/competitors");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Competitor Intelligence")).toBeVisible();
  });
});
