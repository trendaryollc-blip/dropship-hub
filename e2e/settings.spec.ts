import { test, expect } from "@playwright/test";
import { setupFirebaseAuth, injectAuthState } from "./helpers";

const AUTH_ROUTES = {
  login: "/sign-in",
  dashboard: "/dashboard",
  settings: "/settings",
};

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
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("has API Providers tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: /api providers/i })).toBeVisible();
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

  test("each provider has a Get API Key link", async ({ page }) => {
    const links = page.getByRole("link", { name: /get api key/i });
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(3);
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
    await expect(page.getByText("Email", { exact: true })).toBeVisible();
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
});

test.describe("Settings Page - Responsive", () => {
  test("settings page is responsive on mobile", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(AUTH_ROUTES.settings);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
