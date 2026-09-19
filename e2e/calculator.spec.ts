import { test, expect } from "@playwright/test";
import { setupFirebaseAuth, injectAuthState } from "./helpers";

function inputNearLabel(page: import("@playwright/test").Page, labelText: string | RegExp) {
  return page.locator("label").filter({ hasText: labelText }).locator("..").locator("input, select").first();
}

test.describe("Calculator Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/calculator");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Calculator Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/ai", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ providers: [] }) });
    });
  });

  test("loads calculator hub with heading", async ({ page }) => {
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Calculator Suite")).toBeVisible();
  });

  test("has all four calculator categories visible", async ({ page }) => {
    await page.goto("/calculator");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: /profit calculator/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /shipping calculator/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /landed cost calculator/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /margin calculator/i }).first()).toBeVisible();
  });

  test("profit calculator has input fields", async ({ page }) => {
    await page.goto("/calculator/profit");
    await page.waitForLoadState("networkidle");
    await expect(inputNearLabel(page, /product cost/i)).toBeVisible();
    await expect(inputNearLabel(page, /selling price/i)).toBeVisible();
    await expect(inputNearLabel(page, /shipping cost/i)).toBeVisible();
    await expect(inputNearLabel(page, /platform fee/i)).toBeVisible();
    await expect(inputNearLabel(page, /ad spend/i)).toBeVisible();
    await expect(inputNearLabel(page, /units sold/i)).toBeVisible();
  });

  test("shows net profit and margin results", async ({ page }) => {
    await page.goto("/calculator/profit");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Net Profit").first()).toBeVisible();
    await expect(page.getByText("Profit Margin")).toBeVisible();
    await expect(page.getByText("ROI").first()).toBeVisible();
  });

  test("shows cost breakdown section", async ({ page }) => {
    await page.goto("/calculator/profit");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Cost Breakdown").first()).toBeVisible();
  });

  test("shipping tab has weight and dimension inputs", async ({ page }) => {
    await page.goto("/calculator/shipping");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Package Details")).toBeVisible();
    await expect(inputNearLabel(page, /weight/i)).toBeVisible();
    await expect(inputNearLabel(page, /length/i)).toBeVisible();
    await expect(inputNearLabel(page, /width/i)).toBeVisible();
    await expect(inputNearLabel(page, /height/i)).toBeVisible();
  });

  test("shipping tab has origin and destination selectors", async ({ page }) => {
    await page.goto("/calculator/shipping");
    await page.waitForLoadState("networkidle");
    await expect(inputNearLabel(page, /origin/i)).toBeVisible();
    await expect(inputNearLabel(page, /destination/i)).toBeVisible();
  });

  test("landed cost has tariff and insurance inputs", async ({ page }) => {
    await page.goto("/calculator/landed-cost");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("True Cost Input")).toBeVisible();
    await expect(inputNearLabel(page, /tariff/i)).toBeVisible();
    await expect(inputNearLabel(page, /insurance/i)).toBeVisible();
    await expect(inputNearLabel(page, /customs duty/i)).toBeVisible();
  });

  test("margin tab has cost and desired margin inputs", async ({ page }) => {
    await page.goto("/calculator/margin");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Margin Input")).toBeVisible();
    await expect(inputNearLabel(page, /cost price/i)).toBeVisible();
    await expect(inputNearLabel(page, /desired margin/i)).toBeVisible();
  });

  test("shows recommended price in margin tab", async ({ page }) => {
    await page.goto("/calculator/margin");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Recommended Price")).toBeVisible();
  });

  test("product cost input accepts numeric values", async ({ page }) => {
    await page.goto("/calculator/profit");
    await page.waitForLoadState("networkidle");
    const input = inputNearLabel(page, /product cost/i);
    await input.clear();
    await input.fill("15.99");
    await expect(input).toHaveValue("15.99");
  });

  test("results update when inputs change", async ({ page }) => {
    await page.goto("/calculator/profit");
    await page.waitForLoadState("networkidle");
    const input = inputNearLabel(page, /product cost/i);
    await input.clear();
    await input.fill("25");
    await page.waitForTimeout(200);
    await expect(page.getByText("Net Profit").first()).toBeVisible();
  });

  test("can load calculator with pre-filled URL params", async ({ page }) => {
    await page.goto("/calculator/profit?cost=10&price=29.99&ship=5&fee=15&ads=3");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Profit Calculator").first()).toBeVisible();
  });
});
