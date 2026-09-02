import { test, expect } from "@playwright/test";

const AUTH_ROUTES = {
  login: "/sign-in",
  dashboard: "/dashboard",
  settings: "/settings",
};

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

test.describe("Settings Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto(AUTH_ROUTES.settings);
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Settings Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
    await page.goto(AUTH_ROUTES.settings);
    await page.waitForLoadState("networkidle");
  });

  test("loads settings page with heading", async ({ page }) => {
    await expect(page.getByText("Settings")).toBeVisible();
  });

  test("shows provider count status", async ({ page }) => {
    await expect(page.getByText(/providers configured/i)).toBeVisible();
  });

  test("has API Providers tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /api providers/i })).toBeVisible();
  });

  test("has AI Features tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /ai features/i })).toBeVisible();
  });

  test("has Platforms tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /platforms/i })).toBeVisible();
  });

  test("has Stores tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /stores/i })).toBeVisible();
  });

  test("has Notifications tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /notifications/i })).toBeVisible();
  });

  test("has Account tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /account/i })).toBeVisible();
  });

  test("has Data tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /data/i })).toBeVisible();
  });

  test("API Providers tab shows Groq provider", async ({ page }) => {
    await expect(page.getByText("Groq")).toBeVisible();
  });

  test("API Providers tab shows Google Gemini provider", async ({ page }) => {
    await expect(page.getByText("Google Gemini")).toBeVisible();
  });

  test("API Providers tab shows OpenAI provider", async ({ page }) => {
    await expect(page.getByText("OpenAI")).toBeVisible();
  });

  test("API Providers tab shows Anthropic provider", async ({ page }) => {
    await expect(page.getByText("Anthropic (Claude)")).toBeVisible();
  });

  test("each provider has a Get API Key link", async ({ page }) => {
    const links = page.getByRole("link", { name: /get api key/i });
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("can switch to AI Features tab", async ({ page }) => {
    await page.getByRole("button", { name: /ai features/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("AI-Powered Features")).toBeVisible();
  });

  test("AI Features tab shows Price Optimization", async ({ page }) => {
    await page.getByRole("button", { name: /ai features/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Price Optimization")).toBeVisible();
  });

  test("AI Features tab shows Product Analysis", async ({ page }) => {
    await page.getByRole("button", { name: /ai features/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Product Analysis")).toBeVisible();
  });

  test("can switch to Platforms tab", async ({ page }) => {
    await page.getByRole("button", { name: /platforms/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Platform Integrations")).toBeVisible();
  });

  test("Platforms tab shows AliExpress connector", async ({ page }) => {
    await page.getByRole("button", { name: /platforms/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("AliExpress")).toBeVisible();
  });

  test("Platforms tab shows CJ Dropshipping connector", async ({ page }) => {
    await page.getByRole("button", { name: /platforms/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("CJ Dropshipping")).toBeVisible();
  });

  test("can switch to Stores tab", async ({ page }) => {
    await page.getByRole("button", { name: /stores/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Store Connections")).toBeVisible();
  });

  test("Stores tab shows empty state when no stores connected", async ({ page }) => {
    await page.getByRole("button", { name: /stores/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("No stores connected yet")).toBeVisible();
  });

  test("can switch to Notifications tab", async ({ page }) => {
    await page.getByRole("button", { name: /notifications/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Notification Preferences")).toBeVisible();
  });

  test("Notifications tab shows toggle preferences", async ({ page }) => {
    await page.getByRole("button", { name: /notifications/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Price Drop Alerts")).toBeVisible();
    await expect(page.getByText("Stock Out Alerts")).toBeVisible();
    await expect(page.getByText("Order Updates")).toBeVisible();
  });

  test("can switch to Account tab", async ({ page }) => {
    await page.getByRole("button", { name: /account/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Account Management")).toBeVisible();
  });

  test("Account tab shows email field", async ({ page }) => {
    await page.getByRole("button", { name: /account/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Email")).toBeVisible();
  });

  test("Account tab shows change password section", async ({ page }) => {
    await page.getByRole("button", { name: /account/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Change Password")).toBeVisible();
  });

  test("Account tab shows delete account button", async ({ page }) => {
    await page.getByRole("button", { name: /account/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Danger Zone")).toBeVisible();
    await expect(page.getByRole("button", { name: /delete account/i })).toBeVisible();
  });

  test("can switch to Data tab", async ({ page }) => {
    await page.getByRole("button", { name: /data/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Data Export & Import")).toBeVisible();
  });

  test("Data tab has Export and Import buttons", async ({ page }) => {
    await page.getByRole("button", { name: /data/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("button", { name: /export/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import/i })).toBeVisible();
  });

  test("How It Works section is visible", async ({ page }) => {
    await expect(page.getByText("How It Works")).toBeVisible();
    await expect(page.getByText("Fallback Chain")).toBeVisible();
  });

  test("Quick Start section is visible", async ({ page }) => {
    await expect(page.getByText("Quick Start")).toBeVisible();
  });
});

test.describe("Settings Page - Responsive", () => {
  test("settings page is responsive on mobile", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(AUTH_ROUTES.settings);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Settings")).toBeVisible();
  });
});
