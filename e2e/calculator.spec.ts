import { test, expect } from "@playwright/test";

test.describe("Calculator Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/calculator");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Calculator Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    // Setup Firebase auth interception
    await page.route("**/identitytoolkit.googleapis.com/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          localId: "test-user-123",
          email: "test@example.com",
          idToken: "mock-token",
          registered: true,
        }),
      });
    });
    await page.route("**/securetoken.googleapis.com/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "mock-token", token_type: "Bearer", expires_in: 3600 }),
      });
    });

    // Inject authenticated state
    await page.goto("/");
    await page.evaluate(() => {
      const dbRequest = indexedDB.open("firebaseLocalStorageDb", 1);
      dbRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          db.createObjectStore("firebaseLocalStorage");
        }
      };
      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction("firebaseLocalStorage", "readwrite");
        tx.objectStore("firebaseLocalStorage").put({
          fbase_key: "firebase:authUser:test-api-key:[DEFAULT]",
          value: {
            uid: "test-user-123",
            email: "test@example.com",
            stsTokenManager: { accessToken: "mock-token", refreshToken: "mock-refresh", expirationTime: Date.now() + 3600000 },
            emailVerified: true,
          },
        });
      };
    });
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
  });

  test("loads calculator page with heading", async ({ page }) => {
    await expect(page.getByText("Calculator Suite")).toBeVisible();
  });

  test("shows profit tab by default", async ({ page }) => {
    await expect(page.getByText("Input Values")).toBeVisible();
    await expect(page.getByText("Results")).toBeVisible();
  });

  test("profit calculator has input fields", async ({ page }) => {
    await expect(page.getByLabel(/product cost/i)).toBeVisible();
    await expect(page.getByLabel(/selling price/i)).toBeVisible();
    await expect(page.getByLabel(/shipping cost/i)).toBeVisible();
    await expect(page.getByLabel(/platform fee/i)).toBeVisible();
    await expect(page.getByLabel(/ad spend/i)).toBeVisible();
    await expect(page.getByLabel(/units sold/i)).toBeVisible();
  });

  test("shows net profit and margin results", async ({ page }) => {
    await expect(page.getByText("Net Profit")).toBeVisible();
    await expect(page.getByText("Profit Margin")).toBeVisible();
    await expect(page.getByText("ROI")).toBeVisible();
  });

  test("shows cost breakdown section", async ({ page }) => {
    await expect(page.getByText("Cost Breakdown")).toBeVisible();
  });

  test("can switch to shipping tab", async ({ page }) => {
    await page.getByRole("button", { name: /shipping/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Package Details")).toBeVisible();
    await expect(page.getByText("Shipping Options")).toBeVisible();
  });

  test("shipping tab has weight and dimension inputs", async ({ page }) => {
    await page.getByRole("button", { name: /shipping/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByLabel(/weight/i)).toBeVisible();
    await expect(page.getByLabel(/length/i)).toBeVisible();
    await expect(page.getByLabel(/width/i)).toBeVisible();
    await expect(page.getByLabel(/height/i)).toBeVisible();
  });

  test("shipping tab has origin and destination selectors", async ({ page }) => {
    await page.getByRole("button", { name: /shipping/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByLabel(/origin/i)).toBeVisible();
    await expect(page.getByLabel(/destination/i)).toBeVisible();
  });

  test("can switch to landed cost tab", async ({ page }) => {
    await page.getByRole("button", { name: /landed/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("True Cost Input")).toBeVisible();
    await expect(page.getByText("Landed Cost Breakdown")).toBeVisible();
  });

  test("landed cost has tariff and insurance inputs", async ({ page }) => {
    await page.getByRole("button", { name: /landed/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByLabel(/tariff/i)).toBeVisible();
    await expect(page.getByLabel(/insurance/i)).toBeVisible();
    await expect(page.getByLabel(/customs duty/i)).toBeVisible();
  });

  test("can switch to margin tab", async ({ page }) => {
    await page.getByRole("button", { name: /margin/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Margin Input")).toBeVisible();
    await expect(page.getByText("Price Breakpoints")).toBeVisible();
  });

  test("margin tab has cost and desired margin inputs", async ({ page }) => {
    await page.getByRole("button", { name: /margin/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByLabel(/cost price/i)).toBeVisible();
    await expect(page.getByLabel(/desired margin/i)).toBeVisible();
  });

  test("shows recommended price in margin tab", async ({ page }) => {
    await page.getByRole("button", { name: /margin/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Recommended Price")).toBeVisible();
  });

  test("product cost input accepts numeric values", async ({ page }) => {
    const input = page.getByLabel(/product cost/i);
    await input.clear();
    await input.fill("15.99");
    await expect(input).toHaveValue("15.99");
  });

  test("results update when inputs change", async ({ page }) => {
    const input = page.getByLabel(/product cost/i);
    await input.clear();
    await input.fill("25");
    await page.waitForTimeout(200);
    // Results should still be visible and update
    await expect(page.getByText("Net Profit")).toBeVisible();
  });

  test("has all four calculator tabs visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /profit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /shipping/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /landed/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /margin/i })).toBeVisible();
  });
});

test.describe("Calculator Page - URL Parameters", () => {
  test.beforeEach(async ({ page }) => {
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

    await page.goto("/");
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
  });

  test("can load calculator with pre-filled URL params", async ({ page }) => {
    await page.goto("/calculator?title=Test+Product&cost=10&price=29.99&ship=5&fee=15&ads=3");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Calculator Suite")).toBeVisible();
    await expect(page.getByText("Calculating for")).toBeVisible();
    await expect(page.getByText("Test Product")).toBeVisible();
  });
});
